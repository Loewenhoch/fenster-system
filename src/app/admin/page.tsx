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
      <h1 className="text-3xl font-bold text-[#1e3a5f]">Admin Dashboard</h1>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Wohnungen</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Home className="h-5 w-5 text-[#1e3a5f]" />
              <span className="text-3xl font-bold">{apartments}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Bewohner</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-[#1e3a5f]" />
              <span className="text-3xl font-bold">{residents}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Bestellungen</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-[#e67e22]" />
              <span className="text-3xl font-bold">{orders}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Bestätigt</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
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
                <CheckCircle className="h-4 w-4 text-green-600" /> Bestätigt
              </span>
              <Badge className="bg-green-100 text-green-800">{confirmedOrders}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-yellow-600" /> In Bearbeitung / Entwurf
              </span>
              <Badge className="bg-yellow-100 text-yellow-800">{pendingOrders}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-gray-400" /> Nicht bestellt
              </span>
              <Badge className="bg-gray-100 text-gray-800">{apartments - confirmedOrders}</Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
