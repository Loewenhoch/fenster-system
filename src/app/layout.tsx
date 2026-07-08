import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { SessionProvider } from "@/components/providers/session-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: {
    default: "Sonnenschutz – Starhembergstraße 64/66",
    template: "%s – Sonnenschutz",
  },
  description:
    "Online-Portal für Eigentümer der Starhembergstraße 64/66 zur Bestellung von Sonnenschutz. Einfach, übersichtlich und barrierefrei.",
  keywords: [
    "Sonnenschutz",
    "Eigentümerportal",
    "Starhembergstraße",
    "Wohnanlage",
  ],
  authors: [{ name: "Sonnenschutz Starhembergstraße 64/66" }],
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    type: "website",
    locale: "de_AT",
    siteName: "Sonnenschutz – Starhembergstraße 64/66",
    title: "Sonnenschutz – Starhembergstraße 64/66",
    description:
      "Online-Portal für Eigentümer zur Bestellung von Sonnenschutz.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de" className={inter.variable} suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans text-foreground antialiased">
        <ThemeProvider>
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
        </ThemeProvider>
      </body>
    </html>
  );
}
