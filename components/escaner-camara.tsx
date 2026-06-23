"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

export function EscanerCamara({
  onEscaneo,
  onCerrar,
}: {
  onEscaneo: (codigo: string) => void;
  onCerrar: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [ultimoCodigo, setUltimoCodigo] = useState<string | null>(null);
  const ultimoTimestampRef = useRef(0);
  const stopRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    let activo = true;

    const iniciar = async () => {
      try {
        const { BrowserMultiFormatReader } = await import("@zxing/library");
        const reader = new BrowserMultiFormatReader();

        if (!videoRef.current) return;

        const devices = await reader.listVideoInputDevices();
        // Prefiere la cámara trasera
        const deviceId = devices.find((d) =>
          d.label.toLowerCase().includes("back") ||
          d.label.toLowerCase().includes("rear") ||
          d.label.toLowerCase().includes("trasera")
        )?.deviceId ?? devices[devices.length - 1]?.deviceId;

        await reader.decodeFromVideoDevice(
          deviceId ?? null,
          videoRef.current,
          (result, err) => {
            if (!activo || !result) return;
            if (err) return; // Frame sin código — normal

            const codigo = result.getText();
            const ahora = Date.now();

            // Evita detectar el mismo código dos veces en menos de 2s
            if (codigo === ultimoCodigo && ahora - ultimoTimestampRef.current < 2000) return;

            ultimoTimestampRef.current = ahora;
            setUltimoCodigo(codigo);
            onEscaneo(codigo);
          }
        );

        stopRef.current = () => reader.reset();
      } catch {
        setError("No se pudo acceder a la cámara. Verifica que diste permiso.");
      }
    };

    iniciar();

    return () => {
      activo = false;
      stopRef.current?.();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      <div className="flex items-center justify-between px-4 py-3 bg-black/80">
        <p className="text-sm font-medium text-white">Apunta al código de barras</p>
        <button type="button" onClick={() => { stopRef.current?.(); onCerrar(); }}
          className="text-white/70 hover:text-white">
          <X size={22} />
        </button>
      </div>

      <div className="relative flex-1 overflow-hidden">
        <video ref={videoRef} className="h-full w-full object-cover" autoPlay muted playsInline />

        {/* Marco guía */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="relative h-44 w-64">
            <div className="absolute left-0 top-0 h-7 w-7 border-primario" style={{borderLeft:"3px solid",borderTop:"3px solid"}} />
            <div className="absolute right-0 top-0 h-7 w-7 border-primario" style={{borderRight:"3px solid",borderTop:"3px solid"}} />
            <div className="absolute left-0 bottom-0 h-7 w-7 border-primario" style={{borderLeft:"3px solid",borderBottom:"3px solid"}} />
            <div className="absolute right-0 bottom-0 h-7 w-7 border-primario" style={{borderRight:"3px solid",borderBottom:"3px solid"}} />
            <div className="absolute left-0 right-0 top-1/2 h-px bg-primario/60 animate-pulse" />
          </div>
        </div>

        {ultimoCodigo && (
          <div className="absolute bottom-6 left-4 right-4 rounded-xl bg-verde/90 px-4 py-3 text-center">
            <p className="text-xs text-white/70 mb-0.5">Detectado</p>
            <p className="font-mono font-bold text-white text-lg">{ultimoCodigo}</p>
          </div>
        )}
      </div>

      {error && <div className="bg-red-600 px-4 py-3 text-sm text-white text-center">{error}</div>}
      <div className="bg-black/80 px-4 py-3 text-center">
        <p className="text-xs text-white/40">Se detecta automáticamente · Toca ✕ para cerrar</p>
      </div>
    </div>
  );
}
