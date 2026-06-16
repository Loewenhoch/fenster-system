#!/usr/bin/env python3
"""Aktiviert Accounts von Eigentümern mit echten E-Mails in der SQLite-DB.

Nach dem Refactor auf many-to-many (Resident <-> Apartment über ResidentApartment)
wird die Rolle/Primärkontakt-Info aus der Junction-Tabelle gelesen.
"""
import sqlite3
import bcrypt
import csv
import os
import random
import string
import sys
from datetime import datetime

DB_PATH = "/home/leonp/sta-fenster-system/apps/web/prisma/dev.db"
CSV_PATH = "/home/leonp/sta-fenster-system/apps/web/zugangsdaten-accounts.csv"


def generate_password(length=10):
    chars = string.ascii_letters + string.digits
    return "".join(random.SystemRandom().choice(chars) for _ in range(length))


def is_real_email(email):
    if not email:
        return False
    email = email.strip()
    return "@" in email and "@placeholder.local" not in email


def main():
    dry_run = "--dry-run" in sys.argv
    print("=== DRY-RUN ===" if dry_run else "=== Account-Aktivierung ===")

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()

    # Lese alle OWNER_PRIMARY Verknüpfungen inkl. Resident und Wohnung
    c.execute("""
        SELECT
            r.id AS residentId,
            r.firstName,
            r.lastName,
            r.loginEmail,
            r.loginEnabled,
            r.passwordHash,
            ra.isPrimaryContact,
            a.topNumber,
            b.houseNumber
        FROM ResidentApartment ra
        JOIN Resident r ON ra.residentId = r.id
        JOIN Apartment a ON ra.apartmentId = a.id
        JOIN Building b ON a.buildingId = b.id
        WHERE ra.role = 'OWNER_PRIMARY'
        ORDER BY r.id, b.houseNumber, a.topNumber
    """)
    rows = c.fetchall()

    # Gruppiere nach Resident
    by_resident = {}
    for r in rows:
        rid = r["residentId"]
        by_resident.setdefault(rid, {
            "resident": r,
            "apartments": [],
        })["apartments"].append(f"{r['houseNumber']} {r['topNumber']}")

    to_activate = []
    skipped = []
    already_active = []

    for rid, data in by_resident.items():
        r = data["resident"]
        if is_real_email(r["loginEmail"]):
            if r["loginEnabled"] and r["passwordHash"]:
                already_active.append(data)
            else:
                to_activate.append(data)
        else:
            skipped.append(data)

    print(f"\nGefundene Haupteigentümer-Accounts: {len(by_resident)}")
    print(f"- Mit echter E-Mail: {len(to_activate) + len(already_active)}")
    print(f"  - Bereits aktiviert: {len(already_active)}")
    print(f"  - Werden aktiviert: {len(to_activate)}")
    print(f"- Ohne echte E-Mail (übersprungen): {len(skipped)}")

    print("\n--- Werden aktiviert (max. 10) ---")
    for data in to_activate[:10]:
        r = data["resident"]
        print(f"  {', '.join(data['apartments'])} | {r['firstName'] or ''} {r['lastName'] or ''} | {r['loginEmail']}")
    if len(to_activate) > 10:
        print(f"  ... und {len(to_activate) - 10} weitere")

    print("\n--- Übersprungen (keine echte E-Mail, max. 10) ---")
    for data in skipped[:10]:
        r = data["resident"]
        print(f"  {', '.join(data['apartments'])} | {r['firstName'] or ''} {r['lastName'] or ''} | {r['loginEmail']}")
    if len(skipped) > 10:
        print(f"  ... und {len(skipped) - 10} weitere")

    if dry_run:
        print("\nDry-Run beendet. Keine Änderungen vorgenommen.")
        conn.close()
        return

    # Sicherheitsabfrage
    print("\nSollen diese Accounts wirklich aktiviert werden? (ja/nein)")
    answer = input().strip().lower()
    if answer not in ("ja", "j", "yes", "y"):
        print("Abgebrochen. Keine Änderungen vorgenommen.")
        conn.close()
        return

    credentials = []
    for data in to_activate:
        r = data["resident"]
        password = generate_password(10)
        password_hash = bcrypt.hashpw(password.encode(), bcrypt.gensalt(rounds=12)).decode()

        c.execute(
            "UPDATE Resident SET loginEnabled = 1, passwordHash = ? WHERE id = ?",
            (password_hash, r["residentId"]),
        )

        credentials.append({
            "Haus": ", ".join(data["apartments"]),
            "Top": ", ".join([a.split(" ", 1)[1] for a in data["apartments"]]),
            "Name": f"{r['firstName'] or ''} {r['lastName'] or ''}".strip(),
            "E-Mail": r["loginEmail"],
            "Passwort": password,
        })

        print(f"Aktiviert: {', '.join(data['apartments'])} | {r['loginEmail']}")

    conn.commit()
    conn.close()

    # CSV speichern
    with open(CSV_PATH, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["Haus", "Top", "Name", "E-Mail", "Passwort"], delimiter=";")
        writer.writeheader()
        writer.writerows(credentials)

    print(f"\n{len(credentials)} Accounts aktiviert.")
    print(f"Zugangsdaten gespeichert in: {CSV_PATH}")
    print("WICHTIG: Diese Datei enthält Klartext-Passwörter. Sicher aufbewahren!")


if __name__ == "__main__":
    main()
