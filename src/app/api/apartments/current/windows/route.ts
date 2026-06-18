import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getMountingFees, getSunscreenQuantity } from "@/lib/pricing";
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
  requiresManipulationFee: boolean;
  rekordTypeNew: string | null;
  isMotorPossible: boolean;
  isCordPossible: boolean;
  mainProducts: MainProduct[];
  accessories: Accessory[];
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
          orderBy: { windowNumber: "asc" },
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

    const windowsWithProducts: WindowResponse[] = apartment.windows.map(
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

        // 1. Behang mit Gurt
        if (window.isCordPossible && cordPrice) {
          const p = productMap.get("SUNSCREEN_CORD");
          if (p) {
            const unitPrice = cordPrice.unitPrice;
            const quantity = getSunscreenQuantity(window, p.category);
            const materialTotal = unitPrice * quantity;
            const { installationFee, manipulationFee } =
              getMountingFees(window);
            mainProducts.push({
              id: p.id,
              name: p.name,
              description: p.description,
              category: p.category,
              type: "CORD",
              unitPrice,
              quantity,
              installationFee: cordPrice.isComplete ? 0 : installationFee,
              manipulationFee,
              materialTotal,
              totalPrice: materialTotal,
            });
          }
        }

        // 2. Behang inkl. Motor
        if (window.isMotorPossible && motorPrice) {
          const p = productMap.get("SUNSCREEN_MOTOR");
          if (p) {
            const unitPrice = motorPrice.unitPrice;
            const quantity = getSunscreenQuantity(window, p.category);
            const materialTotal = unitPrice * quantity;
            const { installationFee, manipulationFee } =
              getMountingFees(window);
            mainProducts.push({
              id: p.id,
              name: p.name,
              description: p.description,
              category: p.category,
              type: "MOTOR",
              unitPrice,
              quantity,
              installationFee: motorPrice.isComplete ? 0 : installationFee,
              manipulationFee,
              materialTotal,
              totalPrice: materialTotal,
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
          const receiver = productMap.get("RECEIVER");
          if (receiver) {
            const unitPrice = window.priceReceiver ?? receiver.unitPrice ?? 0;
            if (unitPrice > 0) {
              accessories.push({
                id: receiver.id,
                name: receiver.name,
                description: receiver.description,
                category: receiver.category,
                unitPrice,
              });
            }
          }

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
