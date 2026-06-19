import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  getMountingFees,
  getSunscreenQuantity,
  isMountableCategory,
  VAT_RATE,
} from "@/lib/pricing";
import { NextResponse } from "next/server";

const ACCESSORY_CATEGORIES = new Set([
  "RECEIVER",
  "SENDER_1CH",
  "SENDER_15CH",
]);

interface OrderItemInput {
  windowId: string;
  productId: string;
  quantity?: number;
}

function isOwner(role: string): boolean {
  return role.includes("OWNER");
}

function getUnitPrice(
  window: {
    priceCordMaterial: number | null;
    priceCordComplete: number | null;
    priceMotorMaterial: number | null;
    priceMotorComplete: number | null;
    priceIsgWindow: number | null;
    priceIsgDoor: number | null;
    priceReceiver: number | null;
    priceSender1Ch: number | null;
    priceSender15Ch: number | null;
  },
  product: { category: string; unitPrice: number }
): { unitPrice: number; isComplete: boolean } {
  const productCategory = product.category;

  if (productCategory === "SUNSCREEN_MOTOR") {
    if (window.priceMotorMaterial && window.priceMotorMaterial > 0) {
      return { unitPrice: window.priceMotorMaterial, isComplete: false };
    }
    if (window.priceMotorComplete && window.priceMotorComplete > 0) {
      return { unitPrice: window.priceMotorComplete, isComplete: true };
    }
    return { unitPrice: 0, isComplete: false };
  }
  if (productCategory === "SUNSCREEN_CORD") {
    if (window.priceCordMaterial && window.priceCordMaterial > 0) {
      return { unitPrice: window.priceCordMaterial, isComplete: false };
    }
    if (window.priceCordComplete && window.priceCordComplete > 0) {
      return { unitPrice: window.priceCordComplete, isComplete: true };
    }
    return { unitPrice: 0, isComplete: false };
  }
  if (productCategory === "INSECT_SCREEN") {
    return { unitPrice: window.priceIsgWindow ?? window.priceIsgDoor ?? 0, isComplete: false };
  }
  if (productCategory === "RECEIVER") {
    return { unitPrice: window.priceReceiver ?? product.unitPrice ?? 0, isComplete: false };
  }
  if (productCategory === "SENDER_1CH") {
    return { unitPrice: window.priceSender1Ch ?? product.unitPrice ?? 0, isComplete: false };
  }
  if (productCategory === "SENDER_15CH") {
    return { unitPrice: window.priceSender15Ch ?? product.unitPrice ?? 0, isComplete: false };
  }

  return { unitPrice: 0, isComplete: false };
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Nicht authentifiziert" },
        { status: 401 }
      );
    }

    const orders = await prisma.order.findMany({
      where: { residentId: session.user.id },
      include: {
        items: { include: { product: true, window: true } },
        apartment: { include: { building: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(orders);
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Nicht authentifiziert" },
        { status: 401 }
      );
    }

    // Nur Eigentümer dürfen bestellen (keine Mieter)
    if (!isOwner(session.user.role)) {
      return NextResponse.json(
        { error: "Nur Eigentümer können Bestellungen aufgeben" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { items, apartmentId } = body as { items: OrderItemInput[]; apartmentId: string };

    if (!apartmentId || !session.user.apartmentIds.includes(apartmentId)) {
      return NextResponse.json(
        { error: "Ungültige Wohnung" },
        { status: 403 }
      );
    }

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "Keine Artikel übermittelt" },
        { status: 400 }
      );
    }

    // Alle benötigten Fenster und Produkte auf einmal laden
    const windowIds = [...new Set(items.map((i) => i.windowId).filter(Boolean))];
    const productIds = [...new Set(items.map((i) => i.productId).filter(Boolean))];

    const windows = await prisma.window.findMany({
      where: {
        id: { in: windowIds },
        apartmentId: apartmentId,
      },
    });
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
    });

    const windowMap = new Map(windows.map((w) => [w.id, w]));
    const productMap = new Map(products.map((p) => [p.id, p]));
    const selectedProductCategoriesByWindow = new Map<string, Set<string>>();

    for (const item of items) {
      const product = productMap.get(item.productId);
      if (!product) continue;

      const categories =
        selectedProductCategoriesByWindow.get(item.windowId) ?? new Set<string>();
      categories.add(product.category);
      selectedProductCategoriesByWindow.set(item.windowId, categories);
    }

    // Alles in einer Transaktion: Entwurf löschen + neu erstellen
    const order = await prisma.$transaction(async (tx) => {
      // Bestehenden Entwurf für diese Wohnung löschen
      await tx.order.deleteMany({
        where: { residentId: session.user.id, apartmentId, status: "DRAFT" },
      });

      let materialTotal = 0;
      let installationTotal = 0;
      let manipulationTotal = 0;

      const orderItemsWithMeta = items.map((item) => {
        const window = windowMap.get(item.windowId);
        const product = productMap.get(item.productId);

        if (!window) {
          throw new Error(`Fenster ${item.windowId} nicht gefunden`);
        }
        if (!product) {
          throw new Error(`Produkt ${item.productId} nicht gefunden`);
        }

        // Verfügbarkeitsprüfung: Produkt muss für dieses Fenster verfügbar sein
        const hasMotorPrice = (window.priceMotorMaterial && window.priceMotorMaterial > 0) || (window.priceMotorComplete && window.priceMotorComplete > 0);
        const hasCordPrice = (window.priceCordMaterial && window.priceCordMaterial > 0) || (window.priceCordComplete && window.priceCordComplete > 0);
        if (product.category === "SUNSCREEN_MOTOR" && (!window.isMotorPossible || !hasMotorPrice)) {
          throw new Error(`Produkt ${product.name} nicht für Fenster ${window.windowNumber} verfügbar`);
        }
        if (product.category === "SUNSCREEN_CORD" && (!window.isCordPossible || !hasCordPrice)) {
          throw new Error(`Produkt ${product.name} nicht für Fenster ${window.windowNumber} verfügbar`);
        }
        if (product.category === "INSECT_SCREEN" && (!window.priceIsgWindow || window.priceIsgWindow <= 0) && (!window.priceIsgDoor || window.priceIsgDoor <= 0)) {
          throw new Error(`Produkt ${product.name} nicht für Fenster ${window.windowNumber} verfügbar`);
        }
        if (ACCESSORY_CATEGORIES.has(product.category)) {
          const selectedCategories =
            selectedProductCategoriesByWindow.get(item.windowId) ?? new Set<string>();

          if (!window.isMotorPossible || !selectedCategories.has("SUNSCREEN_MOTOR")) {
            throw new Error(`Produkt ${product.name} benötigt Sonnenschutz mit Motor für Fenster ${window.windowNumber}`);
          }
        }

        const { unitPrice, isComplete } = getUnitPrice(window, product);
        if (unitPrice <= 0) {
          throw new Error(`Produkt ${product.name} nicht für Fenster ${window.windowNumber} verfügbar`);
        }
        const quantity = getSunscreenQuantity(window, product.category);
        const materialLineTotal = unitPrice * quantity;

        materialTotal += materialLineTotal;

        return {
          windowId: item.windowId,
          productId: item.productId,
          quantity,
          unitPrice,
          totalPrice: materialLineTotal,
          installationFee: 0,
          manipulationFee: 0,
          isMountable: isMountableCategory(product.category),
          isComplete,
        };
      });

      const chargedWindowIds = new Set<string>();
      for (const item of orderItemsWithMeta) {
        if (!item.isMountable || chargedWindowIds.has(item.windowId)) continue;

        const window = windowMap.get(item.windowId);
        if (!window) continue;

        const { installationFee, manipulationFee, mountingTotal } =
          getMountingFees(window);

        // Komplettpreise sind bereits inkl. Installation
        item.installationFee = item.isComplete ? 0 : installationFee;
        item.manipulationFee = manipulationFee;
        item.totalPrice += item.isComplete ? manipulationFee : mountingTotal;
        installationTotal += item.isComplete ? 0 : installationFee;
        manipulationTotal += manipulationFee;
        chargedWindowIds.add(item.windowId);
      }

      const orderItemsData = orderItemsWithMeta.map((item) => ({
        windowId: item.windowId,
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
        installationFee: item.installationFee,
        manipulationFee: item.manipulationFee,
      }));

      const totalNet = materialTotal + installationTotal + manipulationTotal;
      const totalGross = Math.round(totalNet * (1 + VAT_RATE) * 100) / 100;

      return tx.order.create({
        data: {
          residentId: session.user.id,
          apartmentId,
          status: "DRAFT",
          materialTotal,
          installationTotal,
          manipulationTotal,
          totalNet,
          totalGross,
          items: {
            create: orderItemsData,
          },
        },
        include: {
          items: { include: { product: true, window: true } },
        },
      });
    });

    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    console.error("API Error:", error);
    if (error instanceof Error && (error.message.startsWith("Fenster") || error.message.startsWith("Produkt"))) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}
