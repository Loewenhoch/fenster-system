import { auth, isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

const DEFAULT_SETTINGS: Record<string, string> = {
  installation_fee: "120",
  manipulation_fee: "150",
  vat_rate: "0.10",
};

const settingValueSchema = z.record(z.string(), z.string());

async function ensureDefaultSettings() {
  const existing = await prisma.settings.findMany({
    where: { key: { in: Object.keys(DEFAULT_SETTINGS) } },
  });

  const existingKeys = new Set(existing.map((s) => s.key));
  const missingKeys = Object.keys(DEFAULT_SETTINGS).filter(
    (k) => !existingKeys.has(k)
  );

  if (missingKeys.length > 0) {
    await prisma.settings.createMany({
      data: missingKeys.map((key) => ({
        key,
        value: DEFAULT_SETTINGS[key],
      })),
    });
  }
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.role || !isAdmin(session.user.role)) {
      return NextResponse.json(
        { error: "Zugriff verweigert" },
        { status: 403 }
      );
    }

    await ensureDefaultSettings();

    const settings = await prisma.settings.findMany({
      orderBy: { key: "asc" },
    });

    // Als Key-Value-Objekt zurückgeben
    const settingsObject: Record<string, string> = {};
    for (const setting of settings) {
      settingsObject[setting.key] = setting.value;
    }

    return NextResponse.json(settingsObject);
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.role || !isAdmin(session.user.role)) {
      return NextResponse.json(
        { error: "Zugriff verweigert" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const parseResult = settingValueSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Ungültige Eingabe: Werte müssen Strings sein" },
        { status: 400 }
      );
    }

    const updates = parseResult.data as Record<string, string>;

    await ensureDefaultSettings();

    // Transaktion: Alle Settings aktualisieren
    await prisma.$transaction(
      Object.entries(updates).map(([key, value]) =>
        prisma.settings.upsert({
          where: { key },
          create: {
            key,
            value,
            updatedBy: session.user.id,
          },
          update: {
            value,
            updatedBy: session.user.id,
          },
        })
      )
    );

    // Aktualisierte Settings zurückgeben
    const allSettings = await prisma.settings.findMany({
      orderBy: { key: "asc" },
    });

    const settingsObject: Record<string, string> = {};
    for (const setting of allSettings) {
      settingsObject[setting.key] = setting.value;
    }

    return NextResponse.json(settingsObject);
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}
