"use client";

import { useState, useRef } from "react";
import { Camera } from "lucide-react";

export function LogoUpload({ logoActual }: { logoActual: string | null }) {
  const [preview, setPreview] = useState<string | null>(logoActual);
  const [logoData, setLogoData] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const manejarArchivo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const archivo = e.target.files?.[0];
    if (!archivo) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const url = reader.result as string;
      setPreview(url);
      setLogoData(url);
    };
    reader.readAsDataURL(archivo);
  };

  return (
    <div className="flex items-center gap-4">
      {/* Vista previa */}
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        className="relative group shrink-0"
      >
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={preview}
            alt="Logo"
            className="h-20 w-20 rounded-xl object-contain border border-linea bg-paper"
          />
        ) : (
          <div className="h-20 w-20 rounded-xl border-2 border-dashed border-linea bg-paper flex items-center justify-center text-3xl">
            🏪
          </div>
        )}
        <div className="absolute inset-0 rounded-xl bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <Camera size={20} className="text-white" />
        </div>
      </button>

      <div className="flex-1">
        <p className="text-sm font-medium text-ink">Logo del negocio</p>
        <p className="text-xs text-ink/50 mt-0.5">
          Toca la imagen para cambiarla. JPG, PNG o cualquier formato de imagen.
          Aparece en el ticket de venta.
        </p>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="mt-2 text-xs font-medium text-primario hover:underline"
        >
          {preview ? "Cambiar logo" : "Subir logo"}
        </button>
        {preview && (
          <button
            type="button"
            onClick={() => { setPreview(null); setLogoData(""); }}
            className="ml-3 mt-2 text-xs text-ink/40 hover:text-red-600"
          >
            Quitar
          </button>
        )}
      </div>

      {/* Input oculto para el archivo */}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={manejarArchivo}
      />

      {/* Campo oculto que manda el valor al form server action */}
      <input
        name="logo_url"
        type="hidden"
        value={logoData ?? logoActual ?? ""}
      />
    </div>
  );
}
