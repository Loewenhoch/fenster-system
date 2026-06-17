import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

type SeedData = Record<string, Array<Record<string, unknown>>>;

const dateFields: Record<string, string[]> = {
  Apartment: ["createdAt", "updatedAt"],
  Resident: ["magicLinkExpires", "lastLoginAt", "createdAt", "updatedAt"],
  Window: ["createdAt", "updatedAt"],
  Product: ["createdAt", "updatedAt"],
  Order: ["confirmedAt", "createdAt", "updatedAt"],
  AuditLog: ["timestamp"],
  Settings: ["updatedAt"],
};

function reviveDates(model: string, rows: Array<Record<string, unknown>>) {
  const fields = dateFields[model] ?? [];
  return rows.map((row) => {
    const next = { ...row };
    for (const field of fields) {
      if (typeof next[field] === "string") {
        next[field] = new Date(next[field] as string);
      }
    }
    return next;
  });
}

function withoutId(row: Record<string, unknown>) {
  const rest = { ...row };
  delete rest.id;
  return rest;
}

async function upsertById(model: string, rows: Array<Record<string, unknown>>) {
  if (rows.length === 0) return;
  const delegate = (prisma as unknown as Record<string, {
    upsert: (args: {
      where: Record<string, unknown>;
      update: Record<string, unknown>;
      create: Record<string, unknown>;
    }) => Promise<unknown>;
  }>)[model[0].toLowerCase() + model.slice(1)];

  for (const row of reviveDates(model, rows)) {
    await delegate.upsert({
      where: { id: row.id },
      update: withoutId(row),
      create: row,
    });
  }
}

async function upsertBuildings(rows: Array<Record<string, unknown>>) {
  for (const row of reviveDates("Building", rows)) {
    await prisma.building.upsert({
      where: { houseNumber: row.houseNumber as string },
      update: withoutId(row),
      create: row as never,
    });
  }
}

async function upsertSettings(rows: Array<Record<string, unknown>>) {
  for (const row of reviveDates("Settings", rows)) {
    await prisma.settings.upsert({
      where: { key: row.key as string },
      update: withoutId(row),
      create: row as never,
    });
  }
}

function migrateSeedData(data: SeedData): SeedData {
  const residentApartments: Array<Record<string, unknown>> = [];
  const residents = (data.Resident ?? []).map((row) => {
    const {
      apartmentId,
      role,
      isPrimaryContact,
      ...resident
    } = row;

    if (typeof apartmentId === "string" && typeof row.id === "string") {
      residentApartments.push({
        id: `ra_${row.id}_${apartmentId}`,
        residentId: row.id,
        apartmentId,
        role: typeof role === "string" ? role : "OWNER_PRIMARY",
        isPrimaryContact:
          typeof isPrimaryContact === "boolean" ? isPrimaryContact : false,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      });
    }

    return resident;
  });

  return {
    ...data,
    Resident: residents,
    ResidentApartment: data.ResidentApartment ?? residentApartments,
  };
}

async function main() {
  const seedPath = path.join(process.cwd(), "prisma", "seed-data.json");
  const data = migrateSeedData(
    JSON.parse(fs.readFileSync(seedPath, "utf8")) as SeedData
  );

  await upsertBuildings(data.Building);
  await upsertById("Apartment", data.Apartment);
  await upsertById("Resident", data.Resident);
  await upsertById("ResidentApartment", data.ResidentApartment);
  await upsertById("Window", data.Window);
  await upsertById("Product", data.Product);
  await upsertSettings(data.Settings);

  console.log("Seed completed:", {
    buildings: data.Building.length,
    apartments: data.Apartment.length,
    residents: data.Resident.length,
    windows: data.Window.length,
    products: data.Product.length,
    settings: data.Settings.length,
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
