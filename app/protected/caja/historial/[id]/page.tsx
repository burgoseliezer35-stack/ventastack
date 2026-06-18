import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { AuditoriaCaja } from "@/components/auditoria-caja";
import { geminiDisponible } from "@/lib/gemini";

export default async function DetalleCajaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: caja } = await supabase
    .from("cajas")
    .select(
      "id, estado, fondo_inicial, monto_contado, diferencia, abierta_en, cerrada_en",
    )
    .eq("id", id)
    .single();

  if (!caja) {
    notFound();
  }

  const { data: movimientos } = await supabase
    .from("movimientos_caja")
    .select("tipo, monto, motivo, nota, created_at")
    .eq("caja_id", id)
    .order("created_at", { ascending: true });

  const entradas = (movimientos ?? [])
    .filter((m) => m.tipo === "entrada")
    .reduce((s, m) => s + m.monto, 0);
  const salidas = (movimientos ?? [])
    .filter((m) => m.tipo === "salida")
    .reduce((s, m) => s + m.monto, 0);
  const esperado = caja.fondo_inicial + entradas - salidas;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-ink">
          Caja del {new Date(caja.abierta_en).toLocaleDateString("es-MX")}
        </h1>
        <p className="text-sm text-ink/60">
          {caja.estado === "abierta" ? "Todavía abierta" : "Cerrada"}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-linea bg-white p-4">
          <p className="text-xs text-ink/50">Fondo inicial</p>
          <p className="cifra text-lg font-semibold text-ink">
            ${caja.fondo_inicial.toFixed(2)}
          </p>
        </div>
        <div className="rounded-lg border border-linea bg-white p-4">
          <p className="text-xs text-ink/50">Debería haber</p>
          <p className="cifra text-lg font-semibold text-ink">
            ${esperado.toFixed(2)}
          </p>
        </div>
        {caja.estado === "cerrada" && (
          <>
            <div className="rounded-lg border border-linea bg-white p-4">
              <p className="text-xs text-ink/50">Se contó</p>
              <p className="cifra text-lg font-semibold text-ink">
                ${caja.monto_contado?.toFixed(2)}
              </p>
            </div>
            <div className="rounded-lg border border-linea bg-white p-4">
              <p className="text-xs text-ink/50">Diferencia</p>
              <p
                className={`cifra text-lg font-semibold ${
                  caja.diferencia === 0
                    ? "text-verde"
                    : (caja.diferencia ?? 0) > 0
                      ? "text-verde"
                      : "text-red-600"
                }`}
              >
                {caja.diferencia === 0
                  ? "exacto"
                  : `${(caja.diferencia ?? 0) > 0 ? "+" : ""}$${caja.diferencia?.toFixed(2)}`}
              </p>
            </div>
          </>
        )}
      </div>

      <div className="rounded-lg border border-linea bg-white p-4">
        <h2 className="mb-3 text-sm font-medium text-ink">Movimientos</h2>
        {movimientos?.length ? (
          <ul className="flex flex-col gap-2">
            {movimientos.map((m, i) => (
              <li
                key={i}
                className="flex items-center justify-between gap-2 border-b border-linea pb-2 text-sm last:border-0"
              >
                <div className="flex flex-col">
                  <span className="text-ink/70">
                    {new Date(m.created_at).toLocaleTimeString("es-MX")}
                  </span>
                  <span className="text-xs text-ink/50">
                    {m.motivo}
                    {m.nota ? ` · ${m.nota}` : ""}
                  </span>
                </div>
                <span
                  className={`cifra font-medium ${
                    m.tipo === "entrada" ? "text-verde" : "text-red-600"
                  }`}
                >
                  {m.tipo === "entrada" ? "+" : "−"}${m.monto.toFixed(2)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-ink/40">Sin movimientos.</p>
        )}
      </div>

      {caja.estado === "cerrada" && geminiDisponible() && (
        <AuditoriaCaja cajaId={caja.id} />
      )}

      <Link
        href="/protected/caja/historial"
        className="text-sm text-primario hover:underline"
      >
        Regresar al historial
      </Link>
    </div>
  );
}
