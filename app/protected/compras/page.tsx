import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function ComprasPage() {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) redirect("/auth/login");

  const { data: miPerfil } = await supabase
    .from("profiles")
    .select("role, company_id")
    .eq("id", data.claims.sub as string)
    .single();

  if (miPerfil?.role !== "admin") redirect("/protected");

  const { data: compras } = await supabase
    .from("compras")
    .select("id, total, total_ticket, folio_proveedor, nota, created_at, fecha_ticket, impuestos_incluidos, proveedores(nombre)")
    .eq("company_id", miPerfil.company_id)
    .order("created_at", { ascending: false });

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-ink">Historial de compras</h1>
          <p className="text-xs text-ink/50 mt-0.5">{compras?.length ?? 0} entradas registradas</p>
        </div>
        <Link href="/protected/compras/nueva"
          className="rounded-xl bg-primario px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition">
          + Recibir mercancía
        </Link>
      </div>

      {compras?.length ? (
        <div className="flex flex-col gap-2">
          {compras.map((c) => {
            const proveedor = Array.isArray(c.proveedores)
              ? c.proveedores[0]?.nombre
              : (c.proveedores as { nombre: string } | null)?.nombre;
            const totalMostrar = c.total_ticket ?? c.total;
            return (
              <Link key={c.id} href={`/protected/compras/${c.id}`}
                className="flex items-center gap-4 rounded-xl border border-linea bg-white px-4 py-3 hover:border-primario transition">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-ink truncate">
                      {proveedor ?? "Sin proveedor"}
                    </span>
                    {c.folio_proveedor && (
                      <span className="rounded-full bg-paper border border-linea px-2 py-0.5 text-[10px] font-mono text-ink/60">
                        {c.folio_proveedor}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-ink/50 mt-0.5">
                    {new Date(c.created_at).toLocaleDateString("es-MX", {
                      day: "2-digit", month: "short", year: "numeric"
                    })}
                    {c.nota ? ` · ${c.nota}` : ""}
                    {c.impuestos_incluidos !== null && (
                      <span className="ml-2 text-ink/30">
                        {c.impuestos_incluidos ? "con IVA/IEPS" : "base"}
                      </span>
                    )}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="cifra font-bold text-ink">
                    ${totalMostrar.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="rounded-xl border border-linea bg-white p-12 text-center">
          <p className="text-sm text-ink/50 mb-3">Aún no has registrado ninguna compra.</p>
          <Link href="/protected/compras/nueva"
            className="text-sm text-primario hover:underline">
            Registrar primera entrada de mercancía →
          </Link>
        </div>
      )}
    </div>
  );
}
