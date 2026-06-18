import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function PedidosPage() {
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

  const puedeDevolver = miPerfil?.role === "admin" || miPerfil?.role === "cajero";

  const { data: pedidos } = await supabase
    .from("pedidos")
    .select("id, total, metodo_pago, estado, created_at, clientes(nombre)")
    .order("created_at", { ascending: false })
    .limit(50);

  const normalizar = <T,>(valor: T | T[] | null | undefined): T | null =>
    Array.isArray(valor) ? valor[0] ?? null : valor ?? null;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-bold text-ink">Historial de ventas</h1>

      <div className="rounded-lg border border-linea bg-white p-4">
        {pedidos?.length ? (
          <ul className="flex flex-col gap-3">
            {pedidos.map((p) => {
              const cliente = normalizar(
                p.clientes as { nombre: string } | { nombre: string }[] | null,
              );
              return (
                <li key={p.id} className="border-b border-linea pb-2 text-sm last:border-0">
                  <div className="flex justify-between text-ink">
                    <span>{cliente?.nombre ?? "Público general"}</span>
                    <span className="cifra font-medium">${p.total.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-ink/40">
                    <span>
                      {new Date(p.created_at).toLocaleString("es-MX")} ·{" "}
                      {p.metodo_pago} · {p.estado}
                    </span>
                    <div className="flex gap-3">
                      {puedeDevolver && (
                        <Link
                          href={`/protected/devoluciones/nueva?pedido_id=${p.id}`}
                          className="text-primario hover:underline"
                        >
                          Devolver
                        </Link>
                      )}
                      <Link
                        href={`/protected/pos/recibo/${p.id}`}
                        className="text-primario hover:underline"
                      >
                        Ver recibo →
                      </Link>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-ink/40">Todavía no hay ventas.</p>
        )}
      </div>
    </div>
  );
}
