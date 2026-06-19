import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Esta ruta es pública (sin sesión) — necesita serlo para que el
// formulario de login pueda buscar el correo técnico antes de
// autenticarse. No expone nada sensible: solo confirma si un
// username existe en una empresa, y regresa el correo técnico
// (que el empleado nunca necesita ver).
export async function POST(request: Request) {
  const body = await request.json();
  const { username, company_id } = body;

  if (!username?.trim() || !company_id) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data, error } = await admin.rpc("correo_por_username", {
    p_username: username.trim(),
    p_company_id: company_id,
  });

  if (error || !data) {
    return NextResponse.json(
      { error: "Usuario no encontrado" },
      { status: 404 },
    );
  }

  return NextResponse.json({ email: data });
}
