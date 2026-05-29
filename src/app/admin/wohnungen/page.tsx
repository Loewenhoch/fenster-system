"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Home } from "lucide-react";

export default function AdminWohnungenPage() {
  const [apartments, setApartments] = useState<any[]>([]);
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
      <h1 className="text-3xl font-bold text-[#1e3a5f]">Wohnungen</h1>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Home className="h-5 w-5" />
            Alle Wohnungen
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex items-center gap-2">
            <Search className="h-4 w-4 text-gray-400" />
            <Input
              placeholder="Suchen nach Top, Stockwerk, Haus..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-md"
            />
          </div>

          {loading ? (
            <p className="text-gray-500">Laden...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Haus</TableHead>
                  <TableHead>Top</TableHead>
                  <TableHead>Stockwerk</TableHead>
                  <TableHead>Bewohner</TableHead>
                  <TableHead>Fenster</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((a) => {
                  const hasOrder = a.orders.some((o: any) => o.status === "CONFIRMED");
                  return (
                    <TableRow key={a.id}>
                      <TableCell>{a.building.houseNumber}</TableCell>
                      <TableCell className="font-medium">{a.topNumber}</TableCell>
                      <TableCell>{a.floor}</TableCell>
                      <TableCell>{a.residents.length}</TableCell>
                      <TableCell>{a.windows.length}</TableCell>
                      <TableCell>
                        {hasOrder ? (
                          <Badge className="bg-green-100 text-green-800">Bestellt</Badge>
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
