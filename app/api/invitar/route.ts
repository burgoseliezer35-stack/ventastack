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
  const { email, role } = body;

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

  // 3. Mandamos la invitación con la llave de administrador. Le
  // metemos company_id y role en los metadatos: el trigger del
  // backend (005_invitar_a_equipo.sql) los lee de ahí para saber a
  // qué empresa ligar al nuevo perfil, sin crear una empresa nueva.
  const admin = createAdminClient();

  const { error: inviteError } = await admin.auth.admin.inviteUserByEmail(
    email,
    {
      data: {
        company_id: companyId,
        role,
      },
    },
  );

  if (inviteError) {
    return NextResponse.json({ error: inviteError.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
