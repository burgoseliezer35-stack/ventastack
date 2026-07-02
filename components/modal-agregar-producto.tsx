"use client";

import { imgUrl } from "@/lib/img-proxy";
import { createClient } from "@/lib/supabase/client";
import { useState, useRef, useEffect } from "react";
import { Plus, X, Loader2, CheckCircle, Camera, ImageOff, ScanLine } from "lucide-react";
import { EscanerCamara } from "@/components/escaner-camara";

type DatosOFF = {
  nombre: string | null;
  categoria: string | null;
  imagen_url: string | null;
};

type Impuesto = {
  id: string;
  nombre: string;
  tipo: string;
  factor: string;
  porcentaje: number | null;
  aplicar_automatico: boolean;
};

export function ModalAgregarProducto({
  categorias,
  impuestos,
  crearProducto,
}: {
  categorias: { id: string; nombre: string }[];
  impuestos: Impuesto[];
  crearProducto: (formData: FormData) => Promise<void>;
}) {
  const [abierto, setAbierto] = useState(false);
  const [buscando, setBuscando] = useState(false);
  const [sugerencia, setSugerencia] = useState<DatosOFF | null>(null);
  const [noEncontrado, setNoEncontrado] = useState(false);
  const [imagenManual, setImagenManual] = useState<string | null>(null);
  const [codigo, setCodigo] = useState("");
  const [escanerAbierto, setEscanerAbierto] = useState(false);
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

  const [subiendoFoto, setSubiendoFoto] = useState(false);

  const comprimirABlob = (archivo: File): Promise<Blob> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new window.Image();
        img.onload = () => {
          const MAX = 600;
          const escala = Math.min(1, MAX / Math.max(img.width, img.height));
          const canvas = document.createElement("canvas");
          canvas.width = Math.round(img.width * escala);
          canvas.height = Math.round(img.height * escala);
          canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
          canvas.toBlob((b) => b ? resolve(b) : reject(new Error("Error")), "image/jpeg", 0.8);
        };
        img.onerror = reject;
        img.src = reader.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(archivo);
    });

  // Sube la foto a Supabase Storage bucket "productos" y guarda la URL pública
  const manejarFotoManual = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const archivo = e.target.files?.[0];
    if (!archivo) return;

    // Preview inmediato
    const reader = new FileReader();
    reader.onloadend = () => setImagenManual(reader.result as string);
    reader.readAsDataURL(archivo);

    setSubiendoFoto(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      const blob = await comprimirABlob(archivo);
      const ruta = `productos/${user?.id ?? "anon"}-${Date.now()}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from("productos")
        .upload(ruta, blob, { contentType: "image/jpeg", upsert: true });
      if (!uploadError) {
        const { data } = supabase.storage.from("productos").getPublicUrl(ruta);
        setImagenManual(data.publicUrl);
        if (imagenUrlRef.current) imagenUrlRef.current.value = data.publicUrl;
      } else {
        // Fallback: base64 comprimido cuando Storage no está disponible
        const blob2 = await comprimirABlob(archivo);
        const fr = new FileReader();
        fr.onloadend = () => {
          const b64 = fr.result as string;
          setImagenManual(b64);
          if (imagenUrlRef.current) imagenUrlRef.current.value = b64;
        };
        fr.readAsDataURL(blob2);
      }
    } catch {
      // Error total — usar base64 del preview
      const fr = new FileReader();
      fr.onloadend = () => {
        const b64 = fr.result as string;
        setImagenManual(b64);
        if (imagenUrlRef.current) imagenUrlRef.current.value = b64;
      };
      fr.readAsDataURL(archivo);
    } finally {
      setSubiendoFoto(false);
    }
  };

  const manejarEscaneo = (codigoEscaneado: string) => {
    setCodigo(codigoEscaneado);
    setEscanerAbierto(false);
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
                {escanerAbierto && (
                  <EscanerCamara
                    onEscaneo={manejarEscaneo}
                    onCerrar={() => setEscanerAbierto(false)}
                  />
                )}
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      name="codigo_barras"
                      type="text"
                      value={codigo}
                      onChange={(e) => setCodigo(e.target.value)}
                      placeholder="Escribe o escanea con cámara"
                      className="w-full rounded-xl border border-linea px-4 py-3 text-sm text-ink focus:border-primario focus:outline-none focus:ring-2 focus:ring-primario/20 pr-10"
                    />
                    {buscando && <Loader2 size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-primario animate-spin" />}
                    {sugerencia && !buscando && <CheckCircle size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-verde" />}
                    {noEncontrado && !buscando && <ImageOff size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink/30" />}
                  </div>
                  <button type="button" onClick={() => setEscanerAbierto(true)}
                    className="rounded-xl border border-linea px-3 text-ink/60 hover:border-primario hover:text-primario transition shrink-0">
                    <ScanLine size={20} />
                  </button>
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

              {/* Precio de venta y Costo */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-ink/50 mb-1.5">
                    Precio de venta *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/40 text-sm">$</span>
                    <input
                      name="precio"
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      placeholder="0.00"
                      className="w-full rounded-xl border border-linea pl-7 pr-3 py-3 text-sm text-ink focus:border-primario focus:outline-none focus:ring-2 focus:ring-primario/20"
                    />
                  </div>
                  <p className="text-[10px] text-ink/30 mt-0.5">Lo que cobras</p>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-ink/50 mb-1.5">
                    Costo
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/40 text-sm">$</span>
                    <input
                      name="costo"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      className="w-full rounded-xl border border-linea pl-7 pr-3 py-3 text-sm text-ink focus:border-primario focus:outline-none focus:ring-2 focus:ring-primario/20"
                    />
                  </div>
                  <p className="text-[10px] text-ink/30 mt-0.5">Lo que pagas</p>
                </div>
              </div>

              {/* Categoría y Stock inicial */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-ink/50 mb-1.5">
                    Categoría
                  </label>
                  <select
                    name="categoria_id"
                    className="w-full rounded-xl border border-linea px-3 py-3 text-sm text-ink focus:border-primario focus:outline-none focus:ring-2 focus:ring-primario/20"
                  >
                    <option value="">Sin categoría</option>
                    {categorias.map((c) => (
                      <option key={c.id} value={c.id}>{c.nombre}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-ink/50 mb-1.5">
                    Stock inicial
                  </label>
                  <input
                    name="stock_inicial"
                    type="number"
                    step="0.001"
                    min="0"
                    defaultValue={0}
                    className="w-full rounded-xl border border-linea px-3 py-3 text-sm text-ink focus:border-primario focus:outline-none focus:ring-2 focus:ring-primario/20"
                  />
                  <p className="text-[10px] text-ink/30 mt-0.5">Cantidad en existencia</p>
                </div>
              </div>

              {/* Unidad de medida y Step (incremento por default) */}
              {/* El step se muestra solo cuando la unidad no es pieza,
                  porque para piezas el default de 1 es siempre correcto. */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-ink/50 mb-1.5">
                    Se vende por
                  </label>
                  <select
                    name="unidad_medida"
                    defaultValue="pieza"
                    className="w-full rounded-xl border border-linea px-3 py-3 text-sm text-ink focus:border-primario focus:outline-none focus:ring-2 focus:ring-primario/20"
                  >
                    <option value="pieza">Pieza</option>
                    <option value="kg">Kilogramo (kg)</option>
                    <option value="g">Gramo (g)</option>
                    <option value="litro">Litro</option>
                    <option value="ml">Mililitro (ml)</option>
                    <option value="metro">Metro</option>
                    <option value="caja">Caja</option>
                    <option value="paquete">Paquete</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-ink/50 mb-1.5">
                    Incremento
                  </label>
                  <input
                    name="step_cantidad"
                    type="number"
                    step="0.001"
                    min="0.001"
                    defaultValue={1}
                    className="w-full rounded-xl border border-linea px-3 py-3 text-sm text-ink focus:border-primario focus:outline-none focus:ring-2 focus:ring-primario/20"
                  />
                  <p className="text-[10px] text-ink/30 mt-0.5">Sube/baja de a cuánto (ej. 0.1 kg)</p>
                </div>
              </div>

              {/* Impuestos — checkboxes del catálogo de la empresa */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-ink/50 mb-1.5">
                  Impuestos
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {impuestos.map((imp) => (
                    <label
                      key={imp.id}
                      className="flex items-center gap-2 rounded-lg border border-linea px-3 py-2.5 text-sm text-ink cursor-pointer hover:bg-ink/[0.02] transition"
                    >
                      <input
                        type="checkbox"
                        name="impuesto_ids"
                        value={imp.id}
                        defaultChecked={imp.aplicar_automatico}
                        className="rounded border-linea text-primario focus:ring-primario/30"
                      />
                      <span>{imp.nombre}</span>
                    </label>
                  ))}
                </div>
                <p className="text-[10px] text-ink/40 mt-1">
                  Marca los impuestos que aplican a este producto. IVA 16% viene pre-marcado.
                </p>
              </div>

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
