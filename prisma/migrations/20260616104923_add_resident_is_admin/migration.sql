-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Resident" (
    "id" TEXT NOT NULL PRIMARY KEY,
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
    "loginEnabled" BOOLEAN NOT NULL DEFAULT false,
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "lastLoginAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Resident" ("createdAt", "email", "firstName", "id", "lastLoginAt", "lastName", "loginEmail", "loginEnabled", "magicLinkExpires", "magicLinkToken", "passwordHash", "phone", "salutation", "title", "updatedAt") SELECT "createdAt", "email", "firstName", "id", "lastLoginAt", "lastName", "loginEmail", "loginEnabled", "magicLinkExpires", "magicLinkToken", "passwordHash", "phone", "salutation", "title", "updatedAt" FROM "Resident";
DROP TABLE "Resident";
ALTER TABLE "new_Resident" RENAME TO "Resident";
CREATE UNIQUE INDEX "Resident_loginEmail_key" ON "Resident"("loginEmail");
CREATE UNIQUE INDEX "Resident_magicLinkToken_key" ON "Resident"("magicLinkToken");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
