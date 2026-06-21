import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function AuditoriaPage() {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) redirect("/auth/login");

  const userId = data.claims.sub as string;
  const { data: miPerfil } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();

  if (miPerfil?.role !== "admin") redirect("/protected");

  const { data: bitacora } = await supabase
    .from("bitacora_auditoria")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  const { data: cortes } = await supabase
    .from("cortes_turno")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-bold text-ink">Auditoría</h1>
        <p className="text-sm text-ink/60">
          Solo visible para el administrador. Registra acciones sensibles y cortes de turno.
        </p>
      </div>

      {/* Cortes de turno */}
      <div className="overflow-hidden rounded-xl border border-linea bg-white shadow-sm">
        <div className="border-b border-linea bg-primario-suave px-4 py-3">
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
                      <td className="px-4 py-2.5 text-ink/60 text-xs">
                        {new Date(c.turno_inicio).toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" })}
                      </td>
                      <td className="px-4 py-2.5 text-ink/60 text-xs">
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
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${c.estado === "abierto" ? "bg-primario-suave text-primario" : "bg-verde-suave text-verde"}`}>
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

      {/* Bitácora de acciones */}
      <div className="overflow-hidden rounded-xl border border-linea bg-white shadow-sm">
        <div className="border-b border-linea bg-primario-suave px-4 py-3">
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
                    <td className="px-4 py-2.5 text-xs text-ink/60">
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
