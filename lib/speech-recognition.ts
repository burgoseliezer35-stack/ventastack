"use client";

import { useCallback, useRef, useState } from "react";

type ResultadoVoz = {
  texto: string;
  confianza: number;
};

type EstadoVoz = "inactivo" | "escuchando" | "procesando";

// Tipos para la API nativa del navegador
declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognition;
    webkitSpeechRecognition?: new () => SpeechRecognition;
  }
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

export function useSpeechRecognition() {
  const [estado, setEstado] = useState<EstadoVoz>("inactivo");
  const [error, setError] = useState<string | null>(null);
  const recognizerRef = useRef<SpeechRecognition | null>(null);

  const disponible = typeof window !== "undefined" &&
    !!(window.SpeechRecognition || window.webkitSpeechRecognition);

  const escuchar = useCallback((): Promise<ResultadoVoz | null> => {
    return new Promise((resolve) => {
      if (!disponible) {
        setError("Tu navegador no soporta voz offline. Usa Chrome o Safari.");
        resolve(null);
        return;
      }

      const SR = window.SpeechRecognition ?? window.webkitSpeechRecognition;
      if (!SR) { resolve(null); return; }

      const rec = new SR();
      rec.lang = "es-MX";
      rec.continuous = false;
      rec.interimResults = false;
      rec.maxAlternatives = 3;
      recognizerRef.current = rec;

      setEstado("escuchando");
      setError(null);

      rec.onresult = (e: SpeechRecognitionEvent) => {
        setEstado("procesando");
        const resultado = e.results[0];
        if (resultado) {
          resolve({
            texto: resultado[0].transcript.toLowerCase(),
            confianza: resultado[0].confidence,
          });
        } else {
          resolve(null);
        }
      };

      rec.onerror = (e: SpeechRecognitionErrorEvent) => {
        setEstado("inactivo");
        if (e.error === "no-speech") {
          setError("No escuché nada — intenta de nuevo");
        } else if (e.error === "not-allowed") {
          setError("Necesitas dar permiso al micrófono");
        } else {
          setError(`Error: ${e.error}`);
        }
        resolve(null);
      };

      rec.onend = () => {
        setEstado("inactivo");
      };

      try {
        rec.start();
      } catch {
        setEstado("inactivo");
        setError("No se pudo iniciar el micrófono");
        resolve(null);
      }
    });
  }, [disponible]);

  const detener = useCallback(() => {
    recognizerRef.current?.stop();
    setEstado("inactivo");
  }, []);

  return { disponible, estado, error, escuchar, detener };
}

/**
 * Interpreta texto hablado y lo convierte en items del carrito.
 * Ejemplos:
 *   "dos cocas y una sabritas" → [{nombre: "coca", cantidad: 2}, {nombre: "sabritas", cantidad: 1}]
 *   "tres refrescos" → [{nombre: "refresco", cantidad: 3}]
 *   "una galleta y cinco jugos" → [...]
 */
export function interpretarPedidoVoz(
  texto: string,
  productos: { id: string; nombre: string; codigo_barras: string | null }[],
): { productoId: string; cantidad: number; nombreDetectado: string }[] {
  const NUMEROS: Record<string, number> = {
    un: 1, una: 1, uno: 1,
    dos: 2, tres: 3, cuatro: 4, cinco: 5,
    seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10,
    once: 11, doce: 12, trece: 13, catorce: 14, quince: 15,
    veinte: 20, veinticinco: 25, treinta: 30, cuarenta: 40, cincuenta: 50,
  };

  // Divide el texto en segmentos separados por "y", "más", comas
  const segmentos = texto.split(/\s+y\s+|\s+más\s+|,\s*/).map((s) => s.trim()).filter(Boolean);
  const resultados: { productoId: string; cantidad: number; nombreDetectado: string }[] = [];

  for (const segmento of segmentos) {
    const palabras = segmento.split(/\s+/);
    let cantidad = 1;
    let inicioPalabras = 0;

    // Busca número al principio
    const primero = palabras[0]?.toLowerCase();
    if (primero && NUMEROS[primero]) {
      cantidad = NUMEROS[primero];
      inicioPalabras = 1;
    } else {
      const num = parseInt(primero ?? "", 10);
      if (!isNaN(num)) {
        cantidad = num;
        inicioPalabras = 1;
      }
    }

    const textoBusqueda = palabras.slice(inicioPalabras).join(" ").toLowerCase();
    if (!textoBusqueda) continue;

    // Busca el producto que más coincida (por similitud de substring)
    let mejorProducto: (typeof productos)[0] | null = null;
    let mejorPuntaje = 0;

    for (const p of productos) {
      const nombreNorm = p.nombre.toLowerCase();

      // Coincidencia exacta parcial
      if (nombreNorm.includes(textoBusqueda) || textoBusqueda.includes(nombreNorm.split(" ")[0])) {
        const puntaje = textoBusqueda.length / nombreNorm.length;
        if (puntaje > mejorPuntaje) {
          mejorPuntaje = puntaje;
          mejorProducto = p;
        }
      }

      // Verifica cada palabra del texto contra el nombre
      const palabrasTexto = textoBusqueda.split(" ");
      for (const palabra of palabrasTexto) {
        if (palabra.length >= 3 && nombreNorm.includes(palabra)) {
          const puntaje = palabra.length / nombreNorm.length + 0.1;
          if (puntaje > mejorPuntaje) {
            mejorPuntaje = puntaje;
            mejorProducto = p;
          }
        }
      }
    }

    if (mejorProducto && mejorPuntaje > 0.1) {
      const existente = resultados.find((r) => r.productoId === mejorProducto!.id);
      if (existente) {
        existente.cantidad += cantidad;
      } else {
        resultados.push({
          productoId: mejorProducto.id,
          cantidad,
          nombreDetectado: textoBusqueda,
        });
      }
    }
  }

  return resultados;
}
