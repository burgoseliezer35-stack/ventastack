import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { GestionEquipo } from "@/components/gestion-equipo";

export default async function EquipoPage() {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) redirect("/auth/login");

  const userId = data.claims.sub as string;

  const { data: miPerfil } = await supabase
    .from("profiles")
    .select("role, company_id")
    .eq("id", userId)
    .single();

  if (miPerfil?.role !== "admin") redirect("/protected");

  const { data: equipo } = await supabase
    .from("profiles")
    .select("id, full_name, username, role")
    .neq("id", userId)
    .in("role", ["vendedor", "cajero"])
    .order("created_at", { ascending: true });

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-bold text-ink">Equipo</h1>
        <p className="text-sm text-ink/60">
          Crea cuentas para tus vendedores y cajeros. Ellos entran con su
          usuario y contraseña — sin correo electrónico.
        </p>
      </div>

      <GestionEquipo
        equipo={equipo ?? []}
        companyId={miPerfil.company_id}
      />
    </div>
  );
}
