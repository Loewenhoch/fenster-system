import xlsx from "xlsx";
import path from "path";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const DATA_DIR = "/home/leonp/sta fenster system";

function parseFloatSafe(val: unknown): number | null {
  if (val === null || val === undefined || val === "") return null;
  const str = String(val).trim().replace(",", ".");
  if (str === "-" || str === "?" || str.toLowerCase() === "nicht möglich") return null;
  const n = parseFloat(str);
  return isNaN(n) ? null : n;
}

function parseIntSafe(val: unknown): number | null {
  if (val === null || val === undefined || val === "") return null;
  const str = String(val).trim().replace(/\D/g, "");
  if (!str) return null;
  const n = parseInt(str);
  return isNaN(n) ? null : n;
}

function isNichtMoeglich(val: unknown): boolean {
  if (val === null || val === undefined) return false;
  return String(val).toLowerCase().includes("nicht möglich");
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

async function importApartmentsAndOwners(buildings: { b64: any; b66: any }) {
  console.log("Importiere Wohnungen und EIGENTÜMER (keine Mieter)...");
  const file = path.join(DATA_DIR, "20260429 Wohnungsübersicht-Tops +Zusatzinfos.xlsm");
  const wb = xlsx.readFile(file);
  const sheet = wb.Sheets["Daten"];
  const data = xlsx.utils.sheet_to_json(sheet, { header: 1, blankrows: false }) as any[][];
  const rows = data.slice(2);

  let apartmentCount = 0;
  let ownerCount = 0;

  for (const row of rows) {
    const haus = row[2];
    const stock = row[3];
    const top = row[4];

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

    // === EIGENTÜMER 1 (immer importieren) ===
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
      ownerCount++;
    }

    // === EIGENTÜMER 2 (falls vorhanden) ===
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
      ownerCount++;
    }

    // === KEINE MIETER IMPORTIEREN ===
  }

  console.log(`  ${apartmentCount} Wohnungen, ${ownerCount} Eigentümer importiert`);
}

async function importWindowsV6(buildings: { b64: any; b66: any }) {
  console.log("Importiere Fenster aus V6-Datei...");
  const file = path.join(DATA_DIR, "AusführungsKontrolle + Infos 2026.05.27 - bearb Kopie von 2025.10.14 - V6.xlsm");
  const wb = xlsx.readFile(file);
  const sheet = wb.Sheets["Zusammenschnitt Fenstertypen"];
  const data = xlsx.utils.sheet_to_json(sheet, { header: 1, blankrows: false }) as any[][];
  const rows = data.slice(3);

  let windowCount = 0;
  let skipped = 0;

  for (const row of rows) {
    const haus = row[0];
    const top = row[2];
    const lage = row[5];
    const fensternr = row[7];
    const fluegel = row[8];
    const breite = row[10];
    const hoehe = row[11];
    const bestandSS = row[13];
    const elektSS = row[14];
    const ssInt = row[15];
    const isInt = row[16];
    const wunschESS = row[17];
    const rekordOld = row[19];
    const rekordNew = row[20];

    // Preisfelder aus V6
    // Col V(21)=Rollo mit Motor komplett, Col W(22)=Rollo mit Gurt komplett
    const priceMotorComplete = parseFloatSafe(row[21]);
    const priceCordComplete = parseFloatSafe(row[22]);
    // Col X(23)=Behang+Gurt rabattiert, Col [(26)=Nachbestellung Gurt → Fallback
    const priceCordMaterial = parseFloatSafe(row[23]) ?? parseFloatSafe(row[26]);
    // Col Y(24)=Behang+Motor rabattiert, Col Z(25)=Nachbestellung Motor → Fallback
    const priceMotorMaterial = parseFloatSafe(row[24]) ?? parseFloatSafe(row[25]);
    const priceMotorSurcharge = parseFloatSafe(row[29]);   // Col ^
    const priceIsgWindow = parseFloatSafe(row[30]);        // Col _
    const priceIsgDoor = parseFloatSafe(row[31]);          // Col `
    const priceReceiver = parseFloatSafe(row[32]);         // Col a
    const priceSender15Ch = parseFloatSafe(row[33]);       // Col b
    const priceSender1Ch = parseFloatSafe(row[34]);        // Col c

    // "nicht möglich" = Option nicht verfügbar
    // Motor: Col V, Col Y, Col Z prüfen
    const isMotorPossible = !isNichtMoeglich(row[21]) && !isNichtMoeglich(row[24]) && !isNichtMoeglich(row[25]);
    // Gurt: Col W, Col X, Col [ prüfen
    const isCordPossible = !isNichtMoeglich(row[22]) && !isNichtMoeglich(row[23]) && !isNichtMoeglich(row[26]);
    // ISG: Col _, Col ` prüfen
    const isIsgWindowPossible = !isNichtMoeglich(row[30]);
    const isIsgDoorPossible = !isNichtMoeglich(row[31]);

    // Manipulationsgebühr: wenn Bestand SS vorhanden (BSS)
    const hasExistingSS = String(bestandSS).toLowerCase().includes("bss");
    const requiresManipulationFee = hasExistingSS;

    if (!haus || !top || String(top).toLowerCase() === "allg" || String(top).toLowerCase().includes("weg")) continue;
    if (!fensternr) continue;

    const houseNum = String(haus).trim();
    const building = houseNum === "66" ? buildings.b66 : buildings.b64;
    const topRaw = String(top).trim();
    const topNumber = topRaw.toLowerCase().startsWith("top ") ? topRaw : `Top ${topRaw}`;

    const apartment = await prisma.apartment.findUnique({
      where: { buildingId_topNumber: { buildingId: building.id, topNumber } },
    });

    if (!apartment) {
      skipped++;
      continue;
    }

    const widthMm = parseIntSafe(breite) || 0;
    const heightMm = parseIntSafe(hoehe) || 0;

    await prisma.window.create({
      data: {
        apartmentId: apartment.id,
        windowNumber: String(fensternr).trim(),
        wingType: fluegel ? String(fluegel).trim() : "",
        location: lage ? String(lage).trim().toLowerCase() : "",
        widthMm,
        heightMm,
        measureText: `${widthMm}x${heightMm}`,
        hasExistingSunscreen: hasExistingSS,
        hasElectricSunscreen: String(elektSS).toLowerCase() === "ja" || String(elektSS).toLowerCase() === "x",
        sunscreenInterest: String(ssInt).toLowerCase().includes("int"),
        insectScreenInterest: String(isInt).toLowerCase().includes("int"),
        wantsElectricSs: String(wunschESS).toLowerCase() === "ja" || String(wunschESS).toLowerCase() === "x",
        rekordTypeOld: rekordOld ? String(rekordOld).trim() : null,
        rekordTypeNew: rekordNew ? String(rekordNew).trim() : null,
        // Preise
        priceMotorComplete,
        priceCordComplete,
        priceCordMaterial,
        priceMotorMaterial,
        priceMotorSurcharge,
        priceIsgWindow,
        priceIsgDoor,
        priceReceiver,
        priceSender15Ch,
        priceSender1Ch,
        // Verfügbarkeit
        isMotorPossible,
        isCordPossible,
        isIsgWindowPossible,
        isIsgDoorPossible,
        // Gebühren
        requiresManipulationFee,
      },
    });
    windowCount++;
  }

  console.log(`  ${windowCount} Fenster importiert, ${skipped} übersprungen`);
}

