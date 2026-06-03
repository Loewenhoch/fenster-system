import { auth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserCircle, Mail, Shield } from "lucide-react";

export default async function ProfilePage() {
  const session = await auth();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <UserCircle className="size-8 text-primary" aria-hidden="true" />
        <div>
          <h1 className="text-2xl font-bold text-primary">Profil</h1>
          <p className="text-base text-muted-foreground">
            Ihre persönlichen Daten.
          </p>
        </div>
      </div>

      <div className="grid gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Kontoinformationen</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <UserCircle className="size-5 text-muted-foreground" />
              <span className="text-base">
                {session?.user?.name || "Nicht angegeben"}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Mail className="size-5 text-muted-foreground" />
              <span className="text-base">{session?.user?.email}</span>
            </div>
            <div className="flex items-center gap-3">
              <Shield className="size-5 text-muted-foreground" />
              <span className="text-base">Rolle: {session?.user?.role === "ADMIN" ? "Administrator" : "Eigentümer"}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
