import "dotenv/config";
import xlsx from "xlsx";
import path from "path";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const DATA_DIR = "/home/leonp/sta fenster system";

function parseTopNumber(topStr: string): string {
  return topStr.replace(/^Top\s*/, "").trim();
}

function parseFloatSafe(val: unknown): number | null {
  if (val === null || val === undefined || val === "") return null;
  const n = parseFloat(String(val).replace(",", "."));
  return isNaN(n) ? null : n;
}

async function importBuildings() {
  console.log("Importiere Gebäude...");
  const b64 = await prisma.building.upsert({
    where: { houseNumber: "64" },
    update: {},
    create: { houseNumber: "64", street: "Starhembergstraße", city: "Linz" },
  });
  const b66 = await prisma.building.upsert({
    where: { houseNumber: "66" },
    update: {},
    create: { houseNumber: "66", street: "Starhembergstraße", city: "Linz" },
  });
  console.log(`  Gebäude 64: ${b64.id}, Gebäude 66: ${b66.id}`);
  return { b64, b66 };
}

async function importApartmentsAndResidents(buildings: { b64: any; b66: any }) {
  console.log("Importiere Wohnungen und Bewohner...");
  const file = path.join(DATA_DIR, "20260429 Wohnungsübersicht-Tops +Zusatzinfos.xlsm");
  const wb = xlsx.readFile(file);
  const sheet = wb.Sheets["Daten"];
  const data = xlsx.utils.sheet_to_json(sheet, { header: 1, blankrows: false }) as any[][];

  const rows = data.slice(2);

  let apartmentCount = 0;
  let residentCount = 0;

  for (const row of rows) {
    const haus = row[2];
    const stock = row[3];
    const top = row[4];
    const mieter = row[7];

    if (!haus || !top || String(top).toLowerCase().includes("gesamt")) continue;

    const houseNum = String(haus).trim();
    const building = houseNum === "66" ? buildings.b66 : buildings.b64;

    const topRaw = String(top).trim();
    const topNumber = topRaw.toLowerCase().startsWith("top ") ? topRaw : `Top ${topRaw}`;
    const floor = stock ? String(stock).trim() : "";
    const apartmentType = row[41] ? String(row[41]).trim() : null;
    const sizeSqm = parseFloatSafe(row[44]);

    const apartment = await prisma.apartment.upsert({
      where: { buildingId_topNumber: { buildingId: building.id, topNumber } },
      update: { floor, apartmentType, sizeSqm },
      create: { buildingId: building.id, topNumber, floor, apartmentType, sizeSqm },
    });
    apartmentCount++;

    // Eigentümer 1
    const e1Anrede = row[14] ? String(row[14]).trim() : null;
    const e1Titel = row[15] ? String(row[15]).trim() : null;
    const e1Vorname = row[16] ? String(row[16]).trim() : null;
    const e1Nachname = row[17] ? String(row[17]).trim() : null;
    const e1Tel = row[19] ? String(row[19]).trim() : null;
    const e1EmailRaw = row[20] ? String(row[20]).trim() : null;
    const e1Email = e1EmailRaw && e1EmailRaw.includes("@") ? e1EmailRaw.split(";")[0].trim() : null;

    if (e1Vorname || e1Nachname) {
      await prisma.resident.upsert({
        where: { loginEmail: e1Email || `e1_${apartment.id}@placeholder.local` },
        update: {
          firstName: e1Vorname, lastName: e1Nachname,
          salutation: e1Anrede, title: e1Titel,
          phone: e1Tel, email: e1EmailRaw, isPrimaryContact: true,
        },
        create: {
          apartmentId: apartment.id, role: "OWNER_PRIMARY",
          salutation: e1Anrede, title: e1Titel,
          firstName: e1Vorname, lastName: e1Nachname,
          phone: e1Tel, email: e1EmailRaw,
          loginEmail: e1Email || `e1_${apartment.id}@placeholder.local`,
          isPrimaryContact: true, loginEnabled: false,
        },
      });
      residentCount++;
    }

    // Eigentümer 2
    const e2Vorname = row[25] ? String(row[25]).trim() : null;
    const e2Nachname = row[26] ? String(row[26]).trim() : null;
    if (e2Vorname || e2Nachname) {
      const e2Email = `e2_${apartment.id}@placeholder.local`;
      await prisma.resident.upsert({
        where: { loginEmail: e2Email },
        update: {},
        create: {
          apartmentId: apartment.id, role: "OWNER_SECONDARY",
          firstName: e2Vorname, lastName: e2Nachname,
          loginEmail: e2Email, isPrimaryContact: false, loginEnabled: false,
        },
      });
      residentCount++;
    }

    // Mieter
    const mVorname = row[34] ? String(row[34]).trim() : null;
    const mNachname = row[35] ? String(row[35]).trim() : null;
    const mTel = row[37] ? String(row[37]).trim() : null;
    const mEmailRaw = row[38] ? String(row[38]).trim() : null;
    const mEmail = mEmailRaw && mEmailRaw.includes("@") ? mEmailRaw.split(";")[0].trim() : null;

    if (mVorname || mNachname) {
      const mieterText = mieter ? String(mieter).trim().toLowerCase() : "";
      if (!mieterText.includes("kein mieter") && !mieterText.includes("zur zeit kein")) {
        await prisma.resident.upsert({
          where: { loginEmail: mEmail || `m_${apartment.id}@placeholder.local` },
          update: {
            firstName: mVorname, lastName: mNachname,
            phone: mTel, email: mEmailRaw,
          },
          create: {
            apartmentId: apartment.id, role: "TENANT",
            firstName: mVorname, lastName: mNachname,
            phone: mTel, email: mEmailRaw,
            loginEmail: mEmail || `m_${apartment.id}@placeholder.local`,
            isPrimaryContact: false, loginEnabled: false,
          },
        });
        residentCount++;
      }
    }
  }

  console.log(`  ${apartmentCount} Wohnungen, ${residentCount} Bewohner importiert`);
}

