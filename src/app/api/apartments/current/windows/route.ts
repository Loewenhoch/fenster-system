import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

const INSTALLATION_FEE = 120;
const MANIPULATION_FEE = 150;

// Hauptprodukte, die direkt auswählbar sind
interface MainProduct {
  id: string;
  name: string;
  description: string | null;
  category: string;
  type: "CORD" | "MOTOR" | "INSECT";
  unitPrice: number;
  installationFee: number;
  manipulationFee: number;
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
  isMotorPossible: boolean;
  isCordPossible: boolean;
  mainProducts: MainProduct[];
  accessories: Accessory[];
}

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.apartmentId) {
      return NextResponse.json(
        { error: "Nicht authentifiziert" },
        { status: 401 }
      );
    }

    const apartment = await prisma.apartment.findUnique({
      where: { id: session.user.apartmentId },
      include: {
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

    if (apartment.id !== session.user.apartmentId) {
      return NextResponse.json(
        { error: "Zugriff auf diese Wohnung nicht erlaubt" },
        { status: 403 }
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
        // Keine Prüfung auf "sunscreenInterest" – das steuert nicht die Verfügbarkeit

        // 1. Behang mit Gurt
        if (
          window.isCordPossible &&
          window.priceCordMaterial &&
          window.priceCordMaterial > 0
        ) {
          const p = productMap.get("SUNSCREEN_CORD");
          if (p) {
            const unitPrice = window.priceCordMaterial;
            const installationFee = INSTALLATION_FEE;
            const manipulationFee = window.requiresManipulationFee
              ? MANIPULATION_FEE
              : 0;
            mainProducts.push({
              id: p.id,
              name: p.name,
              description: p.description,
              category: p.category,
              type: "CORD",
              unitPrice,
              installationFee,
              manipulationFee,
              totalPrice: unitPrice + installationFee + manipulationFee,
            });
          }
        }

        // 2. Behang inkl. Motor
        if (
          window.isMotorPossible &&
          window.priceMotorMaterial &&
          window.priceMotorMaterial > 0
        ) {
          const p = productMap.get("SUNSCREEN_MOTOR");
          if (p) {
            const unitPrice = window.priceMotorMaterial;
            const installationFee = INSTALLATION_FEE;
            const manipulationFee = window.requiresManipulationFee
              ? MANIPULATION_FEE
              : 0;
            mainProducts.push({
              id: p.id,
              name: p.name,
              description: p.description,
              category: p.category,
              type: "MOTOR",
              unitPrice,
              installationFee,
              manipulationFee,
              totalPrice: unitPrice + installationFee + manipulationFee,
            });
          }
        }

        // 3. Insektenschutz
        if (window.priceIsgWindow && window.priceIsgWindow > 0) {
          const p = productMap.get("INSECT_SCREEN");
          if (p) {
            const installationFee = INSTALLATION_FEE;
            const manipulationFee = window.requiresManipulationFee
              ? MANIPULATION_FEE
              : 0;
            mainProducts.push({
              id: p.id,
              name: p.name,
              description: p.description,
              category: p.category,
              type: "INSECT",
              unitPrice: window.priceIsgWindow,
              installationFee,
              manipulationFee,
              totalPrice: window.priceIsgWindow + installationFee + manipulationFee,
            });
          }
        }

        // === ZUBEHÖR (nur wenn Motor überhaupt möglich ist) ===
        if (window.isMotorPossible) {
          const receiver = productMap.get("RECEIVER");
          if (receiver) {
            accessories.push({
              id: receiver.id,
              name: receiver.name,
              description: receiver.description,
              category: receiver.category,
              unitPrice: window.priceReceiver ?? receiver.unitPrice ?? 0,
            });
          }

          const sender1 = productMap.get("SENDER_1CH");
          if (sender1) {
            accessories.push({
              id: sender1.id,
              name: sender1.name,
              description: sender1.description,
              category: sender1.category,
              unitPrice: window.priceSender1Ch ?? sender1.unitPrice ?? 0,
            });
          }

          const sender15 = productMap.get("SENDER_15CH");
          if (sender15) {
            accessories.push({
              id: sender15.id,
              name: sender15.name,
              description: sender15.description,
              category: sender15.category,
              unitPrice: window.priceSender15Ch ?? sender15.unitPrice ?? 0,
            });
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
          isMotorPossible: window.isMotorPossible,
          isCordPossible: window.isCordPossible,
          mainProducts,
          accessories,
        };
      }
    );

    return NextResponse.json({ windows: windowsWithProducts });
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}
