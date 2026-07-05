import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { MisPedidosUI } from "./mis-pedidos-ui";

export default async function MisPedidosPage() {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) redirect("/auth/login");

  const userId = data.claims.sub as string;

  // Pedidos de domicilio asignados a este repartidor.
  // RLS ya filtra por company_id; aquí filtramos por repartidor.
  const { data: pedidos } = await supabase
    .from("pedidos")
    .select(`
      id, total, metodo_pago, direccion_entrega, estado_reparto, created_at,
      efectivo_recibido,
      clientes ( nombre, telefono ),
      detalle_pedidos ( cantidad, precio_unitario, productos ( nombre ) )
    `)
    .eq("repartidor_id", userId)
    .eq("es_domicilio", true)
    .in("estado_reparto", ["pendiente", "en_camino", "entregado", "no_entregado"])
    .order("created_at", { ascending: false })
    .limit(50);

  // Normalizar el shape para el cliente
  const normalizados = (pedidos ?? []).map((p) => {
    const cliente = Array.isArray(p.clientes) ? p.clientes[0] : p.clientes;
    return {
      id: p.id,
      total: p.total,
      metodo_pago: p.metodo_pago,
      direccion_entrega: p.direccion_entrega,
      estado_reparto: p.estado_reparto,
      created_at: p.created_at,
      cliente_nombre: (cliente as { nombre?: string } | null)?.nombre ?? "Público general",
      cliente_telefono: (cliente as { telefono?: string | null } | null)?.telefono ?? null,
      items: (p.detalle_pedidos ?? []).map((d) => {
        const prod = Array.isArray(d.productos) ? d.productos[0] : d.productos;
        return {
          nombre: (prod as { nombre?: string } | null)?.nombre ?? "Producto",
          cantidad: d.cantidad,
          precio: d.precio_unitario,
        };
      }),
    };
  });

  return <MisPedidosUI pedidos={normalizados} />;
}
