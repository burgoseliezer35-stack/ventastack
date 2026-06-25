"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { imgUrl } from "@/lib/img-proxy";
import { Camera } from "lucide-react";
import Link from "next/link";

type Producto = {
  id: string;
  nombre: string;
  precio: number;
  activo: boolean;
  stock: number;
  categoria_id: string | null;
  codigo_barras: string | null;
  imagen_url: string | null;
};

export function EditarProductoForm({
  producto,
  categorias,
  actualizarProducto,
}: {
  producto: Producto;
  categorias: { id: string; nombre: string }[];
  actualizarProducto: (id: string, formData: FormData) => Promise<{ ok: boolean; error?: string }>;
}) {
  const [preview, setPreview] = useState<string | null>(producto.imagen_url);
  const [subiendoFoto, setSubiendoFoto] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [urlImagen, setUrlImagen] = useState<string | null>(producto.imagen_url);
  const fileRef = useRef<HTMLInputElement>(null);
  const imagenHiddenRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();

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

  const manejarFoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const archivo = e.target.files?.[0];
    if (!archivo) return;

    // Preview inmediato
    const reader = new FileReader();
    reader.onloadend = () => setPreview(reader.result as string);
    reader.readAsDataURL(archivo);

    setSubiendoFoto(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      const blob = await comprimirABlob(archivo);
      const ruta = `productos/${user?.id ?? "anon"}-${Date.now()}.jpg`;
      const { error } = await supabase.storage
        .from("productos")
        .upload(ruta, blob, { contentType: "image/jpeg", upsert: true });

      if (!error) {
        const { data } = supabase.storage.from("productos").getPublicUrl(ruta);
        setPreview(data.publicUrl);
        setUrlImagen(data.publicUrl);
        if (imagenHiddenRef.current) imagenHiddenRef.current.value = data.publicUrl;
      }
    } catch { /* mantener preview */ }
    finally { setSubiendoFoto(false); }
  };

  const quitarImagen = () => {
    setPreview(null);
    setUrlImagen(null);
    if (imagenHiddenRef.current) imagenHiddenRef.current.value = "";
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <div className="rounded-lg border border-linea bg-white p-6">
      {/* Stock info */}
      <div className="mb-4 flex items-center justify-between rounded-md bg-paper px-3 py-2 text-sm">
        <span className="text-ink/60">
          <span className="cifra font-medium text-ink">{producto.stock}</span> en existencia
        </span>
        <div className="flex gap-3 text-xs">
          <Link href={`/protected/productos/${producto.id}/ajustar`} className="text-primario hover:underline">Ajustar</Link>
          <Link href={`/protected/productos/${producto.id}/kardex`} className="text-primario hover:underline">Ver kardex</Link>
        </div>
      </div>

      <form
        ref={formRef}
        onSubmit={async (e) => {
          e.preventDefault();
          setGuardando(true);
          // Asegurar que imagen_url tenga el valor correcto antes de enviar
          if (imagenHiddenRef.current) {
            imagenHiddenRef.current.value = urlImagen ?? "";
          }
          const formData = new FormData(formRef.current!);
          await actualizarProducto(producto.id, formData);
          router.push("/protected/productos");
          router.refresh();
        }}
        className="flex flex-col gap-4"
      >

        {/* Imagen */}
        <div>
          <label className="block text-sm font-medium text-ink mb-2">Imagen del producto</label>
          <div className="flex items-center gap-4">
            {/* Preview */}
            <button type="button" onClick={() => fileRef.current?.click()}
              className="relative shrink-0 group">
              {preview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imgUrl(preview) ?? ""} alt="Producto"
                  className="h-20 w-20 rounded-xl object-contain border border-linea bg-paper" />
              ) : (
                <div className="h-20 w-20 rounded-xl border-2 border-dashed border-linea bg-paper flex items-center justify-center text-2xl group-hover:border-primario transition">
                  📦
                </div>
              )}
              {subiendoFoto && (
                <div className="absolute inset-0 rounded-xl bg-black/50 flex items-center justify-center">
                  <div className="h-5 w-5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                </div>
              )}
            </button>

            <div className="flex flex-col gap-1.5">
              <button type="button" onClick={() => fileRef.current?.click()}
                disabled={subiendoFoto}
                className="flex items-center gap-1.5 text-sm text-primario hover:underline disabled:opacity-50">
                <Camera size={14} />
                {subiendoFoto ? "Subiendo..." : preview ? "Cambiar imagen" : "Subir imagen"}
              </button>
              <p className="text-xs text-ink/40">Cámara, galería o archivos</p>
              {preview && !subiendoFoto && (
                <button type="button" onClick={quitarImagen}
                  className="text-xs text-red-500 hover:underline text-left">
                  Quitar imagen
                </button>
              )}
            </div>
          </div>

          <input ref={fileRef} type="file" accept="image/*"
            className="hidden" onChange={manejarFoto} />
          <input ref={imagenHiddenRef} name="imagen_url" type="hidden"
            defaultValue={urlImagen ?? ""} />
        </div>

        <hr className="border-linea" />

        {/* Nombre */}
        <div>
          <label htmlFor="nombre" className="block text-sm font-medium text-ink">Nombre</label>
          <input id="nombre" name="nombre" type="text" required defaultValue={producto.nombre}
            className="mt-1 w-full rounded-md border border-linea px-3 py-2 text-ink focus:border-primario focus:outline-none" />
        </div>

        {/* Precio */}
        <div>
          <label htmlFor="precio" className="block text-sm font-medium text-ink">Precio</label>
          <input id="precio" name="precio" type="number" step="0.01" min="0" required defaultValue={producto.precio}
            className="mt-1 w-full rounded-md border border-linea px-3 py-2 text-ink focus:border-primario focus:outline-none" />
        </div>

        {/* Categoría */}
        <div>
          <label htmlFor="categoria_id" className="block text-sm font-medium text-ink">Categoría (opcional)</label>
          <select id="categoria_id" name="categoria_id" defaultValue={producto.categoria_id ?? ""}
            className="mt-1 w-full rounded-md border border-linea px-3 py-2 text-ink focus:border-primario focus:outline-none">
            <option value="">Sin categoría</option>
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>{c.nombre}</option>
            ))}
          </select>
        </div>

        {/* Código de barras */}
        <div>
          <label htmlFor="codigo_barras" className="block text-sm font-medium text-ink">Código de barras (opcional)</label>
          <input id="codigo_barras" name="codigo_barras" type="text" defaultValue={producto.codigo_barras ?? ""}
            className="mt-1 w-full rounded-md border border-linea px-3 py-2 text-ink focus:border-primario focus:outline-none" />
        </div>

        {/* Activo */}
        <label className="flex items-center gap-2 text-sm text-ink">
          <input type="checkbox" name="activo" defaultChecked={producto.activo} />
          Activo (visible en el punto de venta)
        </label>

        <button type="submit" disabled={guardando || subiendoFoto}
          className="w-full rounded-md bg-primario px-4 py-2 font-medium text-white transition hover:opacity-90 disabled:opacity-50">
          {guardando ? "Guardando..." : subiendoFoto ? "Esperando foto..." : "Guardar cambios"}
        </button>
      </form>
    </div>
  );
}
