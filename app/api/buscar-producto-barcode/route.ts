import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type FuenteConfig = { activo: boolean; api_key: string | null };
type BuscadoresConfig = Record<string, FuenteConfig>;

type ResultadoBusqueda = {
  encontrado: boolean;
  nombre: string | null;
  categoria: string | null;
  imagen_url: string | null;
  fuente?: string;
};

// ── Open Food Facts / Beauty / Products (misma API, distinto dominio) ──
async function buscarEnOpenFacts(codigo: string, dominio: string, fuente: string): Promise<ResultadoBusqueda> {
  try {
    const res = await fetch(
      `https://${dominio}/api/v2/product/${encodeURIComponent(codigo)}.json?fields=product_name,product_name_es,categories_tags,image_front_url`,
      { headers: { "User-Agent": "Ventastack/1.0" }, next: { revalidate: 86400 } }
    );
    if (!res.ok) return { encontrado: false, nombre: null, categoria: null, imagen_url: null };
    const json = await res.json();
    if (json.status !== 1 || !json.product) return { encontrado: false, nombre: null, categoria: null, imagen_url: null };
    const p = json.product;
    const nombre = p.product_name_es?.trim() || p.product_name?.trim() || null;
    const cats: string[] = p.categories_tags ?? [];
    const catRaw = cats.find((c: string) => c.startsWith("es:")) || cats.find((c: string) => c.startsWith("en:")) || null;
    const categoria = catRaw ? catRaw.replace(/^(es|en):/, "").replace(/-/g, " ") : null;
    return { encontrado: !!nombre, nombre, categoria, imagen_url: p.image_front_url ?? null, fuente };
  } catch {
    return { encontrado: false, nombre: null, categoria: null, imagen_url: null };
  }
}

// ── UPCitemdb ──
async function buscarEnUPCitemdb(codigo: string): Promise<ResultadoBusqueda> {
  try {
    const res = await fetch(
      `https://api.upcitemdb.com/prod/trial/lookup?upc=${encodeURIComponent(codigo)}`,
      { next: { revalidate: 86400 } }
    );
    if (!res.ok) return { encontrado: false, nombre: null, categoria: null, imagen_url: null };
    const json = await res.json();
    const item = json.items?.[0];
    if (!item) return { encontrado: false, nombre: null, categoria: null, imagen_url: null };
    return { encontrado: true, nombre: item.title ?? null, categoria: item.category ?? null, imagen_url: item.images?.[0] ?? null, fuente: "upcitemdb" };
  } catch {
    return { encontrado: false, nombre: null, categoria: null, imagen_url: null };
  }
}

// ── Go-UPC ──
async function buscarEnGoUPC(codigo: string, apiKey: string): Promise<ResultadoBusqueda> {
  try {
    const res = await fetch(
      `https://go-upc.com/api/v1/code/${encodeURIComponent(codigo)}`,
      { headers: { "Authorization": `Bearer ${apiKey}` }, next: { revalidate: 86400 } }
    );
    if (!res.ok) return { encontrado: false, nombre: null, categoria: null, imagen_url: null };
    const json = await res.json();
    if (!json.product) return { encontrado: false, nombre: null, categoria: null, imagen_url: null };
    return { encontrado: true, nombre: json.product.name ?? null, categoria: json.product.category ?? null, imagen_url: json.product.imageUrl ?? null, fuente: "goupc" };
  } catch {
    return { encontrado: false, nombre: null, categoria: null, imagen_url: null };
  }
}

// ── Barcode Spider ──
async function buscarEnBarcodeSpider(codigo: string, apiKey: string): Promise<ResultadoBusqueda> {
  try {
    const res = await fetch(
      `https://www.barcodespider.com/v1/lookup?token=${apiKey}&upc=${encodeURIComponent(codigo)}`,
      { next: { revalidate: 86400 } }
    );
    if (!res.ok) return { encontrado: false, nombre: null, categoria: null, imagen_url: null };
    const json = await res.json();
    const item = json.item_response?.item_attributes;
    if (!item) return { encontrado: false, nombre: null, categoria: null, imagen_url: null };
    return { encontrado: true, nombre: item.title ?? null, categoria: item.category ?? null, imagen_url: item.image ?? null, fuente: "barcodespider" };
  } catch {
    return { encontrado: false, nombre: null, categoria: null, imagen_url: null };
  }
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const codigo = searchParams.get("codigo")?.trim();
  if (!codigo) return NextResponse.json({ error: "Falta el código" }, { status: 400 });

  const userId = data.claims.sub as string;
  const { data: perfil } = await supabase.from("profiles").select("company_id").eq("id", userId).limit(1).maybeSingle();

  // 1. Buscar en caché (filtrado por empresa para no mezclar resultados)
  if (perfil?.company_id) {
    const { data: cached } = await supabase
      .from("cache_productos_barcode")
      .select("nombre, categoria, imagen_url, fuente")
      .eq("codigo_barras", codigo)
      .eq("company_id", perfil.company_id)
      .single();

    if (cached?.nombre) {
      return NextResponse.json({ encontrado: true, ...cached, desde_cache: true });
    }
  }

  // 2. Obtener configuración de buscadores de la empresa
  const { data: empresa } = await supabase
    .from("companies")
    .select("buscadores_config")
    .eq("id", perfil?.company_id)
    .single();

  const buscadoresConfig: BuscadoresConfig = empresa?.buscadores_config ?? {
    openfoodfacts: { activo: true, api_key: null },
  };

  // 3. Buscar en cada fuente activa en orden
  const ORDEN = ["openfoodfacts", "openbeautyfacts", "openproductsfacts", "upcitemdb", "goupc", "barcodespider"];
  let resultado: ResultadoBusqueda = { encontrado: false, nombre: null, categoria: null, imagen_url: null };

  for (const fuente of ORDEN) {
    const cfg = buscadoresConfig[fuente];
    if (!cfg?.activo) continue;

    if (fuente === "openfoodfacts") resultado = await buscarEnOpenFacts(codigo, "world.openfoodfacts.org", fuente);
    else if (fuente === "openbeautyfacts") resultado = await buscarEnOpenFacts(codigo, "world.openbeautyfacts.org", fuente);
    else if (fuente === "openproductsfacts") resultado = await buscarEnOpenFacts(codigo, "world.openproductsfacts.org", fuente);
    else if (fuente === "upcitemdb") resultado = await buscarEnUPCitemdb(codigo);
    else if (fuente === "goupc" && cfg.api_key) resultado = await buscarEnGoUPC(codigo, cfg.api_key);
    else if (fuente === "barcodespider" && cfg.api_key) resultado = await buscarEnBarcodeSpider(codigo, cfg.api_key);

    if (resultado.encontrado) break; // Encontró — no seguir buscando
  }

  // 4. Guardar en caché si encontró algo
  if (resultado.encontrado && perfil?.company_id) {
    await supabase.from("cache_productos_barcode").upsert({
      company_id: perfil.company_id,
      codigo_barras: codigo,
      fuente: resultado.fuente ?? "desconocido",
      nombre: resultado.nombre,
      categoria: resultado.categoria,
      imagen_url: resultado.imagen_url,
    }, { onConflict: "company_id,codigo_barras" });
  }

  return NextResponse.json({
    ...resultado,
    fuentes_consultadas: ORDEN.filter(f => buscadoresConfig[f]?.activo),
  });
}
