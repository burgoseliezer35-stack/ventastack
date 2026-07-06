import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type PedidoInput = {
  id: string;
  direccion_entrega: string;
  lat?: number | null;
  lng?: number | null;
};

// Geocodifica una dirección con OSM Nominatim.
// Devuelve [lng, lat] (orden que usa ORS) o null si falla.
async function geocodificar(direccion: string): Promise<[number, number] | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(direccion)}&format=json&limit=1&countrycodes=mx`;
    const res = await fetch(url, {
      headers: {
        "User-Agent": "VentaStack/1.0 (contacto@ventastack.com)",
        "Accept-Language": "es",
      },
    });
    const data = await res.json();
    if (data?.[0]) {
      return [parseFloat(data[0].lon), parseFloat(data[0].lat)];
    }
  } catch { /* ignorar */ }
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const orsKey = process.env.ORS_API_KEY;
    if (!orsKey) {
      return NextResponse.json(
        { error: "ORS_API_KEY no configurada" },
        { status: 500 }
      );
    }

    const supabase = await createClient();
    const { data: claims } = await supabase.auth.getClaims();
    if (!claims?.claims) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const { pedidos, repartidor_lat, repartidor_lng } = await req.json() as {
      pedidos: PedidoInput[];
      repartidor_lat: number;
      repartidor_lng: number;
    };

    if (!pedidos?.length || pedidos.length < 2) {
      return NextResponse.json(
        { error: "Se necesitan al menos 2 entregas para optimizar" },
        { status: 400 }
      );
    }

    // ── 1. Geocodificar los pedidos que no tienen coordenadas ──
    const coordenadas: Record<string, [number, number]> = {};
    const actualizaciones: { id: string; lat: number; lng: number }[] = [];

    for (const p of pedidos) {
      if (p.lat && p.lng) {
        coordenadas[p.id] = [p.lng, p.lat]; // ORS usa [lng, lat]
      } else if (p.direccion_entrega) {
        const coords = await geocodificar(p.direccion_entrega);
        if (coords) {
          coordenadas[p.id] = coords;
          actualizaciones.push({ id: p.id, lat: coords[1], lng: coords[0] });
        }
      }
    }

    // Guardar coordenadas geocodificadas en BD para no repetir
    for (const upd of actualizaciones) {
      await supabase
        .from("pedidos")
        .update({ lat: upd.lat, lng: upd.lng })
        .eq("id", upd.id);
    }

    // Filtrar pedidos que sí tienen coordenadas
    const pedidosConCoords = pedidos.filter(p => coordenadas[p.id]);

    if (pedidosConCoords.length < 2) {
      return NextResponse.json(
        { error: "No se pudieron geocodificar suficientes direcciones" },
        { status: 422 }
      );
    }

    // ── 2. Llamar ORS Optimization API (VROOM) ────────────────
    // El repartidor empieza y termina en su ubicación actual.
    // Cada pedido es un "job" con su ubicación de entrega.
    const orsBody = {
      jobs: pedidosConCoords.map((p, i) => ({
        id: i + 1,
        location: coordenadas[p.id], // [lng, lat]
        service: 300, // 5 min estimados por entrega
      })),
      vehicles: [
        {
          id: 1,
          profile: "driving-car",
          start: [repartidor_lng, repartidor_lat],
          end: [repartidor_lng, repartidor_lat],
        },
      ],
      options: { g: true }, // incluir geometría de la ruta
    };

    const orsRes = await fetch(
      "https://api.openrouteservice.org/optimization",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: orsKey,
        },
        body: JSON.stringify(orsBody),
      }
    );

    if (!orsRes.ok) {
      const orsError = await orsRes.text();
      console.error("ORS error:", orsError);
      return NextResponse.json(
        { error: "Error al calcular la ruta óptima" },
        { status: 502 }
      );
    }

    const orsData = await orsRes.json();

    // ── 3. Extraer el orden óptimo de paradas ─────────────────
    // ORS devuelve routes[0].steps con los jobs en el orden óptimo.
    // Cada step tiene job (índice base-1) para identificar el pedido.
    const steps = orsData.routes?.[0]?.steps ?? [];
    const ordenOptimo: string[] = [];

    for (const step of steps) {
      if (step.type === "job") {
        const idx = step.job - 1; // convertir de base-1 a base-0
        const pedido = pedidosConCoords[idx];
        if (pedido) ordenOptimo.push(pedido.id);
      }
    }

    // Pedidos sin coordenadas van al final (no se pudieron optimizar)
    const sinCoords = pedidos
      .filter(p => !coordenadas[p.id])
      .map(p => p.id);

    const distanciaTotal = orsData.routes?.[0]?.summary?.distance ?? 0;
    const duracionTotal = orsData.routes?.[0]?.summary?.duration ?? 0;

    return NextResponse.json({
      orden: [...ordenOptimo, ...sinCoords],
      distancia_km: Math.round(distanciaTotal / 1000),
      duracion_min: Math.round(duracionTotal / 60),
      geocodificados: actualizaciones.length,
    });
  } catch (err) {
    console.error("Error en /api/reparto/optimizar:", err);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
