import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AgbPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-primary">Allgemeine Geschäftsbedingungen</h1>
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">AGB</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-base text-muted-foreground">
          <p>
            Die Nutzung dieses Portals unterliegt den folgenden Bedingungen:
          </p>
          <ul className="list-inside list-disc space-y-2">
            <li>Das Portal steht ausschließlich den Eigentümern der Starhembergstraße 64/66 zur Verfügung.</li>
            <li>Die Auswahl von Sonnenschutz-Produkten ist verbindlich.</li>
            <li>Änderungen sind bis zum festgelegten Stichtag möglich.</li>
            <li>Die Daten werden sicher gespeichert und verarbeitet.</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