async function importWindows(buildings: { b64: any; b66: any }) {
  console.log("Importiere Fenster...");
  const file = path.join(DATA_DIR, "AusführungsKontrolle + Infos 2026.05.27 - bearb Kopie von 2025.10.14 - V4.xlsm");
  const wb = xlsx.readFile(file);
  const sheet = wb.Sheets["Zusammenschnitt Fenstertypen"];
  const data = xlsx.utils.sheet_to_json(sheet, { header: 1, blankrows: false }) as any[][];

  const rows = data.slice(3);

  let windowCount = 0;

  for (const row of rows) {
    const haus = row[0];
    const top = row[2];
    const lage = row[5];
    const fensternr = row[7];
    const fluegel = row[8];
    const breite = row[10];
    const hoehe = row[11];
    const bestandSS = row[13];
    const ssInt = row[15];
    const isInt = row[16];
    const wunschESS = row[17];
    const rekordOld = row[19];
    const rekordNew = row[20];

    if (!haus || !top || String(top).toLowerCase() === "allg" || String(top).toLowerCase().includes("weg")) continue;
    if (!fensternr) continue;

    const houseNum = String(haus).trim();
    const building = houseNum === "66" ? buildings.b66 : buildings.b64;
    const topRaw = String(top).trim();
    const topNumber = topRaw.toLowerCase().startsWith("top ") ? topRaw : `Top ${topRaw}`;

    const apartment = await prisma.apartment.findUnique({
      where: { buildingId_topNumber: { buildingId: building.id, topNumber } },
    });

    if (!apartment) continue;

    const widthMm = parseInt(String(breite).replace(/\D/g, "")) || 0;
    const heightMm = parseInt(String(hoehe).replace(/\D/g, "")) || 0;

    await prisma.window.create({
      data: {
        apartmentId: apartment.id,
        windowNumber: String(fensternr).trim(),
        wingType: fluegel ? String(fluegel).trim() : "",
        location: lage ? String(lage).trim().toLowerCase() : "",
        widthMm,
        heightMm,
        measureText: `${widthMm}x${heightMm}`,
        hasExistingSunscreen: String(bestandSS).toLowerCase().includes("bss"),
        sunscreenInterest: String(ssInt).toLowerCase().includes("int"),
        insectScreenInterest: String(isInt).toLowerCase().includes("int"),
        wantsElectricSs: String(wunschESS).toLowerCase() === "ja" || String(wunschESS).toLowerCase() === "x",
        rekordTypeOld: rekordOld ? String(rekordOld).trim() : null,
        rekordTypeNew: rekordNew ? String(rekordNew).trim() : null,
      },
    });
    windowCount++;
  }

  console.log(`  ${windowCount} Fenster importiert`);
}

