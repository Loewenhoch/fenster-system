import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Sun,
  Bug,
  Zap,
  Ruler,
  MapPin,
  CheckCircle2,
  XCircle,
  Home,
} from "lucide-react";

export default async function FensterPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const session = await auth();

  if (!session?.user?.apartmentId) {
    redirect("/login");
  }

  const params = await searchParams;
  const filter = params.filter;

  const resident = await prisma.resident.findUnique({
    where: { id: session.user.id },
    include: {
      apartment: {
        include: {
          building: true,
          windows: {
            orderBy: { windowNumber: "asc" },
          },
        },
      },
    },
  });

  if (!resident?.apartment) {
    redirect("/login");
  }

  const windows = resident.apartment.windows;
  const filteredWindows = filter
    ? windows.filter((w) => {
        if (filter === "strasse")
          return w.location.toLowerCase().includes("straße") || w.location.toLowerCase().includes("strasse");
        if (filter === "hof")
          return w.location.toLowerCase().includes("hof");
        return true;
      })
    : windows;

  const strasseCount = windows.filter(
    (w) =>
      w.location.toLowerCase().includes("straße") ||
      w.location.toLowerCase().includes("strasse")
  ).length;
  const hofCount = windows.filter((w) =>
    w.location.toLowerCase().includes("hof")
  ).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-primary sm:text-3xl">
          Meine Fenster
        </h1>
        <p className="mt-1 text-base text-muted-foreground">
          Übersicht aller Fenster Ihrer Wohnung
        </p>
      </div>

      {/* Filter */}
      <div className="flex flex-wrap gap-3">
        <a
          href="/fenster"
          className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-base font-medium transition-colors min-h-[48px] ${
            !filter
              ? "bg-primary text-primary-foreground"
              : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
          }`}
        >
          <Home className="size-5" />
          Alle ({windows.length})
        </a>
        <a
          href="/fenster?filter=strasse"
          className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-base font-medium transition-colors min-h-[48px] ${
            filter === "strasse"
              ? "bg-primary text-primary-foreground"
              : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
          }`}
        >
          <MapPin className="size-5" />
          Straßenseite ({strasseCount})
        </a>
        <a
          href="/fenster?filter=hof"
          className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-base font-medium transition-colors min-h-[48px] ${
            filter === "hof"
              ? "bg-primary text-primary-foreground"
              : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
          }`}
        >
          <Home className="size-5" />
          Hofseite ({hofCount})
        </a>
      </div>

      {/* Fenster-Tabelle */}
      <Card className="card-elevated">
        <CardHeader className="pb-3">
          <CardTitle className="text-xl">Fensterliste</CardTitle>
          <CardDescription>
            {filteredWindows.length} von {windows.length} Fenstern angezeigt
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0 sm:p-4">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-base">Fenster-Nr</TableHead>
                  <TableHead className="text-base">Lage</TableHead>
                  <TableHead className="text-base">Maße</TableHead>
                  <TableHead className="text-base">Bestand SS</TableHead>
                  <TableHead className="text-base">Optionen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredWindows.map((window) => (
                  <TableRow key={window.id}>
                    <TableCell className="text-base font-medium">
                      {window.windowNumber}
                    </TableCell>
                    <TableCell className="text-base">
                      <div className="flex items-center gap-2">
                        <MapPin className="size-4 text-muted-foreground" />
                        {window.location}
                      </div>
                    </TableCell>
                    <TableCell className="text-base">
                      <div className="flex items-center gap-2">
                        <Ruler className="size-4 text-muted-foreground" />
                        {window.widthMm} x {window.heightMm} mm
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {window.measureText}
                      </span>
                    </TableCell>
                    <TableCell className="text-base">
                      {window.hasExistingSunscreen ? (
                        <Badge
                          variant="default"
                          className="bg-success text-success-foreground text-sm"
                        >
                          <CheckCircle2 className="mr-1 size-3" />
                          vorhanden
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-sm">
                          <XCircle className="mr-1 size-3" />
                          keine
                        </Badge>
                      )}
                      {window.hasElectricSunscreen && (
                        <Badge
                          variant="secondary"
                          className="ml-1 text-sm"
                        >
                          <Zap className="mr-1 size-3" />
                          elektrisch
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-base">
                      <div className="flex flex-wrap gap-1">
                        {window.sunscreenInterest && (
                          <Badge
                            variant="secondary"
                            className="text-sm bg-accent/10 text-accent"
                          >
                            <Sun className="mr-1 size-3" />
                            Sonnenschutz
                          </Badge>
                        )}
                        {window.insectScreenInterest && (
                          <Badge
                            variant="secondary"
                            className="text-sm bg-accent/10 text-accent"
                          >
                            <Bug className="mr-1 size-3" />
                            Insektenschutz
                          </Badge>
                        )}
                        {window.wantsElectricSs && (
                          <Badge
                            variant="secondary"
                            className="text-sm bg-accent/10 text-accent"
                          >
                            <Zap className="mr-1 size-3" />
                            Elektro
                          </Badge>
                        )}
                        {window.isOrderable && (
                          <Badge
                            variant="outline"
                            className="text-sm border-success text-success"
                          >
                            bestellbar
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Hinweis */}
      <Card className="bg-secondary/50 border-dashed">
        <CardContent className="py-6">
          <p className="text-base text-muted-foreground">
            <strong className="text-foreground">Hinweis:</strong> Die
            verfügbaren Sonnenschutz-Produkte für jedes Fenster sehen Sie im Bestellvorgang.
            Nicht alle Produkte sind für jedes Fenster verfügbar.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
