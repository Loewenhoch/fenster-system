# Deployment-Anleitung

> **Status:** Build läuft fehlerfrei durch ✅

---

## 1. Environment-Variablen

Die folgenden Variablen müssen in der Hosting-Umgebung gesetzt werden:

| Variable | Beschreibung | Beispiel |
|---|---|---|
| `DATABASE_URL` | Prisma-Datenbank-URL | `file:./dev.db` (SQLite) oder PostgreSQL-URL |
| `NEXTAUTH_SECRET` | JWT-Secret für Auth.js | Mindestens 32 Zeichen, zufällig generiert |
| `NEXTAUTH_URL` | Öffentliche URL der App | `https://deine-domain.at` |
| `RESEND_API_KEY` | API-Key für E-Mail-Versand | `re_xxxxxxxx` |
| `ADMIN_EMAIL` | Admin-Benutzer E-Mail | `admin@starhembergstr.at` |

### Generieren eines starken NEXTAUTH_SECRET:
```bash
openssl rand -base64 32
```

---

## 2. Hosting-Optionen

### Option A: Vercel (⚠️ mit Einschränkungen)

**Problem:** Vercel ist ein **Serverless**-Platform. SQLite funktioniert dort **nicht zuverlässig**, weil:
- Das Filesystem nicht persistent ist (DB wird bei jedem Deploy zurückgesetzt)
- Mehrere Serverless-Instanzen greifen gleichzeitig auf die Datei zu
- Schreibzugriffe können verloren gehen

**Empfohlene Lösung für Vercel:**
SQLite durch **PostgreSQL** ersetzen (z.B. Vercel Postgres, Neon, Supabase).

**Schnelle Umstellung auf PostgreSQL:**
1. In `prisma/schema.prisma`:
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```
2. `npx prisma migrate dev`
3. Daten neu importieren

**Vercel Build-Konfiguration (`vercel.json`):**
```json
{
  "buildCommand": "prisma generate && next build",
  "installCommand": "npm install",
  "framework": "nextjs"
}
```

---

### Option B: Railway / Render / Fly.io (✅ empfohlen)

Diese Plattformen unterstützen **SQLite** oder bieten einfache PostgreSQL-Integration.

**Railway:**
```bash
# SQLite wird direkt unterstützt
# Einfach deployen, DATABASE_URL bleibt file:./dev.db
```

**Render (Web Service):**
- Build Command: `npm install && npx prisma generate && npx next build`
- Start Command: `npx next start -H 0.0.0.0 -p 10000`
- Disk: 1 GB (für SQLite empfohlen)

**Fly.io:**
```bash
fly deploy
# SQLite funktioniert mit einem persistenten Volume
```

---

### Option C: VPS / Eigen-Server (✅ vollständige Kontrolle)

**Ubuntu-Server Setup:**
```bash
# 1. Projekt klonen
git clone <repo-url>
cd sta-fenster-system/apps/web

# 2. Abhängigkeiten
npm install

# 3. Environment
cp .env.example .env
# → Variablen anpassen

# 4. Prisma
npx prisma generate

# 5. Build
npm run build

# 6. Start (mit PM2 für Dauerbetrieb)
npm install -g pm2
pm2 start "npx next start -H 0.0.0.0 -p 3000" --name "fenster-system"
pm2 save
pm2 startup
```

---

## 3. Erstdeployment-Schritte

Nach dem ersten Deploy muss die Datenbank befüllt werden:

```bash
# 1. Excel-Dateien ins Projektverzeichnis legen
#    → /sta-fenster-system/AusführungsKontrolle...V6.xlsm
#    → /sta-fenster-system/20260429 Wohnungsübersicht...xlsm

# 2. Import ausführen
npx tsx scripts/import-v6.ts
```

**Wichtig:** Das Script importiert nur bei leerer Datenbank korrekt. Vor dem Re-Import:
```bash
npx prisma migrate reset --force
```

---

## 4. Build-Status

| Prüfung | Status |
|---|---|
| `npm run build` | ✅ Fehlerfrei |
| TypeScript-Check | ✅ Keine Fehler |
| Prisma-Client | ✅ Generiert |
| Statische Seiten | 28 Seiten |
| API-Routen | 12 Endpunkte |

---

## 5. Bekannte Einschränkungen

| Thema | Status | Lösung |
|---|---|---|
| SQLite auf Vercel | ⚠️ Nicht empfohlen | PostgreSQL verwenden |
| E-Mail-Versand | ⚠️ Resend-Test-Key | Produktions-Key hinterlegen |
| Auth-Secret | ⚠️ Lokaler Platzhalter | Starkes Secret generieren |
| HTTPS erzwungen | ❌ Noch nicht aktiv | `secureCookie` in Auth.js aktivieren |
