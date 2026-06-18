import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sugerirUpsell } from "@/lib/gemini";

export async function POST(request: Request) {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json(
      { error: "Upselling inteligente no está activado todavía en esta empresa" },
      { status: 503 },
    );
  }

  const body = await request.json();
  const { nombresEnCarrito } = body;

  if (!Array.isArray(nombresEnCarrito) || nombresEnCarrito.length === 0) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  // RLS deja ver solo los productos de la MISMA empresa de quien
  // está vendiendo.
  const { data: catalogo } = await supabase
    .from("productos")
    .select("id, nombre")
    .eq("activo", true);

  const items = await sugerirUpsell(nombresEnCarrito, catalogo ?? []);

  if (items === null) {
    return NextResponse.json(
      { error: "No se pudo pedir sugerencias — intenta de nuevo" },
      { status: 502 },
    );
  }

  return NextResponse.json({ items });
}
