"use client";

import { createClient } from "@/lib/supabase/client";
import { useState } from "react";

export function CheckinButton({ clienteId }: { clienteId: string }) {
  const [estado, setEstado] = useState<"idle" | "cargando" | "ok" | "error">(
    "idle",
  );
  const [mensaje, setMensaje] = useState<string | null>(null);

  const hacerCheckin = () => {
    if (!navigator.geolocation) {
      setEstado("error");
      setMensaje("Tu navegador no puede obtener tu ubicación");
      return;
    }

    setEstado("cargando");
    setMensaje(null);

    navigator.geolocation.getCurrentPosition(
      async (posicion) => {
        const supabase = createClient();

        // El servidor (no este código) es el que decide si esto se
        // acepta o no: vuelve a calcular la distancia real y la
        // compara contra el límite de 50 metros.
        const { data, error } = await supabase.rpc("registrar_checkin", {
          p_cliente_id: clienteId,
          p_latitud: posicion.coords.latitude,
          p_longitud: posicion.coords.longitude,
        });

        if (error) {
          setEstado("error");
          setMensaje(error.message);
          return;
        }

        setEstado("ok");
        setMensaje(
          `Check-in registrado — a ${data?.distancia_metros ?? "?"}m del cliente`,
        );
      },
      () => {
        setEstado("error");
        setMensaje(
          "No se pudo obtener tu ubicación. Revisa los permisos del navegador.",
        );
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={hacerCheckin}
        disabled={estado === "cargando"}
        className="rounded-md border border-emerald-600 px-3 py-1 text-xs font-medium text-emerald-600 transition hover:bg-emerald-50 disabled:opacity-50"
      >
        {estado === "cargando" ? "Ubicando..." : "Check-in"}
      </button>
      {mensaje && (
        <p
          className={`text-xs ${
            estado === "ok" ? "text-emerald-600" : "text-red-600"
          }`}
        >
          {mensaje}
        </p>
      )}
    </div>
  );
}
