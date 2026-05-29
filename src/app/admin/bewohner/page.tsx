"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Users } from "lucide-react";

export default function AdminBewohnerPage() {
  const [residents, setResidents] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/residents")
      .then((r) => r.json())
      .then((data) => { setResidents(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const filtered = residents.filter((r) =>
    (r.firstName || "").toLowerCase().includes(search.toLowerCase()) ||
    (r.lastName || "").toLowerCase().includes(search.toLowerCase()) ||
    (r.loginEmail || "").toLowerCase().includes(search.toLowerCase()) ||
    r.apartment.topNumber.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-[#1e3a5f]">Bewohner</h1>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Alle Bewohner
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex items-center gap-2">
            <Search className="h-4 w-4 text-gray-400" />
            <Input
              placeholder="Suchen nach Name, E-Mail, Top..."
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
                  <TableHead>Name</TableHead>
                  <TableHead>Rolle</TableHead>
                  <TableHead>Wohnung</TableHead>
                  <TableHead>E-Mail</TableHead>
                  <TableHead>Login</TableHead>
                  <TableHead>Letzter Login</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">
                      {r.salutation} {r.title} {r.firstName} {r.lastName}
                    </TableCell>
                    <TableCell>
                      <Badge variant={r.role === "OWNER_PRIMARY" ? "default" : "secondary"}>
                        {r.role === "OWNER_PRIMARY" ? "Eigentümer" : r.role === "TENANT" ? "Mieter" : "Eigentümer 2"}
                      </Badge>
                    </TableCell>
                    <TableCell>{r.apartment.building.houseNumber} – {r.apartment.topNumber}</TableCell>
                    <TableCell>{r.loginEmail || "—"}</TableCell>
                    <TableCell>
                      {r.loginEnabled ? (
                        <Badge className="bg-green-100 text-green-800">Aktiv</Badge>
                      ) : (
                        <Badge variant="outline">Inaktiv</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {r.lastLoginAt ? new Date(r.lastLoginAt).toLocaleDateString("de-DE") : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
