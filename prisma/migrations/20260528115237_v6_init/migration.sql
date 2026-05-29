-- CreateTable
CREATE TABLE "Building" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "houseNumber" TEXT NOT NULL,
    "street" TEXT NOT NULL DEFAULT 'Starhembergstraße',
    "city" TEXT NOT NULL DEFAULT 'Linz'
);

-- CreateTable
CREATE TABLE "Apartment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "buildingId" TEXT NOT NULL,
    "topNumber" TEXT NOT NULL,
    "floor" TEXT NOT NULL,
    "apartmentType" TEXT,
    "sizeSqm" REAL,
    "sizeSqmPlan" REAL,
    "loggiaType" TEXT,
    "loggiaSizeSqm" REAL,
    "heatingType" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Apartment_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "Building" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Resident" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "apartmentId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'OWNER_PRIMARY',
    "salutation" TEXT,
    "title" TEXT,
    "firstName" TEXT,
    "lastName" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "loginEmail" TEXT,
    "passwordHash" TEXT,
    "magicLinkToken" TEXT,
    "magicLinkExpires" DATETIME,
    "isPrimaryContact" BOOLEAN NOT NULL DEFAULT false,
    "loginEnabled" BOOLEAN NOT NULL DEFAULT false,
    "lastLoginAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Resident_apartmentId_fkey" FOREIGN KEY ("apartmentId") REFERENCES "Apartment" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Window" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "apartmentId" TEXT NOT NULL,
    "windowNumber" TEXT NOT NULL,
    "wingType" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "widthMm" INTEGER NOT NULL,
    "heightMm" INTEGER NOT NULL,
    "measureText" TEXT NOT NULL,
    "hasExistingSunscreen" BOOLEAN NOT NULL DEFAULT false,
    "hasElectricSunscreen" BOOLEAN NOT NULL DEFAULT false,
    "sunscreenInterest" BOOLEAN NOT NULL DEFAULT false,
    "insectScreenInterest" BOOLEAN NOT NULL DEFAULT false,
    "wantsElectricSs" BOOLEAN NOT NULL DEFAULT false,
    "rekordTypeOld" TEXT,
    "rekordTypeNew" TEXT,
    "isOrderable" BOOLEAN NOT NULL DEFAULT true,
    "priceMotorComplete" REAL,
    "priceCordComplete" REAL,
    "priceCordMaterial" REAL,
    "priceMotorMaterial" REAL,
    "priceMotorSurcharge" REAL,
    "priceIsgWindow" REAL,
    "priceIsgDoor" REAL,
    "priceReceiver" REAL,
    "priceSender15Ch" REAL,
    "priceSender1Ch" REAL,
    "isMotorPossible" BOOLEAN NOT NULL DEFAULT true,
    "isCordPossible" BOOLEAN NOT NULL DEFAULT true,
    "isIsgWindowPossible" BOOLEAN NOT NULL DEFAULT true,
    "isIsgDoorPossible" BOOLEAN NOT NULL DEFAULT true,
    "requiresManipulationFee" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Window_apartmentId_fkey" FOREIGN KEY ("apartmentId") REFERENCES "Apartment" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "unitPrice" REAL NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "residentId" TEXT NOT NULL,
    "apartmentId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "totalNet" REAL NOT NULL,
    "totalGross" REAL NOT NULL,
    "materialTotal" REAL NOT NULL DEFAULT 0,
    "installationTotal" REAL NOT NULL DEFAULT 0,
    "manipulationTotal" REAL NOT NULL DEFAULT 0,
    "confirmationSignature" TEXT,
    "confirmationName" TEXT,
    "confirmationIp" TEXT,
    "confirmedAt" DATETIME,
    "privacyAccepted" BOOLEAN NOT NULL DEFAULT false,
    "termsAccepted" BOOLEAN NOT NULL DEFAULT false,
    "withdrawalAccepted" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Order_residentId_fkey" FOREIGN KEY ("residentId") REFERENCES "Resident" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Order_apartmentId_fkey" FOREIGN KEY ("apartmentId") REFERENCES "Apartment" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "OrderItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT NOT NULL,
    "windowId" TEXT,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" REAL NOT NULL,
    "totalPrice" REAL NOT NULL,
    "installationFee" REAL NOT NULL DEFAULT 0,
    "manipulationFee" REAL NOT NULL DEFAULT 0,
    "notes" TEXT,
    CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "OrderItem_windowId_fkey" FOREIGN KEY ("windowId") REFERENCES "Window" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "OrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tableName" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "oldValues" TEXT,
    "newValues" TEXT,
    "userId" TEXT,
    "userEmail" TEXT,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Settings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    "updatedBy" TEXT
);

-- CreateIndex
CREATE UNIQUE INDEX "Building_houseNumber_key" ON "Building"("houseNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Apartment_buildingId_topNumber_key" ON "Apartment"("buildingId", "topNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Resident_loginEmail_key" ON "Resident"("loginEmail");

-- CreateIndex
CREATE UNIQUE INDEX "Resident_magicLinkToken_key" ON "Resident"("magicLinkToken");

-- CreateIndex
CREATE UNIQUE INDEX "Settings_key_key" ON "Settings"("key");
