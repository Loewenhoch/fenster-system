"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loading } from "@/components/ui/loading";
import {
  getOrderState,
  clearOrderState,
  setSelections,
  getPriceBreakdown,
  type OrderSelection,
} from "@/lib/order-storage";
import {
  ArrowRight,
  ArrowLeft,
  ShoppingCart,
  Home,
  Sun,
  Bug,
  Radio,
  Smartphone,
  Trash2,
  Wrench,
  AlertTriangle,
} from "lucide-react";

interface WindowInfo {
  id: string;
  windowNumber: string;
  location: string;
  requiresManipulationFee: boolean;
}

const STEP = 2;
const TOTAL_STEPS = 3;

export default function ZusammenfassungPage() {
  const router = useRouter();
  const [selections, setLocalSelections] = useState<OrderSelection[]>([]);
  const [windows, setWindows] = useState<Record<string, WindowInfo>>({});
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function init() {
      const state = getOrderState();
      if (state.selections.length === 0) {
        router.replace("/bestellung");
        return;
      }
      setLocalSelections(state.selections);

      try {
        const res = await fetch("/api/apartments/current/windows");
        if (res.ok) {
          const data = await res.json();
          const winMap: Record<string, WindowInfo> = {};
          data.windows.forEach((w: WindowInfo) => {
            winMap[w.id] = w;
          });
          setWindows(winMap);
        }
      } catch {
        // ignore
      }
      setLoading(false);
    }
    init();
  }, [router]);

  const handleRemove = (windowId: string, productId: string) => {
    const newSelections = selections.filter(
      (s) => !(s.windowId === windowId && s.productId === productId)
    );
    setLocalSelections(newSelections);
    setSelections(newSelections);
    if (newSelections.length === 0) {
      clearOrderState();
      router.replace("/bestellung");
    }
  };

  const handleContinue = async () => {
    if (selections.length === 0) {
      setError("Bitte wählen Sie mindestens ein Produkt aus.");
      return;
    }

    setError("");
    setCreating(true);

    try {
      const items = selections.map((s) => ({
        windowId: s.windowId,
        productId: s.productId,
        quantity: 1,
      }));

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Bestellung konnte nicht erstellt werden");
      }

      const order = await res.json();
      clearOrderState();
      router.push(`/bestellung/bestaetigung?orderId=${order.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ein Fehler ist aufgetreten");
      setCreating(false);
    }
  };

  const breakdown = getPriceBreakdown();
  const vatAmount = breakdown.totalNet * 0.2;
  const totalGross = breakdown.totalNet * 1.2;

  if (loading) return <Loading fullScreen text="Zusammenfassung wird geladen..." />;

  return (
    <div className="space-y-6">
      {/* Progress */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-primary">
            Schritt {STEP} von {TOTAL_STEPS}
          </span>
          <span className="text-muted-foreground">Zusammenfassung</span>
        </div>
        <div className="h-3 w-full overflow-hidden rounded-full bg-secondary">
          <div
            className="h-full rounded-full bg-accent transition-all duration-300"
            style={{ width: `${(STEP / TOTAL_STEPS) * 100}%` }}
          />
        </div>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-primary sm:text-3xl">
          Zusammenfassung
        </h1>
        <p className="mt-1 text-base text-muted-foreground">
          Prüfen Sie Ihre Auswahl vor der Bestätigung.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-base text-destructive">
          {error}
        </div>
      )}

      <Card className="card-elevated">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-xl">
            <ShoppingCart className="size-6 text-accent" />
            Ausgewählte Produkte
          </CardTitle>
          <CardDescription>
            {selections.length} Produkt{selections.length !== 1 ? "e" : ""} in der Auswahl
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0 sm:p-4">
          <div className="divide-y divide-border">
            {selections.map((selection, index) => {
              const win = windows[selection.windowId];
              return (
                <div
                  key={`${selection.windowId}-${selection.productId}-${index}`}
                  className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-base font-medium">
                      {selection.productName.includes("Motor") && (
                        <Sun className="size-5 text-accent shrink-0" />
                      )}
                      {selection.productName.includes("Gurt") && (
                        <Sun className="size-5 text-accent shrink-0" />
                      )}
                      {selection.productName.includes("Insekt") && (
                        <Bug className="size-5 text-accent shrink-0" />
                      )}
                      {selection.productName.includes("Funk") && (
                        <Radio className="size-5 text-accent shrink-0" />
                      )}
                      {selection.productName.includes("Hand") && (
                        <Smartphone className="size-5 text-accent shrink-0" />
                      )}
                      <span className="truncate">{selection.productName}</span>
                    </div>
                    <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                      <Home className="size-4" />
                      Fenster {win?.windowNumber || selection.windowId.slice(0, 6)}
                      {win?.location && ` · ${win.location}`}
                    </div>
                    {/* Preisaufschlüsselung pro Zeile */}
                    <div className="mt-1 flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                      <span>Mat.: {selection.unitPrice.toFixed(2).replace(".", ",")} €</span>
                      {selection.installationFee > 0 && (
                        <span className="flex items-center gap-0.5">
                          <Wrench className="size-3" />
                          Mont.: {selection.installationFee.toFixed(2).replace(".", ",")} €
                        </span>
                      )}
                      {selection.manipulationFee > 0 && (
                        <span className="flex items-center gap-0.5 text-warning">
                          <AlertTriangle className="size-3" />
                          Manip.: {selection.manipulationFee.toFixed(2).replace(".", ",")} €
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-lg font-bold text-primary">
                      {selection.totalPrice.toFixed(2).replace(".", ",")} €
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:bg-destructive/10"
                      onClick={() =>
                        handleRemove(selection.windowId, selection.productId)
                      }
                      aria-label="Entfernen"
                    >
                      <Trash2 className="size-5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Preisaufschlüsselung */}
      <Card className="bg-secondary/30">
        <CardContent className="py-4">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Materialkosten</span>
              <span className="font-medium">
                {breakdown.materialTotal.toFixed(2).replace(".", ",")} €
              </span>
            </div>
            {breakdown.installationTotal > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground flex items-center gap-1">
                  <Wrench className="size-3" />
                  Montagekosten ({(breakdown.installationTotal / 120).toFixed(0)} × 120 €)
                </span>
                <span className="font-medium">
                  {breakdown.installationTotal.toFixed(2).replace(".", ",")} €
                </span>
              </div>
            )}
            {breakdown.manipulationTotal > 0 && (
              <div className="flex justify-between text-warning">
                <span className="flex items-center gap-1">
                  <AlertTriangle className="size-3" />
                  Manipulationsgebühr ({(breakdown.manipulationTotal / 150).toFixed(0)} × 150 €)
                </span>
                <span className="font-medium">
                  {breakdown.manipulationTotal.toFixed(2).replace(".", ",")} €
                </span>
              </div>
            )}
            <div className="border-t pt-2 flex justify-between text-base font-medium">
              <span>Summe netto</span>
              <span>{breakdown.totalNet.toFixed(2).replace(".", ",")} €</span>
            </div>
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>USt. (20%)</span>
              <span>{vatAmount.toFixed(2).replace(".", ",")} €</span>
            </div>
            <div className="border-t pt-2 flex justify-between text-xl font-bold text-primary">
              <span>Gesamtsumme brutto</span>
              <span>{totalGross.toFixed(2).replace(".", ",")} €</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Aktionen */}
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
        <Link href="/bestellung">
          <Button variant="outline" size="lg" className="btn-lg gap-2 w-full sm:w-auto">
            <ArrowLeft className="size-5" />
            Zurück
          </Button>
        </Link>
        <Button
          size="lg"
          className="btn-lg gap-2 bg-accent hover:bg-accent/90 w-full sm:w-auto"
          onClick={handleContinue}
          disabled={creating}
        >
          {creating ? "Wird erstellt..." : "Weiter zur Bestätigung"}
          <ArrowRight className="size-5" />
        </Button>
      </div>
    </div>
  );
}
