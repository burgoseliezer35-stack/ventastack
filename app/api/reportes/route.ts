import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import * as XLSX from "xlsx";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const desde = searchParams.get("desde") ?? new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
  const hasta = searchParams.get("hasta") ?? new Date().toISOString();

  // Pedidos del período con detalles
  const { data: pedidos } = await supabase
    .from("pedidos")
    .select("id, total, metodo_pago, created_at, estado, clientes(nombre), profiles!vendedor_id(full_name)")
    .gte("created_at", desde)
    .lte("created_at", hasta)
    .eq("estado", "confirmado")
    .order("created_at", { ascending: false });

  const { data: detalle } = await supabase
    .from("detalle_pedidos")
    .select("pedido_id, cantidad, precio_unitario, subtotal, productos(nombre, costo)")
    .in("pedido_id", (pedidos ?? []).map((p) => p.id));

  const wb = XLSX.utils.book_new();

  // ── Hoja 1: Resumen de ventas ──
  const normalizar = <T,>(v: T | T[] | null): T | null =>
    Array.isArray(v) ? v[0] ?? null : v ?? null;

  const filasPedidos = (pedidos ?? []).map((p) => {
    const cliente = normalizar(p.clientes as unknown as { nombre: string } | null);
    const vendedor = normalizar(p.profiles as unknown as { full_name: string } | null);
    return {
      "Folio": p.id.slice(0, 8).toUpperCase(),
      "Fecha": new Date(p.created_at).toLocaleString("es-MX"),
      "Cliente": cliente?.nombre ?? "Público general",
      "Vendedor": vendedor?.full_name ?? "—",
      "Método pago": p.metodo_pago,
      "Total": p.total,
    };
  });

  const ws1 = XLSX.utils.json_to_sheet(filasPedidos);
  ws1["!cols"] = [{ wch: 10 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 15 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(wb, ws1, "Ventas");

  // ── Hoja 2: Detalle de productos vendidos ──
  const productosAgrupados: Record<string, { nombre: string; unidades: number; total: number; ganancia: number }> = {};
  for (const d of detalle ?? []) {
    const prod = normalizar(d.productos as unknown as { nombre: string; costo: number } | null);
    const nombre = prod?.nombre ?? "Producto";
    if (!productosAgrupados[nombre]) {
      productosAgrupados[nombre] = { nombre, unidades: 0, total: 0, ganancia: 0 };
    }
    productosAgrupados[nombre].unidades += d.cantidad;
    productosAgrupados[nombre].total += d.subtotal;
    productosAgrupados[nombre].ganancia += (d.precio_unitario - (prod?.costo ?? 0)) * d.cantidad;
  }

  const filasProductos = Object.values(productosAgrupados)
    .sort((a, b) => b.total - a.total)
    .map((p) => ({
      "Producto": p.nombre,
      "Unidades vendidas": p.unidades,
      "Total vendido": p.total,
      "Ganancia": p.ganancia,
    }));

  const ws2 = XLSX.utils.json_to_sheet(filasProductos);
  ws2["!cols"] = [{ wch: 30 }, { wch: 18 }, { wch: 15 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(wb, ws2, "Por producto");

  // ── Hoja 3: Por método de pago ──
  const porMetodo: Record<string, { ventas: number; total: number }> = {};
  for (const p of pedidos ?? []) {
    if (!porMetodo[p.metodo_pago]) porMetodo[p.metodo_pago] = { ventas: 0, total: 0 };
    porMetodo[p.metodo_pago].ventas += 1;
    porMetodo[p.metodo_pago].total += p.total;
  }
  const ws3 = XLSX.utils.json_to_sheet(
    Object.entries(porMetodo).map(([m, d]) => ({
      "Método": m, "# Ventas": d.ventas, "Total": d.total,
    }))
  );
  XLSX.utils.book_append_sheet(wb, ws3, "Por método pago");

  // Generar el archivo
  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  const fechaStr = new Date().toISOString().slice(0, 10);

  return new NextResponse(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="reporte_ventastack_${fechaStr}.xlsx"`,
    },
  });
}
