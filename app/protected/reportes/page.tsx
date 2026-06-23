import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function ReportesPage() {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) redirect("/auth/login");

  const userId = data.claims.sub as string;
  const { data: miPerfil } = await supabase
    .from("profiles")
    .select("role, company_id")
    .eq("id", userId)
    .single();

  if (miPerfil?.role !== "admin") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-paper px-4 text-center">
        <p className="text-sm text-ink/70">Solo el admin puede ver reportes.</p>
        <Link href="/protected" className="text-sm text-primario hover:underline">Regresar</Link>
      </div>
    );
  }

  const ahora = new Date();
  const inicioHoy = new Date(ahora); inicioHoy.setHours(0, 0, 0, 0);
  const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
  const inicioSemana = new Date(ahora); inicioSemana.setDate(ahora.getDate() - 6); inicioSemana.setHours(0,0,0,0);

  // Pedidos del mes con vendedor
  const { data: pedidosMes } = await supabase
    .from("pedidos")
    .select("id, total, metodo_pago, created_at, profiles(full_name)")
    .gte("created_at", inicioMes.toISOString())
    .eq("estado", "confirmado");

  const normalizar = <T,>(v: T | T[] | null | undefined): T | null =>
    Array.isArray(v) ? v[0] ?? null : v ?? null;

  const ventasHoy = (pedidosMes ?? []).filter(p => new Date(p.created_at) >= inicioHoy);
  const totalHoy = ventasHoy.reduce((s, p) => s + p.total, 0);
  const totalMes = (pedidosMes ?? []).reduce((s, p) => s + p.total, 0);

  // Ventas por día (últimos 7 días)
  const ventasPorDia: Record<string, number> = {};
  for (let i = 6; i >= 0; i--) {
    const d = new Date(ahora); d.setDate(d.getDate() - i); d.setHours(0,0,0,0);
    const key = d.toLocaleDateString("es-MX", { weekday: "short", day: "numeric" });
    ventasPorDia[key] = 0;
  }
  for (const p of pedidosMes ?? []) {
    const d = new Date(p.created_at);
    if (d >= inicioSemana) {
      const key = d.toLocaleDateString("es-MX", { weekday: "short", day: "numeric" });
      if (key in ventasPorDia) ventasPorDia[key] += p.total;
    }
  }
  const maxDia = Math.max(...Object.values(ventasPorDia), 1);

  // Por método de pago
  const porMetodo: Record<string, { total: number; count: number }> = {};
  for (const p of pedidosMes ?? []) {
    if (!porMetodo[p.metodo_pago]) porMetodo[p.metodo_pago] = { total: 0, count: 0 };
    porMetodo[p.metodo_pago].total += p.total;
    porMetodo[p.metodo_pago].count += 1;
  }

  // Por vendedor
  const porVendedor: Record<string, { total: number; count: number }> = {};
  for (const p of pedidosMes ?? []) {
    const v = normalizar(p.profiles as unknown as { full_name: string } | null);
    const nombre = v?.full_name ?? "Sin vendedor";
    if (!porVendedor[nombre]) porVendedor[nombre] = { total: 0, count: 0 };
    porVendedor[nombre].total += p.total;
    porVendedor[nombre].count += 1;
  }

  // Por producto
  const { data: detalleMes } = await supabase
    .from("detalle_pedidos")
    .select("cantidad, precio_unitario, productos(nombre, costo), pedidos!inner(created_at, estado)")
    .gte("pedidos.created_at", inicioMes.toISOString())
    .eq("pedidos.estado", "confirmado");

  const porProducto: Record<string, { unidades: number; total: number; ganancia: number }> = {};
  let gananciaVentas = 0;

  for (const d of detalleMes ?? []) {
    const prod = normalizar(d.productos as unknown as { nombre: string; costo: number } | null);
    const nombre = prod?.nombre ?? "Producto";
    const costo = prod?.costo ?? 0;
    const subtotal = d.precio_unitario * Number(d.cantidad);
    const gan = (d.precio_unitario - costo) * Number(d.cantidad);
    if (!porProducto[nombre]) porProducto[nombre] = { unidades: 0, total: 0, ganancia: 0 };
    porProducto[nombre].unidades += Number(d.cantidad);
    porProducto[nombre].total += subtotal;
    porProducto[nombre].ganancia += gan;
    gananciaVentas += gan;
  }

  const topProductos = Object.entries(porProducto)
    .sort((a, b) => b[1].unidades - a[1].unidades)
    .slice(0, 8);

  // Clientes con saldo por cobrar
  const { data: clientesSaldo } = await supabase
    .from("clientes")
    .select("nombre, saldo_actual")
    .gt("saldo_actual", 0)
    .order("saldo_actual", { ascending: false })
    .limit(5);

  const totalPorCobrar = (clientesSaldo ?? []).reduce((s, c) => s + c.saldo_actual, 0);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-bold text-ink">Reportes</h1>
        <div className="flex gap-2">
          <a
            href="/api/reportes"
            download
            className="flex items-center gap-1.5 rounded-md bg-verde px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition"
          >
            ⬇️ Exportar Excel
          </a>
        </div>
      </div>

      {/* Tarjetas resumen */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Ventas hoy", valor: totalHoy, sub: `${ventasHoy.length} ventas`, color: "text-ink" },
          { label: "Ventas del mes", valor: totalMes, sub: `${pedidosMes?.length ?? 0} ventas`, color: "text-ink" },
          { label: "Ganancia del mes", valor: gananciaVentas, sub: "venta menos costo", color: "text-verde" },
          { label: "Por cobrar", valor: totalPorCobrar, sub: `${clientesSaldo?.length ?? 0} clientes`, color: "text-amber-600" },
        ].map((t) => (
          <div key={t.label} className="rounded-xl border border-linea bg-white p-4 text-center shadow-sm">
            <p className="text-xs text-ink/50">{t.label}</p>
            <p className={`cifra text-lg font-bold ${t.color}`}>${t.valor.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}</p>
            <p className="text-xs text-ink/40">{t.sub}</p>
          </div>
        ))}
      </div>

      {/* Gráfica de barras — ventas últimos 7 días */}
      <div className="rounded-xl border border-linea bg-white p-4 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold text-ink">Ventas últimos 7 días</h2>
        <div className="flex items-end gap-2 h-28">
          {Object.entries(ventasPorDia).map(([dia, total]) => (
            <div key={dia} className="flex flex-1 flex-col items-center gap-1">
              <span className="text-[9px] text-ink/50 cifra">${total > 0 ? total.toFixed(0) : ""}</span>
              <div
                className="w-full rounded-t-md bg-primario transition-all"
                style={{ height: `${Math.max((total / maxDia) * 80, total > 0 ? 4 : 0)}px` }}
              />
              <span className="text-[9px] text-ink/60 text-center">{dia}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Por vendedor */}
        <div className="rounded-xl border border-linea bg-white shadow-sm overflow-hidden">
          <div className="border-b border-linea bg-primario-suave px-4 py-3">
            <h2 className="text-sm font-semibold text-ink">Ventas por vendedor (este mes)</h2>
          </div>
          {Object.keys(porVendedor).length ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-primario text-left text-xs font-semibold uppercase text-white">
                  <th className="px-4 py-2">Vendedor</th>
                  <th className="px-4 py-2 text-right">Ventas</th>
                  <th className="px-4 py-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-linea">
                {Object.entries(porVendedor)
                  .sort((a, b) => b[1].total - a[1].total)
                  .map(([nombre, datos]) => (
                    <tr key={nombre}>
                      <td className="px-4 py-2 text-ink">{nombre}</td>
                      <td className="px-4 py-2 text-right text-ink/60">{datos.count}</td>
                      <td className="px-4 py-2 text-right font-medium text-ink cifra">${datos.total.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          ) : <p className="px-4 py-6 text-sm text-ink/40">Sin datos.</p>}
        </div>

        {/* Por método de pago */}
        <div className="rounded-xl border border-linea bg-white shadow-sm overflow-hidden">
          <div className="border-b border-linea bg-primario-suave px-4 py-3">
            <h2 className="text-sm font-semibold text-ink">Por método de pago (este mes)</h2>
          </div>
          {Object.keys(porMetodo).length ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-primario text-left text-xs font-semibold uppercase text-white">
                  <th className="px-4 py-2">Método</th>
                  <th className="px-4 py-2 text-right">Ventas</th>
                  <th className="px-4 py-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-linea">
                {Object.entries(porMetodo)
                  .sort((a, b) => b[1].total - a[1].total)
                  .map(([metodo, datos]) => (
                    <tr key={metodo}>
                      <td className="px-4 py-2 capitalize text-ink">{metodo}</td>
                      <td className="px-4 py-2 text-right text-ink/60">{datos.count}</td>
                      <td className="px-4 py-2 text-right font-medium text-ink cifra">${datos.total.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          ) : <p className="px-4 py-6 text-sm text-ink/40">Sin datos.</p>}
        </div>

        {/* Top productos */}
        <div className="rounded-xl border border-linea bg-white shadow-sm overflow-hidden">
          <div className="border-b border-linea bg-primario-suave px-4 py-3">
            <h2 className="text-sm font-semibold text-ink">Productos más vendidos (este mes)</h2>
          </div>
          {topProductos.length ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-primario text-left text-xs font-semibold uppercase text-white">
                  <th className="px-4 py-2">Producto</th>
                  <th className="px-4 py-2 text-right">Uds.</th>
                  <th className="px-4 py-2 text-right">Total</th>
                  <th className="px-4 py-2 text-right">Ganancia</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-linea">
                {topProductos.map(([nombre, datos]) => (
                  <tr key={nombre}>
                    <td className="px-4 py-2 text-ink">{nombre}</td>
                    <td className="px-4 py-2 text-right text-ink/60">{datos.unidades}</td>
                    <td className="px-4 py-2 text-right text-ink cifra">${datos.total.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}</td>
                    <td className="px-4 py-2 text-right text-verde cifra">${datos.ganancia.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <p className="px-4 py-6 text-sm text-ink/40">Sin ventas este mes.</p>}
        </div>

        {/* Clientes con saldo */}
        <div className="rounded-xl border border-linea bg-white shadow-sm overflow-hidden">
          <div className="border-b border-linea bg-primario-suave px-4 py-3">
            <h2 className="text-sm font-semibold text-ink">Clientes con saldo por cobrar</h2>
          </div>
          {clientesSaldo?.length ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-primario text-left text-xs font-semibold uppercase text-white">
                  <th className="px-4 py-2">Cliente</th>
                  <th className="px-4 py-2 text-right">Saldo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-linea">
                {clientesSaldo.map((c) => (
                  <tr key={c.nombre}>
                    <td className="px-4 py-2 text-ink">{c.nombre}</td>
                    <td className="px-4 py-2 text-right font-medium text-amber-600 cifra">${c.saldo_actual.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <p className="px-4 py-6 text-sm text-ink/40">Todos al corriente.</p>}
        </div>
      </div>
    </div>
  );
}
