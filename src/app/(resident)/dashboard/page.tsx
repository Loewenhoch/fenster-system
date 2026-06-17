import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Eye,
  ShoppingCart,
  FileCheck,
  Home,
  Layers,
  MapPin,
  Clock,
  CalendarDays,
} from "lucide-react";

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user?.apartmentIds?.length) {
    redirect("/login");
  }

  const resident = await prisma.resident.findUnique({
    where: { id: session.user.id },
    include: {
      apartmentLinks: {
        orderBy: { createdAt: "asc" },
        include: {
          apartment: {
            include: {
              building: true,
              windows: { orderBy: { windowNumber: "asc" } },
              orders: {
                orderBy: { createdAt: "desc" },
                take: 1,
                include: { items: true },
              },
            },
          },
        },
      },
    },
  });

  if (!resident?.apartmentLinks?.length) {
    redirect("/login");
  }

  const apartments = resident.apartmentLinks.map((link) => link.apartment);
  const totalWindows = apartments.reduce((sum, apt) => sum + apt.windows.length, 0);

  // Aggregierter Bestellstatus über alle Wohnungen
  const allOrders = apartments.flatMap((apt) => apt.orders);
  const latestOrder = allOrders.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )[0];
  const hasOrder = latestOrder?.status === "CONFIRMED" || latestOrder?.status === "DRAFT";
  const isConfirmed = latestOrder?.status === "CONFIRMED";

  const allWindows = apartments.flatMap((apt) => apt.windows);
  const orderableWindows = allWindows.filter((w) => w.isOrderable);
  const windowsWithInterest = allWindows.filter(
    (w) => w.sunscreenInterest || w.insectScreenInterest || w.wantsElectricSs
  );

  const multipleApartments = apartments.length > 1;

  return (
    <div className="space-y-6">
      {/* Begrüßung */}
      <div>
        <h1 className="text-2xl font-bold text-primary sm:text-3xl">
          Willkommen, {resident.firstName || resident.lastName || "Eigentümer"}
        </h1>
        <p className="mt-1 text-base text-muted-foreground">
          Hier finden Sie alle Informationen zu Ihren Wohnungen und Bestellungen.
        </p>
      </div>

      {/* Wohnungsübersicht */}
      {multipleApartments ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {apartments.map((apartment) => (
            <Card key={apartment.id} className="card-elevated">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Home className="size-5 text-accent" />
                  Haus {apartment.building.houseNumber}, {apartment.topNumber}
                </CardTitle>
                <CardDescription>
                  {apartment.floor} · {apartment.windows.length} Fenster
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-2">
                  <Link href={`/fenster?apartmentId=${apartment.id}`}>
                    <Button variant="outline" className="w-full gap-2">
                      <Eye className="size-4" />
                      Fenster
                    </Button>
                  </Link>
                  <Link href={`/bestellung?apartmentId=${apartment.id}`}>
                    <Button className="w-full gap-2 bg-accent hover:bg-accent/90">
                      <ShoppingCart className="size-4" />
                      Bestellen
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="card-elevated">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-xl">
              <Home className="size-6 text-accent" />
              Ihre Wohnung
            </CardTitle>
            <CardDescription>Übersicht Ihrer Wohnungsdaten</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-lg bg-secondary p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="size-4" />
                  Haus
                </div>
                <p className="mt-1 text-lg font-semibold text-primary">
                  {apartments[0].building.houseNumber}
                </p>
                <p className="text-sm text-muted-foreground">{apartments[0].building.street}</p>
              </div>
              <div className="rounded-lg bg-secondary p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Layers className="size-4" />
                  Stockwerk
                </div>
                <p className="mt-1 text-lg font-semibold text-primary">
                  {apartments[0].floor}
                </p>
              </div>
              <div className="rounded-lg bg-secondary p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Home className="size-4" />
                  Top
                </div>
                <p className="mt-1 text-lg font-semibold text-primary">
                  {apartments[0].topNumber}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bestellstatus */}
      <Card className="card-elevated">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-xl">
            <ShoppingCart className="size-6 text-accent" />
            Bestellstatus
          </CardTitle>
          <CardDescription>Aktueller Status Ihrer Bestellungen</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              {isConfirmed ? (
                <Badge
                  variant="default"
                  className="bg-success text-success-foreground px-3 py-1 text-base"
                >
                  <FileCheck className="mr-1 size-4" />
                  Bestellung bestätigt
                </Badge>
              ) : hasOrder ? (
                <Badge variant="secondary" className="px-3 py-1 text-base">
                  <Clock className="mr-1 size-4" />
                  Bestellung in Bearbeitung
                </Badge>
              ) : (
                <Badge variant="outline" className="px-3 py-1 text-base">
                  Noch nicht bestellt
                </Badge>
              )}
              {latestOrder && (
                <p className="mt-2 text-sm text-muted-foreground">
                  Bestellung vom{" "}
                  {new Date(latestOrder.createdAt).toLocaleDateString("de-DE", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                  })}
                  {latestOrder.totalNet > 0 && (
                    <span className="ml-2 font-medium text-foreground">
                      ({latestOrder.totalNet.toFixed(2).replace(".", ",")} € netto)
                    </span>
                  )}
                </p>
              )}
            </div>
            {isConfirmed && latestOrder ? (
              <Link href={`/bestellung?orderId=${latestOrder.id}`}>
                <Button size="lg" className="btn-lg gap-2">
                  <Eye className="size-5" />
                  Bestellung ansehen
                </Button>
              </Link>
            ) : null}
          </div>
        </CardContent>
      </Card>

      {/* Letzte Aktivität */}
      <Card className="card-elevated">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-xl">
            <CalendarDays className="size-6 text-accent" />
            Letzte Aktivität
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {resident.lastLoginAt ? (
              <div className="flex items-center gap-3 text-base">
                <Clock className="size-5 text-muted-foreground" />
                <span>
                  Letzter Login am{" "}
                  {new Date(resident.lastLoginAt).toLocaleDateString("de-DE", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-3 text-base text-muted-foreground">
                <Clock className="size-5" />
                <span>Noch keine Aktivität</span>
              </div>
            )}
            {latestOrder?.confirmedAt && (
              <div className="flex items-center gap-3 text-base">
                <FileCheck className="size-5 text-success" />
                <span>
                  Bestellung bestätigt am{" "}
                  {new Date(latestOrder.confirmedAt).toLocaleDateString("de-DE", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            )}
            {windowsWithInterest.length > 0 && !hasOrder && (
              <div className="flex items-center gap-3 text-base">
                <Eye className="size-5 text-accent" />
                <span>
                  {windowsWithInterest.length} Fenster mit Sonnenschutz-Interesse markiert
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* CTA Buttons */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Link href={`/fenster?apartmentId=${apartments[0].id}`}>
          <Button
            variant="outline"
            size="lg"
            className="btn-xl h-auto w-full flex-col gap-2 py-6"
          >
            <Eye className="size-8" />
            <span className="text-lg font-semibold">Fenster ansehen</span>
            <span className="text-sm font-normal text-muted-foreground">
              {totalWindows} Fenster in {apartments.length} {apartments.length === 1 ? "Wohnung" : "Wohnungen"}
            </span>
          </Button>
        </Link>

        {isConfirmed && latestOrder ? (
          <Link href={`/bestellung?orderId=${latestOrder.id}`}>
            <Button
              size="lg"
              className="btn-xl h-auto w-full flex-col gap-2 py-6 bg-accent hover:bg-accent/90"
            >
              <FileCheck className="size-8" />
              <span className="text-lg font-semibold">Bestellung ansehen</span>
              <span className="text-sm font-normal text-primary-foreground/80">
                Bestellung vom{" "}
                {new Date(latestOrder.createdAt).toLocaleDateString("de-DE")}
              </span>
            </Button>
          </Link>
        ) : (
          <Link
            href={`/bestellung?apartmentId=${apartments[0].id}`}
          >
            <Button
              size="lg"
              className="btn-xl h-auto w-full flex-col gap-2 py-6 bg-accent hover:bg-accent/90"
            >
              <ShoppingCart className="size-8" />
              <span className="text-lg font-semibold">Bestellung starten</span>
              <span className="text-sm font-normal text-primary-foreground/80">
                {orderableWindows.length} Fenster mit Sonnenschutz-Option verfügbar
              </span>
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
}
