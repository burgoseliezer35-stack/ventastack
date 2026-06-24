"use client";

import { imgUrl } from "@/lib/img-proxy";

import { useState, useRef, useEffect } from "react";
import { Plus, X, Loader2, CheckCircle, Camera, ImageOff } from "lucide-react";

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
  const [noEncontrado, setNoEncontrado] = useState(false);
  const [imagenManual, setImagenManual] = useState<string | null>(null);
  const [codigo, setCodigo] = useState("");
  const nombreRef = useRef<HTMLInputElement>(null);
  const imagenUrlRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (codigo.length < 8) {
      timerRef.current = setTimeout(() => { setSugerencia(null); setNoEncontrado(false); }, 0);
      return;
    }

    timerRef.current = setTimeout(async () => {
      setBuscando(true);
      setNoEncontrado(false);
      try {
        const res = await fetch(`/api/buscar-producto-barcode?codigo=${encodeURIComponent(codigo)}`);
        const data = await res.json();
        if (data.encontrado) {
          setSugerencia(data);
          setNoEncontrado(false);
          if (nombreRef.current && !nombreRef.current.value && data.nombre) {
            nombreRef.current.value = data.nombre;
          }
          if (imagenUrlRef.current && data.imagen_url) {
            imagenUrlRef.current.value = data.imagen_url;
          }
        } else {
          setSugerencia(null);
          setNoEncontrado(true);
        }
      } catch {
        setSugerencia(null);
        setNoEncontrado(true);
      }
      setBuscando(false);
    }, 600);
  }, [codigo]);

  // Comprime la imagen a máx 400px y calidad 70% antes de guardar como base64
  // Evita que fotos de celular (~3-5MB) rompan la fila de Postgres
  const comprimirImagen = (archivo: File): Promise<string> =>
    new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new window.Image();
        img.onload = () => {
          const MAX = 400;
          const escala = Math.min(1, MAX / Math.max(img.width, img.height));
          const canvas = document.createElement("canvas");
          canvas.width = Math.round(img.width * escala);
          canvas.height = Math.round(img.height * escala);
          const ctx = canvas.getContext("2d")!;
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL("image/jpeg", 0.7));
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(archivo);
    });

  // Convierte la foto del celular a base64 comprimido y la usa como imagen del producto
  const manejarFotoManual = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const archivo = e.target.files?.[0];
    if (!archivo) return;
    const url = await comprimirImagen(archivo);
    setImagenManual(url);
    if (imagenUrlRef.current) imagenUrlRef.current.value = url;
  };

  const cerrar = () => {
    setAbierto(false);
    setSugerencia(null);
    setNoEncontrado(false);
    setImagenManual(null);
    setBuscando(false);
    setCodigo("");
    if (imagenUrlRef.current) imagenUrlRef.current.value = "";
  };

  const imagenActual = imagenManual ?? sugerencia?.imagen_url ?? null;

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

            <div className="flex items-center justify-between border-b border-linea px-6 py-4 sticky top-0 bg-white rounded-t-2xl">
              <h2 className="font-bold text-ink text-base">Agregar producto</h2>
              <button type="button" onClick={cerrar} className="text-ink/40 hover:text-ink">
                <X size={20} />
              </button>
            </div>

            <form action={crearProducto} onSubmit={cerrar} className="flex flex-col gap-5 px-6 py-5">

              {/* Código de barras */}
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
                  {buscando && <Loader2 size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-primario animate-spin" />}
                  {sugerencia && !buscando && <CheckCircle size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-verde" />}
                  {noEncontrado && !buscando && <ImageOff size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink/30" />}
                </div>
              </div>

              {/* Imagen — automatica OFF o manual */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-ink/50 mb-1.5">
                  Imagen del producto
                </label>

                {imagenActual ? (
                  /* Tarjeta de confirmación visual */
                  <div className="flex items-center gap-4 rounded-2xl bg-gradient-to-r from-primario-suave to-white border border-primario/20 p-4">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={imgUrl(imagenActual) ?? ""}
                      alt="Vista previa"
                      className="h-20 w-20 rounded-xl object-contain bg-white border border-linea shadow-sm shrink-0"
                    />
                    <div className="flex flex-col gap-2 flex-1">
                      {sugerencia && !imagenManual && (
                        <>
                          <span className="text-[10px] font-semibold uppercase tracking-wide text-primario">
                            ✓ Encontrado en Open Food Facts
                          </span>
                          <p className="font-semibold text-ink text-sm leading-tight">{sugerencia.nombre}</p>
                          {sugerencia.categoria && (
                            <p className="text-xs text-ink/50 capitalize">{sugerencia.categoria}</p>
                          )}
                        </>
                      )}
                      {imagenManual && (
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-verde">
                          ✓ Foto cargada desde tu dispositivo
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setImagenManual(null);
                          if (imagenUrlRef.current) {
                            imagenUrlRef.current.value = sugerencia?.imagen_url ?? "";
                          }
                          fileInputRef.current?.click();
                        }}
                        className="text-xs text-primario hover:underline text-left"
                      >
                        Cambiar foto
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Zona de subida — aparece si OFF no encontró nada o el código tiene menos de 8 dígitos */
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full rounded-xl border-2 border-dashed border-linea hover:border-primario transition-colors p-6 flex flex-col items-center gap-2 text-ink/40 hover:text-primario group"
                  >
                    <Camera size={28} className="group-hover:scale-110 transition-transform" />
                    <span className="text-sm font-medium">
                      {noEncontrado
                        ? "No encontramos imagen — toca para subir una foto"
                        : "Toca para subir una foto (opcional)"}
                    </span>
                    <span className="text-xs text-ink/30">Desde tu cámara o galería</span>
                  </button>
                )}

                {/* Input de archivo oculto */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={manejarFotoManual}
                />
                <input ref={imagenUrlRef} name="imagen_url" type="hidden" />
              </div>

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
