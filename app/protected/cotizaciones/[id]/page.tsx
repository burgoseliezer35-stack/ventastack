import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";

export default async function DetalleCotizacionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: cotizacion } = await supabase
    .from("cotizaciones")
    .select("id, total, nota, valida_hasta, created_at, clientes(nombre)")
    .eq("id", id)
    .single();

  if (!cotizacion) {
    notFound();
  }

  const { data: detalle } = await supabase
    .from("detalle_cotizaciones")
    .select("cantidad, precio_unitario, subtotal, productos(nombre)")
    .eq("cotizacion_id", id);

  const cliente = Array.isArray(cotizacion.clientes)
    ? cotizacion.clientes[0]
    : cotizacion.clientes;

  const hoy = new Date().toISOString().slice(0, 10);
  const vencida = cotizacion.valida_hasta && cotizacion.valida_hasta < hoy;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-ink">
          Cotización — {cliente?.nombre ?? "Público general"}
        </h1>
        <p className="text-sm text-ink/60">
          {new Date(cotizacion.created_at).toLocaleDateString("es-MX")}
          {cotizacion.valida_hasta &&
            ` · válida hasta ${cotizacion.valida_hasta}${vencida ? " (vencida)" : ""}`}
          {cotizacion.nota ? ` · ${cotizacion.nota}` : ""}
        </p>
      </div>

      <div className="rounded-lg border border-linea bg-white p-4">
        <ul className="flex flex-col gap-2">
          {detalle?.map((d, i) => {
            const producto = Array.isArray(d.productos)
              ? d.productos[0]?.nombre
              : (d.productos as { nombre: string } | null)?.nombre;
            return (
              <li
                key={i}
                className="flex items-center justify-between border-b border-linea pb-2 text-sm last:border-0"
              >
                <span className="text-ink">{producto ?? "Producto"}</span>
                <span className="cifra text-ink/60">
                  {d.cantidad} × ${d.precio_unitario.toFixed(2)} = $
                  {d.subtotal.toFixed(2)}
                </span>
              </li>
            );
          })}
        </ul>
        <div className="mt-3 flex justify-between border-t border-linea pt-3 text-sm font-semibold text-ink">
          <span>Total</span>
          <span className="cifra">${cotizacion.total.toFixed(2)}</span>
        </div>
      </div>

      <Link href="/protected/cotizaciones" className="text-sm text-primario hover:underline">
        Regresar al historial
      </Link>
    </div>
  );
}
