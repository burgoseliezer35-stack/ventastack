import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function AuditoriaPage() {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) redirect("/auth/login");

  const { data: miPerfil } = await supabase
    .from("profiles")
    .select("role, company_id")
    .eq("id", data.claims.sub as string)
    .single();

  if (miPerfil?.role !== "admin") redirect("/protected");

  const [{ data: bitacora }, { data: cortes }, { data: kardex }, { data: reconciliacion }] = await Promise.all([
    supabase
      .from("bitacora_auditoria")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("cortes_turno")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("movimientos_inventario")
      .select(`
        id, tipo, cantidad, motivo, nota, created_at,
        stock_antes, stock_despues,
        productos(nombre),
        profiles(full_name)
      `)
      .eq("company_id", miPerfil.company_id)
      .order("created_at", { ascending: false })
      .limit(200),
    supabase.rpc("reconciliar_stock"),
  ]);

  const discrepancias = (reconciliacion ?? []).filter((r: {estado: string}) => r.estado === "discrepancia");

  const MOTIVO_COLOR: Record<string, string> = {
    venta:     "bg-blue-100 text-blue-700",
    compra:    "bg-green-100 text-green-700",
    ajuste:    "bg-amber-100 text-amber-700",
    devolucion:"bg-purple-100 text-purple-700",
    merma:     "bg-red-100 text-red-700",
    transferencia: "bg-cyan-100 text-cyan-700",
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-ink">Auditoría</h1>
        <p className="text-sm text-ink/50">
          Solo visible para el administrador. Registra movimientos de inventario, cortes y acciones sensibles.
        </p>
      </div>

      {/* ── Reconciliación de stock ──────────────────────────── */}
      {discrepancias.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-red-200 bg-red-50 shadow-sm">
          <div className="border-b border-red-200 px-5 py-3 flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-red-800">⚠ Discrepancias de stock detectadas</h2>
              <p className="text-xs text-red-600 mt-0.5">
                El stock en la base de datos no coincide con el kardex. Requiere revisión.
              </p>
            </div>
            <span className="rounded-full bg-red-100 border border-red-300 px-3 py-0.5 text-xs font-bold text-red-700">
              {discrepancias.length} producto{discrepancias.length > 1 ? "s" : ""}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-red-100 text-left text-xs font-semibold uppercase tracking-wide text-red-700">
                  <th className="px-4 py-2.5">Producto</th>
                  <th className="px-4 py-2.5 text-right">Stock sistema</th>
                  <th className="px-4 py-2.5 text-right">Stock kardex</th>
                  <th className="px-4 py-2.5 text-right">Diferencia</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-red-100">
                {discrepancias.map((r: {producto_id: string; nombre: string; stock_actual: number; stock_kardex: number; diferencia: number}) => (
                  <tr key={r.producto_id} className="bg-white">
                    <td className="px-4 py-2.5 font-medium text-ink">{r.nombre}</td>
                    <td className="cifra px-4 py-2.5 text-right text-ink">{r.stock_actual}</td>
                    <td className="cifra px-4 py-2.5 text-right text-ink/70">{r.stock_kardex}</td>
                    <td className={`cifra px-4 py-2.5 text-right font-bold ${r.diferencia > 0 ? "text-amber-600" : "text-red-600"}`}>
                      {r.diferencia > 0 ? "+" : ""}{r.diferencia}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Si todo cuadra */}
      {(reconciliacion ?? []).length > 0 && discrepancias.length === 0 && (
        <div className="rounded-xl border border-verde/30 bg-verde-suave px-5 py-3 flex items-center gap-3">
          <span className="text-verde font-bold text-lg">✓</span>
          <div>
            <p className="text-sm font-semibold text-verde">Stock reconciliado correctamente</p>
            <p className="text-xs text-verde/70">Todos los productos cuadran con el kardex.</p>
          </div>
        </div>
      )}

      {/* ── Kardex de inventario ─────────────────────────────── */}
      <div className="overflow-hidden rounded-xl border border-linea bg-white shadow-sm">
        <div className="border-b border-linea bg-primario-suave px-5 py-3 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-ink">Kardex de inventario</h2>
            <p className="text-xs text-ink/50 mt-0.5">
              Historial inmutable de todos los movimientos de stock con saldo antes y después
            </p>
          </div>
          <span className="text-xs text-ink/40">{kardex?.length ?? 0} movimientos</span>
        </div>
        {kardex?.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-primario text-left text-xs font-semibold uppercase tracking-wide text-white">
                  <th className="px-4 py-2.5">Fecha/Hora</th>
                  <th className="px-4 py-2.5">Producto</th>
                  <th className="px-4 py-2.5">Movimiento</th>
                  <th className="px-4 py-2.5 text-right">Cantidad</th>
                  <th className="px-4 py-2.5 text-right">Stock antes</th>
                  <th className="px-4 py-2.5 text-right">Stock después</th>
                  <th className="px-4 py-2.5">Registró</th>
                  <th className="px-4 py-2.5">Nota</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-linea">
                {kardex.map((m, idx) => {
                  const producto = Array.isArray(m.productos) ? m.productos[0] : m.productos;
                  const perfil = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;
                  const esEntrada = m.tipo === "entrada";
                  const tieneStock = m.stock_antes != null && m.stock_despues != null;
                  return (
                    <tr key={m.id} className={idx % 2 === 1 ? "bg-paper/60" : ""}>
                      <td className="px-4 py-2.5 text-xs text-ink/60 whitespace-nowrap">
                        {new Date(m.created_at).toLocaleString("es-MX", {
                          dateStyle: "short", timeStyle: "short"
                        })}
                      </td>
                      <td className="px-4 py-2.5 font-medium text-ink max-w-[180px] truncate">
                        {producto?.nombre ?? "—"}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${MOTIVO_COLOR[m.motivo] ?? "bg-gray-100 text-gray-600"}`}>
                          {m.motivo}
                        </span>
                      </td>
                      <td className={`cifra px-4 py-2.5 text-right font-bold ${esEntrada ? "text-verde" : "text-red-500"}`}>
                        {esEntrada ? "+" : "-"}{m.cantidad}
                      </td>
                      <td className="cifra px-4 py-2.5 text-right text-ink/60">
                        {tieneStock ? m.stock_antes : <span className="text-ink/30 text-xs">—</span>}
                      </td>
                      <td className="cifra px-4 py-2.5 text-right font-semibold text-ink">
                        {tieneStock ? m.stock_despues : <span className="text-ink/30 text-xs">—</span>}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-ink/60">
                        {perfil?.full_name ?? "—"}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-ink/50 max-w-[150px] truncate">
                        {m.nota ?? "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="px-4 py-8 text-center text-sm text-ink/40">
            Sin movimientos de inventario todavía.
          </p>
        )}
      </div>

      {/* ── Cortes de turno ──────────────────────────────────── */}
      <div className="overflow-hidden rounded-xl border border-linea bg-white shadow-sm">
        <div className="border-b border-linea bg-primario-suave px-5 py-3">
          <h2 className="font-semibold text-ink">Cortes de turno</h2>
        </div>
        {cortes?.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-primario text-left text-xs font-semibold uppercase tracking-wide text-white">
                  <th className="px-4 py-2.5">Cajero</th>
                  <th className="px-4 py-2.5">Inicio</th>
                  <th className="px-4 py-2.5">Fin</th>
                  <th className="px-4 py-2.5 text-right">Ventas</th>
                  <th className="px-4 py-2.5 text-right">Sistema</th>
                  <th className="px-4 py-2.5 text-right">Contado</th>
                  <th className="px-4 py-2.5 text-right">Diferencia</th>
                  <th className="px-4 py-2.5">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-linea">
                {cortes.map((c, idx) => {
                  const dif = c.diferencia ?? 0;
                  return (
                    <tr key={c.id} className={idx % 2 === 1 ? "bg-paper/60" : ""}>
                      <td className="px-4 py-2.5 text-ink">{c.cajero_nombre ?? "—"}</td>
                      <td className="px-4 py-2.5 text-ink/60 text-xs whitespace-nowrap">
                        {new Date(c.turno_inicio).toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" })}
                      </td>
                      <td className="px-4 py-2.5 text-ink/60 text-xs whitespace-nowrap">
                        {c.turno_fin ? new Date(c.turno_fin).toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" }) : "—"}
                      </td>
                      <td className="cifra px-4 py-2.5 text-right text-ink">
                        ${(c.total_ventas ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="cifra px-4 py-2.5 text-right text-ink/70">
                        ${(c.efectivo_sistema ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="cifra px-4 py-2.5 text-right text-ink/70">
                        {c.efectivo_contado != null
                          ? `$${c.efectivo_contado.toLocaleString("en-US", { minimumFractionDigits: 2 })}`
                          : "—"}
                      </td>
                      <td className={`cifra px-4 py-2.5 text-right font-semibold ${dif > 0 ? "text-verde" : dif < 0 ? "text-red-600" : "text-ink/40"}`}>
                        {c.diferencia != null
                          ? `${dif >= 0 ? "+" : ""}$${dif.toLocaleString("en-US", { minimumFractionDigits: 2 })}`
                          : "—"}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          c.estado === "abierto" ? "bg-primario-suave text-primario" : "bg-verde-suave text-verde"
                        }`}>
                          {c.estado}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="px-4 py-8 text-center text-sm text-ink/40">Sin cortes de turno todavía.</p>
        )}
      </div>

      {/* ── Bitácora de acciones sensibles ───────────────────── */}
      <div className="overflow-hidden rounded-xl border border-linea bg-white shadow-sm">
        <div className="border-b border-linea bg-primario-suave px-5 py-3">
          <h2 className="font-semibold text-ink">Bitácora de acciones sensibles</h2>
        </div>
        {bitacora?.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-primario text-left text-xs font-semibold uppercase tracking-wide text-white">
                  <th className="px-4 py-2.5">Fecha/Hora</th>
                  <th className="px-4 py-2.5">Empleado</th>
                  <th className="px-4 py-2.5">Acción</th>
                  <th className="px-4 py-2.5">Detalle</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-linea">
                {bitacora.map((b, idx) => (
                  <tr key={b.id} className={idx % 2 === 1 ? "bg-paper/60" : ""}>
                    <td className="px-4 py-2.5 text-xs text-ink/60 whitespace-nowrap">
                      {new Date(b.created_at).toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" })}
                    </td>
                    <td className="px-4 py-2.5 text-ink">{b.usuario_nombre ?? "—"}</td>
                    <td className="px-4 py-2.5">
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                        {b.accion}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-ink/60">
                      {b.detalle ? JSON.stringify(b.detalle) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="px-4 py-8 text-center text-sm text-ink/40">Sin acciones registradas todavía.</p>
        )}
      </div>
    </div>
  );
}

