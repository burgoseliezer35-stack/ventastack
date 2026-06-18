"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useRef, useState } from "react";
import type { Map as LeafletMap, Marker as LeafletMarker } from "leaflet";
import "leaflet/dist/leaflet.css";

// Centro de Mérida, Yucatán — ahí es donde opera la flotilla, así
// que el mapa siempre arranca viendo esa zona, sin importar si hay
// vendedores activos en ese momento o no.
const CENTRO_MERIDA: [number, number] = [20.9674, -89.5926];

// Cada cuántos segundos volvemos a preguntar por ubicaciones nuevas.
const INTERVALO_REFRESCO_MS = 20_000;

// Si la última ubicación de un vendedor es más vieja que esto, no
// lo mostramos como "en vivo" — mostrar un punto viejo como si
// fuera de ahora sería engañoso.
const MINUTOS_PARA_CONSIDERAR_OBSOLETO = 10;

type VendedorConUbicacion = {
  id: string;
  nombre: string;
  latitud: number;
  longitud: number;
  actualizadoEn: string;
};

export function MapaFlotilla({ vendedores }: { vendedores: { id: string; nombre: string }[] }) {
  const mapaDivRef = useRef<HTMLDivElement>(null);
  const mapaRef = useRef<LeafletMap | null>(null);
  const marcadoresRef = useRef<Map<string, LeafletMarker>>(new Map());
  const [enVivo, setEnVivo] = useState<VendedorConUbicacion[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let activo = true;

    const inicializar = async () => {
      const L = (await import("leaflet")).default;

      if (!mapaDivRef.current || mapaRef.current) return;

      mapaRef.current = L.map(mapaDivRef.current).setView(CENTRO_MERIDA, 13);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap",
        maxZoom: 19,
      }).addTo(mapaRef.current);

      const actualizar = async () => {
        const supabase = createClient();
        const ids = vendedores.map((v) => v.id);
        if (ids.length === 0) return;

        const { data, error: errUbicaciones } = await supabase
          .from("ubicaciones_vendedor")
          .select("vendedor_id, latitud, longitud, actualizado_en")
          .in("vendedor_id", ids);

        if (!activo) return;

        if (errUbicaciones) {
          setError(errUbicaciones.message);
          return;
        }

        const limiteMs = MINUTOS_PARA_CONSIDERAR_OBSOLETO * 60_000;
        const ahora = Date.now();

        const conNombre: VendedorConUbicacion[] = (data ?? [])
          .filter((u) => ahora - new Date(u.actualizado_en).getTime() <= limiteMs)
          .map((u) => {
            const vendedor = vendedores.find((v) => v.id === u.vendedor_id);
            return {
              id: u.vendedor_id,
              nombre: vendedor?.nombre ?? "Vendedor",
              latitud: u.latitud,
              longitud: u.longitud,
              actualizadoEn: u.actualizado_en,
            };
          });

        setEnVivo(conNombre);

        // Sincronizamos marcadores: quitamos los que ya no están en
        // línea, movemos los que sí, y creamos los nuevos.
        const idsVivos = new Set(conNombre.map((v) => v.id));
        for (const [id, marcador] of marcadoresRef.current) {
          if (!idsVivos.has(id)) {
            marcador.remove();
            marcadoresRef.current.delete(id);
          }
        }
        for (const v of conNombre) {
          const existente = marcadoresRef.current.get(v.id);
          if (existente) {
            existente.setLatLng([v.latitud, v.longitud]);
          } else if (mapaRef.current) {
            const nuevo = L.marker([v.latitud, v.longitud])
              .addTo(mapaRef.current)
              .bindPopup(v.nombre);
            marcadoresRef.current.set(v.id, nuevo);
          }
        }
      };

      await actualizar();
      const intervalo = setInterval(actualizar, INTERVALO_REFRESCO_MS);
      return () => clearInterval(intervalo);
    };

    const limpiarPromesa = inicializar();

    return () => {
      activo = false;
      limpiarPromesa.then((limpiar) => limpiar?.());
      mapaRef.current?.remove();
      mapaRef.current = null;
    };
  }, [vendedores]);

  return (
    <div className="flex flex-col gap-3">
      <div
        ref={mapaDivRef}
        className="h-[60vh] w-full rounded-lg border border-linea"
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="rounded-lg border border-linea bg-white p-3 text-sm">
        {enVivo.length === 0 ? (
          <p className="text-ink/50">
            Ningún vendedor está compartiendo ubicación en este momento.
          </p>
        ) : (
          <p className="text-ink/70">
            {enVivo.length} vendedor{enVivo.length === 1 ? "" : "es"} en línea
            ahora.
          </p>
        )}
      </div>
    </div>
  );
}
