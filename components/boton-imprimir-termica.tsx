"use client";

import { useState } from "react";
import { Printer, Loader2, CheckCircle, AlertTriangle } from "lucide-react";
import {
  generarBytesTicket,
  imprimirBluetooth,
  imprimirWifi,
  type LineaTicket,
  type ConfigImpresora,
} from "@/lib/impresora";

type Props = {
  lineas: LineaTicket[];
  config: ConfigImpresora | null;
  abrirCajon?: boolean;
};

export function BotonImprimirTermica({ lineas, config, abrirCajon = true }: Props) {
  const [estado, setEstado] = useState<"idle" | "imprimiendo" | "ok" | "error">("idle");
  const [mensajeError, setMensajeError] = useState<string | null>(null);

  if (!config || config.tipo === "ninguna") {
    return (
      <p className="text-xs text-ink/40 text-center">
        Configura tu impresora en{" "}
        <a href="/protected/configuracion-impresora" className="text-primario hover:underline">
          Configuración de impresora
        </a>{" "}
        para imprimir aquí.
      </p>
    );
  }

  const imprimir = async () => {
    setEstado("imprimiendo");
    setMensajeError(null);

    const bytes = generarBytesTicket(lineas, config.anchoPapel, abrirCajon);

    let resultado: { ok: boolean; error?: string };

    if (config.tipo === "bluetooth") {
      resultado = await imprimirBluetooth(bytes, config.deviceId);
    } else {
      resultado = await imprimirWifi(bytes, config.ip!, config.puerto);
    }

    if (resultado.ok) {
      setEstado("ok");
      setTimeout(() => setEstado("idle"), 3000);
    } else {
      setEstado("error");
      setMensajeError(resultado.error ?? "Error desconocido");
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={imprimir}
        disabled={estado === "imprimiendo"}
        className={`flex items-center justify-center gap-2 w-full rounded-xl px-4 py-3 font-semibold text-white transition ${
          estado === "ok"
            ? "bg-verde"
            : estado === "error"
            ? "bg-red-600"
            : "bg-primario hover:opacity-90"
        } disabled:opacity-50`}
      >
        {estado === "imprimiendo" && <Loader2 size={16} className="animate-spin" />}
        {estado === "ok" && <CheckCircle size={16} />}
        {estado === "error" && <AlertTriangle size={16} />}
        {estado === "idle" && <Printer size={16} />}
        {estado === "imprimiendo"
          ? "Imprimiendo..."
          : estado === "ok"
          ? "¡Impreso!"
          : estado === "error"
          ? "Error al imprimir"
          : `Imprimir en ${config.tipo === "bluetooth" ? "Bluetooth" : "WiFi"}`}
      </button>

      {estado === "error" && mensajeError && (
        <p className="text-xs text-red-600 text-center">{mensajeError}</p>
      )}

      <p className="text-[10px] text-ink/30 text-center">
        {config.tipo === "bluetooth"
          ? `📶 ${config.nombre ?? "Impresora Bluetooth"}`
          : `🌐 ${config.ip}:${config.puerto ?? 9100}`}
        {abrirCajon ? " · cajón de dinero incluido" : ""}
      </p>
    </div>
  );
}
