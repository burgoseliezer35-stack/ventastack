"use client";

import { useState } from "react";

export function AuditoriaCaja({ cajaId }: { cajaId: string }) {
  const [procesando, setProcesando] = useState(false);
  const [evaluacion, setEvaluacion] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pedirAuditoria = async () => {
    setProcesando(true);
    setError(null);
    setEvaluacion(null);

    try {
      const res = await fetch("/api/auditar-caja", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cajaId }),
      });

      const respuesta = await res.json();

      if (!res.ok) {
        setError(respuesta.error ?? "No se pudo hacer la auditoría");
        setProcesando(false);
        return;
      }

      setEvaluacion(respuesta.evaluacion);
    } catch {
      setError("No se pudo conectar para hacer la auditoría");
    }

    setProcesando(false);
  };

  return (
    <div className="rounded-lg border border-linea bg-white p-4">
      <h2 className="mb-2 text-sm font-medium text-ink">Revisión con IA</h2>
      {!evaluacion && (
        <button
          type="button"
          onClick={pedirAuditoria}
          disabled={procesando}
          className="rounded-md bg-primario px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
        >
          {procesando ? "Revisando..." : "🔍 Revisar este cierre"}
        </button>
      )}
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      {evaluacion && (
        <div>
          <p className="text-sm text-ink/80">{evaluacion}</p>
          <button
            type="button"
            onClick={pedirAuditoria}
            disabled={procesando}
            className="mt-2 text-xs text-primario hover:underline disabled:opacity-50"
          >
            {procesando ? "Revisando..." : "Revisar de nuevo"}
          </button>
        </div>
      )}
    </div>
  );
}
