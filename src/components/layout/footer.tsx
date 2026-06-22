"use client";

import Link from "next/link";
import { Mail, Phone, MapPin } from "lucide-react";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="mt-auto w-full border-t border-border bg-secondary text-secondary-foreground">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {/* Links */}
          <div>
            <h3 className="mb-4 text-lg font-semibold text-primary">
              Rechtliches
            </h3>
            <nav aria-label="Rechtliche Links">
              <ul className="space-y-3">
                <li>
                  <Link
                    href="/datenschutz"
                    className="text-base text-muted-foreground transition-colors hover:text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    Datenschutz
                  </Link>
                </li>
                <li>
                  <Link
                    href="/agb"
                    className="text-base text-muted-foreground transition-colors hover:text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    AGB
                  </Link>
                </li>
                <li>
                  <Link
                    href="/widerruf"
                    className="text-base text-muted-foreground transition-colors hover:text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    Widerruf
                  </Link>
                </li>
                <li>
                  <Link
                    href="/impressum"
                    className="text-base text-muted-foreground transition-colors hover:text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    Impressum
                  </Link>
                </li>
              </ul>
            </nav>
          </div>

          {/* Kontakt */}
          <div>
            <h3 className="mb-4 text-lg font-semibold text-primary">Kontakt</h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <MapPin
                  className="mt-0.5 size-5 shrink-0 text-accent"
                  aria-hidden="true"
                />
                <span className="text-base text-muted-foreground">
                  DI Platzer ZT GmbH
                  <br />
                  Margarethen 33a
                  <br />
                  4020 Linz, Austria
                </span>
              </li>
              <li className="flex items-center gap-3">
                <Mail
                  className="size-5 shrink-0 text-accent"
                  aria-hidden="true"
                />
                <a
                  href="mailto:zt@platzer.co.at"
                  className="text-base text-muted-foreground transition-colors hover:text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  zt@platzer.co.at
                </a>
              </li>
              <li className="flex items-center gap-3">
                <Phone
                  className="size-5 shrink-0 text-accent"
                  aria-hidden="true"
                />
                <a
                  href="tel:+437327810220"
                  className="text-base text-muted-foreground transition-colors hover:text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  0732 7810220
                </a>
              </li>
            </ul>
          </div>

          {/* Copyright */}
          <div className="flex flex-col justify-between sm:col-span-2 lg:col-span-1">
            <div>
              <h3 className="mb-4 text-lg font-semibold text-primary">
                Über uns
              </h3>
              <p className="text-base text-muted-foreground">
                Ihr Online-Portal zur einfachen Bestellung von Sonnenschutz
                für Eigentümer der Starhembergstraße 64/66.
              </p>
            </div>
            <p className="mt-6 text-sm text-muted-foreground">
              &copy; {currentYear} Sonnenschutz Starhembergstraße 64/66. Alle Rechte
              vorbehalten.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
