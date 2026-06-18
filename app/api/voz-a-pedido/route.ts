import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { interpretarPedidoDeVoz } from "@/lib/gemini";

export async function POST(request: Request) {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  // Defensa doble: aunque el botón no debería aparecer en la
  // pantalla sin la llave configurada, si alguien llega a esta ruta
  // de todos modos, contestamos algo claro en vez de tronar.
  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json(
      { error: "Voice-to-Order no está activado todavía en esta empresa" },
      { status: 503 },
    );
  }

  const body = await request.json();
  const { audioBase64, mimeType } = body;

  if (!audioBase64 || !mimeType) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  // No confiamos en una lista de productos que mande el navegador —
  // la consultamos aquí. RLS ya la deja ver solo los de la MISMA
  // empresa de quien está hablando.
  const { data: productos } = await supabase
    .from("productos")
    .select("id, nombre")
    .eq("activo", true);

  const items = await interpretarPedidoDeVoz(
    audioBase64,
    mimeType,
    productos ?? [],
  );

  if (items === null) {
    return NextResponse.json(
      { error: "No pudimos entender el audio — intenta de nuevo" },
      { status: 502 },
    );
  }

  return NextResponse.json({ items });
}
