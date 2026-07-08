import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Home, Users, ShoppingCart, CheckCircle, Clock, XCircle } from "lucide-react";

export default async function AdminDashboard() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") redirect("/dashboard");

  const [apartments, residents, orders, confirmedOrders] = await Promise.all([
    prisma.apartment.count(),
    prisma.resident.count(),
    prisma.order.count(),
    prisma.order.count({ where: { status: "CONFIRMED" } }),
  ]);

  const pendingOrders = orders - confirmedOrders;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-primary">Admin Dashboard</h1>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Wohnungen</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Home className="h-5 w-5 text-primary" />
              <span className="text-3xl font-bold">{apartments}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Eigentümer</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <span className="text-3xl font-bold">{residents}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Bestellungen</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-accent" />
              <span className="text-3xl font-bold">{orders}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Bestätigt</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-success" />
              <span className="text-3xl font-bold">{confirmedOrders}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Bestellstatus Übersicht</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-success" /> Bestätigt
              </span>
              <Badge className="bg-success/15 text-success">{confirmedOrders}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-warning" /> In Bearbeitung / Entwurf
              </span>
              <Badge className="bg-warning/15 text-warning">{pendingOrders}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-muted-foreground" /> Nicht bestellt
              </span>
              <Badge className="bg-muted text-muted-foreground">{apartments - confirmedOrders}</Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
