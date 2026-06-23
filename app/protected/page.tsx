import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Package, Users, ShoppingCart, UserPlus,
  TrendingUp, TrendingDown, AlertTriangle, Clock,
} from "lucide-react";

export default async function ProtectedPage() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) redirect("/auth/login");

  const userId = data.claims.sub as string;
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("full_name, role, es_superadmin, company_id")
    .eq("id", userId)
    .single();

  if (profileError || !profile) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-paper px-4 text-center">
        <p className="text-sm text-ink/70">No encontramos tu perfil de usuario.</p>
        <Link href="/auth/login" className="text-sm text-primario hover:underline">Cerrar sesión e intentar de nuevo</Link>
      </div>
    );
  }

  if (profile.es_superadmin && profile.role !== "admin") {
    redirect("/reseller");
  }

  const esAdmin = profile.role === "admin";

  // ── Datos del dashboard ──
  const ahora = new Date();
  const inicioHoy = new Date(ahora); inicioHoy.setHours(0, 0, 0, 0);
  const inicioAyer = new Date(inicioHoy); inicioAyer.setDate(inicioAyer.getDate() - 1);
  const finAyer = new Date(inicioHoy);
  
  const inicioSemana = new Date(ahora); inicioSemana.setDate(ahora.getDate() - 6); inicioSemana.setHours(0,0,0,0);

  const [
    { count: totalProductos },
    { count: _totalClientes },
    { count: totalEquipo },
    { data: ventasHoy },
    { data: ventasAyer },
    { data: ventasSemana },
    { data: stockBajo },
  ] = await Promise.all([
    supabase.from("productos").select("id", { count: "exact", head: true }).eq("activo", true),
    supabase.from("clientes").select("id", { count: "exact", head: true }), // eslint-disable-next-line
    supabase.from("profiles").select("id", { count: "exact", head: true }).in("role", ["cajero", "vendedor"]),
    supabase.from("pedidos").select("total").gte("created_at", inicioHoy.toISOString()).eq("estado", "confirmado"),
    supabase.from("pedidos").select("total").gte("created_at", inicioAyer.toISOString()).lt("created_at", finAyer.toISOString()).eq("estado", "confirmado"),
    supabase.from("pedidos").select("total, created_at").gte("created_at", inicioSemana.toISOString()).eq("estado", "confirmado"),
    supabase.from("productos").select("id, nombre, stock, umbral_stock_bajo:companies!inner(umbral_stock_bajo)").lt("stock", 5).eq("activo", true).limit(5),
  ]);

  const totalHoy = (ventasHoy ?? []).reduce((s, p) => s + p.total, 0);
  const totalAyer = (ventasAyer ?? []).reduce((s, p) => s + p.total, 0);
  const cambioVsAyer = totalAyer > 0 ? ((totalHoy - totalAyer) / totalAyer) * 100 : 0;
  const ventasHoyCount = ventasHoy?.length ?? 0;

  // Ventas por día últimos 7 días
  const ventasPorDia: Record<string, number> = {};
  for (let i = 6; i >= 0; i--) {
    const d = new Date(ahora); d.setDate(d.getDate() - i); d.setHours(0,0,0,0);
    const key = d.toLocaleDateString("es-MX", { weekday: "short", day: "numeric" });
    ventasPorDia[key] = 0;
  }
  for (const v of ventasSemana ?? []) {
    const d = new Date(v.created_at);
    const key = d.toLocaleDateString("es-MX", { weekday: "short", day: "numeric" });
    if (key in ventasPorDia) ventasPorDia[key] += v.total;
  }
  const maxDia = Math.max(...Object.values(ventasPorDia), 1);
  const totalSemana = Object.values(ventasPorDia).reduce((s, v) => s + v, 0);

  return (
    <div className="flex flex-col gap-5">
      {/* Bienvenida */}
      <div>
        <h1 className="text-xl font-bold text-ink">
          Hola, {profile.full_name?.split(" ")[0] ?? "Admin"} 👋
        </h1>
        <p className="text-sm text-ink/50">
          {ahora.toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" })}
        </p>
      </div>

      {/* Tarjetas principales */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {/* Ventas hoy */}
        <div className="rounded-xl border border-linea bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-ink/50">Ventas hoy</p>
              <p className="cifra text-xl font-bold text-ink mt-1">
                ${totalHoy.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-ink/40 mt-0.5">{ventasHoyCount} transacciones</p>
            </div>
            <ShoppingCart size={18} className="text-primario shrink-0 mt-0.5" />
          </div>
          {totalAyer > 0 && (
            <div className={`mt-2 flex items-center gap-1 text-xs font-medium ${cambioVsAyer >= 0 ? "text-verde" : "text-red-500"}`}>
              {cambioVsAyer >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              {Math.abs(cambioVsAyer).toFixed(1)}% vs ayer
            </div>
          )}
        </div>

        {/* Semana */}
        <div className="rounded-xl border border-linea bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-ink/50">Esta semana</p>
              <p className="cifra text-xl font-bold text-ink mt-1">
                ${totalSemana.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-ink/40 mt-0.5">{ventasSemana?.length ?? 0} ventas</p>
            </div>
            <TrendingUp size={18} className="text-verde shrink-0 mt-0.5" />
          </div>
        </div>

        {/* Catálogo */}
        <Link href="/protected/productos"
          className="rounded-xl border border-linea bg-white p-4 shadow-sm hover:border-primario transition-colors">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-ink/50">Catálogo</p>
              <p className="text-xl font-bold text-ink mt-1">{totalProductos ?? 0}</p>
              <p className="text-xs text-ink/40 mt-0.5">productos activos</p>
            </div>
            <Package size={18} className="text-primario shrink-0 mt-0.5" />
          </div>
        </Link>

        {/* Equipo */}
        <Link href="/protected/equipo"
          className="rounded-xl border border-linea bg-white p-4 shadow-sm hover:border-primario transition-colors">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-ink/50">Equipo</p>
              <p className="text-xl font-bold text-ink mt-1">{totalEquipo ?? 0}</p>
              <p className="text-xs text-ink/40 mt-0.5">cajeros y vendedores</p>
            </div>
            <UserPlus size={18} className="text-primario shrink-0 mt-0.5" />
          </div>
        </Link>
      </div>

      {/* Gráfica de barras — últimos 7 días */}
      <div className="rounded-xl border border-linea bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-ink">Ventas últimos 7 días</h2>
          <Link href="/protected/reportes" className="text-xs text-primario hover:underline">
            Ver reportes completos →
          </Link>
        </div>
        <div className="flex items-end gap-2 h-32">
          {Object.entries(ventasPorDia).map(([dia, total]) => {
            const esHoy = dia === ahora.toLocaleDateString("es-MX", { weekday: "short", day: "numeric" });
            return (
              <div key={dia} className="flex flex-1 flex-col items-center gap-1">
                {total > 0 && (
                  <span className="text-[9px] text-ink/50 cifra">
                    ${total >= 1000 ? `${(total/1000).toFixed(1)}k` : total.toFixed(0)}
                  </span>
                )}
                <div
                  className={`w-full rounded-t-md transition-all ${esHoy ? "bg-primario" : "bg-primario/30"}`}
                  style={{ height: `${Math.max((total / maxDia) * 96, total > 0 ? 4 : 0)}px` }}
                />
                <span className={`text-[9px] text-center ${esHoy ? "font-bold text-primario" : "text-ink/50"}`}>
                  {dia}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Accesos rápidos */}
        <div className="rounded-xl border border-linea bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-ink mb-3">Accesos rápidos</h2>
          <div className="grid grid-cols-2 gap-2">
            {[
              { href: "/protected/pos", label: "Punto de venta", emoji: "🛒" },
              { href: "/protected/compras/recibir", label: "Recibir mercancía", emoji: "📦" },
              { href: "/protected/clientes", label: "Clientes", emoji: "👥" },
              { href: "/protected/almacenes", label: "Almacenes", emoji: "🏭" },
            ].map((a) => (
              <Link key={a.href} href={a.href}
                className="flex items-center gap-2 rounded-lg border border-linea p-3 text-sm text-ink hover:border-primario hover:bg-primario-suave transition-colors">
                <span>{a.emoji}</span>
                <span className="text-xs font-medium">{a.label}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Alertas de stock bajo */}
        <div className="rounded-xl border border-linea bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-ink flex items-center gap-1.5">
              <AlertTriangle size={14} className="text-amber-500" />
              Stock bajo
            </h2>
            <Link href="/protected/productos" className="text-xs text-primario hover:underline">Ver catálogo</Link>
          </div>
          {!stockBajo?.length ? (
            <p className="text-xs text-verde">✓ Todo en orden — sin productos con stock bajo.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {stockBajo.map((p) => (
                <li key={p.id} className="flex items-center justify-between text-sm">
                  <span className="text-ink truncate">{p.nombre}</span>
                  <span className="ml-2 shrink-0 rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
                    {p.stock} uds.
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Turno activo si es cajero */}
      {!esAdmin && (
        <Link href="/protected/caja/turno"
          className="flex items-center gap-3 rounded-xl border border-primario/30 bg-primario-suave p-4">
          <Clock size={20} className="text-primario" />
          <div>
            <p className="text-sm font-semibold text-ink">Mi turno</p>
            <p className="text-xs text-ink/50">Abre o cierra tu turno antes de empezar</p>
          </div>
          <span className="ml-auto text-primario text-sm">→</span>
        </Link>
      )}
    </div>
  );
}
