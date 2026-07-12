import { NextRequest, NextResponse } from "next/server";

export type ColoniaResult = {
  colonia: string;
  municipio: string;
  estado: string;
  ciudad: string;
};

export type CPResult = {
  cp: string;
  municipio: string;
  estado: string;
  ciudad: string;
  colonias: string[];
};

// ── Proveedor 1: Postali (postali.app) ───────────────────────
// Sin API key, sin registro, sin límites. Datos de SEPOMEX oficial.
// Cacheado en Cloudflare — rápido desde México.
async function consultarPostali(cp: string): Promise<CPResult | null> {
  try {
    const res = await fetch(
      `https://postali.app/api/v1/cp/${cp}`,
      {
        headers: { "Accept": "application/json" },
        next: { revalidate: 86400 },
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (!data?.municipio) return null;

    const colonias = (data.asentamientos ?? [])
      .map((a: { nombre?: string }) => a.nombre)
      .filter(Boolean)
      .sort();

    return {
      cp,
      municipio: data.municipio ?? "",
      estado: data.estado ?? "",
      ciudad: data.asentamientos?.[0]?.ciudad ?? data.municipio ?? "",
      colonias,
    };
  } catch {
    return null;
  }
}

// ── Proveedor 2: codigos.zip (fallback) ──────────────────────
// 1,000 req/hora gratis. Requiere API key como variable de entorno.
// Si no está configurada, se omite silenciosamente.
async function consultarCodigosZip(cp: string): Promise<CPResult | null> {
  const key = process.env.CODIGOS_ZIP_API_KEY;
  if (!key) return null;

  try {
    const res = await fetch(
      `https://api.codigos.zip/api/zip/${cp}?pais=MX`,
      {
        headers: {
          "X-API-Key": key,
          "Accept": "application/json",
        },
        next: { revalidate: 86400 },
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (!data?.colonias?.length) return null;

    return {
      cp,
      municipio: data.municipio ?? "",
      estado: data.estado ?? "",
      ciudad: data.ciudad ?? data.municipio ?? "",
      colonias: Array.isArray(data.colonias)
        ? data.colonias.map((c: { nombre?: string } | string) =>
            typeof c === "string" ? c : c.nombre ?? ""
          ).filter(Boolean).sort()
        : [],
    };
  } catch {
    return null;
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ cp: string }> }
) {
  const { cp } = await params;

  // Validar formato CP mexicano (5 dígitos)
  if (!/^\d{5}$/.test(cp)) {
    return NextResponse.json(
      { error: "CP inválido — debe tener 5 dígitos" },
      { status: 400 }
    );
  }

  // Intentar Postali primero (sin API key, SEPOMEX oficial)
  let resultado = await consultarPostali(cp);

  // Si falla, intentar codigos.zip (requiere CODIGOS_ZIP_API_KEY en .env)
  if (!resultado) {
    resultado = await consultarCodigosZip(cp);
  }

  if (!resultado) {
    return NextResponse.json(
      { error: "CP no encontrado" },
      { status: 404 }
    );
  }

  return NextResponse.json(resultado, {
    headers: {
      // Caché en el browser 24h — los CP casi nunca cambian
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
    },
  });
}
