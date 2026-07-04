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
      .select("name, logo_url, rfc, razon_social, calle, colonia, ciudad, estado_empresa, codigo_postal, telefono, _deprecated_iva_porcentaje, _deprecated_iva_incluido, _deprecated_ieps_habilitado, _deprecated_ieps_porcentaje, pie_ticket")
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
        iva_porcentaje: (e._deprecated_iva_porcentaje as number | null) ?? null,
        iva_incluido: (e._deprecated_iva_incluido as boolean | null) ?? null,
        ieps_habilitado: (e._deprecated_ieps_habilitado as boolean | null) ?? null,
        ieps_porcentaje: (e._deprecated_ieps_porcentaje as number | null) ?? null,
        pie_ticket: (e.pie_ticket as string | null) ?? null,
      };
    }
  }

  const { data: detalle } = await supabase
    .from("detalle_pedidos")
    .select("cantidad, precio_unitario, subtotal, productos(nombre, iva_porcentaje, ieps_porcentaje)")
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

  const ivaIncluido = empresa?.iva_incluido ?? true;

  const renglones = (detalle ?? []).map((d) => {
    const prod = normalizar(d.productos as unknown as { nombre: string; iva_porcentaje?: number | null; ieps_porcentaje?: number | null } | null);
    // Fallback: si el detalle no tiene el % (pedido viejo anterior a la 045),
    // usamos el del producto; si tampoco, IVA 16% / IEPS 0%.
    const ivaPct: number = prod?.iva_porcentaje ?? 16;
    const iepsPct: number = prod?.ieps_porcentaje ?? 0;
    return {
      nombre: prod?.nombre ?? "Producto",
      cantidad: d.cantidad,
      precioUnitario: d.precio_unitario,
      subtotal: d.subtotal,
      iva_porcentaje: ivaPct,
      ieps_porcentaje: iepsPct,
    };
  });

  // ── Desglose de impuestos por tasa (estilo Bodega Aurrera) ──
  // Orden SAT: Base → IEPS sobre base → IVA sobre (base + IEPS)
  const r2 = (n: number) => Math.round(n * 100) / 100;
  const mapaIva: Record<number, { base: number; monto: number }> = {};
  const mapaIeps: Record<number, { base: number; monto: number }> = {};

  for (const ren of renglones) {
    const ivaPct = ren.iva_porcentaje / 100;
    const iepsPct = ren.ieps_porcentaje / 100;

    // Extraer base sin impuestos (si precio ya los incluye)
    const base = ivaIncluido
      ? r2(ren.subtotal / (1 + iepsPct + ivaPct + iepsPct * ivaPct))
      : ren.subtotal;

    const iepsMonto = r2(base * iepsPct);
    const ivaMonto = r2((base + iepsMonto) * ivaPct);

    if (ren.iva_porcentaje > 0) {
      if (!mapaIva[ren.iva_porcentaje]) mapaIva[ren.iva_porcentaje] = { base: 0, monto: 0 };
      mapaIva[ren.iva_porcentaje].base = r2(mapaIva[ren.iva_porcentaje].base + base);
      mapaIva[ren.iva_porcentaje].monto = r2(mapaIva[ren.iva_porcentaje].monto + ivaMonto);
    }
    if (ren.ieps_porcentaje > 0) {
      if (!mapaIeps[ren.ieps_porcentaje]) mapaIeps[ren.ieps_porcentaje] = { base: 0, monto: 0 };
      mapaIeps[ren.ieps_porcentaje].base = r2(mapaIeps[ren.ieps_porcentaje].base + base);
      mapaIeps[ren.ieps_porcentaje].monto = r2(mapaIeps[ren.ieps_porcentaje].monto + iepsMonto);
    }
  }

  const desgloseTasas = [
    ...Object.entries(mapaIeps).map(([pct, d]) => ({
      tipo: "IEPS" as const,
      pct: Number(pct),
      base: d.base,
      monto: d.monto,
    })),
    ...Object.entries(mapaIva).map(([pct, d]) => ({
      tipo: "IVA" as const,
      pct: Number(pct),
      base: d.base,
      monto: d.monto,
    })),
  ];

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
      ivaIncluido={ivaIncluido}
      iepsHabilitado={empresa?.ieps_habilitado ?? false}
      iepsPorcentaje={empresa?.ieps_porcentaje ?? 0}
      pieTicket={empresa?.pie_ticket ?? null}
      efectivoRecibido={(pedido as { efectivo_recibido?: number | null }).efectivo_recibido ?? null}
      cambio={(pedido as { cambio?: number | null }).cambio ?? null}
      desgloseTasas={desgloseTasas}
    />
  );
}
