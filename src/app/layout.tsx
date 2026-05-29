import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { SessionProvider } from "@/components/providers/session-provider";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: {
    default: "Fenster & Sonnenschutz – Starhembergstraße 64 & 66",
    template: "%s – Fenster & Sonnenschutz",
  },
  description:
    "Online-Portal für Bewohner der Starhembergstraße 64 & 66 zur Auswahl von Fenstern und Sonnenschutz. Einfach, übersichtlich und barrierefrei.",
  keywords: [
    "Fenster",
    "Sonnenschutz",
    "Bewohnerportal",
    "Starhembergstraße",
    "Wohnanlage",
  ],
  authors: [{ name: "Fenster & Sonnenschutz" }],
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    type: "website",
    locale: "de_AT",
    siteName: "Fenster & Sonnenschutz – Starhembergstraße 64 & 66",
    title: "Fenster & Sonnenschutz – Starhembergstraße 64 & 66",
    description:
      "Online-Portal für Bewohner zur Auswahl von Fenstern und Sonnenschutz.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de" className={inter.variable}>
      <body className="min-h-screen bg-background font-sans text-foreground antialiased">
        <SessionProvider>
          {children}
          <Toaster
            position="top-center"
            richColors
            closeButton
            toastOptions={{
              className: "text-base",
            }}
          />
        </SessionProvider>
      </body>
    </html>
  );
}
