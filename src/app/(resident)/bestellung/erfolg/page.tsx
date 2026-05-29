"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, FileText, Home } from "lucide-react";

export default function BestellungErfolgPage() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId");
  const [order, setOrder] = useState<any>(null);

  useEffect(() => {
    if (orderId) {
      fetch("/api/orders")
        .then((r) => r.json())
        .then((orders) => {
          const o = orders.find((x: any) => x.id === orderId);
          setOrder(o);
        });
    }
  }, [orderId]);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center space-y-3">
        <CheckCircle className="h-16 w-16 text-green-600 mx-auto" />
        <h1 className="text-3xl font-bold text-[#1e3a5f]">Bestellung erfolgreich!</h1>
        <p className="text-gray-600 text-lg">
          Vielen Dank für Ihre verbindliche Bestellung.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Bestelldetails</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between">
            <span className="text-gray-600">Bestellnummer:</span>
            <span className="font-medium">{orderId}</span>
          </div>
          {order && (
            <>
              <div className="flex justify-between">
                <span className="text-gray-600">Datum:</span>
                <span className="font-medium">
                  {new Date(order.createdAt).toLocaleDateString("de-DE")}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Gesamtsumme (netto):</span>
                <span className="font-medium text-[#1e3a5f]">
                  {order.totalNet.toFixed(2)} €
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Positionen:</span>
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
          <Button className="w-full h-14 text-lg gap-2 bg-[#1e3a5f] hover:bg-[#152d4a]">
            <FileText className="h-5 w-5" />
            Bestellung ansehen
          </Button>
        </Link>
      </div>
    </div>
  );
}
