import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function CotizacionesPage() {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) {
    redirect("/auth/login");
  }

  const { data: cotizaciones } = await supabase
    .from("cotizaciones")
    .select("id, total, valida_hasta, created_at, clientes(nombre)")
    .order("created_at", { ascending: false })
    .limit(50);

  const hoy = new Date().toISOString().slice(0, 10);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-bold text-ink">Cotizaciones</h1>

      <Link
        href="/protected/cotizaciones/nueva"
        className="rounded-md bg-primario px-4 py-3 text-center text-sm font-medium text-white transition hover:opacity-90"
      >
        + Nueva cotización
      </Link>

      <div className="rounded-lg border border-linea bg-white p-4">
        {cotizaciones?.length ? (
          <ul className="flex flex-col gap-2">
            {cotizaciones.map((c) => {
              const cliente = Array.isArray(c.clientes) ? c.clientes[0] : c.clientes;
              const vencida = c.valida_hasta && c.valida_hasta < hoy;
              return (
                <li key={c.id} className="border-b border-linea pb-2 last:border-0">
                  <Link
                    href={`/protected/cotizaciones/${c.id}`}
                    className="flex items-center justify-between gap-2 text-sm"
                  >
                    <div className="flex flex-col">
                      <span className="text-ink">
                        {cliente?.nombre ?? "Público general"}
                      </span>
                      <span className="text-xs text-ink/50">
                        {new Date(c.created_at).toLocaleDateString("es-MX")}
                        {c.valida_hasta &&
                          ` · válida hasta ${c.valida_hasta}${vencida ? " (vencida)" : ""}`}
                      </span>
                    </div>
                    <span className="cifra font-medium text-ink">
                      ${c.total.toFixed(2)}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-ink/50">Todavía no tienes cotizaciones.</p>
        )}
      </div>
    </div>
  );
}
