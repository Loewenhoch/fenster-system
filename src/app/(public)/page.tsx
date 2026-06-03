import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, Shield, Home, Sun } from "lucide-react";

export default function HomePage() {
  return (
    <div className="space-y-12">
      {/* Hero */}
      <section className="text-center">
        <h1 className="text-3xl font-bold tracking-tight text-primary sm:text-4xl lg:text-5xl">
          Sonnenschutz für Eigentümer
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
          Bestellen Sie bequem den gewünschten Sonnenschutz für Ihre Wohnung in
          der Starhembergstraße 64/66.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link href="/login">
            <Button size="xl" className="gap-2">
              Zum Anmelden
              <ArrowRight className="size-5" aria-hidden="true" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="mb-4 flex size-12 items-center justify-center rounded-lg bg-primary/10">
            <Home className="size-6 text-primary" aria-hidden="true" />
          </div>
          <h2 className="text-xl font-semibold text-primary">
            Eigentümerportal
          </h2>
          <p className="mt-2 text-base text-muted-foreground">
            Melden Sie sich als Eigentümer an und sehen Sie die verfügbaren
            Bestellmöglichkeiten für Ihre Wohnung.
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="mb-4 flex size-12 items-center justify-center rounded-lg bg-accent/10">
            <Sun className="size-6 text-accent" aria-hidden="true" />
          </div>
          <h2 className="text-xl font-semibold text-primary">
            Sonnenschutz
          </h2>
          <p className="mt-2 text-base text-muted-foreground">
            Wählen Sie den passenden Sonnenschutz für die vorhandenen
            Fenstern Ihrer Wohnung aus.
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 shadow-sm sm:col-span-2 lg:col-span-1">
          <div className="mb-4 flex size-12 items-center justify-center rounded-lg bg-success/10">
            <Shield className="size-6 text-success" aria-hidden="true" />
          </div>
          <h2 className="text-xl font-semibold text-primary">
            Sicher &amp; Einfach
          </h2>
          <p className="mt-2 text-base text-muted-foreground">
            Ihre Auswahl wird sicher gespeichert. Sie können jederzeit
            Änderungen vornehmen.
          </p>
        </div>
      </section>
    </div>
  );
}
