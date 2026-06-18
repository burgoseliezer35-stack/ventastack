import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { Recibo } from "@/components/recibo";

export default async function ReciboPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) {
    redirect("/auth/login");
  }

  const { data: pedido } = await supabase
    .from("pedidos")
    .select("id, total, metodo_pago, created_at, clientes(nombre), companies(name)")
    .eq("id", id)
    .single();

  if (!pedido) {
    notFound();
  }

  const { data: detalle } = await supabase
    .from("detalle_pedidos")
    .select("cantidad, precio_unitario, subtotal, productos(nombre)")
    .eq("pedido_id", id);

  // Estas relaciones a veces llegan como objeto y a veces como
  // arreglo de un elemento, según la versión de los tipos — las
  // normalizamos por seguridad antes de pasarlas al componente.
  const normalizar = <T,>(valor: T | T[] | null | undefined): T | null =>
    Array.isArray(valor) ? valor[0] ?? null : valor ?? null;

  const cliente = normalizar(pedido.clientes as { nombre: string } | { nombre: string }[] | null);
  const empresa = normalizar(pedido.companies as { name: string } | { name: string }[] | null);

  const renglones = (detalle ?? []).map((d) => ({
    nombre:
      normalizar(d.productos as { nombre: string } | { nombre: string }[] | null)
        ?.nombre ?? "Producto",
    cantidad: d.cantidad,
    precioUnitario: d.precio_unitario,
    subtotal: d.subtotal,
  }));

  return (
    <Recibo
      pedidoId={pedido.id}
      empresa={empresa?.name ?? "Mi Negocio"}
      cliente={cliente?.nombre ?? "Público general"}
      metodoPago={pedido.metodo_pago}
      total={pedido.total}
      fecha={pedido.created_at}
      renglones={renglones}
    />
  );
}
