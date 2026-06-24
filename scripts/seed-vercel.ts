import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

type SeedData = Record<string, Array<Record<string, unknown>>>;

const ELECTRIC_EXISTING_SUNSCREEN_WINDOW_IDS = new Set([
  "cmqhzalhr00nxidsl8x8iv1qq", // H66 Top 14, 178f.1
  "cmqhzalhw00nzidsl7tkp8od6", // H66 Top 14, 179f
  "cmqhzali100o1idsl6u7z6021", // H66 Top 14, 180f
  "cmqhzali600o3idsl6k5ckcgj", // H66 Top 14, 181f (180f)
  "cmqhzallp00pfidslxz3nquke", // H66 Top 22, 205f
  "cmqhzalv000t1idslypwylfge", // H66 Top 43, 270f.1
  "cmqhzalv400t3idsl2lfqmz1w", // H66 Top 43, 271f.1
  "cmqhzalva00t5idslh5pfxqg9", // H66 Top 43, 272f.1
]);

const conflictFieldsByModel: Record<string, string[]> = {
  Apartment: ["buildingId", "topNumber"],
  Building: ["houseNumber"],
  Resident: ["loginEmail"],
  ResidentApartment: ["residentId", "apartmentId"],
  Settings: ["key"],
};

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
  const conflictFields = conflictFieldsByModel[model] ?? ["id"];
  const columns = Object.keys(data[0]);
  const updateColumns = columns.filter(
    (column) => !conflictFields.includes(column)
  );
  const quotedColumns = columns.map(quoteIdentifier).join(", ");
  const quotedTable = quoteIdentifier(model);
  const quotedConflictFields = conflictFields.map(quoteIdentifier).join(", ");
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
       ON CONFLICT (${quotedConflictFields}) DO UPDATE SET ${updateSet}`,
      ...values
    );
  }

  console.log(`Seeded ${model}: ${data.length}`);
}

async function removeStaleSeedWindows(rows: Array<Record<string, unknown>>) {
  const seedWindowIds = rows
    .map((row) => row.id)
    .filter((id): id is string => typeof id === "string");

  if (seedWindowIds.length === 0) return;

  const placeholders = seedWindowIds.map((_, index) => `$${index + 1}`).join(", ");
  const deleted = await prisma.$executeRawUnsafe(
    `DELETE FROM "Window" AS w
     WHERE w."id" NOT IN (${placeholders})
       AND NOT EXISTS (
         SELECT 1 FROM "OrderItem" AS oi
         WHERE oi."windowId" = w."id"
       )`,
    ...seedWindowIds
  );

  console.log(`Removed stale unreferenced windows: ${deleted}`);
}

function migrateSeedData(data: SeedData): SeedData {
  const windows = normalizeElectricExistingSunscreens(
    normalizeWindowCordPrices(data.Window ?? [])
  );
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
    Window: windows,
    ResidentApartment: data.ResidentApartment ?? residentApartments,
  };
}

function normalizeElectricExistingSunscreens(rows: Array<Record<string, unknown>>) {
  return rows.map((row) => {
    if (
      typeof row.id === "string" &&
      ELECTRIC_EXISTING_SUNSCREEN_WINDOW_IDS.has(row.id)
    ) {
      return {
        ...row,
        hasExistingSunscreen: true,
        hasElectricSunscreen: true,
      };
    }

    return row;
  });
}

function asPositiveNumber(value: unknown): number | null {
  return typeof value === "number" && value > 0 ? value : null;
}

function normalizeWindowCordPrices(rows: Array<Record<string, unknown>>) {
  const fallbackByRekordType = new Map<
    string,
    { material: number | null; complete: number | null }
  >();

  for (const row of rows) {
    const rekordType =
      typeof row.rekordTypeNew === "string" ? row.rekordTypeNew : null;
    if (!rekordType) continue;

    const current = fallbackByRekordType.get(rekordType) ?? {
      material: null,
      complete: null,
    };
    current.material ??= asPositiveNumber(row.priceCordMaterial);
    current.complete ??= asPositiveNumber(row.priceCordComplete);
    fallbackByRekordType.set(rekordType, current);
  }

  return rows.map((row) => {
    if (row.isCordPossible === false) return row;

    const hasCordPrice =
      asPositiveNumber(row.priceCordMaterial) !== null ||
      asPositiveNumber(row.priceCordComplete) !== null;
    const hasMotorPrice =
      asPositiveNumber(row.priceMotorMaterial) !== null ||
      asPositiveNumber(row.priceMotorComplete) !== null;
    const rekordType =
      typeof row.rekordTypeNew === "string" ? row.rekordTypeNew : null;
    const fallback = rekordType ? fallbackByRekordType.get(rekordType) : null;

    if (hasCordPrice || !hasMotorPrice || !fallback) return row;

    return {
      ...row,
      priceCordMaterial: fallback.material ?? row.priceCordMaterial,
      priceCordComplete: fallback.complete ?? row.priceCordComplete,
    };
  });
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
  await removeStaleSeedWindows(data.Window);
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
