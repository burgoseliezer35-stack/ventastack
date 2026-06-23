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
  if (error || !data?.claims) redirect("/auth/login");

  const userId = data.claims.sub as string;

  const { data: pedido } = await supabase
    .from("pedidos")
    .select("id, total, metodo_pago, created_at, vendedor_id, clientes(nombre), companies(name, logo_url, rfc, razon_social, calle, colonia, ciudad, estado_empresa, codigo_postal, telefono, iva_porcentaje, iva_incluido, ieps_habilitado, ieps_porcentaje)")
    .eq("id", id)
    .single();

  if (!pedido) notFound();

  const { data: detalle } = await supabase
    .from("detalle_pedidos")
    .select("cantidad, precio_unitario, subtotal, productos(nombre)")
    .eq("pedido_id", id);

  // Nombre de quien atendió — vendedor_id o el usuario actual
  const { data: vendedorPerfil } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", pedido.vendedor_id ?? userId)
    .single();

  const normalizar = <T,>(v: T | T[] | null | undefined): T | null =>
    Array.isArray(v) ? v[0] ?? null : v ?? null;

  const cliente = normalizar(pedido.clientes as unknown as { nombre: string } | null);
  const empresa = normalizar(pedido.companies as unknown as {
    name: string; logo_url: string | null; rfc: string | null;
    razon_social: string | null; calle: string | null; colonia: string | null;
    ciudad: string | null; estado_empresa: string | null; codigo_postal: string | null;
    telefono: string | null; iva_porcentaje: number | null; iva_incluido: boolean | null;
    ieps_habilitado: boolean | null; ieps_porcentaje: number | null;
  } | null);

  const renglones = (detalle ?? []).map((d) => ({
    nombre: normalizar(d.productos as unknown as { nombre: string } | null)?.nombre ?? "Producto",
    cantidad: d.cantidad,
    precioUnitario: d.precio_unitario,
    subtotal: d.subtotal,
  }));

  const direccion = [
    empresa?.calle, empresa?.colonia, empresa?.ciudad,
    empresa?.estado_empresa, empresa?.codigo_postal,
  ].filter(Boolean).join(", ");

  return (
    <Recibo
      pedidoId={pedido.id}
      empresa={empresa?.name ?? "Mi Negocio"}
      logoUrl={empresa?.logo_url ?? null}
      razonSocial={empresa?.razon_social ?? null}
      rfc={empresa?.rfc ?? null}
      direccion={direccion}
      telefono={empresa?.telefono ?? null}
      cliente={cliente?.nombre ?? "Público general"}
      metodoPago={pedido.metodo_pago}
      total={pedido.total}
      fecha={pedido.created_at}
      renglones={renglones}
      atendidoPor={vendedorPerfil?.full_name ?? null}
      ivaPorcentaje={empresa?.iva_porcentaje ?? 0}
      ivaIncluido={empresa?.iva_incluido ?? true}
      iepsHabilitado={empresa?.ieps_habilitado ?? false}
      iepsPorcentaje={empresa?.ieps_porcentaje ?? 0}
    />
  );
}
