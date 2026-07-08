import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ExternalLink, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

function isAllowedPlanPath(file: string) {
  return file.startsWith("/grundrisse/") && file.endsWith(".pdf");
}

export default async function PlanPage({
  searchParams,
}: {
  searchParams: Promise<{ file?: string; title?: string; back?: string }>;
}) {
  const session = await auth();

  if (!session?.user?.apartmentIds?.length) {
    redirect("/login");
  }

  const params = await searchParams;
  const file = params.file ?? "";
  const title = params.title || "Plan";
  const backHref = params.back?.startsWith("/fenster") ? params.back : "/fenster";

  if (!isAllowedPlanPath(file)) {
    redirect(backHref);
  }

  return (
    <div className="flex min-h-[calc(100vh-8rem)] flex-col gap-4">
      <div className="flex flex-col gap-3 rounded-lg border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-lg font-semibold text-primary">
            <FileText className="size-5 text-accent" />
            <span className="truncate">{title}</span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Der Plan wurde in einem eigenen Tab geöffnet.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Link href={backHref}>
            <Button variant="outline" className="w-full gap-2 sm:w-auto">
              <ArrowLeft className="size-4" />
              Zurück zu Meine Fenster
            </Button>
          </Link>
          <a href={file} target="_blank" rel="noreferrer">
            <Button variant="outline" className="w-full gap-2 sm:w-auto">
              <ExternalLink className="size-4" />
              PDF öffnen
            </Button>
          </a>
        </div>
      </div>

      <div className="min-h-[70vh] flex-1 overflow-hidden rounded-lg border bg-muted">
        <object
          data={file}
          type="application/pdf"
          className="h-[70vh] w-full sm:h-[calc(100vh-15rem)]"
        >
          <div className="p-6 text-center">
            <p className="text-base text-muted-foreground">
              Der Plan kann in diesem Browser nicht direkt angezeigt werden.
            </p>
            <a
              href={file}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex text-accent underline"
            >
              PDF direkt öffnen
            </a>
          </div>
        </object>
      </div>
    </div>
  );
}
