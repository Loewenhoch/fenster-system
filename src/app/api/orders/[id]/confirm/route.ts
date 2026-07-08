import { auth } from "@/lib/auth";
import { repairDraftOrderTotals } from "@/lib/order-repair";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Nicht authentifiziert" },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await req.json();
    const {
      confirmationName,
      confirmationSignature,
      privacyAccepted,
      termsAccepted,
      withdrawalAccepted,
    } = body;

    if (!confirmationName || typeof confirmationName !== "string") {
      return NextResponse.json(
        { error: "Bestätigungsname ist erforderlich" },
        { status: 400 }
      );
    }

    if (!privacyAccepted || !termsAccepted || !withdrawalAccepted) {
      return NextResponse.json(
        { error: "Alle Bestätigungen müssen akzeptiert werden" },
        { status: 400 }
      );
    }

    const order = await prisma.order.findFirst({
      where: { id, residentId: session.user.id },
    });

    if (!order) {
      return NextResponse.json(
        { error: "Bestellung nicht gefunden" },
        { status: 404 }
      );
    }

    if (order.status === "CONFIRMED") {
      return NextResponse.json(
        { error: "Bestellung wurde bereits bestätigt" },
        { status: 409 }
      );
    }

    if (order.status !== "DRAFT") {
      return NextResponse.json(
        { error: "Nur Entwürfe können bestätigt werden" },
        { status: 400 }
      );
    }

    await repairDraftOrderTotals(order.id);

    const headers = new Headers(req.headers);
    const ip = headers.get("x-forwarded-for") || headers.get("x-real-ip") || "unknown";

    const updated = await prisma.order.update({
      where: { id },
      data: {
        status: "CONFIRMED",
        confirmationName,
        confirmationSignature: confirmationSignature || null,
        confirmationIp: ip,
        confirmedAt: new Date(),
        privacyAccepted: true,
        termsAccepted: true,
        withdrawalAccepted: true,
      },
      include: {
        items: { include: { product: true, window: true } },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}
