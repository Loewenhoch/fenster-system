import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const apartments = await prisma.apartment.findMany({
    include: {
      building: true,
      residents: { select: { id: true, firstName: true, lastName: true, role: true, loginEnabled: true } },
      windows: { select: { id: true } },
      orders: { select: { id: true, status: true }, orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: [{ buildingId: "asc" }, { topNumber: "asc" }],
  });

  return NextResponse.json(apartments);
}
