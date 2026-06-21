"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Clock, CheckCircle, AlertTriangle, TrendingUp } from "lucide-react";

type Turno = {
  id: string;
  turno_inicio: string;
  cajero_nombre: string | null;
};

export function CorteTurnoForm({
  turnoAbierto,
  usuarioNombre,
}: {
  turnoAbierto: Turno | null;
  usuarioNombre: string;
}) {
  const [efectivoContado, setEfectivoContado] = useState("");
  const [nota, setNota] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<{
    diferencia: number;
    efectivo_sistema: number;
    total_ventas: number;
    num_ventas: number;
  } | null>(null);
  const supabase = createClient();
  const router = useRouter();

  const abrirTurno = async () => {
    setCargando(true);
    setError(null);
    const { error: err } = await supabase.rpc("abrir_turno");
    setCargando(false);
    if (err) { setError(err.message); return; }
    router.refresh();
  };

  const cerrarTurno = async () => {
    if (!turnoAbierto) return;
    const contado = parseFloat(efectivoContado.replace(/,/g, ""));
    if (isNaN(contado) || contado < 0) {
      setError("Escribe cuánto efectivo contaste físicamente");
      return;
    }

    setCargando(true);
    setError(null);

    const { error: err } = await supabase.rpc("cerrar_turno", {
      p_turno_id: turnoAbierto.id,
      p_efectivo_contado: contado,
      p_nota: nota.trim() || null,
    });

    if (err) { setError(err.message); setCargando(false); return; }

    // Traer el resultado del corte recién cerrado
    const { data: corte } = await supabase
      .from("cortes_turno")
      .select("diferencia, efectivo_sistema, total_ventas, num_ventas")
      .eq("id", turnoAbierto.id)
      .single();

    setCargando(false);
    if (corte) setResultado(corte);
    router.refresh();
  };

  const inicio = turnoAbierto
    ? new Date(turnoAbierto.turno_inicio).toLocaleString("es-MX", {
        dateStyle: "short",
        timeStyle: "short",
      })
    : null;

  // Pantalla de resultado después de cerrar
  if (resultado) {
    const sobrante = resultado.diferencia > 0;
    const faltante = resultado.diferencia < 0;
    return (
      <div className="flex flex-col gap-4">
        <div className="rounded-2xl border border-linea bg-white p-6 shadow-sm flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <CheckCircle size={28} className="text-verde shrink-0" />
            <div>
              <p className="font-bold text-ink">Turno cerrado correctamente</p>
              <p className="text-sm text-ink/50">Ya puedes entregar tu caja</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Ventas del turno", valor: resultado.total_ventas, color: "text-ink" },
              { label: "Transacciones", valor: resultado.num_ventas, color: "text-ink", unidad: "" },
              { label: "Efectivo sistema", valor: resultado.efectivo_sistema, color: "text-ink" },
              {
                label: sobrante ? "Sobrante" : faltante ? "Faltante" : "Cuadre exacto",
                valor: Math.abs(resultado.diferencia),
                color: sobrante ? "text-verde" : faltante ? "text-red-600" : "text-ink",
              },
            ].map((t) => (
              <div key={t.label} className="rounded-xl bg-paper p-3 text-center">
                <p className="text-xs text-ink/50">{t.label}</p>
                <p className={`text-lg font-bold cifra ${t.color}`}>
                  {t.unidad !== "" ? "$" : ""}{typeof t.valor === "number" ? t.valor.toLocaleString("en-US", { minimumFractionDigits: t.unidad === "" ? 0 : 2, maximumFractionDigits: t.unidad === "" ? 0 : 2 }) : t.valor}
                </p>
              </div>
            ))}
          </div>

          {faltante && (
            <div className="flex items-start gap-2 rounded-xl bg-red-50 border border-red-200 p-3">
              <AlertTriangle size={16} className="text-red-600 shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">
                Hay un faltante de{" "}
                <strong>${Math.abs(resultado.diferencia).toLocaleString("en-US", { minimumFractionDigits: 2 })}</strong>.
                El administrador puede ver el detalle en Reportes → Cortes.
              </p>
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={() => { setResultado(null); router.refresh(); }}
          className="rounded-md bg-primario px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          Listo
        </button>
      </div>
    );
  }

  // Sin turno abierto — botón para abrir
  if (!turnoAbierto) {
    return (
      <div className="rounded-2xl border border-linea bg-white p-6 shadow-sm flex flex-col gap-4 items-center text-center">
        <Clock size={40} className="text-primario/40" />
        <div>
          <p className="font-semibold text-ink">No tienes un turno abierto</p>
          <p className="text-sm text-ink/50 mt-1">
            Abre tu turno antes de empezar a vender para que el sistema registre
            tus ventas y puedas hacer el corte al terminar.
          </p>
        </div>
        <p className="text-xs text-ink/40">Cajero: {usuarioNombre}</p>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="button"
          onClick={abrirTurno}
          disabled={cargando}
          className="w-full rounded-xl bg-primario px-4 py-3 font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
        >
          {cargando ? "Abriendo..." : "Abrir turno"}
        </button>
      </div>
    );
  }

  // Turno abierto — formulario de cierre
  return (
    <div className="flex flex-col gap-4">
      {/* Resumen del turno activo */}
      <div className="rounded-2xl border border-primario/30 bg-primario-suave p-4 flex items-center gap-3">
        <TrendingUp size={20} className="text-primario shrink-0" />
        <div>
          <p className="text-sm font-semibold text-ink">Turno activo</p>
          <p className="text-xs text-ink/50">Abierto desde {inicio}</p>
        </div>
      </div>

      {/* Formulario de cierre */}
      <div className="rounded-2xl border border-linea bg-white p-6 shadow-sm flex flex-col gap-5">
        <h2 className="font-semibold text-ink">Cierre de turno</h2>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-ink/50 mb-1.5">
            Efectivo que contaste en caja
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-ink/40 font-medium">$</span>
            <input
              type="text"
              inputMode="decimal"
              value={efectivoContado}
              onChange={(e) => setEfectivoContado(e.target.value)}
              onFocus={(e) => e.target.select()}
              placeholder="0.00"
              className="w-full rounded-xl border border-linea pl-8 pr-4 py-3 text-xl font-bold text-ink focus:border-primario focus:outline-none focus:ring-2 focus:ring-primario/20"
            />
          </div>
          <p className="mt-1 text-xs text-ink/40">
            Cuenta físicamente todos los billetes y monedas en tu caja.
          </p>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-ink/50 mb-1.5">
            Nota (opcional)
          </label>
          <input
            type="text"
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            placeholder="Alguna observación del turno..."
            className="w-full rounded-xl border border-linea px-4 py-3 text-sm text-ink focus:border-primario focus:outline-none"
          />
        </div>

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
        )}

        <button
          type="button"
          onClick={cerrarTurno}
          disabled={cargando || !efectivoContado}
          className="w-full rounded-xl bg-primario px-4 py-3.5 font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
        >
          {cargando ? "Calculando..." : "Cerrar turno y ver resultado"}
        </button>
      </div>
    </div>
  );
}
