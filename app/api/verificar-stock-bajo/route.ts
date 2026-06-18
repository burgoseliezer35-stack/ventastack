import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { verificarYNotificarStockBajo } from "@/lib/alertas-stock";

export async function POST(request: Request) {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const body = await request.json();
  const { productoIds } = body;

  if (!Array.isArray(productoIds) || productoIds.length === 0) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  // No truena nunca, y nunca le importa al cajero el resultado —
  // la venta ya se hizo, esto es solo un aviso de cortesía aparte.
  await verificarYNotificarStockBajo(supabase, productoIds);

  return NextResponse.json({ ok: true });
}
