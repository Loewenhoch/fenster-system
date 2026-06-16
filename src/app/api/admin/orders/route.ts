import { auth, isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

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
        priceBreakdown: {
          unitPrice: item.unitPrice,
          installationFee: item.installationFee,
          manipulationFee: item.manipulationFee,
          lineTotal: item.totalPrice,
        },
      }));

      return {
        ...order,
        items: itemDetails,
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
