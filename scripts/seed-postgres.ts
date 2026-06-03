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
  const delegate = (prisma as unknown as Record<string, { createMany: Function }>)[
    model[0].toLowerCase() + model.slice(1)
  ];
  await delegate.createMany({
    data: reviveDates(model, rows),
    skipDuplicates: true,
  });
}

async function main() {
  const seedPath = path.join(process.cwd(), "prisma", "seed-data.json");
  const data = JSON.parse(fs.readFileSync(seedPath, "utf8")) as SeedData;

  await createMany("Building", data.Building);
  await createMany("Apartment", data.Apartment);
  await createMany("Resident", data.Resident);
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
