import { auth, isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

const EDITABLE_STATUSES = new Set(["DRAFT", "CONFIRMED", "CANCELLED"]);

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.role || !isAdmin(session.user.role)) {
      return NextResponse.json(
        { error: "Zugriff verweigert" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await req.json();
    const status = typeof body.status === "string" ? body.status : undefined;
    const confirmationName =
      typeof body.confirmationName === "string"
        ? body.confirmationName.trim()
        : undefined;

    if (status && !EDITABLE_STATUSES.has(status)) {
      return NextResponse.json(
        { error: "Ungültiger Status" },
        { status: 400 }
      );
    }

    const existing = await prisma.order.findUnique({
      where: { id },
      select: { id: true, confirmedAt: true },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Bestellung nicht gefunden" },
        { status: 404 }
      );
    }

    const updated = await prisma.order.update({
      where: { id },
      data: {
        ...(status ? { status } : {}),
        ...(confirmationName !== undefined
          ? { confirmationName: confirmationName || null }
          : {}),
        ...(status === "CONFIRMED" && !existing.confirmedAt
          ? { confirmedAt: new Date() }
          : {}),
        ...(status === "DRAFT" || status === "CANCELLED"
          ? { confirmedAt: null }
          : {}),
      },
      select: { id: true },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Admin order update error:", error);
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.role || !isAdmin(session.user.role)) {
      return NextResponse.json(
        { error: "Zugriff verweigert" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const existing = await prisma.order.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Bestellung nicht gefunden" },
        { status: 404 }
      );
    }

    await prisma.order.delete({ where: { id } });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Admin order delete error:", error);
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}
