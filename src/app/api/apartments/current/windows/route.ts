import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  getExistingSunscreenCategory,
  getIncludedReceiverUnitPrice,
  getMountingFees,
  getSunscreenQuantity,
} from "@/lib/pricing";
import { NextResponse } from "next/server";

// Hauptprodukte, die direkt auswählbar sind
interface MainProduct {
  id: string;
  name: string;
  description: string | null;
  category: string;
  type: "CORD" | "MOTOR" | "INSECT";
  unitPrice: number;
  quantity: number;
  installationFee: number;
  manipulationFee: number;
  materialTotal: number;
  totalPrice: number;
  isIncludedRestoration?: boolean;
}

// Zubehör, nur sichtbar wenn Motor ausgewählt
interface Accessory {
  id: string;
  name: string;
  description: string | null;
  category: string;
  unitPrice: number;
}

interface WindowResponse {
  id: string;
  windowNumber: string;
  location: string;
  widthMm: number;
  heightMm: number;
  measureText: string;
  hasExistingSunscreen: boolean;
  hasElectricSunscreen: boolean;
  requiresManipulationFee: boolean;
  rekordTypeNew: string | null;
  isMotorPossible: boolean;
  isCordPossible: boolean;
  mainProducts: MainProduct[];
  accessories: Accessory[];
}

function getWindowDisplayKey(window: {
  windowNumber: string;
  location: string;
  widthMm: number;
  heightMm: number;
  measureText: string;
}) {
  return [
    window.windowNumber.trim().toLowerCase(),
    window.location.trim().toLowerCase(),
    window.widthMm,
    window.heightMm,
    window.measureText.trim().toLowerCase(),
  ].join("|");
}

