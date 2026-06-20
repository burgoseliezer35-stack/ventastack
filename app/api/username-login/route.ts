import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Valida que sea un UUID real para evitar inyecciones o scraping
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  const body = await request.json();
  const { username, company_id } = body;

  if (!username?.trim() || !company_id) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  // Rechaza cualquier company_id que no sea un UUID válido
  if (!UUID_REGEX.test(company_id)) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  // Limpia el username — solo letras, números, guiones y guiones bajos
  const usernameLimpio = username.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
  if (!usernameLimpio || usernameLimpio.length > 50) {
    return NextResponse.json({ error: "Usuario inválido" }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data, error } = await admin.rpc("correo_por_username", {
    p_username: usernameLimpio,
    p_company_id: company_id,
  });

  if (error || !data) {
    // Mismo mensaje siempre — no revelamos si el usuario existe o no
    return NextResponse.json(
      { error: "Usuario o contraseña incorrectos" },
      { status: 404 },
    );
  }

  return NextResponse.json({ email: data });
}
