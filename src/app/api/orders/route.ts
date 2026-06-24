import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  getExistingSunscreenCategory,
  getInsectScreenUnitPrice,
  getIncludedReceiverUnitPrice,
  getMountingFees,
  getSunscreenQuantity,
  isIncludedExistingSunscreen,
  isMountableCategory,
  isNoOrderCategory,
  isNonOrderableWindowType,
  isSunscreenCategory,
  NO_ORDER_CATEGORY,
  NO_ORDER_PRODUCT_ID,
  VAT_RATE,
} from "@/lib/pricing";
import { NextResponse } from "next/server";

const ACCESSORY_CATEGORIES = new Set([
  "SENDER_1CH",
  "SENDER_15CH",
]);

interface OrderItemInput {
  windowId: string;
  productId: string;
  quantity?: number;
}

async function ensureNoOrderProduct() {
  return prisma.product.upsert({
    where: { id: NO_ORDER_PRODUCT_ID },
    update: {
      name: "Ich möchte nichts bestellen",
      description: "Rückmeldung ohne Produktbestellung",
      category: NO_ORDER_CATEGORY,
      unitPrice: 0,
      isActive: true,
    },
    create: {
      id: NO_ORDER_PRODUCT_ID,
      name: "Ich möchte nichts bestellen",
      description: "Rückmeldung ohne Produktbestellung",
      category: NO_ORDER_CATEGORY,
      unitPrice: 0,
      isActive: true,
    },
  });
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
    hasExistingSunscreen: boolean;
    hasElectricSunscreen: boolean;
    requiresManipulationFee: boolean;
  },
  product: { category: string; unitPrice: number },
  includedReceiverFallbackUnitPrice?: number | null
): { unitPrice: number; isComplete: boolean; isIncludedRestoration: boolean } {
  const productCategory = product.category;

  if (isIncludedExistingSunscreen(window, productCategory)) {
    return { unitPrice: 0, isComplete: false, isIncludedRestoration: true };
  }

  if (productCategory === "SUNSCREEN_MOTOR") {
    const includedReceiverUnitPrice = getIncludedReceiverUnitPrice(
      window,
      includedReceiverFallbackUnitPrice
    );
    if (window.priceMotorMaterial && window.priceMotorMaterial > 0) {
      return { unitPrice: window.priceMotorMaterial + includedReceiverUnitPrice, isComplete: false, isIncludedRestoration: false };
    }
    if (window.priceMotorComplete && window.priceMotorComplete > 0) {
      return { unitPrice: window.priceMotorComplete + includedReceiverUnitPrice, isComplete: true, isIncludedRestoration: false };
    }
    return { unitPrice: 0, isComplete: false, isIncludedRestoration: false };
  }
  if (productCategory === "SUNSCREEN_CORD") {
    if (window.priceCordMaterial && window.priceCordMaterial > 0) {
      return { unitPrice: window.priceCordMaterial, isComplete: false, isIncludedRestoration: false };
    }
    if (window.priceCordComplete && window.priceCordComplete > 0) {
      return { unitPrice: window.priceCordComplete, isComplete: true, isIncludedRestoration: false };
    }
    return { unitPrice: 0, isComplete: false, isIncludedRestoration: false };
  }
  if (productCategory === "INSECT_SCREEN") {
    return { unitPrice: getInsectScreenUnitPrice(window), isComplete: false, isIncludedRestoration: false };
  }
  if (productCategory === "RECEIVER") {
    return { unitPrice: 0, isComplete: false, isIncludedRestoration: false };
  }
  if (productCategory === "SENDER_1CH") {
    return { unitPrice: window.priceSender1Ch ?? product.unitPrice ?? 0, isComplete: false, isIncludedRestoration: false };
  }
  if (productCategory === "SENDER_15CH") {
    return { unitPrice: window.priceSender15Ch ?? product.unitPrice ?? 0, isComplete: false, isIncludedRestoration: false };
  }

  return { unitPrice: 0, isComplete: false, isIncludedRestoration: false };
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
    const { items, apartmentId, submitNoOrder } = body as {
      items: OrderItemInput[];
      apartmentId: string;
      submitNoOrder?: boolean;
    };

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
    const apartmentWindows = await prisma.window.findMany({
      where: { apartmentId },
    });

    const normalizedItems: OrderItemInput[] = items.filter(
      (item) => item.productId !== "RECEIVER"
    );
    const userSubmittedOnlyNoOrder =
      normalizedItems.length > 0 &&
      normalizedItems.every((item) => item.productId === NO_ORDER_PRODUCT_ID);

    if (submitNoOrder && !userSubmittedOnlyNoOrder) {
      return NextResponse.json(
        { error: "Direktes Abschicken ist nur für 'nichts bestellen' möglich" },
        { status: 400 }
      );
    }

    if (normalizedItems.some((item) => item.productId === NO_ORDER_PRODUCT_ID)) {
      await ensureNoOrderProduct();
    }

    const selectedKeys = new Set(
      normalizedItems.map((item) => `${item.windowId}:${item.productId}`)
    );

    for (const window of apartmentWindows) {
      if (isNonOrderableWindowType(window)) continue;

      const includedCategory = getExistingSunscreenCategory(window);
      if (!includedCategory) continue;

      const key = `${window.id}:${includedCategory}`;
      if (!selectedKeys.has(key)) {
        normalizedItems.push({ windowId: window.id, productId: includedCategory });
        selectedKeys.add(key);
      }
    }

    const windowIds = [...new Set(normalizedItems.map((i) => i.windowId).filter(Boolean))];
    const productIds = [
      ...new Set([
        ...normalizedItems.map((i) => i.productId).filter(Boolean),
        "RECEIVER",
      ]),
    ];

    const windows = apartmentWindows.filter((window) => windowIds.includes(window.id));
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
    });

    const windowMap = new Map(windows.map((w) => [w.id, w]));
    const productMap = new Map(products.map((p) => [p.id, p]));
    const selectedProductCategoriesByWindow = new Map<string, Set<string>>();

    for (const item of normalizedItems) {
      const product = productMap.get(item.productId);
      if (!product) continue;

      const categories =
        selectedProductCategoriesByWindow.get(item.windowId) ?? new Set<string>();
      categories.add(product.category);
      selectedProductCategoriesByWindow.set(item.windowId, categories);
    }

    for (const [windowId, categories] of selectedProductCategoriesByWindow.entries()) {
      if (categories.has(NO_ORDER_CATEGORY) && categories.size > 1) {
        const window = apartmentWindows.find((w) => w.id === windowId);
        throw new Error(
          `Fenster ${window?.windowNumber ?? windowId}: 'Nichts bestellen' kann nicht mit Produkten kombiniert werden`
        );
      }
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

      const orderItemsWithMeta = normalizedItems.map((item) => {
        const window = windowMap.get(item.windowId);
        const product = productMap.get(item.productId);

        if (!window) {
          throw new Error(`Fenster ${item.windowId} nicht gefunden`);
        }
        if (!product) {
          throw new Error(`Produkt ${item.productId} nicht gefunden`);
        }
        if (isNonOrderableWindowType(window) && !isNoOrderCategory(product.category)) {
          throw new Error(`Fenster ${window.windowNumber} ist Typ 7 und nicht bestellbar`);
        }

        if (isNoOrderCategory(product.category)) {
          return {
            windowId: item.windowId,
            productId: item.productId,
            quantity: 1,
            unitPrice: 0,
            totalPrice: 0,
            installationFee: 0,
            manipulationFee: 0,
            isMountable: false,
            isComplete: false,
            isIncludedRestoration: false,
          };
        }

        // Verfügbarkeitsprüfung: Produkt muss für dieses Fenster verfügbar sein
        const includedCategory = getExistingSunscreenCategory(window);
        if (
          includedCategory &&
          isSunscreenCategory(product.category) &&
          product.category !== includedCategory
        ) {
          throw new Error(`Fuer Fenster ${window.windowNumber} ist der vorhandene Sonnenschutz fix vorgegeben`);
        }

        const hasMotorPrice = (window.priceMotorMaterial && window.priceMotorMaterial > 0) || (window.priceMotorComplete && window.priceMotorComplete > 0);
        const hasCordPrice = (window.priceCordMaterial && window.priceCordMaterial > 0) || (window.priceCordComplete && window.priceCordComplete > 0);
        if (product.category === "SUNSCREEN_MOTOR" && (!window.isMotorPossible || (!hasMotorPrice && includedCategory !== "SUNSCREEN_MOTOR"))) {
          throw new Error(`Produkt ${product.name} nicht fuer Fenster ${window.windowNumber} verfuegbar`);
        }
        if (product.category === "SUNSCREEN_CORD" && (!window.isCordPossible || (!hasCordPrice && includedCategory !== "SUNSCREEN_CORD"))) {
          throw new Error(`Produkt ${product.name} nicht fuer Fenster ${window.windowNumber} verfuegbar`);
        }
        if (product.category === "INSECT_SCREEN" && getInsectScreenUnitPrice(window) <= 0) {
          throw new Error(`Produkt ${product.name} nicht für Fenster ${window.windowNumber} verfügbar`);
        }
        if (ACCESSORY_CATEGORIES.has(product.category)) {
          const selectedCategories =
            selectedProductCategoriesByWindow.get(item.windowId) ?? new Set<string>();

          if (!window.isMotorPossible || !selectedCategories.has("SUNSCREEN_MOTOR")) {
            throw new Error(`Produkt ${product.name} benötigt Sonnenschutz mit Motor für Fenster ${window.windowNumber}`);
          }
        }

        const { unitPrice, isComplete, isIncludedRestoration } = getUnitPrice(
          window,
          product,
          productMap.get("RECEIVER")?.unitPrice
        );
        if (unitPrice <= 0 && !isIncludedRestoration) {
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
          isIncludedRestoration,
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
        item.installationFee = item.isComplete || item.isIncludedRestoration ? 0 : installationFee;
        item.manipulationFee = item.isIncludedRestoration ? 0 : manipulationFee;
        item.totalPrice += item.isComplete || item.isIncludedRestoration ? 0 : mountingTotal;
        installationTotal += item.isComplete || item.isIncludedRestoration ? 0 : installationFee;
        manipulationTotal += item.isIncludedRestoration ? 0 : manipulationFee;
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
          status: submitNoOrder && userSubmittedOnlyNoOrder ? "CONFIRMED" : "DRAFT",
          materialTotal,
          installationTotal,
          manipulationTotal,
          totalNet,
          totalGross,
          confirmedAt: submitNoOrder && userSubmittedOnlyNoOrder ? new Date() : null,
          confirmationName:
            submitNoOrder && userSubmittedOnlyNoOrder
              ? session.user.name || session.user.email || "Keine Bestellung"
              : null,
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
    if (error instanceof Error && (error.message.startsWith("Fenster") || error.message.startsWith("Produkt") || error.message.startsWith("Fuer"))) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}
