"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useRef, useState } from "react";

// Cada cuántos milisegundos mandamos la ubicación como mucho, aunque
// el GPS reporte cambios más seguido (para no gastar de más).
const INTERVALO_MINIMO_MS = 30_000;

export function CompartirUbicacion() {
  const [activo, setActivo] = useState(false);
  const ultimoEnvioRef = useRef(0);

  useEffect(() => {
    if (!navigator.geolocation) return;

    const supabase = createClient();

    const watchId = navigator.geolocation.watchPosition(
      (posicion) => {
        const ahora = Date.now();
        if (ahora - ultimoEnvioRef.current < INTERVALO_MINIMO_MS) return;
        ultimoEnvioRef.current = ahora;

        setActivo(true);
        supabase
          .rpc("actualizar_mi_ubicacion", {
            p_latitud: posicion.coords.latitude,
            p_longitud: posicion.coords.longitude,
          })
          .then(() => {});
      },
      () => {
        // Si no da permiso, o falla, simplemente no compartimos —
        // no es un error que deba interrumpir su trabajo.
        setActivo(false);
      },
      { enableHighAccuracy: true, maximumAge: 60_000 },
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  if (!activo) return null;

  return (
    <div className="fixed bottom-3 right-3 z-40 rounded-full bg-ink/80 px-3 py-1 text-xs text-white shadow-md">
      📍 Compartiendo tu ubicación con tu equipo
    </div>
  );
}
