import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Navigation } from "@/components/layout/navigation";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function ResidentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.role === "ADMIN") {
    redirect("/admin");
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header showNav />
      <div className="flex flex-1">
        <Navigation variant="resident" />
        <main className="flex-1 pb-24 lg:pb-8">
          <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            {children}
          </div>
        </main>
      </div>
      <Footer />
    </div>
  );
}
