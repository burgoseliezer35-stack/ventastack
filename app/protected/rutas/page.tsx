import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { MapaFlotilla } from "@/components/mapa-flotilla";

export default async function RutasPage() {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) {
    redirect("/auth/login");
  }

  const userId = data.claims.sub as string;

  const { data: miPerfil } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();

  if (miPerfil?.role !== "admin") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-paper px-4 text-center">
        <p className="text-sm text-ink/70">
          Solo el admin de la empresa puede ver esta página.
        </p>
        <Link href="/protected" className="text-sm text-primario hover:underline">
          Regresar
        </Link>
      </div>
    );
  }

  // RLS deja ver solo a los perfiles de la MISMA empresa.
  const { data: vendedoresRaw } = await supabase
    .from("profiles")
    .select("id, full_name")
    .eq("role", "vendedor")
    .order("full_name");

  const vendedores = (vendedoresRaw ?? []).map((v) => ({
    id: v.id,
    nombre: v.full_name ?? "Vendedor",
  }));

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-bold text-ink">Ver rutas</h1>
        <p className="text-sm text-ink/60">
          Mapa en vivo de tu equipo en ruta — se actualiza solo cada 20
          segundos.
        </p>
      </div>

      {vendedores.length === 0 ? (
        <p className="max-w-sm text-sm text-ink/60">
          Todavía no tienes vendedores dados de alta. Agrega uno en{" "}
          <Link href="/protected/equipo" className="text-primario hover:underline">
            Equipo
          </Link>
          .
        </p>
      ) : (
        <MapaFlotilla vendedores={vendedores} />
      )}

      <p className="text-xs text-ink/40">
        Esto funciona mientras el vendedor tenga la app abierta en su
        celular con la pantalla prendida — al ser todavía la versión web,
        no actualiza en segundo plano. Eso se resuelve con la app móvil
        nativa, que sigue pendiente.
      </p>
    </div>
  );
}
