"use client";

import { useState, useRef, useEffect } from "react";
import { Plus, X, Loader2, CheckCircle } from "lucide-react";

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
  const [buscando, setBuscando] = useState(false);
  const [sugerencia, setSugerencia] = useState<DatosOFF | null>(null);
  const [codigo, setCodigo] = useState("");
  const nombreRef = useRef<HTMLInputElement>(null);
  const imagenUrlRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Busca automáticamente en cuanto el código tiene ≥8 dígitos,
  // sin que el admin tenga que hacer nada extra.
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (codigo.length < 8) {
      timerRef.current = setTimeout(() => setSugerencia(null), 0);
      return;
    }

    timerRef.current = setTimeout(async () => {
      setBuscando(true);
      try {
        const res = await fetch(`/api/buscar-producto-barcode?codigo=${encodeURIComponent(codigo)}`);
        const data = await res.json();
        if (data.encontrado) {
          setSugerencia(data);
          if (nombreRef.current && !nombreRef.current.value && data.nombre) {
            nombreRef.current.value = data.nombre;
          }
          if (imagenUrlRef.current && data.imagen_url) {
            imagenUrlRef.current.value = data.imagen_url;
          }
        } else {
          setSugerencia(null);
        }
      } catch { setSugerencia(null); }
      setBuscando(false);
    }, 600);
  }, [codigo]);

  const cerrar = () => {
    setAbierto(false);
    setSugerencia(null);
    setBuscando(false);
    setCodigo("");
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl max-h-[92vh] overflow-y-auto">

            {/* Header */}
            <div className="flex items-center justify-between border-b border-linea px-6 py-4 sticky top-0 bg-white rounded-t-2xl">
              <h2 className="font-bold text-ink text-base">Agregar producto</h2>
              <button type="button" onClick={cerrar} className="text-ink/40 hover:text-ink">
                <X size={20} />
              </button>
            </div>

            <form action={crearProducto} onSubmit={cerrar} className="flex flex-col gap-5 px-6 py-5">

              {/* Código de barras — dispara búsqueda automática */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-ink/50 mb-1.5">
                  Código de barras
                </label>
                <div className="relative">
                  <input
                    name="codigo_barras"
                    type="text"
                    value={codigo}
                    onChange={(e) => setCodigo(e.target.value)}
                    placeholder="Escanea o escribe — buscamos el producto solo"
                    className="w-full rounded-xl border border-linea px-4 py-3 text-sm text-ink focus:border-primario focus:outline-none focus:ring-2 focus:ring-primario/20 pr-10"
                  />
                  {buscando && (
                    <Loader2 size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-primario animate-spin" />
                  )}
                  {sugerencia && !buscando && (
                    <CheckCircle size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-verde" />
                  )}
                </div>
              </div>

              {/* Tarjeta de confirmación visual si se encontró */}
              {sugerencia?.imagen_url && (
                <div className="flex items-center gap-4 rounded-2xl bg-gradient-to-r from-primario-suave to-white border border-primario/20 p-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={sugerencia.imagen_url}
                    alt={sugerencia.nombre ?? "Producto"}
                    className="h-20 w-20 rounded-xl object-contain bg-white border border-linea shadow-sm shrink-0"
                  />
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-primario">
                      ✓ Encontrado en Open Food Facts
                    </span>
                    <p className="font-semibold text-ink text-sm leading-tight">{sugerencia.nombre}</p>
                    {sugerencia.categoria && (
                      <p className="text-xs text-ink/50 capitalize">{sugerencia.categoria}</p>
                    )}
                  </div>
                </div>
              )}

              <input ref={imagenUrlRef} name="imagen_url" type="hidden" />

              {/* Nombre */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-ink/50 mb-1.5">
                  Nombre del producto
                </label>
                <input
                  ref={nombreRef}
                  name="nombre"
                  type="text"
                  required
                  placeholder="Refresco 600ml"
                  className="w-full rounded-xl border border-linea px-4 py-3 text-sm text-ink focus:border-primario focus:outline-none focus:ring-2 focus:ring-primario/20"
                />
              </div>

              {/* Precio */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-ink/50 mb-1.5">
                  Precio de venta
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-ink/40 text-sm font-medium">$</span>
                  <input
                    name="precio"
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    placeholder="0.00"
                    className="w-full rounded-xl border border-linea pl-8 pr-4 py-3 text-sm text-ink focus:border-primario focus:outline-none focus:ring-2 focus:ring-primario/20"
                  />
                </div>
              </div>

              {/* Categoría */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-ink/50 mb-1.5">
                  Categoría <span className="text-ink/30 normal-case font-normal">(opcional)</span>
                </label>
                <select
                  name="categoria_id"
                  className="w-full rounded-xl border border-linea px-4 py-3 text-sm text-ink focus:border-primario focus:outline-none focus:ring-2 focus:ring-primario/20"
                >
                  <option value="">Sin categoría</option>
                  {categorias.map((c) => (
                    <option key={c.id} value={c.id}>{c.nombre}</option>
                  ))}
                </select>
              </div>

              <p className="text-xs text-ink/40 -mt-1">
                Arranca con 0 en existencia — usa &quot;Ajustar&quot; para entrar la cantidad inicial.
              </p>

              <button
                type="submit"
                className="w-full rounded-xl bg-primario px-4 py-3.5 font-semibold text-white transition hover:opacity-90 text-sm"
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
