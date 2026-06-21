import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const barcode = searchParams.get("codigo");

  if (!barcode?.trim()) {
    return NextResponse.json({ error: "Falta el código" }, { status: 400 });
  }

  try {
    // Solo pedimos los campos que nos interesan para no traer
    // toda la info nutricional que no necesitamos.
    const res = await fetch(
      `https://world.openfoodfacts.org/api/v0/product/${encodeURIComponent(barcode.trim())}.json?fields=product_name,product_name_es,categories_tags,image_front_url`,
      {
        headers: {
          "User-Agent": "Ventastack/1.0 (soporte@ventastack.app)",
        },
        next: { revalidate: 86400 }, // cachea 24h para no golpear la API
      },
    );

    if (!res.ok) {
      return NextResponse.json({ encontrado: false });
    }

    const json = await res.json();

    if (json.status !== 1 || !json.product) {
      return NextResponse.json({ encontrado: false });
    }

    const p = json.product;

    // Prefiere el nombre en español, si está disponible
    const nombre =
      p.product_name_es?.trim() || p.product_name?.trim() || null;

    // Toma la primera categoría en español o inglés
    const categorias: string[] = p.categories_tags ?? [];
    const categoriaRaw =
      categorias.find((c: string) => c.startsWith("es:")) ||
      categorias.find((c: string) => c.startsWith("en:")) ||
      null;
    const categoria = categoriaRaw
      ? categoriaRaw.replace(/^(es|en):/, "").replace(/-/g, " ")
      : null;

    return NextResponse.json({
      encontrado: true,
      nombre,
      categoria,
      imagen_url: p.image_front_url ?? null,
    });
  } catch {
    return NextResponse.json({ encontrado: false });
  }
}
