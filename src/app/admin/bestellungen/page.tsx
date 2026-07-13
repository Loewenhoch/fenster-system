"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  BarChart3,
  CheckCircle2,
  Eye,
  Package,
  Printer,
  Save,
  Search,
  ShoppingCart,
  Trash2,
  Wrench,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { VAT_RATE } from "@/lib/pricing";

interface OrderItem {
  id: string;
  product: { name: string; category: string };
  window: {
    windowNumber: string;
    location: string;
    widthMm: number;
    heightMm: number;
    rekordTypeNew: string | null;
  } | null;
  windowTypeLabel: string | null;
  unitPrice: number;
  installationFee: number;
  manipulationFee: number;
  totalPrice: number;
  quantity: number;
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
  typeSummary: {
    windowTypeLabel: string;
    productName: string;
    category: string;
    quantity: number;
  }[];
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
  const [printMode, setPrintMode] = useState<"all" | "confirmed" | null>(null);
  const [statusDrafts, setStatusDrafts] = useState<Record<string, string>>({});
  const [nameDrafts, setNameDrafts] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadOrders = useCallback(() => {
    setLoading(true);
    fetch("/api/admin/orders")
      .then((r) => {
        if (!r.ok) throw new Error("Zugriff verweigert");
        return r.json();
      })
      .then((data) => {
        const nextOrders = Array.isArray(data) ? data : [];
        setOrders(nextOrders);
        setStatusDrafts(
          Object.fromEntries(nextOrders.map((order) => [order.id, order.status]))
        );
        setNameDrafts(
          Object.fromEntries(
            nextOrders.map((order) => [
              order.id,
              order.confirmationName ?? "",
            ])
          )
        );
        setLoading(false);
      })
      .catch(() => {
        setOrders([]);
        setStatusDrafts({});
        setNameDrafts({});
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(loadOrders, 0);
    return () => window.clearTimeout(timer);
  }, [loadOrders]);

  useEffect(() => {
    const resetPrintMode = () => setPrintMode(null);
    window.addEventListener("afterprint", resetPrintMode);
    return () => window.removeEventListener("afterprint", resetPrintMode);
  }, []);

  const filtered = useMemo(() => {
    const normalizedSearch = search.toLowerCase();
    return orders.filter((o) =>
      (o.resident?.firstName || "").toLowerCase().includes(normalizedSearch) ||
      (o.resident?.lastName || "").toLowerCase().includes(normalizedSearch) ||
      o.apartment.topNumber.toLowerCase().includes(normalizedSearch) ||
      o.status.toLowerCase().includes(normalizedSearch)
    );
  }, [orders, search]);

  const formatPrice = (n: number | null | undefined) =>
    ((n ?? 0).toFixed(2).replace(".", ",") + " €");

  const formatDate = (date: string | null | undefined) =>
    date ? new Date(date).toLocaleDateString("de-DE") : "–";

  const residentName = (order: Order) =>
    [order.resident?.firstName, order.resident?.lastName]
      .filter(Boolean)
      .join(" ") || "Unbekannt";

  const statusLabel = (status: string) => {
    if (status === "CONFIRMED") return "Bestätigt";
    if (status === "DRAFT") return "Entwurf";
    if (status === "CANCELLED") return "Storniert";
    return status;
  };

  const renderStatusBadge = (status: string) => {
    if (status === "CONFIRMED") {
      return <Badge className="bg-green-100 text-green-800">Bestätigt</Badge>;
    }
    if (status === "DRAFT") {
      return <Badge className="bg-yellow-100 text-yellow-800">Entwurf</Badge>;
    }
    if (status === "CANCELLED") {
      return <Badge variant="destructive">Storniert</Badge>;
    }
    return <Badge variant="outline">{status}</Badge>;
  };

  const productTypeSummary = useMemo(() => {
    const summary = new Map<
      string,
      {
        windowTypeLabel: string;
        productName: string;
        category: string;
        quantity: number;
      }
    >();

    for (const order of filtered.filter((item) => item.status === "CONFIRMED")) {
      for (const item of order.typeSummary) {
        const key = `${item.windowTypeLabel}|${item.category}|${item.productName}`;
        const current =
          summary.get(key) ?? {
            windowTypeLabel: item.windowTypeLabel,
            productName: item.productName,
            category: item.category,
            quantity: 0,
          };
        current.quantity += item.quantity;
        summary.set(key, current);
      }
    }

    return Array.from(summary.values()).sort((a, b) => {
      const typeCompare = a.windowTypeLabel.localeCompare(
        b.windowTypeLabel,
        "de",
        { numeric: true }
      );
      return typeCompare || a.productName.localeCompare(b.productName, "de");
    });
  }, [filtered]);

  const confirmedCount = filtered.filter((order) => order.status === "CONFIRMED").length;
  const allConfirmedCount = orders.filter(
    (order) => order.status === "CONFIRMED"
  ).length;
  const filteredGrossTotal = filtered
    .filter((order) => order.status === "CONFIRMED")
    .reduce(
    (sum, order) => sum + order.totalGross,
    0
  );

  const printOrders = useMemo(() => {
    if (!printMode) return [];
    if (printMode === "confirmed") {
      return orders.filter((order) => order.status === "CONFIRMED");
    }
    return orders;
  }, [orders, printMode]);

  const printGrossTotal = printOrders.reduce(
    (sum, order) => sum + order.totalGross,
    0
  );

  const printOrdersList = (mode: "all" | "confirmed") => {
    setPrintMode(mode);
    window.setTimeout(() => {
      window.print();
    }, 0);
  };

  const updateOrder = async (orderId: string) => {
    setSavingId(orderId);
    try {
      const response = await fetch(`/api/admin/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: statusDrafts[orderId],
          confirmationName: nameDrafts[orderId] ?? "",
        }),
      });

      if (!response.ok) throw new Error("Speichern fehlgeschlagen");
      loadOrders();
    } finally {
      setSavingId(null);
    }
  };

  const deleteOrder = async (order: Order) => {
    const label = `${order.resident?.lastName ?? "Unbekannt"} / Top ${
      order.apartment.topNumber
    } / ${order.id.slice(0, 8)}`;
    if (!window.confirm(`Bestellung wirklich löschen?\n\n${label}`)) return;

    setDeletingId(order.id);
    try {
      const response = await fetch(`/api/admin/orders/${order.id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Löschen fehlgeschlagen");
      loadOrders();
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-primary">Bestellungen</h1>

      <div className="grid gap-3 md:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <ShoppingCart className="size-8 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">Bestellungen</p>
              <p className="text-2xl font-bold">{filtered.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <CheckCircle2 className="size-8 text-green-700" />
            <div>
              <p className="text-sm text-muted-foreground">Bestätigt</p>
              <p className="text-2xl font-bold">{confirmedCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Package className="size-8 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">Summe brutto</p>
              <p className="text-2xl font-bold">{formatPrice(filteredGrossTotal)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Materialübersicht nach Fenstertyp
          </CardTitle>
        </CardHeader>
        <CardContent>
          {productTypeSummary.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Für die aktuelle Auswahl gibt es noch keine bestellbaren Positionen.
            </p>
          ) : (
            <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
              {productTypeSummary.map((item) => (
                <div
                  key={`${item.windowTypeLabel}-${item.category}-${item.productName}`}
                  className="flex items-center justify-between gap-3 rounded-lg border bg-background px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="font-medium">{item.windowTypeLabel}</p>
                    <p className="truncate text-sm text-muted-foreground">
                      {item.productName}
                    </p>
                  </div>
                  <span className="shrink-0 text-lg font-bold text-primary">
                    {item.quantity} Stk.
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Alle Bestellungen
            </CardTitle>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                type="button"
                variant="outline"
                className="gap-2"
                disabled={loading || orders.length === 0}
                onClick={() => printOrdersList("all")}
              >
                <Printer className="size-4" />
                Alle Bestellungen ausdrucken
              </Button>
              <Button
                type="button"
                variant="outline"
                className="gap-2"
                disabled={loading || allConfirmedCount === 0}
                onClick={() => printOrdersList("confirmed")}
              >
                <Printer className="size-4" />
                Alle bestätigten Bestellungen ausdrucken
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Suchen nach Name, Top, Status..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-md"
            />
          </div>

          {loading ? (
            <p className="text-muted-foreground">Laden...</p>
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
                        {renderStatusBadge(o.status)}
                      </TableCell>
                      <TableCell>
                        {new Date(o.createdAt).toLocaleDateString("de-DE")}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatPrice(o.totalNet)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Dialog>
                            <DialogTrigger>
                              <Button variant="ghost" size="icon" title="Details ansehen">
                                <Eye className="size-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-h-[80vh] max-w-3xl overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle>
                                Bestelldetails #{o.id.slice(0, 8)}
                              </DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 mt-4">
                              <div className="grid gap-3 rounded-lg border p-4 text-sm md:grid-cols-[1fr_1fr_auto]">
                                <div>
                                  <label className="text-xs text-muted-foreground">
                                    Status
                                  </label>
                                  <select
                                    value={statusDrafts[o.id] ?? o.status}
                                    onChange={(event) =>
                                      setStatusDrafts((current) => ({
                                        ...current,
                                        [o.id]: event.target.value,
                                      }))
                                    }
                                    className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                                  >
                                    <option value="DRAFT">Entwurf</option>
                                    <option value="CONFIRMED">Bestätigt</option>
                                    <option value="CANCELLED">Storniert</option>
                                  </select>
                                </div>
                                <div>
                                  <label className="text-xs text-muted-foreground">
                                    Bestätigt von
                                  </label>
                                  <Input
                                    value={nameDrafts[o.id] ?? ""}
                                    onChange={(event) =>
                                      setNameDrafts((current) => ({
                                        ...current,
                                        [o.id]: event.target.value,
                                      }))
                                    }
                                    className="mt-1 h-9"
                                    placeholder="Name"
                                  />
                                </div>
                                <div className="flex items-end">
                                  <Button
                                    size="sm"
                                    onClick={() => updateOrder(o.id)}
                                    disabled={savingId === o.id}
                                  >
                                    <Save className="size-4" />
                                    {savingId === o.id ? "Speichern..." : "Speichern"}
                                  </Button>
                                </div>
                              </div>

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
                                    Status: {statusLabel(o.status)}
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
                                      <th className="px-3 py-2 text-right">Montage</th>
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
                                          {item.window ? (
                                            <>
                                              {item.window.windowNumber}
                                              <br />
                                              <span className="text-xs">
                                                {item.window.location} · {item.window.widthMm}x
                                                {item.window.heightMm} mm
                                                {item.windowTypeLabel ? ` · ${item.windowTypeLabel}` : ""}
                                                {item.quantity > 1 ? ` · ${item.quantity} Stk.` : ""}
                                              </span>
                                            </>
                                          ) : (
                                            "–"
                                          )}
                                        </td>
                                        <td className="px-3 py-2 text-right">
                                          {formatPrice(item.unitPrice)}
                                        </td>
                                        <td className="px-3 py-2 text-right">
                                          {item.installationFee + item.manipulationFee > 0 ? (
                                            <span className="flex items-center justify-end gap-1">
                                              <Wrench className="size-3 text-muted-foreground" />
                                              {formatPrice(item.installationFee + item.manipulationFee)}
                                            </span>
                                          ) : (
                                            "–"
                                          )}
                                        </td>
                                        <td className="px-3 py-2 text-right font-medium">
                                          {formatPrice(
                                            item.totalPrice +
                                              item.installationFee +
                                              item.manipulationFee
                                          )}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>

                              {o.typeSummary.length > 0 && (
                                <div className="border rounded-lg p-4 space-y-3 text-sm">
                                  <div>
                                    <h3 className="font-semibold text-primary">
                                      Typ-Auswertung
                                    </h3>
                                    <p className="text-xs text-muted-foreground">
                                      Zusammenfassung für Materialbestellung nach Fenstertyp.
                                    </p>
                                  </div>
                                  <div className="space-y-2">
                                    {o.typeSummary.map((summary) => (
                                      <div
                                        key={`${summary.windowTypeLabel}-${summary.category}-${summary.productName}`}
                                        className="flex items-center justify-between gap-3 rounded-md bg-secondary px-3 py-2"
                                      >
                                        <div>
                                          <span className="font-medium">
                                            {summary.windowTypeLabel}
                                          </span>
                                          <span className="text-muted-foreground">
                                            {" · "}
                                            {summary.productName}
                                          </span>
                                        </div>
                                        <span className="font-semibold">
                                          {summary.quantity} Stk.
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              <div className="border rounded-lg p-4 space-y-2 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Materialkosten</span>
                                  <span>{formatPrice(o.materialTotal)}</span>
                                </div>
                                {o.installationTotal + o.manipulationTotal > 0 && (
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Montagegebühren</span>
                                    <span>{formatPrice(o.installationTotal + o.manipulationTotal)}</span>
                                  </div>
                                )}
                                <div className="border-t pt-2 flex justify-between font-medium">
                                  <span>Summe netto</span>
                                  <span>{formatPrice(o.totalNet)}</span>
                                </div>
                                <div className="flex justify-between text-muted-foreground">
                                  <span>USt. ({Math.round(VAT_RATE * 100)}%)</span>
                                  <span>{formatPrice(o.priceSummary?.vatAmount || o.totalGross - o.totalNet)}</span>
                                </div>
                                <div className="border-t pt-2 flex justify-between text-lg font-bold text-primary">
                                  <span>Gesamtsumme brutto</span>
                                  <span>{formatPrice(o.totalGross)}</span>
                                </div>
                              </div>
                            </div>
                            <DialogFooter>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => deleteOrder(o)}
                                disabled={deletingId === o.id}
                              >
                                <Trash2 className="size-4" />
                                {deletingId === o.id ? "Löschen..." : "Bestellung löschen"}
                              </Button>
                            </DialogFooter>
                            </DialogContent>
                          </Dialog>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Bestellung löschen"
                            onClick={() => deleteOrder(o)}
                            disabled={deletingId === o.id}
                          >
                            <Trash2 className="size-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {printMode && (
        <div className="print-area fixed left-[-10000px] top-0 w-full bg-background print:static">
          <div className="space-y-5 text-sm text-foreground">
            <div>
              <h1 className="text-2xl font-bold text-primary">
                {printMode === "confirmed"
                  ? "Bestätigte Bestellungen"
                  : "Alle Bestellungen"}
              </h1>
              <p className="text-muted-foreground">
                Ausdruck vom {new Date().toLocaleDateString("de-DE")} ·{" "}
                {printOrders.length} Bestellung
                {printOrders.length !== 1 ? "en" : ""} · Summe brutto{" "}
                {formatPrice(printGrossTotal)}
              </p>
            </div>

            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="border-b">
                  <th className="py-2 pr-2 text-left">Nr.</th>
                  <th className="py-2 pr-2 text-left">Eigentümer</th>
                  <th className="py-2 pr-2 text-left">Wohnung</th>
                  <th className="py-2 pr-2 text-left">Status</th>
                  <th className="py-2 pr-2 text-left">Datum</th>
                  <th className="py-2 pr-2 text-right">Netto</th>
                  <th className="py-2 text-right">Brutto</th>
                </tr>
              </thead>
              <tbody>
                {printOrders.map((order) => (
                  <tr key={order.id} className="border-b align-top">
                    <td className="py-2 pr-2 font-medium">
                      {order.id.slice(0, 8)}
                    </td>
                    <td className="py-2 pr-2">
                      {residentName(order)}
                      {order.resident?.email && (
                        <div className="text-[10px] text-muted-foreground">
                          {order.resident.email}
                        </div>
                      )}
                    </td>
                    <td className="py-2 pr-2">
                      Haus {order.apartment.building.houseNumber},{" "}
                      {order.apartment.topNumber}
                    </td>
                    <td className="py-2 pr-2">{statusLabel(order.status)}</td>
                    <td className="py-2 pr-2">
                      {formatDate(order.confirmedAt ?? order.createdAt)}
                    </td>
                    <td className="py-2 pr-2 text-right">
                      {formatPrice(order.totalNet)}
                    </td>
                    <td className="py-2 text-right">
                      {formatPrice(order.totalGross)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="space-y-4">
              {printOrders.map((order) => (
                <div key={`detail-${order.id}`} className="break-inside-avoid border-t pt-3">
                  <div className="mb-2 flex items-start justify-between gap-4">
                    <div>
                      <h2 className="text-base font-semibold text-primary">
                        {residentName(order)} · Haus{" "}
                        {order.apartment.building.houseNumber},{" "}
                        {order.apartment.topNumber}
                      </h2>
                      <p className="text-xs text-muted-foreground">
                        Bestellung #{order.id.slice(0, 8)} ·{" "}
                        {statusLabel(order.status)} ·{" "}
                        {formatDate(order.confirmedAt ?? order.createdAt)}
                      </p>
                    </div>
                    <div className="text-right text-xs">
                      <div>Netto: {formatPrice(order.totalNet)}</div>
                      <div className="font-semibold">
                        Brutto: {formatPrice(order.totalGross)}
                      </div>
                    </div>
                  </div>

                  <table className="w-full border-collapse text-[11px]">
                    <thead>
                      <tr className="border-b">
                        <th className="py-1 pr-2 text-left">Produkt</th>
                        <th className="py-1 pr-2 text-left">Fenster</th>
                        <th className="py-1 pr-2 text-right">Material</th>
                        <th className="py-1 pr-2 text-right">Montage</th>
                        <th className="py-1 text-right">Gesamt</th>
                      </tr>
                    </thead>
                    <tbody>
                      {order.items.map((item) => (
                        <tr key={item.id} className="border-b align-top">
                          <td className="py-1 pr-2">{item.product.name}</td>
                          <td className="py-1 pr-2">
                            {item.window
                              ? `${item.window.windowNumber} · ${
                                  item.windowTypeLabel ?? "Typ unbekannt"
                                }`
                              : "–"}
                            {item.quantity > 1 ? ` · ${item.quantity} Stk.` : ""}
                          </td>
                          <td className="py-1 pr-2 text-right">
                            {formatPrice(item.totalPrice)}
                          </td>
                          <td className="py-1 pr-2 text-right">
                            {item.installationFee + item.manipulationFee > 0
                              ? formatPrice(
                                  item.installationFee + item.manipulationFee
                                )
                              : "–"}
                          </td>
                          <td className="py-1 text-right">
                            {formatPrice(
                              item.totalPrice +
                                item.installationFee +
                                item.manipulationFee
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
