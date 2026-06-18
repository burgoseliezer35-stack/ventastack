import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { DevolucionForm } from "@/components/devolucion-form";

export default async function NuevaDevolucionPage({
  searchParams,
}: {
  searchParams: Promise<{ pedido_id?: string }>;
}) {
  const { pedido_id } = await searchParams;
  const supabase = await createClient();

  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) {
    redirect("/auth/login");
  }

  if (!pedido_id) {
    return (
      <div className="flex flex-col items-center gap-4 py-12 text-center">
        <p className="max-w-sm text-sm text-ink/60">
          Para devolver algo, primero elige la venta desde el historial.
        </p>
        <Link
          href="/protected/pedidos"
          className="rounded-md bg-primario px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
        >
          Ver historial de ventas
        </Link>
      </div>
    );
  }

  const { data: pedido } = await supabase
    .from("pedidos")
    .select("id, total, metodo_pago, created_at, clientes(nombre)")
    .eq("id", pedido_id)
    .single();

  if (!pedido) {
    notFound();
  }

  const { data: detalle } = await supabase
    .from("detalle_pedidos")
    .select("producto_id, cantidad, precio_unitario, productos(nombre)")
    .eq("pedido_id", pedido_id);

  // Cuánto ya se devolvió de este pedido, por producto — para no
  // dejar devolver más de lo que de verdad queda disponible.
  const { data: devolucionesDeEstePedido } = await supabase
    .from("devoluciones")
    .select("id")
    .eq("pedido_id", pedido_id);

  const idsDevoluciones = (devolucionesDeEstePedido ?? []).map((d) => d.id);

  const { data: devolucionesPrevias } = idsDevoluciones.length
    ? await supabase
        .from("detalle_devoluciones")
        .select("producto_id, cantidad")
        .in("devolucion_id", idsDevoluciones)
    : { data: [] };

  const yaDevuelto = new Map<string, number>();
  for (const d of devolucionesPrevias ?? []) {
    yaDevuelto.set(d.producto_id, (yaDevuelto.get(d.producto_id) ?? 0) + d.cantidad);
  }

  const cliente = Array.isArray(pedido.clientes)
    ? pedido.clientes[0]
    : pedido.clientes;

  const items = (detalle ?? []).map((d) => {
    const producto = Array.isArray(d.productos) ? d.productos[0] : d.productos;
    const disponible = d.cantidad - (yaDevuelto.get(d.producto_id) ?? 0);
    return {
      producto_id: d.producto_id,
      nombre: producto?.nombre ?? "Producto",
      precio_unitario: d.precio_unitario,
      disponible,
    };
  });

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="text-center">
        <h1 className="text-xl font-bold text-ink">Registrar devolución</h1>
        <p className="text-sm text-ink/60">
          {cliente?.nombre ?? "Público general"} ·{" "}
          {new Date(pedido.created_at).toLocaleDateString("es-MX")} ·{" "}
          {pedido.metodo_pago}
        </p>
      </div>
      <DevolucionForm pedidoId={pedido.id} items={items} />
    </div>
  );
}
