"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loading } from "@/components/ui/loading";
import { ErrorState } from "@/components/ui/error";
import {
  getOrderState,
  addSelection,
  removeSelection,
  getPriceBreakdown,
  type OrderSelection,
} from "@/lib/order-storage";
import {
  ShoppingCart,
  ArrowRight,
  ArrowLeft,
  Sun,
  Bug,
  Radio,
  Smartphone,
  Home,
  Wrench,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface MainProduct {
  id: string;
  name: string;
  description: string | null;
  category: string;
  type: "CORD" | "MOTOR" | "INSECT";
  unitPrice: number;
  installationFee: number;
  manipulationFee: number;
  totalPrice: number;
}

interface Accessory {
  id: string;
  name: string;
  description: string | null;
  category: string;
  unitPrice: number;
}

interface WindowWithProducts {
  id: string;
  windowNumber: string;
  location: string;
  widthMm: number;
  heightMm: number;
  measureText: string;
  hasExistingSunscreen: boolean;
  requiresManipulationFee: boolean;
  isMotorPossible: boolean;
  isCordPossible: boolean;
  mainProducts: MainProduct[];
  accessories: Accessory[];
}

const STEP = 1;
const TOTAL_STEPS = 3;

export default function BestellungPage() {
  const router = useRouter();
  const [windows, setWindows] = useState<WindowWithProducts[]>([]);
  const [selections, setSelections] = useState<OrderSelection[]>([]);
  const [expandedWindows, setExpandedWindows] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("/api/apartments/current/windows");
        if (!res.ok) throw new Error("Fenster konnten nicht geladen werden");
        const data = await res.json();
        setWindows(data.windows);
        const saved = getOrderState();
        setSelections(saved.selections);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Unbekannter Fehler");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // Prüfe ob für ein Fenster ein Motor-Produkt ausgewählt wurde
  const isMotorSelected = useCallback(
    (windowId: string) => {
      const win = windows.find((w) => w.id === windowId);
      if (!win) return false;
      return selections.some((s) => {
        if (s.windowId !== windowId) return false;
        const mp = win.mainProducts.find((p) => p.id === s.productId);
        return mp?.type === "MOTOR";
      });
    },
    [selections, windows]
  );

  const isSelected = useCallback(
    (windowId: string, productId: string) => {
      return selections.some(
        (s) => s.windowId === windowId && s.productId === productId
      );
    },
    [selections]
  );

  const handleToggleMain = useCallback(
    (windowId: string, product: MainProduct) => {
      if (isSelected(windowId, product.id)) {
        removeSelection(windowId, product.id);
        // Wenn Motor abgewählt wird, auch alle Zubehör für dieses Fenster entfernen
        if (product.type === "MOTOR") {
          const win = windows.find((w) => w.id === windowId);
          if (win) {
            win.accessories.forEach((acc) => {
              removeSelection(windowId, acc.id);
            });
          }
        }
      } else {
        // Wenn Motor gewählt wird, vorher Gurt entfernen (Mutual exclusive)
        if (product.type === "MOTOR") {
          const win = windows.find((w) => w.id === windowId);
          if (win) {
            const cordProduct = win.mainProducts.find((p) => p.type === "CORD");
            if (cordProduct && isSelected(windowId, cordProduct.id)) {
              removeSelection(windowId, cordProduct.id);
            }
          }
        }
        // Wenn Gurt gewählt wird, vorher Motor entfernen (Mutual exclusive)
        if (product.type === "CORD") {
          const win = windows.find((w) => w.id === windowId);
          if (win) {
            const motorProduct = win.mainProducts.find((p) => p.type === "MOTOR");
            if (motorProduct && isSelected(windowId, motorProduct.id)) {
              removeSelection(windowId, motorProduct.id);
              win.accessories.forEach((acc) => {
                removeSelection(windowId, acc.id);
              });
            }
          }
        }
        addSelection({
          windowId,
          productId: product.id,
          productName: product.name,
          unitPrice: product.unitPrice,
          installationFee: product.installationFee,
          manipulationFee: product.manipulationFee,
          totalPrice: product.totalPrice,
        });
      }
      setSelections(getOrderState().selections);
    },
    [isSelected, windows]
  );

  const handleToggleAccessory = useCallback(
    (windowId: string, accessory: Accessory) => {
      if (isSelected(windowId, accessory.id)) {
        removeSelection(windowId, accessory.id);
      } else {
        addSelection({
          windowId,
          productId: accessory.id,
          productName: accessory.name,
          unitPrice: accessory.unitPrice,
          installationFee: 0,
          manipulationFee: 0,
          totalPrice: accessory.unitPrice,
        });
      }
      setSelections(getOrderState().selections);
    },
    [isSelected]
  );

  const toggleExpand = (windowId: string) => {
    setExpandedWindows((prev) => {
      const next = new Set(prev);
      if (next.has(windowId)) {
        next.delete(windowId);
      } else {
        next.add(windowId);
      }
      return next;
    });
  };

  const handleContinue = () => {
    if (selections.length === 0) {
      setError("Bitte wählen Sie mindestens ein Produkt aus.");
      return;
    }
    const hasMainProduct = selections.some((s) => {
      const win = windows.find((w) => w.id === s.windowId);
      if (!win) return false;
      return win.mainProducts.some((p) => p.id === s.productId);
    });
    if (!hasMainProduct) {
      setError("Bitte wählen Sie mindestens einen Sonnenschutz oder Insektenschutz aus.");
      return;
    }
    router.push("/bestellung/zusammenfassung");
  };

  if (loading) return <Loading fullScreen text="Fenster werden geladen..." />;
  if (error && !windows.length)
    return <ErrorState message={error} onRetry={() => window.location.reload()} />;

  const breakdown = getPriceBreakdown();

  return (
    <div className="space-y-6">
      {/* Progress */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-primary">
            Schritt {STEP} von {TOTAL_STEPS}
          </span>
          <span className="text-muted-foreground">Produktauswahl</span>
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
          Produkte auswählen
        </h1>
        <p className="mt-1 text-base text-muted-foreground">
          Wählen Sie für jedes Fenster die gewünschten Sonnenschutz-Produkte aus.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-base text-destructive">
          {error}
        </div>
      )}

      <div className="space-y-4">
        {windows.map((win) => {
          const motorSelected = isMotorSelected(win.id);
          const hasAnySelection = selections.some((s) => s.windowId === win.id);
          const isExpanded = expandedWindows.has(win.id) || hasAnySelection;

          return (
            <Card key={win.id} className="card-elevated">
              <CardHeader className="pb-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Home className="size-5 text-accent" />
                      Fenster {win.windowNumber}
                    </CardTitle>
                    <CardDescription>
                      {win.location} · {win.widthMm} x {win.heightMm} mm ·{" "}
                      {win.measureText}
                    </CardDescription>
                  </div>
                  <div className="flex flex-wrap gap-1 items-center">
                    {win.requiresManipulationFee && (
                      <Badge
                        variant="secondary"
                        className="bg-warning/10 text-warning text-sm"
                      >
                        <AlertTriangle className="mr-1 size-3" />
                        Bestand SS (+150 €)
                      </Badge>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleExpand(win.id)}
                      className="gap-1"
                    >
                      {isExpanded ? (
                        <>
                          <ChevronUp className="size-4" /> Einklappen
                        </>
                      ) : (
                        <>
                          <ChevronDown className="size-4" /> Auswählen
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardHeader>

              {isExpanded && (
                <CardContent>
                  <div className="space-y-4">
                    {/* === HAUPTPRODUKTE === */}
                    <div>
                      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                        Sonnenschutz / Insektenschutz
                      </h3>
                      {win.mainProducts.length === 0 ? (
                        <p className="text-base text-muted-foreground py-2">
                          Für dieses Fenster sind aktuell keine Sonnenschutz-Produkte verfügbar.
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {win.mainProducts.map((product) => {
                            const checked = isSelected(win.id, product.id);

                            return (
                              <div
                                key={product.id}
                                className={`flex items-start gap-3 rounded-lg border p-4 transition-colors cursor-pointer ${
                                  checked
                                    ? "border-accent bg-accent/5"
                                    : "border-border bg-card hover:bg-muted/50"
                                }`}
                                onClick={() => handleToggleMain(win.id, product)}
                              >
                                <Checkbox
                                  id={`${win.id}-${product.id}`}
                                  checked={checked}
                                  className="mt-1 size-5 pointer-events-none"
                                />
                                <div className="flex-1 min-w-0 pointer-events-none">
                                  <Label
                                    htmlFor={`${win.id}-${product.id}`}
                                    className="flex flex-wrap items-center gap-2 text-base font-medium cursor-pointer"
                                  >
                                    {product.type === "MOTOR" && (
                                      <Sun className="size-5 text-accent shrink-0" />
                                    )}
                                    {product.type === "CORD" && (
                                      <Sun className="size-5 text-accent shrink-0" />
                                    )}
                                    {product.type === "INSECT" && (
                                      <Bug className="size-5 text-accent shrink-0" />
                                    )}
                                    <span className="truncate">{product.name}</span>
                                    <span className="ml-auto text-lg font-bold text-primary whitespace-nowrap">
                                      {product.totalPrice.toFixed(2).replace(".", ",")} €
                                    </span>
                                  </Label>
                                  {product.description && (
                                    <p className="mt-1 text-sm text-muted-foreground">
                                      {product.description}
                                    </p>
                                  )}
                                  {/* Preisaufschlüsselung */}
                                  <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted-foreground">
                                    <span>
                                      Material:{" "}
                                      {product.unitPrice.toFixed(2).replace(".", ",")} €
                                    </span>
                                    {product.installationFee > 0 && (
                                      <span className="flex items-center gap-1">
                                        <Wrench className="size-3" />
                                        Montage:{" "}
                                        {product.installationFee
                                          .toFixed(2)
                                          .replace(".", ",")} €
                                      </span>
                                    )}
                                    {product.manipulationFee > 0 && (
                                      <span className="flex items-center gap-1 text-warning">
                                        <AlertTriangle className="size-3" />
                                        Manipulation:{" "}
                                        {product.manipulationFee
                                          .toFixed(2)
                                          .replace(".", ",")} €
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* === ZUBEHÖR (nur wenn Motor ausgewählt) === */}
                    {motorSelected && win.accessories.length > 0 && (
                      <div className="border-t pt-4">
                        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-2">
                          <Radio className="size-4" />
                          Zubehör für Motorsteuerung
                        </h3>
                        <div className="space-y-2">
                          {win.accessories.map((accessory) => {
                            const checked = isSelected(win.id, accessory.id);
                            const unitPrice = accessory.unitPrice;

                            return (
                              <div
                                key={accessory.id}
                                className={`flex items-start gap-3 rounded-lg border p-3 transition-colors cursor-pointer ${
                                  checked
                                    ? "border-accent bg-accent/5"
                                    : "border-border bg-card hover:bg-muted/50"
                                }`}
                                onClick={() =>
                                  handleToggleAccessory(win.id, accessory)
                                }
                              >
                                <Checkbox
                                  id={`${win.id}-${accessory.id}`}
                                  checked={checked}
                                  className="mt-0.5 size-5 pointer-events-none"
                                />
                                <div className="flex-1 min-w-0 pointer-events-none">
                                  <Label
                                    htmlFor={`${win.id}-${accessory.id}`}
                                    className="flex flex-wrap items-center gap-2 text-base font-medium cursor-pointer"
                                  >
                                    {accessory.category === "RECEIVER" && (
                                      <Radio className="size-4 text-accent shrink-0" />
                                    )}
                                    {(accessory.category === "SENDER_1CH" ||
                                      accessory.category === "SENDER_15CH") && (
                                      <Smartphone className="size-4 text-accent shrink-0" />
                                    )}
                                    <span>{accessory.name}</span>
                                    <span className="ml-auto font-bold text-primary whitespace-nowrap">
                                      {unitPrice > 0
                                        ? `${unitPrice.toFixed(2).replace(".", ",")} €`
                                        : "Preis auf Anfrage"}
                                    </span>
                                  </Label>
                                  {accessory.description && (
                                    <p className="mt-0.5 text-sm text-muted-foreground">
                                      {accessory.description}
                                    </p>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Hinweis wenn Motor möglich aber nicht ausgewählt */}
                    {win.isMotorPossible &&
                      !motorSelected &&
                      win.mainProducts.some((p) => p.type === "MOTOR") && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <Radio className="size-3" />
                          Wählen Sie "Sonnenschutz mit Motor" aus, um Zubehör
                          (Funkempfänger, Handsender) hinzuzufügen.
                        </p>
                      )}
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      {/* Subtotal & Actions */}
      <Card className="sticky bottom-20 z-20 border-2 border-accent shadow-lg lg:static lg:border lg:shadow-sm">
        <CardContent className="flex flex-col gap-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-base text-muted-foreground">
              {selections.length} Produkt{selections.length !== 1 ? "e" : ""} ausgewählt
            </p>
            <p className="text-2xl font-bold text-primary">
              {breakdown.totalNet.toFixed(2).replace(".", ",")} €{" "}
              <span className="text-base font-normal text-muted-foreground">
                netto
              </span>
            </p>
            {selections.length > 0 && (
              <div className="mt-1 text-sm text-muted-foreground space-y-0.5">
                <div>
                  Material:{" "}
                  {breakdown.materialTotal.toFixed(2).replace(".", ",")} €
                </div>
                {breakdown.installationTotal > 0 && (
                  <div>
                    Montage:{" "}
                    {breakdown.installationTotal.toFixed(2).replace(".", ",")} €
                  </div>
                )}
                {breakdown.manipulationTotal > 0 && (
                  <div className="text-warning">
                    Manipulation:{" "}
                    {breakdown.manipulationTotal.toFixed(2).replace(".", ",")} €
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="flex gap-3">
            <Link href="/dashboard">
              <Button variant="outline" size="lg" className="btn-lg gap-2">
                <ArrowLeft className="size-5" />
                Zurück
              </Button>
            </Link>
            <Button
              size="lg"
              className="btn-lg gap-2 bg-accent hover:bg-accent/90"
              onClick={handleContinue}
            >
              Weiter zur Zusammenfassung
              <ArrowRight className="size-5" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
