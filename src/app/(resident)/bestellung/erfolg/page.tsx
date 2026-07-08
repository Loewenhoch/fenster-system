"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, FileText, Home } from "lucide-react";

interface OrderSummary {
  id: string;
  createdAt: string;
  totalNet: number;
  items: unknown[];
}

export default function BestellungErfolgPage() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId");
  const [order, setOrder] = useState<OrderSummary | null>(null);

  useEffect(() => {
    if (orderId) {
      fetch("/api/orders")
        .then((r) => r.json())
        .then((orders: OrderSummary[]) => {
          const o = orders.find((x) => x.id === orderId);
          setOrder(o ?? null);
        });
    }
  }, [orderId]);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center space-y-3">
        <CheckCircle className="mx-auto h-16 w-16 text-success" />
        <h1 className="text-3xl font-bold text-primary">Bestellung erfolgreich!</h1>
        <p className="text-lg text-muted-foreground">
          Vielen Dank für Ihre verbindliche Bestellung.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Bestelldetails</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Bestellnummer:</span>
            <span className="font-medium">{orderId}</span>
          </div>
          {order && (
            <>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Datum:</span>
                <span className="font-medium">
                  {new Date(order.createdAt).toLocaleDateString("de-DE")}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Gesamtsumme (netto):</span>
                <span className="font-medium text-primary">
                  {order.totalNet.toFixed(2)} €
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Positionen:</span>
                <span className="font-medium">{order.items.length}</span>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link href="/dashboard">
          <Button variant="outline" className="w-full h-14 text-lg gap-2">
            <Home className="h-5 w-5" />
            Zum Dashboard
          </Button>
        </Link>
        <Link href="/bestellung">
          <Button className="h-14 w-full gap-2 text-lg">
            <FileText className="h-5 w-5" />
            Bestellung ansehen
          </Button>
        </Link>
      </div>
    </div>
  );
}
