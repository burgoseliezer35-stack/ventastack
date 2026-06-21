"use client";

import { useState, useRef } from "react";
import { Plus, X, Search, Loader2 } from "lucide-react";

type DatosOFF = {
  nombre: string | null;
  categoria: string | null;
  imagen_url: string | null;
};

export function ModalAgregarProducto({
  categorias,
  crearProducto,
}: {
  categorias: { id: string; nombre: string }[];
  crearProducto: (formData: FormData) => Promise<void>;
}) {
  const [abierto, setAbierto] = useState(false);
  const [buscandoOFF, setBuscandoOFF] = useState(false);
  const [sugerencia, setSugerencia] = useState<DatosOFF | null>(null);
  const nombreRef = useRef<HTMLInputElement>(null);
  const imagenUrlRef = useRef<HTMLInputElement>(null);

  const buscarEnOFF = async (codigo: string) => {
    if (!codigo.trim()) return;
    setBuscandoOFF(true);
    setSugerencia(null);

    try {
      const res = await fetch(
        `/api/buscar-producto-barcode?codigo=${encodeURIComponent(codigo.trim())}`,
      );
      const data = await res.json();

      if (data.encontrado) {
        setSugerencia(data);
        // Pre-llenamos el nombre si el campo está vacío
        if (nombreRef.current && !nombreRef.current.value && data.nombre) {
          nombreRef.current.value = data.nombre;
        }
        if (imagenUrlRef.current && data.imagen_url) {
          imagenUrlRef.current.value = data.imagen_url;
        }
      }
    } catch {
      // Sin conexión o sin resultado — no pasa nada, el admin llena a mano
    }

    setBuscandoOFF(false);
  };

  const cerrar = () => {
    setAbierto(false);
    setSugerencia(null);
    setBuscandoOFF(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="flex items-center gap-1.5 rounded-md bg-primario px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
      >
        <Plus size={16} />
        Agregar producto
      </button>

      {abierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white shadow-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-linea px-5 py-4 sticky top-0 bg-white">
              <h2 className="font-semibold text-ink">Agregar producto</h2>
              <button
                type="button"
                onClick={cerrar}
                className="text-ink/40 hover:text-ink"
                aria-label="Cerrar"
              >
                <X size={20} />
              </button>
            </div>

            <form
              action={crearProducto}
              onSubmit={cerrar}
              className="flex flex-col gap-4 px-5 py-4"
            >
              {/* Código de barras — va primero para buscar en OFF */}
              <div>
                <label htmlFor="codigo_barras" className="block text-sm font-medium text-ink">
                  Código de barras
                </label>
                <div className="mt-1 flex gap-2">
                  <input
                    id="codigo_barras"
                    name="codigo_barras"
                    type="text"
                    placeholder="Escanéalo o escríbelo"
                    className="flex-1 rounded-md border border-linea px-3 py-2 text-ink focus:border-primario focus:outline-none"
                    onBlur={(e) => buscarEnOFF(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        buscarEnOFF((e.target as HTMLInputElement).value);
                      }
                    }}
                  />
                  {buscandoOFF && (
                    <div className="flex items-center px-2 text-primario">
                      <Loader2 size={18} className="animate-spin" />
                    </div>
                  )}
                </div>
                {sugerencia ? (
                  <p className="mt-1 flex items-center gap-1 text-xs text-verde">
                    <Search size={11} />
                    Encontrado en Open Food Facts — datos pre-llenados
                  </p>
                ) : (
                  <p className="mt-1 text-xs text-ink/50">
                    Al escanear buscamos el nombre e imagen automáticamente.
                  </p>
                )}
              </div>

              {/* Vista previa de imagen si se encontró */}
              {sugerencia?.imagen_url && (
                <div className="flex items-center gap-3 rounded-lg bg-primario-suave p-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={sugerencia.imagen_url}
                    alt="Vista previa"
                    className="h-16 w-16 rounded-md object-contain bg-white border border-linea"
                  />
                  <div>
                    <p className="text-xs font-medium text-ink">{sugerencia.nombre}</p>
                    {sugerencia.categoria && (
                      <p className="text-xs text-ink/60">{sugerencia.categoria}</p>
                    )}
                  </div>
                </div>
              )}

              {/* URL de imagen (oculta, se llena automáticamente) */}
              <input
                ref={imagenUrlRef}
                name="imagen_url"
                type="hidden"
              />

              <div>
                <label htmlFor="nombre" className="block text-sm font-medium text-ink">
                  Nombre
                </label>
                <input
                  ref={nombreRef}
                  id="nombre"
                  name="nombre"
                  type="text"
                  required
                  placeholder="Refresco 600ml"
                  className="mt-1 w-full rounded-md border border-linea px-3 py-2 text-ink focus:border-primario focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="precio" className="block text-sm font-medium text-ink">
                  Precio de venta
                </label>
                <input
                  id="precio"
                  name="precio"
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  className="mt-1 w-full rounded-md border border-linea px-3 py-2 text-ink focus:border-primario focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="categoria_id" className="block text-sm font-medium text-ink">
                  Categoría (opcional)
                </label>
                <select
                  id="categoria_id"
                  name="categoria_id"
                  className="mt-1 w-full rounded-md border border-linea px-3 py-2 text-ink focus:border-primario focus:outline-none"
                >
                  <option value="">Sin categoría</option>
                  {categorias.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <p className="text-xs text-ink/50">
                Arranca con 0 en existencia — después de crearlo, usa
                &quot;Ajustar&quot; para entrar la cantidad inicial real.
              </p>

              <button
                type="submit"
                className="w-full rounded-md bg-primario px-4 py-2 font-medium text-white transition hover:opacity-90"
              >
                Guardar producto
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
