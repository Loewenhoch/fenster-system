import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function WiderrufPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-primary">Widerrufsrecht</h1>
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Widerrufserklärung</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-base text-muted-foreground">
          <p>
            Sie haben das Recht, Ihre Auswahl innerhalb der angegebenen Frist
            zu widerrufen.
          </p>
          <p>
            Der Widerruf ist schriftlich oder per E-Mail an uns zu richten.
            Nach Ablauf der Frist ist die Auswahl verbindlich.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
