import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function DevolucionesPage() {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) {
    redirect("/auth/login");
  }

  const { data: devoluciones } = await supabase
    .from("devoluciones")
    .select("id, total, nota, created_at, clientes(nombre)")
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-bold text-ink">Devoluciones</h1>

      <div className="rounded-lg border border-linea bg-white p-4">
        {devoluciones?.length ? (
          <ul className="flex flex-col gap-2">
            {devoluciones.map((d) => {
              const cliente = Array.isArray(d.clientes) ? d.clientes[0] : d.clientes;
              return (
                <li key={d.id} className="border-b border-linea pb-2 last:border-0">
                  <Link
                    href={`/protected/devoluciones/${d.id}`}
                    className="flex items-center justify-between gap-2 text-sm"
                  >
                    <div className="flex flex-col">
                      <span className="text-ink">{cliente?.nombre ?? "Público general"}</span>
                      <span className="text-xs text-ink/50">
                        {new Date(d.created_at).toLocaleDateString("es-MX")}
                        {d.nota ? ` · ${d.nota}` : ""}
                      </span>
                    </div>
                    <span className="cifra font-medium text-ink">
                      ${d.total.toFixed(2)}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-ink/50">Todavía no hay devoluciones.</p>
        )}
      </div>

      <Link href="/protected/pedidos" className="text-sm text-primario hover:underline">
        Ver historial de ventas
      </Link>
    </div>
  );
}
