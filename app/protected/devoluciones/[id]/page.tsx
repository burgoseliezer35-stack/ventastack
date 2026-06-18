import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";

export default async function DetalleDevolucionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: devolucion } = await supabase
    .from("devoluciones")
    .select("id, pedido_id, total, nota, created_at, clientes(nombre)")
    .eq("id", id)
    .single();

  if (!devolucion) {
    notFound();
  }

  const { data: detalle } = await supabase
    .from("detalle_devoluciones")
    .select("cantidad, precio_unitario, subtotal, productos(nombre)")
    .eq("devolucion_id", id);

  const { data: pedido } = await supabase
    .from("pedidos")
    .select("metodo_pago")
    .eq("id", devolucion.pedido_id)
    .single();

  const cliente = Array.isArray(devolucion.clientes)
    ? devolucion.clientes[0]
    : devolucion.clientes;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-ink">
          Devolución — {cliente?.nombre ?? "Público general"}
        </h1>
        <p className="text-sm text-ink/60">
          {new Date(devolucion.created_at).toLocaleString("es-MX")}
          {devolucion.nota ? ` · ${devolucion.nota}` : ""}
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
          <span>Total devuelto</span>
          <span className="cifra">${devolucion.total.toFixed(2)}</span>
        </div>
      </div>

      <div className="rounded-lg border border-dashed border-linea bg-paper p-4 text-sm text-ink/60">
        <p className="font-medium text-ink">Esto se ajustó solo:</p>
        <p className="mt-1">El stock de cada producto ya subió de vuelta.</p>
        {pedido?.metodo_pago === "credito" && (
          <p>La deuda del cliente ya bajó en ${devolucion.total.toFixed(2)}.</p>
        )}
        {pedido?.metodo_pago === "efectivo" && (
          <p>
            Si había una caja abierta, ya se anotó la salida de $
            {devolucion.total.toFixed(2)}.
          </p>
        )}
      </div>

      <Link href="/protected/devoluciones" className="text-sm text-primario hover:underline">
        Regresar al historial
      </Link>
    </div>
  );
}
