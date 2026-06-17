import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

type SeedData = Record<string, Array<Record<string, unknown>>>;

const dateFields: Record<string, string[]> = {
  Apartment: ["createdAt", "updatedAt"],
  Resident: ["magicLinkExpires", "lastLoginAt", "createdAt", "updatedAt"],
  ResidentApartment: ["createdAt", "updatedAt"],
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

function quoteIdentifier(value: string) {
  return `"${value.replaceAll('"', '""')}"`;
}

async function bulkUpsertById(model: string, rows: Array<Record<string, unknown>>) {
  if (rows.length === 0) return;
  const data = reviveDates(model, rows);
  const modelDateFields = new Set(dateFields[model] ?? []);
  const columns = Object.keys(data[0]);
  const updateColumns = columns.filter((column) => column !== "id");
  const quotedColumns = columns.map(quoteIdentifier).join(", ");
  const quotedTable = quoteIdentifier(model);
  const updateSet = updateColumns
    .map((column) => `${quoteIdentifier(column)} = EXCLUDED.${quoteIdentifier(column)}`)
    .join(", ");

  for (let start = 0; start < data.length; start += 100) {
    const batch = data.slice(start, start + 100);
    const values: unknown[] = [];
    const valueRows = batch.map((row) => {
      const placeholders = columns.map((column) => {
        values.push(row[column] ?? null);
        return modelDateFields.has(column)
          ? `$${values.length}::timestamp`
          : `$${values.length}`;
      });
      return `(${placeholders.join(", ")})`;
    });

    await prisma.$executeRawUnsafe(
      `INSERT INTO ${quotedTable} (${quotedColumns}) VALUES ${valueRows.join(", ")}
       ON CONFLICT ("id") DO UPDATE SET ${updateSet}`,
      ...values
    );
  }

  console.log(`Seeded ${model}: ${data.length}`);
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

  await bulkUpsertById("Building", data.Building);
  await bulkUpsertById("Apartment", data.Apartment);
  await bulkUpsertById("Resident", data.Resident);
  await bulkUpsertById("ResidentApartment", data.ResidentApartment);
  await bulkUpsertById("Window", data.Window);
  await bulkUpsertById("Product", data.Product);
  await bulkUpsertById("Settings", data.Settings);

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
