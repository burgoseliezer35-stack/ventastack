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

  // Datos base del pedido
  const { data: pedido } = await supabase
    .from("pedidos")
    .select("id, total, metodo_pago, efectivo_recibido, cambio, created_at, vendedor_id, company_id, clientes(nombre)")
    .eq("id", id)
    .single();

  if (!pedido) notFound();

  // Datos de la empresa — select directo para traer todas las columnas extendidas
  const companyId = (pedido as { company_id?: string }).company_id;
  let empresa: {
    name: string; logo_url: string | null; rfc: string | null;
    razon_social: string | null; calle: string | null; colonia: string | null;
    ciudad: string | null; estado_empresa: string | null; codigo_postal: string | null;
    telefono: string | null; iva_porcentaje: number | null; iva_incluido: boolean | null;
    ieps_habilitado: boolean | null; ieps_porcentaje: number | null;
    pie_ticket?: string | null;
  } | null = null;

  if (companyId) {
    // Un solo select con todos los campos para evitar que RLS bloquee alguno
    const { data: emp } = await supabase
      .from("companies")
      .select("name, logo_url, rfc, razon_social, calle, colonia, ciudad, estado_empresa, codigo_postal, telefono, iva_porcentaje, iva_incluido, ieps_habilitado, ieps_porcentaje, pie_ticket")
      .eq("id", companyId)
      .single();

    if (emp) {
      const e = emp as Record<string, unknown>;
      empresa = {
        name: (e.name as string) ?? "Mi Negocio",
        logo_url: (e.logo_url as string | null) ?? null,
        rfc: (e.rfc as string | null) ?? null,
        razon_social: (e.razon_social as string | null) ?? null,
        calle: (e.calle as string | null) ?? null,
        colonia: (e.colonia as string | null) ?? null,
        ciudad: (e.ciudad as string | null) ?? null,
        estado_empresa: (e.estado_empresa as string | null) ?? null,
        codigo_postal: (e.codigo_postal as string | null) ?? null,
        telefono: (e.telefono as string | null) ?? null,
        iva_porcentaje: (e.iva_porcentaje as number | null) ?? null,
        iva_incluido: (e.iva_incluido as boolean | null) ?? null,
        ieps_habilitado: (e.ieps_habilitado as boolean | null) ?? null,
        ieps_porcentaje: (e.ieps_porcentaje as number | null) ?? null,
        pie_ticket: (e.pie_ticket as string | null) ?? null,
      };
    }
  }

  const { data: detalle } = await supabase
    .from("detalle_pedidos")
    .select("cantidad, precio_unitario, subtotal, productos(nombre)")
    .eq("pedido_id", id);

  // Nombre del vendedor — preferir full_name, si es email usar la parte antes del @
  const { data: vendedorPerfil } = await supabase
    .from("profiles")
    .select("full_name, username")
    .eq("id", pedido.vendedor_id ?? userId)
    .single();

  const resolverNombreVendedor = () => {
    const nombre = vendedorPerfil?.full_name ?? "";
    // Si full_name parece un email, usar username o la parte antes del @
    if (nombre.includes("@")) {
      if (vendedorPerfil?.username) return vendedorPerfil.username;
      return nombre.split("@")[0];
    }
    return nombre || null;
  };

  const normalizar = <T,>(v: T | T[] | null | undefined): T | null =>
    Array.isArray(v) ? v[0] ?? null : v ?? null;

  const cliente = normalizar(pedido.clientes as unknown as { nombre: string } | null);

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
      atendidoPor={resolverNombreVendedor()}
      ivaPorcentaje={empresa?.iva_porcentaje ?? 0}
      ivaIncluido={empresa?.iva_incluido ?? true}
      iepsHabilitado={empresa?.ieps_habilitado ?? false}
      iepsPorcentaje={empresa?.ieps_porcentaje ?? 0}
      pieTicket={empresa?.pie_ticket ?? null}
      efectivoRecibido={(pedido as { efectivo_recibido?: number | null }).efectivo_recibido ?? null}
      cambio={(pedido as { cambio?: number | null }).cambio ?? null}
    />
  );
}
