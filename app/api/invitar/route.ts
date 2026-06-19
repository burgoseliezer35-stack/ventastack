import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const supabase = await createClient();

  // 1. Confirmamos quién está pidiendo la invitación.
  const { data: claimsData, error: claimsError } =
    await supabase.auth.getClaims();
  if (claimsError || !claimsData?.claims) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }
  const userId = claimsData.claims.sub as string;

  const { data: profile } = await supabase
    .from("profiles")
    .select("company_id, role, es_superadmin")
    .eq("id", userId)
    .single();

  if (!profile) {
    return NextResponse.json({ error: "Perfil no encontrado" }, { status: 403 });
  }

  const body = await request.json();
  const { email, role, password, full_name } = body;

  // 2. ¿A qué empresa va, y qué roles puede repartir quien invita?
  // Un admin normal SIEMPRE invita a su PROPIA empresa, sin importar
  // qué le manden en el body — así nadie puede "colarse" a otra
  // empresa con un body manipulado a mano. Solo el reseller
  // (superadmin) puede elegir la empresa, y solo para fundar el
  // "admin" dueño de un negocio nuevo.
  let companyId = profile.company_id;
  let rolesPermitidos = ["cajero", "vendedor"];

  if (profile.es_superadmin && body.company_id) {
    companyId = body.company_id;
    rolesPermitidos = ["admin"];
  } else if (profile.role !== "admin") {
    return NextResponse.json(
      { error: "Solo el admin de la empresa puede invitar" },
      { status: 403 },
    );
  }

  if (!email || !rolesPermitidos.includes(role)) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }
  if (!full_name?.trim()) {
    return NextResponse.json({ error: "Falta el nombre completo" }, { status: 400 });
  }
  if (!password || password.length < 6) {
    return NextResponse.json(
      { error: "La contraseña necesita al menos 6 caracteres" },
      { status: 400 },
    );
  }

  // 3. Creamos la cuenta directo, con la contraseña que el admin
  // eligió — sin mandar ningún correo. email_confirm:true la deja
  // lista para entrar de inmediato, sin necesitar un enlace. Esto
  // evita por completo el límite de correos de Supabase (2 por
  // hora) y el hecho de que ese correo de prueba ni siquiera le
  // llega a alguien fuera de tu propio equipo de Supabase.
  const admin = createAdminClient();

  const { error: crearError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      company_id: companyId,
      role,
      full_name: full_name.trim(),
    },
  });

  if (crearError) {
    return NextResponse.json({ error: crearError.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
