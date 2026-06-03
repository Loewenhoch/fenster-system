"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Search, ShoppingCart, Eye, Wrench, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface OrderItem {
  id: string;
  product: { name: string; category: string };
  window: {
    windowNumber: string;
    location: string;
    widthMm: number;
    heightMm: number;
  };
  unitPrice: number;
  installationFee: number;
  manipulationFee: number;
  totalPrice: number;
  priceBreakdown: {
    unitPrice: number;
    installationFee: number;
    manipulationFee: number;
    lineTotal: number;
  };
}

interface Order {
  id: string;
  status: string;
  totalNet: number;
  totalGross: number;
  materialTotal: number;
  installationTotal: number;
  manipulationTotal: number;
  createdAt: string;
  confirmedAt: string | null;
  confirmationName: string | null;
  confirmationIp: string | null;
  resident: {
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    phone: string | null;
  } | null;
  apartment: {
    topNumber: string;
    building: { houseNumber: string };
  };
  items: OrderItem[];
  priceSummary: {
    materialTotal: number;
    installationTotal: number;
    manipulationTotal: number;
    totalNet: number;
    totalGross: number;
    vatAmount: number;
  };
}

export default function AdminBestellungenPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/orders")
      .then((r) => r.json())
      .then((data) => {
        setOrders(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filtered = orders.filter((o) =>
    (o.resident?.firstName || "").toLowerCase().includes(search.toLowerCase()) ||
    (o.resident?.lastName || "").toLowerCase().includes(search.toLowerCase()) ||
    o.apartment.topNumber.toLowerCase().includes(search.toLowerCase()) ||
    o.status.toLowerCase().includes(search.toLowerCase())
  );

  const formatPrice = (n: number) => n.toFixed(2).replace(".", ",") + " €";

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-primary">Bestellungen</h1>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Alle Bestellungen
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex items-center gap-2">
            <Search className="h-4 w-4 text-gray-400" />
            <Input
              placeholder="Suchen nach Name, Top, Status..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-md"
            />
          </div>

          {loading ? (
            <p className="text-gray-500">Laden...</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Bestellung</TableHead>
                    <TableHead>Eigentümer</TableHead>
                    <TableHead>Wohnung</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Datum</TableHead>
                    <TableHead className="text-right">Summe (netto)</TableHead>
                    <TableHead className="text-right">Aktion</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((o) => (
                    <TableRow key={o.id}>
                      <TableCell className="font-medium">
                        {o.id.slice(0, 8)}...
                      </TableCell>
                      <TableCell>
                        {o.resident?.firstName} {o.resident?.lastName}
                        {o.resident?.email && (
                          <div className="text-xs text-muted-foreground">
                            {o.resident.email}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {o.apartment.building.houseNumber} – {o.apartment.topNumber}
                      </TableCell>
                      <TableCell>
                        {o.status === "CONFIRMED" ? (
                          <Badge className="bg-green-100 text-green-800">Bestätigt</Badge>
                        ) : o.status === "DRAFT" ? (
                          <Badge className="bg-yellow-100 text-yellow-800">Entwurf</Badge>
                        ) : (
                          <Badge variant="outline">{o.status}</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {new Date(o.createdAt).toLocaleDateString("de-DE")}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatPrice(o.totalNet)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Dialog>
                          <DialogTrigger>
                            <Button variant="ghost" size="icon">
                              <Eye className="size-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle>
                                Bestelldetails #{o.id.slice(0, 8)}
                              </DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 mt-4">
                              <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                  <span className="text-muted-foreground">Eigentümer:</span>
                                  <p className="font-medium">
                                    {o.resident?.firstName} {o.resident?.lastName}
                                  </p>
                                  <p className="text-muted-foreground">{o.resident?.email}</p>
                                  <p className="text-muted-foreground">{o.resident?.phone}</p>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Wohnung:</span>
                                  <p className="font-medium">
                                    {o.apartment.building.houseNumber} – Top {o.apartment.topNumber}
                                  </p>
                                  <p className="text-muted-foreground">
                                    Status: {o.status === "CONFIRMED" ? "Bestätigt" : "Entwurf"}
                                  </p>
                                  {o.confirmedAt && (
                                    <p className="text-muted-foreground">
                                      Bestätigt am:{" "}
                                      {new Date(o.confirmedAt).toLocaleDateString("de-DE")}
                                    </p>
                                  )}
                                  {o.confirmationName && (
                                    <p className="text-muted-foreground">
                                      Von: {o.confirmationName}
                                    </p>
                                  )}
                                  {o.confirmationIp && (
                                    <p className="text-muted-foreground">
                                      IP: {o.confirmationIp}
                                    </p>
                                  )}
                                </div>
                              </div>

                              <div className="border rounded-lg overflow-hidden">
                                <table className="w-full text-sm">
                                  <thead className="bg-muted">
                                    <tr>
                                      <th className="px-3 py-2 text-left">Produkt</th>
                                      <th className="px-3 py-2 text-left">Fenster</th>
                                      <th className="px-3 py-2 text-right">Material</th>
                                      <th className="px-3 py-2 text-right">Mont.</th>
                                      <th className="px-3 py-2 text-right">Manip.</th>
                                      <th className="px-3 py-2 text-right">Gesamt</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y">
                                    {o.items.map((item) => (
                                      <tr key={item.id}>
                                        <td className="px-3 py-2">
                                          <p className="font-medium">{item.product.name}</p>
                                          <p className="text-xs text-muted-foreground">
                                            {item.product.category}
                                          </p>
                                        </td>
                                        <td className="px-3 py-2 text-muted-foreground">
                                          {item.window.windowNumber}
                                          <br />
                                          <span className="text-xs">
                                            {item.window.location} · {item.window.widthMm}x
                                            {item.window.heightMm} mm
                                          </span>
                                        </td>
                                        <td className="px-3 py-2 text-right">
                                          {formatPrice(item.unitPrice)}
                                        </td>
                                        <td className="px-3 py-2 text-right">
                                          {item.installationFee > 0 ? (
                                            <span className="flex items-center justify-end gap-1">
                                              <Wrench className="size-3 text-muted-foreground" />
                                              {formatPrice(item.installationFee)}
                                            </span>
                                          ) : (
                                            "–"
                                          )}
                                        </td>
                                        <td className="px-3 py-2 text-right">
                                          {item.manipulationFee > 0 ? (
                                            <span className="flex items-center justify-end gap-1 text-warning">
                                              <AlertTriangle className="size-3" />
                                              {formatPrice(item.manipulationFee)}
                                            </span>
                                          ) : (
                                            "–"
                                          )}
                                        </td>
                                        <td className="px-3 py-2 text-right font-medium">
                                          {formatPrice(item.totalPrice)}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>

                              <div className="border rounded-lg p-4 space-y-2 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Materialkosten</span>
                                  <span>{formatPrice(o.materialTotal)}</span>
                                </div>
                                {o.installationTotal > 0 && (
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Montagekosten</span>
                                    <span>{formatPrice(o.installationTotal)}</span>
                                  </div>
                                )}
                                {o.manipulationTotal > 0 && (
                                  <div className="flex justify-between text-warning">
                                    <span className="flex items-center gap-1">
                                      <AlertTriangle className="size-3" />
                                      Manipulationsgebühr
                                    </span>
                                    <span>{formatPrice(o.manipulationTotal)}</span>
                                  </div>
                                )}
                                <div className="border-t pt-2 flex justify-between font-medium">
                                  <span>Summe netto</span>
                                  <span>{formatPrice(o.totalNet)}</span>
                                </div>
                                <div className="flex justify-between text-muted-foreground">
                                  <span>USt. (20%)</span>
                                  <span>{formatPrice(o.priceSummary?.vatAmount || o.totalGross - o.totalNet)}</span>
                                </div>
                                <div className="border-t pt-2 flex justify-between text-lg font-bold text-primary">
                                  <span>Gesamtsumme brutto</span>
                                  <span>{formatPrice(o.totalGross)}</span>
                                </div>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
