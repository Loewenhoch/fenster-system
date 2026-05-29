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
            <strong>Fenster &amp; Sonnenschutz</strong>
            <br />
            Starhembergstraße 64 &amp; 66
            <br />
            1060 Wien, Österreich
          </p>
          <p>
            <strong>Kontakt:</strong>
            <br />
            E-Mail: info@fenster-sonnenschutz.at
            <br />
            Telefon: +43 1 234 567 890
          </p>
          <p>
            Verantwortlich für den Inhalt: Fenster &amp; Sonnenschutz GmbH
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
