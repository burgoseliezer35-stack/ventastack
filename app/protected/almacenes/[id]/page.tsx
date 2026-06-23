import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowRightLeft } from "lucide-react";

export default async function AlmacenDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) redirect("/auth/login");

  const { data: almacen } = await supabase
    .from("almacenes").select("*").eq("id", id).single();
  if (!almacen) notFound();

  const { data: stock } = await supabase
    .from("stock_almacen")
    .select("cantidad, productos(id, nombre, codigo_barras, precio)")
    .eq("almacen_id", id)
    .gt("cantidad", 0)
    .order("cantidad", { ascending: false });

  const { data: transferencias } = await supabase
    .from("transferencias_almacen")
    .select("id, estado, created_at, almacenes!almacen_origen_id(nombre), almacenes!almacen_destino_id(nombre)")
    .or(`almacen_origen_id.eq.${id},almacen_destino_id.eq.${id}`)
    .order("created_at", { ascending: false })
    .limit(10);

  const totalUnidades = (stock ?? []).reduce((s, i) => s + i.cantidad, 0);
  const totalValor = (stock ?? []).reduce((s, i) => {
    const p = Array.isArray(i.productos) ? i.productos[0] : i.productos;
    return s + i.cantidad * (p?.precio ?? 0);
  }, 0);

  return (
    <div className="flex flex-col gap-5 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-ink">{almacen.nombre}</h1>
          <p className="text-sm text-ink/60 capitalize">{almacen.tipo}</p>
        </div>
        <div className="flex gap-2">
          <Link href="/protected/almacenes/transferencia"
            className="flex items-center gap-1.5 rounded-md bg-primario px-3 py-2 text-sm font-medium text-white hover:opacity-90 transition">
            <ArrowRightLeft size={15} />
            Transferir
          </Link>
          <Link href="/protected/almacenes" className="text-sm text-primario hover:underline self-center">
            Regresar
          </Link>
        </div>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-linea bg-white p-4 text-center shadow-sm">
          <p className="text-xs text-ink/50">Total unidades</p>
          <p className="text-2xl font-bold text-ink">{totalUnidades.toLocaleString("en-US")}</p>
        </div>
        <div className="rounded-xl border border-linea bg-white p-4 text-center shadow-sm">
          <p className="text-xs text-ink/50">Valor en inventario</p>
          <p className="text-2xl font-bold text-primario cifra">
            ${totalValor.toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      {/* Stock por producto */}
      <div className="overflow-hidden rounded-xl border border-linea bg-white shadow-sm">
        <div className="border-b border-linea bg-primario-suave px-4 py-3">
          <h2 className="font-semibold text-ink">Stock en este almacén</h2>
        </div>
        {!stock?.length ? (
          <p className="px-4 py-8 text-center text-sm text-ink/40">Sin productos en este almacén todavía.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-primario text-left text-xs font-semibold uppercase tracking-wide text-white">
                <th className="px-4 py-2.5">Producto</th>
                <th className="px-4 py-2.5 text-right">Cantidad</th>
                <th className="px-4 py-2.5 text-right">Valor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-linea">
              {stock.map((s, idx) => {
                const p = Array.isArray(s.productos) ? s.productos[0] : s.productos;
                return (
                  <tr key={idx} className={idx % 2 === 1 ? "bg-paper/60" : ""}>
                    <td className="px-4 py-2.5 text-ink">{p?.nombre ?? "—"}</td>
                    <td className="px-4 py-2.5 text-right font-medium text-ink">{s.cantidad}</td>
                    <td className="cifra px-4 py-2.5 text-right text-ink/70">
                      ${(s.cantidad * (p?.precio ?? 0)).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Historial de transferencias */}
      {transferencias && transferencias.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-linea bg-white shadow-sm">
          <div className="border-b border-linea bg-primario-suave px-4 py-3">
            <h2 className="font-semibold text-ink">Transferencias recientes</h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-primario text-left text-xs font-semibold uppercase tracking-wide text-white">
                <th className="px-4 py-2.5">Fecha</th>
                <th className="px-4 py-2.5">Origen → Destino</th>
                <th className="px-4 py-2.5">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-linea">
              {transferencias.map((t, idx) => {
                const origen = Array.isArray(t.almacenes) ? t.almacenes[0] : t.almacenes;
                return (
                  <tr key={t.id} className={idx % 2 === 1 ? "bg-paper/60" : ""}>
                    <td className="px-4 py-2.5 text-xs text-ink/60">
                      {new Date(t.created_at).toLocaleDateString("es-MX")}
                    </td>
                    <td className="px-4 py-2.5 text-ink text-xs">
                      {(origen as {nombre:string} | null)?.nombre ?? "—"}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        t.estado === "completada" ? "bg-verde-suave text-verde" :
                        t.estado === "pendiente" ? "bg-amber-100 text-amber-700" :
                        "bg-red-100 text-red-700"
                      }`}>{t.estado}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
