import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { CorteTurnoForm } from "@/components/corte-turno-form";

export default async function TurnoPage() {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) redirect("/auth/login");

  const userId = data.claims.sub as string;
  const { data: miPerfil } = await supabase
    .from("profiles")
    .select("role, full_name, company_id")
    .eq("id", userId)
    .single();

  if (!miPerfil) redirect("/auth/login");

  // Buscar turno abierto del cajero actual
  const { data: turnoAbierto } = await supabase
    .from("cortes_turno")
    .select("*")
    .eq("cajero_id", userId)
    .eq("estado", "abierto")
    .single();

  return (
    <div className="flex flex-col gap-4 max-w-lg">
      <div>
        <h1 className="text-xl font-bold text-ink">Mi turno</h1>
        <p className="text-sm text-ink/60">
          Abre tu turno al iniciar y ciérralo al terminar contando el efectivo.
        </p>
      </div>
      <CorteTurnoForm
        turnoAbierto={turnoAbierto ?? null}
        usuarioNombre={miPerfil.full_name ?? ""}
      />
    </div>
  );
}
