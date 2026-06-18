import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function ReportesPage() {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) {
    redirect("/auth/login");
  }

  const userId = data.claims.sub as string;

  const { data: miPerfil } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();

  if (miPerfil?.role !== "admin") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-paper px-4 text-center">
        <p className="text-sm text-ink/70">
          Solo el admin de la empresa puede ver esta página.
        </p>
        <Link href="/protected" className="text-sm text-primario hover:underline">
          Regresar
        </Link>
      </div>
    );
  }

  const ahora = new Date();
  const inicioHoy = new Date(ahora);
  inicioHoy.setHours(0, 0, 0, 0);
  const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);

  const { data: pedidosMes } = await supabase
    .from("pedidos")
    .select("total, metodo_pago, created_at")
    .gte("created_at", inicioMes.toISOString());

  const ventasHoy = (pedidosMes ?? []).filter(
    (p) => new Date(p.created_at) >= inicioHoy,
  );
  const totalHoy = ventasHoy.reduce((suma, p) => suma + p.total, 0);
  const totalMes = (pedidosMes ?? []).reduce((suma, p) => suma + p.total, 0);

  const porMetodo: Record<string, number> = {};
  for (const p of pedidosMes ?? []) {
    porMetodo[p.metodo_pago] = (porMetodo[p.metodo_pago] ?? 0) + p.total;
  }

  const normalizar = <T,>(valor: T | T[] | null | undefined): T | null =>
    Array.isArray(valor) ? valor[0] ?? null : valor ?? null;

  // Para el top de productos y la ganancia necesitamos cruzar con
  // pedidos.created_at; "!inner" fuerza ese cruce para poder
  // filtrar por la fecha del pedido, no del renglón.
  const { data: detalleMes } = await supabase
    .from("detalle_pedidos")
    .select("cantidad, precio_unitario, productos(nombre, costo), pedidos!inner(created_at)")
    .gte("pedidos.created_at", inicioMes.toISOString());

  const conteoProductos: Record<string, number> = {};
  let gananciaVentas = 0;
  let hayProductoSinCosto = false;

  for (const d of detalleMes ?? []) {
    const producto = normalizar(
      d.productos as { nombre: string; costo: number } | { nombre: string; costo: number }[] | null,
    );
    const nombre = producto?.nombre ?? "Producto";
    conteoProductos[nombre] = (conteoProductos[nombre] ?? 0) + Number(d.cantidad);

    const costo = producto?.costo ?? 0;
    if (costo === 0) hayProductoSinCosto = true;
    gananciaVentas += (d.precio_unitario - costo) * Number(d.cantidad);
  }

  // Las devoluciones de este mes restan de la ganancia — lo que se
  // devolvió ya no se vendió de verdad.
  const { data: devolucionesMes } = await supabase
    .from("detalle_devoluciones")
    .select("cantidad, precio_unitario, productos(costo), devoluciones!inner(created_at)")
    .gte("devoluciones.created_at", inicioMes.toISOString());

  let gananciaDevuelta = 0;
  for (const d of devolucionesMes ?? []) {
    const producto = normalizar(
      d.productos as { costo: number } | { costo: number }[] | null,
    );
    gananciaDevuelta += (d.precio_unitario - (producto?.costo ?? 0)) * Number(d.cantidad);
  }

  const gananciaMes = gananciaVentas - gananciaDevuelta;

  const topProductos = Object.entries(conteoProductos)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return (
    <div className="flex flex-col items-center gap-6">
      <h1 className="text-xl font-bold text-ink">Reportes</h1>

      <div className="grid w-full max-w-sm grid-cols-2 gap-3">
        <div className="rounded-lg border border-linea bg-white p-4 text-center">
          <p className="text-xs text-ink/50">Ventas de hoy</p>
          <p className="cifra text-lg font-semibold text-ink">
            ${totalHoy.toFixed(2)}
          </p>
          <p className="text-xs text-ink/40">{ventasHoy.length} ventas</p>
        </div>
        <div className="rounded-lg border border-linea bg-white p-4 text-center">
          <p className="text-xs text-ink/50">Ventas del mes</p>
          <p className="cifra text-lg font-semibold text-ink">
            ${totalMes.toFixed(2)}
          </p>
          <p className="text-xs text-ink/40">{pedidosMes?.length ?? 0} ventas</p>
        </div>
      </div>

      <div className="w-full max-w-sm rounded-lg border border-linea bg-white p-4 text-center">
        <p className="text-xs text-ink/50">Ganancia del mes (venta menos costo)</p>
        <p className="cifra text-2xl font-bold text-verde">
          ${gananciaMes.toFixed(2)}
        </p>
        {hayProductoSinCosto && (
          <p className="mt-2 text-xs text-ink/40">
            Algún producto vendido nunca se compró por &quot;Compras&quot; — su
            costo cuenta como $0, así que esta cifra puede estar un poco
            inflada para ese producto.
          </p>
        )}
      </div>

      <div className="w-full max-w-sm rounded-lg border border-linea bg-white p-6">
        <h2 className="mb-3 text-sm font-medium text-ink">
          Ventas por método de pago (este mes)
        </h2>
        {Object.keys(porMetodo).length ? (
          <ul className="flex flex-col gap-2 text-sm">
            {Object.entries(porMetodo).map(([metodo, total]) => (
              <li key={metodo} className="flex justify-between text-ink">
                <span className="capitalize">{metodo}</span>
                <span className="cifra">${total.toFixed(2)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-ink/40">Sin datos todavía.</p>
        )}
      </div>

      <div className="w-full max-w-sm rounded-lg border border-linea bg-white p-6">
        <h2 className="mb-3 text-sm font-medium text-ink">
          Productos más vendidos (este mes)
        </h2>
        {topProductos.length ? (
          <ul className="flex flex-col gap-2 text-sm">
            {topProductos.map(([nombre, cantidad]) => (
              <li key={nombre} className="flex justify-between text-ink">
                <span>{nombre}</span>
                <span className="cifra">{cantidad} pzas</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-ink/40">Sin datos todavía.</p>
        )}
      </div>
    </div>
  );
}