async function importProducts() {
  console.log("Importiere Produkte...");
  const products = [
    { id: "SUNSCREEN_MOTOR", name: "Sonnenschutz mit Motor", category: "SUNSCREEN_MOTOR", unitPrice: 0 },
    { id: "SUNSCREEN_CORD", name: "Sonnenschutz mit Gurt", category: "SUNSCREEN_CORD", unitPrice: 0 },
    { id: "INSECT_SCREEN", name: "Insektenschutz integriert", category: "INSECT_SCREEN", unitPrice: 0 },
    { id: "RECEIVER", name: "Funkempfänger", category: "RECEIVER", unitPrice: 82.55 },
    { id: "SENDER_1CH", name: "Handsender 1-Kanal", category: "SENDER_1CH", unitPrice: 50.58 },
    { id: "SENDER_15CH", name: "Handsender 15-Kanal", category: "SENDER_15CH", unitPrice: 82.55 },
  ];

  for (const p of products) {
    await prisma.product.upsert({
      where: { id: p.id },
      update: {},
      create: { id: p.id, name: p.name, category: p.category, unitPrice: p.unitPrice, isActive: true },
    });
  }
  console.log(`  ${products.length} Produkte importiert`);
}

async function createAdminUser() {
  console.log("Erstelle Admin-Benutzer...");
  const firstApartment = await prisma.apartment.findFirst();
  if (!firstApartment) {
    console.log("  Keine Wohnung gefunden");
    return;
  }

  const passwordHash = await bcrypt.hash("admin123", 12);
  await prisma.resident.upsert({
    where: { loginEmail: "admin@starhembergstr.at" },
    update: { passwordHash, loginEnabled: true, firstName: "Admin", lastName: "System" },
    create: {
      apartmentId: firstApartment.id, role: "OWNER_PRIMARY",
      firstName: "Admin", lastName: "System",
      loginEmail: "admin@starhembergstr.at",
      passwordHash, isPrimaryContact: true, loginEnabled: true,
    },
  });
  console.log("  Admin: admin@starhembergstr.at / admin123");
}

async function main() {
  console.log("=== Excel-Datenimport gestartet ===");
  try {
    await prisma.orderItem.deleteMany();
    await prisma.order.deleteMany();
    await prisma.window.deleteMany();
    await prisma.resident.deleteMany();
    await prisma.apartment.deleteMany();
    await prisma.building.deleteMany();
    await prisma.product.deleteMany();

    const buildings = await importBuildings();
    await importApartmentsAndResidents(buildings);
    await importWindows(buildings);
    await importProducts();
    await createAdminUser();

    const stats = {
      buildings: await prisma.building.count(),
      apartments: await prisma.apartment.count(),
      residents: await prisma.resident.count(),
      windows: await prisma.window.count(),
      products: await prisma.product.count(),
    };

    console.log("\n=== Import abgeschlossen ===");
    console.log("Gebäude:", stats.buildings);
    console.log("Wohnungen:", stats.apartments);
    console.log("Bewohner:", stats.residents);
    console.log("Fenster:", stats.windows);
    console.log("Produkte:", stats.products);
  } catch (error) {
    console.error("Fehler:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
