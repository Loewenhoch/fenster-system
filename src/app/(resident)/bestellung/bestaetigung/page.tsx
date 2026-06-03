"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Loading } from "@/components/ui/loading";
import {
  AlertCircle,
  FileCheck,
  ArrowLeft,
  CheckCircle,
  Wrench,
  AlertTriangle,
} from "lucide-react";

interface OrderData {
  id: string;
  status: string;
  totalNet: number;
  totalGross: number;
  materialTotal: number;
  installationTotal: number;
  manipulationTotal: number;
  items: Array<{
    id: string;
    product: { name: string };
    window: { windowNumber: string; location: string };
    unitPrice: number;
    installationFee: number;
    manipulationFee: number;
    totalPrice: number;
    quantity: number;
  }>;
}

const STEP = 3;
const TOTAL_STEPS = 3;

export default function BestellungBestaetigungPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId");

  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [privacy, setPrivacy] = useState(false);
  const [terms, setTerms] = useState(false);
  const [withdrawal, setWithdrawal] = useState(false);
  const [name, setName] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!orderId) {
      router.replace("/bestellung/zusammenfassung");
      return;
    }

    fetch("/api/orders")
      .then((r) => r.json())
      .then((orders) => {
        const o = orders.find((x: OrderData) => x.id === orderId);
        if (o) setOrder(o);
      })
      .finally(() => setLoading(false));
  }, [orderId, router]);

  const handleSubmit = async () => {
    if (!privacy || !terms || !withdrawal) {
      setError("Alle Checkboxen müssen akzeptiert werden.");
      return;
    }
    if (name.length < 2) {
      setError("Bitte geben Sie Ihren vollständigen Namen ein.");
      return;
    }

    setError("");
    setConfirming(true);

    try {
      const res = await fetch(`/api/orders/${orderId}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          confirmationName: name,
          privacyAccepted: privacy,
          termsAccepted: terms,
          withdrawalAccepted: withdrawal,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Bestätigung fehlgeschlagen");
      }

      router.push("/bestellung/erfolg?orderId=" + orderId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ein Fehler ist aufgetreten");
      setConfirming(false);
    }
  };

  if (loading) return <Loading fullScreen text="Bestellung wird geladen..." />;

  if (!order) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-base text-destructive">
          Bestellung nicht gefunden.
        </div>
        <Link href="/bestellung">
          <Button variant="outline" className="gap-2">
            <ArrowLeft className="size-4" />
            Zurück zur Auswahl
          </Button>
        </Link>
      </div>
    );
  }

  const vatAmount = order.totalGross - order.totalNet;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Progress */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-primary">
            Schritt {STEP} von {TOTAL_STEPS}
          </span>
          <span className="text-muted-foreground">Bestätigung</span>
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
          Verbindliche Bestätigung
        </h1>
        <p className="mt-1 text-base text-muted-foreground">
          Prüfen Sie Ihre Bestellung und bestätigen Sie diese verbindlich.
        </p>
      </div>

      {/* Bestellübersicht */}
      <Card className="card-elevated">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-xl">
            <FileCheck className="size-6 text-accent" />
            Bestellübersicht
          </CardTitle>
          <CardDescription>
            {order.items.length} Position{order.items.length !== 1 ? "en" : ""}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="divide-y divide-border">
            {order.items.map((item) => (
              <div
                key={item.id}
                className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium text-base">{item.product.name}</p>
                  <p className="text-sm text-muted-foreground">
                    Fenster {item.window.windowNumber} · {item.window.location}
                  </p>
                  <div className="flex flex-wrap gap-x-2 text-xs text-muted-foreground mt-0.5">
                    <span>
                      Mat.:{" "}
                      {item.quantity > 1
                        ? `${item.quantity} × ${item.unitPrice
                            .toFixed(2)
                            .replace(".", ",")} €`
                        : `${item.unitPrice.toFixed(2).replace(".", ",")} €`}
                    </span>
                    {item.installationFee + item.manipulationFee > 0 && (
                      <span className="flex items-center gap-0.5">
                        <Wrench className="size-3" />
                        Montagegebühr:{" "}
                        {(item.installationFee + item.manipulationFee)
                          .toFixed(2)
                          .replace(".", ",")} €
                      </span>
                    )}
                  </div>
                </div>
                <span className="text-lg font-bold text-primary">
                  {item.totalPrice.toFixed(2).replace(".", ",")} €
                </span>
              </div>
            ))}
          </div>

          <div className="border-t pt-3 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Materialkosten</span>
              <span className="font-medium">
                {order.materialTotal.toFixed(2).replace(".", ",")} €
              </span>
            </div>
            {order.installationTotal + order.manipulationTotal > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Montagegebühren</span>
                <span className="font-medium">
                  {(order.installationTotal + order.manipulationTotal)
                    .toFixed(2)
                    .replace(".", ",")} €
                </span>
              </div>
            )}
            {order.manipulationTotal > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <span className="flex items-center gap-1">
                  <AlertTriangle className="size-3" />
                  davon Manipulation bei Bestand
                </span>
                <span className="font-medium">
                  {order.manipulationTotal.toFixed(2).replace(".", ",")} €
                </span>
              </div>
            )}
            <div className="border-t pt-2 flex justify-between text-base font-medium">
              <span>Summe netto</span>
              <span>{order.totalNet.toFixed(2).replace(".", ",")} €</span>
            </div>
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>USt. (20%)</span>
              <span>{vatAmount.toFixed(2).replace(".", ",")} €</span>
            </div>
            <div className="border-t pt-2 flex justify-between text-xl font-bold text-primary">
              <span>Gesamtsumme brutto</span>
              <span>{order.totalGross.toFixed(2).replace(".", ",")} €</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bestätigungsformular */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-accent" />
            Bestellung verbindlich abschließen
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-lg text-sm">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <Checkbox
                id="privacy"
                checked={privacy}
                onCheckedChange={(c) => setPrivacy(c as boolean)}
              />
              <Label htmlFor="privacy" className="text-sm leading-relaxed cursor-pointer">
                Ich habe die{" "}
                <a href="/datenschutz" target="_blank" className="text-accent underline">
                  Datenschutzerklärung
                </a>{" "}
                gelesen und akzeptiere sie.
              </Label>
            </div>

            <div className="flex items-start gap-3">
              <Checkbox
                id="terms"
                checked={terms}
                onCheckedChange={(c) => setTerms(c as boolean)}
              />
              <Label htmlFor="terms" className="text-sm leading-relaxed cursor-pointer">
                Ich habe die{" "}
                <a href="/agb" target="_blank" className="text-accent underline">
                  AGB
                </a>{" "}
                gelesen und akzeptiere sie.
              </Label>
            </div>

            <div className="flex items-start gap-3">
              <Checkbox
                id="withdrawal"
                checked={withdrawal}
                onCheckedChange={(c) => setWithdrawal(c as boolean)}
              />
              <Label
                htmlFor="withdrawal"
                className="text-sm leading-relaxed cursor-pointer"
              >
                Ich habe die{" "}
                <a href="/widerruf" target="_blank" className="text-accent underline">
                  Widerrufsbelehrung
                </a>{" "}
                zur Kenntnis genommen.
              </Label>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Vollständiger Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Max Mustermann"
              className="h-12"
            />
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link href="/bestellung/zusammenfassung" className="w-full sm:w-auto">
              <Button variant="outline" className="w-full h-14 text-lg gap-2 sm:w-auto">
                <ArrowLeft className="size-5" />
                Zurück
              </Button>
            </Link>
            <Button
              onClick={handleSubmit}
              disabled={confirming}
              className="w-full h-14 text-lg bg-accent hover:bg-accent/90"
            >
              {confirming
                ? "Wird verarbeitet..."
                : "Bestellung verbindlich abschicken"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
