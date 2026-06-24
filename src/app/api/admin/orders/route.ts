import { auth, isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getWindowTypeLabel } from "@/lib/pricing";
import { NextResponse } from "next/server";

const TYPE_SUMMARY_CATEGORIES = new Set([
  "SUNSCREEN_CORD",
  "SUNSCREEN_MOTOR",
  "INSECT_SCREEN",
]);

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.role || !isAdmin(session.user.role)) {
      return NextResponse.json(
        { error: "Zugriff verweigert" },
        { status: 403 }
      );
    }

    // Pagination: max 100 Bestellungen pro Request
    const orders = await prisma.order.findMany({
      take: 100,
      include: {
        resident: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
        apartment: {
          include: {
            building: {
              select: {
                houseNumber: true,
              },
            },
          },
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                category: true,
                unitPrice: true,
              },
            },
            window: {
              select: {
                id: true,
                windowNumber: true,
                location: true,
                widthMm: true,
                heightMm: true,
                rekordTypeNew: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Berechne detaillierte Preise pro Bestellung
    const ordersWithDetails = orders.map((order) => {
      const itemDetails = order.items.map((item) => ({
        ...item,
        windowTypeLabel: item.window ? getWindowTypeLabel(item.window) : null,
        priceBreakdown: {
          unitPrice: item.unitPrice,
          installationFee: item.installationFee,
          manipulationFee: item.manipulationFee,
          lineTotal: item.totalPrice,
        },
      }));
      const typeSummaryMap = new Map<
        string,
        {
          windowTypeLabel: string;
          productName: string;
          category: string;
          quantity: number;
        }
      >();

      for (const item of itemDetails) {
        if (!TYPE_SUMMARY_CATEGORIES.has(item.product.category)) continue;

        const windowTypeLabel = item.windowTypeLabel ?? "Typ unbekannt";
        const key = `${windowTypeLabel}|${item.product.category}|${item.product.name}`;
        const current =
          typeSummaryMap.get(key) ?? {
            windowTypeLabel,
            productName: item.product.name,
            category: item.product.category,
            quantity: 0,
          };
        current.quantity += item.quantity;
        typeSummaryMap.set(key, current);
      }

      return {
        ...order,
        items: itemDetails,
        typeSummary: Array.from(typeSummaryMap.values()).sort((a, b) => {
          const typeCompare = a.windowTypeLabel.localeCompare(
            b.windowTypeLabel,
            "de",
            { numeric: true }
          );
          return typeCompare || a.productName.localeCompare(b.productName, "de");
        }),
        priceSummary: {
          materialTotal: order.materialTotal,
          installationTotal: order.installationTotal,
          manipulationTotal: order.manipulationTotal,
          totalNet: order.totalNet,
          totalGross: order.totalGross,
          vatAmount: order.totalGross - order.totalNet,
        },
      };
    });

    return NextResponse.json(ordersWithDetails);
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}
