import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  getMountingFees,
  getSunscreenQuantity,
  isMountableCategory,
} from "@/lib/pricing";
import { NextResponse } from "next/server";

const VAT_RATE = 0.2;

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
    priceMotorMaterial: number | null;
    priceIsgWindow: number | null;
    priceIsgDoor: number | null;
    priceReceiver: number | null;
    priceSender1Ch: number | null;
    priceSender15Ch: number | null;
  },
  product: { category: string; unitPrice: number }
): number {
  const productCategory = product.category;

  if (productCategory === "SUNSCREEN_MOTOR") {
    return window.priceMotorMaterial ?? 0;
  }
  if (productCategory === "SUNSCREEN_CORD") {
    return window.priceCordMaterial ?? 0;
  }
  if (productCategory === "INSECT_SCREEN") {
    return window.priceIsgWindow ?? window.priceIsgDoor ?? 0;
  }
  if (productCategory === "RECEIVER") {
    return window.priceReceiver ?? product.unitPrice ?? 0;
  }
  if (productCategory === "SENDER_1CH") {
    return window.priceSender1Ch ?? product.unitPrice ?? 0;
  }
  if (productCategory === "SENDER_15CH") {
    return window.priceSender15Ch ?? product.unitPrice ?? 0;
  }

  return 0;
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

    const resident = await prisma.resident.findUnique({
      where: { id: session.user.id },
    });

    if (!resident) {
      return NextResponse.json(
        { error: "Benutzer nicht gefunden" },
        { status: 404 }
      );
    }

    // Nur Eigentümer dürfen bestellen (keine Mieter)
    if (!isOwner(resident.role)) {
      return NextResponse.json(
        { error: "Nur Eigentümer können Bestellungen aufgeben" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { items } = body as { items: OrderItemInput[] };

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
        apartmentId: resident.apartmentId,
      },
    });
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
    });

    const windowMap = new Map(windows.map((w) => [w.id, w]));
    const productMap = new Map(products.map((p) => [p.id, p]));

    // Bestehenden Entwurf löschen
    await prisma.order.deleteMany({
      where: { residentId: session.user.id, status: "DRAFT" },
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

      const unitPrice = getUnitPrice(window, product);
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
      };
    });

    const chargedWindowIds = new Set<string>();
    for (const item of orderItemsWithMeta) {
      if (!item.isMountable || chargedWindowIds.has(item.windowId)) continue;

      const window = windowMap.get(item.windowId);
      if (!window) continue;

      const { installationFee, manipulationFee, mountingTotal } =
        getMountingFees(window);

      item.installationFee = installationFee;
      item.manipulationFee = manipulationFee;
      item.totalPrice += mountingTotal;
      installationTotal += installationFee;
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
    const totalGross = totalNet * (1 + VAT_RATE);

    const order = await prisma.order.create({
      data: {
        residentId: session.user.id,
        apartmentId: resident.apartmentId,
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

    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    console.error("API Error:", error);
    if (error instanceof Error && error.message.startsWith("Fenster")) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof Error && error.message.startsWith("Produkt")) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}
