import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { LogoutButton } from "@/components/logout-button";

export default async function ResellerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) {
    redirect("/auth/login");
  }

  const userId = data.claims.sub as string;

  const { data: perfil } = await supabase
    .from("profiles")
    .select("es_superadmin")
    .eq("id", userId)
    .limit(1)
    .maybeSingle();

  // Si no eres el dueño de la plataforma, esta puerta no es para
  // ti — te regresamos a tu panel normal, sin mensaje de error
  // (simplemente no existe esta sección para ti).
  if (!perfil?.es_superadmin) {
    redirect("/protected");
  }

  return (
    <div className="min-h-screen bg-paper">
      <header className="sticky top-0 z-10 border-b-2 border-primario bg-paper">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <Link
            href="/reseller"
            className="text-lg font-bold tracking-tight text-ink"
          >
            Ventastack <span className="text-primario">· reseller</span>
          </Link>
          <LogoutButton />
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8">{children}</main>
    </div>
  );
}
