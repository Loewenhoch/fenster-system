"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Users } from "lucide-react";

interface ApartmentLink {
  role: string;
  isPrimaryContact: boolean;
  apartment: {
    topNumber: string;
    building: {
      houseNumber: string;
    };
  };
}

interface Resident {
  id: string;
  salutation?: string;
  title?: string;
  firstName?: string;
  lastName?: string;
  loginEmail?: string;
  loginEnabled: boolean;
  lastLoginAt?: string;
  apartmentLinks: ApartmentLink[];
}

export default function AdminBewohnerPage() {
  const [residents, setResidents] = useState<Resident[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/residents")
      .then((r) => r.json())
      .then((data) => { setResidents(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const filtered = residents.filter((r) => {
    const searchLower = search.toLowerCase();
    const nameMatch =
      (r.firstName || "").toLowerCase().includes(searchLower) ||
      (r.lastName || "").toLowerCase().includes(searchLower);
    const emailMatch = (r.loginEmail || "").toLowerCase().includes(searchLower);
    const aptMatch = r.apartmentLinks.some(
      (l) => l.apartment.topNumber.toLowerCase().includes(searchLower)
    );
    return nameMatch || emailMatch || aptMatch;
  });

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-[#1e3a5f]">Eigentümer</h1>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Alle Eigentümer
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
                  <TableHead>Wohnungen</TableHead>
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
                      <div className="space-y-1">
                        {r.apartmentLinks.map((link) => (
                          <div key={`${r.id}-${link.apartment.topNumber}`} className="flex items-center gap-2">
                            <Badge
                              variant={link.role === "OWNER_PRIMARY" ? "default" : "secondary"}
                            >
                              {link.role === "OWNER_PRIMARY"
                                ? "Haupt"
                                : link.role === "TENANT"
                                ? "Mieter"
                                : "Neben"}
                            </Badge>
                            <span className="text-sm">
                              {link.apartment.building.houseNumber} – {link.apartment.topNumber}
                            </span>
                          </div>
                        ))}
                      </div>
                    </TableCell>
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
