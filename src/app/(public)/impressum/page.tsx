import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ImpressumPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-primary">Impressum</h1>
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Kontakt &amp; Verantwortlichkeit</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-base text-muted-foreground">
          <p>
            <strong>DI Platzer ZT GmbH</strong>
            <br />
            Margarethen 33a
            <br />
            4020 Linz, Austria
          </p>
          <p>
            <strong>Kontakt:</strong>
            <br />
            E-Mail: zt@platzer.co.at
            <br />
            Telefon: 0732 7810220
          </p>
          <p>Verantwortlich für den Inhalt: DI Platzer ZT GmbH</p>
        </CardContent>
      </Card>
    </div>
  );
}
