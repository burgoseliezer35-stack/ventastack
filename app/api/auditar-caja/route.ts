import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { auditarCaja } from "@/lib/gemini";

export async function POST(request: Request) {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json(
      { error: "La auditoría de caja no está activada todavía en esta empresa" },
      { status: 503 },
    );
  }

  const body = await request.json();
  const { cajaId } = body;

  if (!cajaId) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  // No confiamos en un resumen que mande el navegador — lo
  // recalculamos aquí. RLS ya deja ver solo la caja de la MISMA
  // empresa de quien está pidiendo la auditoría.
  const { data: caja } = await supabase
    .from("cajas")
    .select("fondo_inicial, monto_contado, diferencia")
    .eq("id", cajaId)
    .single();

  if (!caja) {
    return NextResponse.json({ error: "Caja no encontrada" }, { status: 404 });
  }

  const { data: movimientos } = await supabase
    .from("movimientos_caja")
    .select("tipo, monto, motivo, nota")
    .eq("caja_id", cajaId);

  const lista = movimientos ?? [];
  const totalEntradas = lista
    .filter((m) => m.tipo === "entrada")
    .reduce((s, m) => s + m.monto, 0);
  const totalSalidas = lista
    .filter((m) => m.tipo === "salida")
    .reduce((s, m) => s + m.monto, 0);
  const esperado = caja.fondo_inicial + totalEntradas - totalSalidas;

  const evaluacion = await auditarCaja({
    fondoInicial: caja.fondo_inicial,
    totalEntradas,
    totalSalidas,
    esperado,
    contado: caja.monto_contado ?? esperado,
    diferencia: caja.diferencia ?? 0,
    movimientos: lista,
  });

  if (evaluacion === null) {
    return NextResponse.json(
      { error: "No se pudo hacer la auditoría — intenta de nuevo" },
      { status: 502 },
    );
  }

  return NextResponse.json({ evaluacion });
}
