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

async function createMany(model: string, rows: Array<Record<string, unknown>>) {
  if (rows.length === 0) return;
  const delegate = (prisma as unknown as Record<string, {
    createMany: (args: { data: Array<Record<string, unknown>> }) => Promise<unknown>;
  }>)[model[0].toLowerCase() + model.slice(1)];

  await delegate.createMany({ data: reviveDates(model, rows) });
}

async function clearDatabase() {
  await prisma.auditLog.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.window.deleteMany();
  await prisma.product.deleteMany();
  await prisma.residentApartment.deleteMany();
  await prisma.resident.deleteMany();
  await prisma.apartment.deleteMany();
  await prisma.building.deleteMany();
  await prisma.settings.deleteMany();
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

  await clearDatabase();

  await createMany("Building", data.Building);
  await createMany("Apartment", data.Apartment);
  await createMany("Resident", data.Resident);
  await createMany("ResidentApartment", data.ResidentApartment);
  await createMany("Window", data.Window);
  await createMany("Product", data.Product);
  await createMany("Order", data.Order);
  await createMany("OrderItem", data.OrderItem);
  await createMany("AuditLog", data.AuditLog);
  await createMany("Settings", data.Settings);

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
