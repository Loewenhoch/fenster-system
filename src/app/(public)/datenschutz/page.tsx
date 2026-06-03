import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function DatenschutzPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-primary">Datenschutz</h1>
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Datenschutzerklärung</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-base text-muted-foreground">
          <p>
            Der Schutz Ihrer persönlichen Daten ist uns ein besonderes Anliegen.
            Wir verarbeiten Ihre Daten daher ausschließlich auf Grundlage der
            gesetzlichen Bestimmungen (DSGVO, TKG 2003).
          </p>
          <p>
            Bei der Nutzung dieses Portals werden bestimmte Daten von Ihnen
            benötigt, um Ihnen die Auswahl von Sonnenschutz-Produkten zu
            ermöglichen.
          </p>
          <p>
            Ihre Daten werden sicher gespeichert und nicht an Dritte
            weitergegeben.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
