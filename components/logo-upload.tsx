"use client";

import { useState, useRef, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export function LogoUpload({ logoActual }: { logoActual: string | null }) {
  const [preview, setPreview] = useState<string | null>(logoActual);
  const [subiendo, setSubiendo] = useState(false);
  const [urlGuardada, setUrlGuardada] = useState<string | null>(logoActual);
  const fileRef = useRef<HTMLInputElement>(null);
  const hiddenRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (hiddenRef.current) {
      hiddenRef.current.value = urlGuardada ?? "";
    }
  }, [urlGuardada]);

  const manejarArchivo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const archivo = e.target.files?.[0];
    if (!archivo) return;

    // Preview inmediato mientras sube
    const reader = new FileReader();
    reader.onloadend = () => setPreview(reader.result as string);
    reader.readAsDataURL(archivo);

    // Comprimir antes de subir
    setSubiendo(true);
    try {
      const urlFinal = await subirAStorage(archivo);
      setPreview(urlFinal);
      setUrlGuardada(urlFinal);
      if (hiddenRef.current) hiddenRef.current.value = urlFinal;
    } catch (err) {
      console.error("Error subiendo logo:", err);
      // Fallback: guardar como base64 comprimido
      const base64 = await comprimirImagen(archivo);
      setPreview(base64);
      setUrlGuardada(base64);
      if (hiddenRef.current) hiddenRef.current.value = base64;
    } finally {
      setSubiendo(false);
    }
  };

  const subirAStorage = async (archivo: File): Promise<string> => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("No autenticado");

    // Comprimir antes de subir
    const blob = await comprimirABlob(archivo);
    const ext = "jpg";
    // crypto.randomUUID() genera un ID único sin depender de Date.now()
    // (función impura rechazada por react-hooks/purity).
    const ruta = `logos/${user.id}-${crypto.randomUUID()}.${ext}`;

    const { error } = await supabase.storage
      .from("empresas")
      .upload(ruta, blob, { contentType: "image/jpeg", upsert: true });

    if (error) throw error;

    const { data } = supabase.storage.from("empresas").getPublicUrl(ruta);
    return data.publicUrl;
  };

  const comprimirABlob = (archivo: File): Promise<Blob> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new window.Image();
        img.onload = () => {
          const MAX = 500;
          const escala = Math.min(1, MAX / Math.max(img.width, img.height));
          const canvas = document.createElement("canvas");
          canvas.width = Math.round(img.width * escala);
          canvas.height = Math.round(img.height * escala);
          canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
          canvas.toBlob((b) => b ? resolve(b) : reject(new Error("Canvas vacío")), "image/jpeg", 0.8);
        };
        img.onerror = reject;
        img.src = reader.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(archivo);
    });

  const comprimirImagen = (archivo: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new window.Image();
        img.onload = () => {
          const MAX = 400;
          const escala = Math.min(1, MAX / Math.max(img.width, img.height));
          const canvas = document.createElement("canvas");
          canvas.width = Math.round(img.width * escala);
          canvas.height = Math.round(img.height * escala);
          canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL("image/jpeg", 0.7));
        };
        img.onerror = reject;
        img.src = reader.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(archivo);
    });

  const quitarLogo = () => {
    setPreview(null);
    setUrlGuardada(null);
    if (hiddenRef.current) hiddenRef.current.value = "";
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <div className="flex items-center gap-4">
      {/* Preview */}
      <button type="button" onClick={() => fileRef.current?.click()}
        className="relative group shrink-0">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="Logo"
            className="h-20 w-20 rounded-xl object-contain border border-linea bg-paper" />
        ) : (
          <div className="h-20 w-20 rounded-xl border-2 border-dashed border-linea bg-paper flex items-center justify-center text-3xl">
            🏪
          </div>
        )}
        {subiendo && (
          <div className="absolute inset-0 rounded-xl bg-black/50 flex items-center justify-center">
            <div className="h-5 w-5 rounded-full border-2 border-white border-t-transparent animate-spin" />
          </div>
        )}
      </button>

      <div className="flex-1">
        <p className="text-sm font-medium text-ink">Logo del negocio</p>
        <p className="text-xs text-ink/50 mt-0.5">
          JPG, PNG o cualquier formato. Aparece en el ticket de venta.
        </p>
        <div className="flex items-center gap-3 mt-2">
          <button type="button" onClick={() => fileRef.current?.click()}
            disabled={subiendo}
            className="text-xs font-medium text-primario hover:underline disabled:opacity-50">
            {subiendo ? "Subiendo..." : preview ? "Cambiar logo" : "Subir logo"}
          </button>
          {preview && !subiendo && (
            <button type="button" onClick={quitarLogo}
              className="text-xs text-ink/40 hover:text-red-600">
              Quitar
            </button>
          )}
        </div>
      </div>

      {/* Sin capture — permite galería, cámara y archivos */}
      <input ref={fileRef} type="file" accept="image/*"
        className="hidden" onChange={manejarArchivo} />

      {/* URL final que va al server action */}
      <input ref={hiddenRef} name="logo_url" type="hidden"
        defaultValue={logoActual ?? ""} />
    </div>
  );
}