export async function GET(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.apartmentIds?.length) {
      return NextResponse.json(
        { error: "Nicht authentifiziert" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    let apartmentId = searchParams.get("apartmentId");

    const apartmentOptions = await prisma.apartment.findMany({
      where: { id: { in: session.user.apartmentIds } },
      include: { building: true },
      orderBy: [
        { building: { houseNumber: "asc" } },
        { topNumber: "asc" },
      ],
    });

    // Falls keine Wohnung angegeben: Primary oder erste verwenden
    if (!apartmentId) {
      apartmentId = session.user.primaryApartmentId || session.user.apartmentIds[0];
    }

    if (!apartmentId || !session.user.apartmentIds.includes(apartmentId)) {
      return NextResponse.json(
        { error: "Zugriff auf diese Wohnung nicht erlaubt" },
        { status: 403 }
      );
    }

    const apartment = await prisma.apartment.findUnique({
      where: { id: apartmentId },
      include: {
        building: true,
        windows: {
          orderBy: [
            { windowNumber: "asc" },
            { updatedAt: "desc" },
          ],
        },
      },
    });

    if (!apartment) {
      return NextResponse.json(
        { error: "Wohnung nicht gefunden" },
        { status: 404 }
      );
    }

    const products = await prisma.product.findMany({
      where: { isActive: true },
    });

    const productMap = new Map(products.map((p) => [p.category, p]));

    const uniqueWindowsByKey = new Map<string, (typeof apartment.windows)[number]>();
    for (const window of apartment.windows) {
      const key = getWindowDisplayKey(window);
      if (!uniqueWindowsByKey.has(key)) {
        uniqueWindowsByKey.set(key, window);
      }
    }
    const uniqueWindows = Array.from(uniqueWindowsByKey.values());

    const windowsWithProducts: WindowResponse[] = uniqueWindows.map(
      (window) => {
        const mainProducts: MainProduct[] = [];
        const accessories: Accessory[] = [];

        // === HAUPTPRODUKTE ===
        // Verfügbarkeit: Preis > 0 UND technisch möglich ("nicht möglich" steht nicht in Excel)

        // Hilfsfunktion: Materialpreis bevorzugen, sonst Komplettpreis
        const cordPrice =
          window.priceCordMaterial && window.priceCordMaterial > 0
            ? { unitPrice: window.priceCordMaterial, isComplete: false }
            : window.priceCordComplete && window.priceCordComplete > 0
            ? { unitPrice: window.priceCordComplete, isComplete: true }
            : null;

        const motorPrice =
          window.priceMotorMaterial && window.priceMotorMaterial > 0
            ? { unitPrice: window.priceMotorMaterial, isComplete: false }
            : window.priceMotorComplete && window.priceMotorComplete > 0
            ? { unitPrice: window.priceMotorComplete, isComplete: true }
            : null;

        const existingSunscreenCategory = getExistingSunscreenCategory(window);
        const receiverProduct = productMap.get("RECEIVER");
        const includedReceiverUnitPrice = getIncludedReceiverUnitPrice(
          window,
          receiverProduct?.unitPrice
        );

        // 1. Behang mit Gurt
        if (
          window.isCordPossible &&
          (cordPrice || existingSunscreenCategory === "SUNSCREEN_CORD") &&
          (!existingSunscreenCategory || existingSunscreenCategory === "SUNSCREEN_CORD")
        ) {
          const p = productMap.get("SUNSCREEN_CORD");
          if (p) {
            const isIncludedRestoration = existingSunscreenCategory === p.category;
            const unitPrice = isIncludedRestoration ? 0 : cordPrice?.unitPrice ?? 0;
            const quantity = getSunscreenQuantity(window, p.category);
            const materialTotal = unitPrice * quantity;
            const { installationFee, manipulationFee } =
              getMountingFees(window);
            mainProducts.push({
              id: p.id,
              name: p.name,
              description: isIncludedRestoration
                ? "Vorhandener Sonnenschutz wird kostenlos wieder montiert."
                : p.description,
              category: p.category,
              type: "CORD",
              unitPrice,
              quantity,
              installationFee: isIncludedRestoration || cordPrice?.isComplete ? 0 : installationFee,
              manipulationFee: isIncludedRestoration ? 0 : manipulationFee,
              materialTotal,
              totalPrice: materialTotal,
              isIncludedRestoration,
            });
          }
        }

        // 2. Behang inkl. Motor
        if (
          window.isMotorPossible &&
          (motorPrice || existingSunscreenCategory === "SUNSCREEN_MOTOR") &&
          (!existingSunscreenCategory || existingSunscreenCategory === "SUNSCREEN_MOTOR")
        ) {
          const p = productMap.get("SUNSCREEN_MOTOR");
          if (p) {
            const isIncludedRestoration = existingSunscreenCategory === p.category;
            const unitPrice = isIncludedRestoration
              ? 0
              : (motorPrice?.unitPrice ?? 0) + includedReceiverUnitPrice;
            const quantity = getSunscreenQuantity(window, p.category);
            const materialTotal = unitPrice * quantity;
            const { installationFee, manipulationFee } =
              getMountingFees(window);
            mainProducts.push({
              id: p.id,
              name: p.name,
              description: isIncludedRestoration
                ? "Vorhandener Sonnenschutz wird kostenlos wieder montiert."
                : "Inklusive Funkempfänger. Sender können optional dazubestellt werden.",
              category: p.category,
              type: "MOTOR",
              unitPrice,
              quantity,
              installationFee: isIncludedRestoration || motorPrice?.isComplete ? 0 : installationFee,
              manipulationFee: isIncludedRestoration ? 0 : manipulationFee,
              materialTotal,
              totalPrice: materialTotal,
              isIncludedRestoration,
            });
          }
        }

        // 3. Insektenschutz
        const isgPrice = window.priceIsgWindow ?? window.priceIsgDoor;
        if (isgPrice && isgPrice > 0) {
          const p = productMap.get("INSECT_SCREEN");
          if (p) {
            const unitPrice = isgPrice;
            const quantity = 1;
            const materialTotal = unitPrice * quantity;
            const { installationFee, manipulationFee } =
              getMountingFees(window);
            mainProducts.push({
              id: p.id,
              name: p.name,
              description: p.description,
              category: p.category,
              type: "INSECT",
              unitPrice,
              quantity,
              installationFee,
              manipulationFee,
              materialTotal,
              totalPrice: materialTotal,
            });
          }
        }

        // === ZUBEHÖR (nur wenn Motor überhaupt möglich ist UND Preis > 0) ===
        if (window.isMotorPossible) {
          const sender1 = productMap.get("SENDER_1CH");
          if (sender1) {
            const unitPrice = window.priceSender1Ch ?? sender1.unitPrice ?? 0;
            if (unitPrice > 0) {
              accessories.push({
                id: sender1.id,
                name: sender1.name,
                description: sender1.description,
                category: sender1.category,
                unitPrice,
              });
            }
          }

          const sender15 = productMap.get("SENDER_15CH");
          if (sender15) {
            const unitPrice = window.priceSender15Ch ?? sender15.unitPrice ?? 0;
            if (unitPrice > 0) {
              accessories.push({
                id: sender15.id,
                name: sender15.name,
                description: sender15.description,
                category: sender15.category,
                unitPrice,
              });
            }
          }
        }

        return {
          id: window.id,
          windowNumber: window.windowNumber,
          location: window.location,
          widthMm: window.widthMm,
          heightMm: window.heightMm,
          measureText: window.measureText,
          hasExistingSunscreen: window.hasExistingSunscreen,
          hasElectricSunscreen: window.hasElectricSunscreen,
          requiresManipulationFee: window.requiresManipulationFee,
          rekordTypeNew: window.rekordTypeNew,
          isMotorPossible: window.isMotorPossible,
          isCordPossible: window.isCordPossible,
          mainProducts,
          accessories,
        };
      }
    );

    return NextResponse.json({
      apartment: {
        id: apartment.id,
        houseNumber: apartment.building.houseNumber,
        topNumber: apartment.topNumber,
        floor: apartment.floor,
      },
      apartments: apartmentOptions.map((apt) => ({
        id: apt.id,
        houseNumber: apt.building.houseNumber,
        topNumber: apt.topNumber,
        floor: apt.floor,
      })),
      windows: windowsWithProducts,
    });
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}
