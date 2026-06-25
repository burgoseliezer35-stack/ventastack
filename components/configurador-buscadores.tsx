"use client";

import { useState } from "react";
import { Database } from "lucide-react";

type FuenteConfig = {
  activo: boolean;
  api_key: string | null;
};

type BuscadoresConfig = {
  openfoodfacts: FuenteConfig;
  openbeautyfacts: FuenteConfig;
  openproductsfacts: FuenteConfig;
  upcitemdb: FuenteConfig;
  goupc: FuenteConfig;
  barcodespider: FuenteConfig;
};

const FUENTES = [
  {
    id: "openfoodfacts",
    nombre: "Open Food Facts",
    icono: "food",
    descripcion: "Alimentos, bebidas, abarrotes",
    gratis: true,
    url: null,
  },
  {
    id: "openbeautyfacts",
    nombre: "Open Beauty Facts",
    icono: "beauty",
    descripcion: "Cosméticos, cuidado personal, farmacia",
    gratis: true,
    url: null,
  },
  {
    id: "openproductsfacts",
    nombre: "Open Products Facts",
    icono: "box",
    descripcion: "Productos generales, hogar",
    gratis: true,
    url: null,
  },
  {
    id: "upcitemdb",
    nombre: "UPCitemdb",
    emoji: "🔌",
    descripcion: "Electrónicos, cables, accesorios — 100/día gratis",
    gratis: true,
    url: "https://www.upcitemdb.com",
  },
  {
    id: "goupc",
    nombre: "Go-UPC",
    icono: "globe",
    descripcion: "1 billón de productos globales — desde $19.95/mes",
    gratis: false,
    url: "https://go-upc.com",
  },
  {
    id: "barcodespider",
    nombre: "Barcode Spider",
    icono: "spider",
    descripcion: "1 billón de productos, cobertura Asia/Europa/América",
    gratis: false,
    url: "https://www.barcodespider.com",
  },
] as const;

const DEFAULT_CONFIG: BuscadoresConfig = {
  openfoodfacts: { activo: true, api_key: null },
  openbeautyfacts: { activo: false, api_key: null },
  openproductsfacts: { activo: false, api_key: null },
  upcitemdb: { activo: false, api_key: null },
  goupc: { activo: false, api_key: null },
  barcodespider: { activo: false, api_key: null },
};

export function ConfiguradorBuscadores({
  companyId,
  configActual,
  onGuardar,
}: {
  companyId: string;
  configActual: BuscadoresConfig | null;
  onGuardar: (companyId: string, config: BuscadoresConfig) => Promise<void>;
}) {
  const [config, setConfig] = useState<BuscadoresConfig>(
    configActual ?? DEFAULT_CONFIG
  );
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);

  const toggleFuente = (id: keyof BuscadoresConfig) => {
    setConfig((prev) => ({
      ...prev,
      [id]: { ...prev[id], activo: !prev[id].activo },
    }));
  };

  const setApiKey = (id: keyof BuscadoresConfig, key: string) => {
    setConfig((prev) => ({
      ...prev,
      [id]: { ...prev[id], api_key: key.trim() || null },
    }));
  };

  const guardar = async () => {
    setGuardando(true);
    setMensaje(null);
    await onGuardar(companyId, config);
    setMensaje("Guardado correctamente");
    setGuardando(false);
    setTimeout(() => setMensaje(null), 3000);
  };

  const activas = Object.values(config).filter((f) => f.activo).length;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-ink">
            Buscadores de productos activos:{" "}
            <span className="text-primario">{activas}</span>
          </p>
          <p className="text-xs text-ink/50 mt-0.5">
            Se consultan en orden de arriba a abajo hasta encontrar el producto.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {FUENTES.map((fuente) => {
          const cfg = config[fuente.id as keyof BuscadoresConfig];
          return (
            <div
              key={fuente.id}
              className={`rounded-xl border p-4 transition-all ${
                cfg.activo
                  ? "border-primario/30 bg-primario-suave"
                  : "border-linea bg-white"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 flex-1">
                  <div className="h-9 w-9 rounded-lg bg-paper border border-linea flex items-center justify-center shrink-0"><Database size={16} className="text-ink/40" /></div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-ink">
                        {fuente.nombre}
                      </p>
                      {fuente.gratis ? (
                        <span className="rounded-full bg-verde-suave px-2 py-0.5 text-[10px] font-semibold text-verde">
                          GRATIS
                        </span>
                      ) : (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                          DE PAGO
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-ink/50">{fuente.descripcion}</p>
                    {fuente.url && !fuente.gratis && (
                      <a
                        href={fuente.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] text-primario hover:underline"
                      >
                        Obtener API key → {fuente.url}
                      </a>
                    )}
                  </div>
                </div>

                {/* Toggle */}
                <label className="relative inline-flex cursor-pointer items-center shrink-0">
                  <input
                    type="checkbox"
                    checked={cfg.activo}
                    onChange={() => toggleFuente(fuente.id as keyof BuscadoresConfig)}
                    className="sr-only peer"
                  />
                  <div className="h-6 w-11 rounded-full bg-linea peer-checked:bg-primario transition-colors after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:after:translate-x-5" />
                </label>
              </div>

              {/* Campo API key — solo para las de pago y cuando están activas */}
              {!fuente.gratis && cfg.activo && (
                <div className="mt-3 pt-3 border-t border-linea/50">
                  <label className="block text-xs font-medium text-ink/60 mb-1">
                    API Key de {fuente.nombre}
                  </label>
                  <input
                    type="password"
                    value={cfg.api_key ?? ""}
                    onChange={(e) =>
                      setApiKey(fuente.id as keyof BuscadoresConfig, e.target.value)
                    }
                    placeholder="Pega aquí tu API key"
                    className="w-full rounded-md border border-linea px-3 py-2 text-sm text-ink focus:border-primario focus:outline-none font-mono"
                  />
                  {!cfg.api_key && (
                    <p className="mt-1 text-xs text-amber-600">
                      Sin API key esta fuente no va a funcionar aunque esté activa.
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {mensaje && (
        <p className="text-sm text-verde font-medium">✓ {mensaje}</p>
      )}

      <button
        type="button"
        onClick={guardar}
        disabled={guardando || activas === 0}
        className="w-full rounded-xl bg-primario px-4 py-3 font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
      >
        {guardando ? "Guardando..." : `Guardar configuración (${activas} fuente${activas !== 1 ? "s" : ""} activa${activas !== 1 ? "s" : ""})`}
      </button>

      {activas === 0 && (
        <p className="text-xs text-red-600 text-center">
          Activa al menos una fuente para que funcione la búsqueda.
        </p>
      )}
    </div>
  );
}