async function importProducts() {
  console.log("Importiere Produkte...");
  const products = [
    { id: "SUNSCREEN_MOTOR", name: "Sonnenschutz mit Motor", category: "SUNSCREEN_MOTOR", unitPrice: 0 },
    { id: "SUNSCREEN_CORD", name: "Sonnenschutz mit Gurt (Behang)", category: "SUNSCREEN_CORD", unitPrice: 0 },
    { id: "INSECT_SCREEN", name: "Insektenschutz integriert", category: "INSECT_SCREEN", unitPrice: 0 },
    { id: "RECEIVER", name: "Funkempfänger", category: "RECEIVER", unitPrice: 82.55 },
    { id: "SENDER_1CH", name: "Handsender 1-Kanal", category: "SENDER_1CH", unitPrice: 50.58 },
    { id: "SENDER_15CH", name: "Handsender 15-Kanal", category: "SENDER_15CH", unitPrice: 82.55 },
  ];

  for (const p of products) {
    await prisma.product.upsert({
      where: { id: p.id },
      update: { name: p.name, category: p.category, unitPrice: p.unitPrice },
      create: { id: p.id, name: p.name, category: p.category, unitPrice: p.unitPrice, isActive: true },
    });
  }
  console.log(`  ${products.length} Produkte importiert`);
}

async function createSettings() {
  console.log("Importiere System-Einstellungen...");
  const settings = [
    { key: "installation_fee", value: "120" },
    { key: "manipulation_fee", value: "150" },
    { key: "vat_rate", value: "0.20" },
  ];
  for (const s of settings) {
    await prisma.settings.upsert({
      where: { key: s.key },
      update: { value: s.value },
      create: { key: s.key, value: s.value },
    });
  }
  console.log(`  ${settings.length} Einstellungen importiert`);
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

async function createTestUser() {
  console.log("Erstelle Test-Benutzer...");
  // Finde Wohnung mit den meisten Fenstern
  const apartments = await prisma.apartment.findMany({
    include: { windows: true, residents: true },
  });
  const sorted = apartments
    .filter(a => a.residents.length > 0)
    .sort((a, b) => b.windows.length - a.windows.length);

  const apartment = sorted[0];
  if (!apartment) {
    console.log("  Keine passende Wohnung gefunden");
    return;
  }

  const resident = apartment.residents[0];
  const passwordHash = await bcrypt.hash("test123", 12);

  await prisma.resident.update({
    where: { id: resident.id },
    data: {
      loginEmail: "test@starhembergstr.at",
      passwordHash,
      loginEnabled: true,
      firstName: "Test",
      lastName: "Benutzer",
    },
  });

  console.log(`  Test-Account: test@starhembergstr.at / test123`);
  console.log(`  Wohnung: ${apartment.buildingId} - ${apartment.topNumber} (${apartment.windows.length} Fenster)`);
}

async function main() {
  console.log("=== V6-Datenimport gestartet ===");
  try {
    await prisma.orderItem.deleteMany();
    await prisma.order.deleteMany();
    await prisma.window.deleteMany();
    await prisma.resident.deleteMany();
    await prisma.apartment.deleteMany();
    await prisma.building.deleteMany();
    await prisma.product.deleteMany();
    await prisma.settings.deleteMany();

    const buildings = await importBuildings();
    await importApartmentsAndOwners(buildings);
    await importWindowsV6(buildings);
    await importProducts();
    await createSettings();
    await createAdminUser();
    await createTestUser();

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
    console.log("Eigentümer:", stats.residents);
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
