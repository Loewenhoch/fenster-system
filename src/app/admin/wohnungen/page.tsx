"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Home } from "lucide-react";

interface AdminApartment {
  id: string;
  topNumber: string;
  floor: string;
  building: { houseNumber: string };
  residentLinks?: unknown[];
  windows: unknown[];
  orders: Array<{ status: string }>;
}

export default function AdminWohnungenPage() {
  const [apartments, setApartments] = useState<AdminApartment[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/apartments")
      .then((r) => r.json())
      .then((data) => { setApartments(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const filtered = apartments.filter((a) =>
    a.topNumber.toLowerCase().includes(search.toLowerCase()) ||
    a.floor.toLowerCase().includes(search.toLowerCase()) ||
    a.building.houseNumber.includes(search)
  );

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-primary">Wohnungen</h1>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Home className="h-5 w-5" />
            Alle Wohnungen
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Suchen nach Top, Stockwerk, Haus..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-md"
            />
          </div>

          {loading ? (
            <p className="text-muted-foreground">Laden...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Haus</TableHead>
                  <TableHead>Top</TableHead>
                  <TableHead>Stockwerk</TableHead>
                  <TableHead>Eigentümer</TableHead>
                  <TableHead>Fenster</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((a) => {
                  const hasOrder = a.orders.some((o) => o.status === "CONFIRMED");
                  return (
                    <TableRow key={a.id}>
                      <TableCell>{a.building.houseNumber}</TableCell>
                      <TableCell className="font-medium">{a.topNumber}</TableCell>
                      <TableCell>{a.floor}</TableCell>
                      <TableCell>{a.residentLinks?.length || 0}</TableCell>
                      <TableCell>{a.windows.length}</TableCell>
                      <TableCell>
                        {hasOrder ? (
                          <Badge className="bg-success/15 text-success">Bestellt</Badge>
                        ) : (
                          <Badge variant="outline">Offen</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
