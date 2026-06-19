import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const userId = data.claims.sub as string;
  const { data: perfil } = await supabase
    .from("profiles")
    .select("company_id, role")
    .eq("id", userId)
    .single();

  if (perfil?.role !== "admin") {
    return NextResponse.json({ error: "Solo el admin puede crear usuarios" }, { status: 403 });
  }

  const body = await request.json();
  const { full_name, username, password, role } = body;

  if (!full_name?.trim()) {
    return NextResponse.json({ error: "Falta el nombre completo" }, { status: 400 });
  }
  if (!username?.trim()) {
    return NextResponse.json({ error: "Falta el nombre de usuario" }, { status: 400 });
  }
  if (!password || password.length < 6) {
    return NextResponse.json({ error: "La contraseña necesita al menos 6 caracteres" }, { status: 400 });
  }
  if (!["vendedor", "cajero"].includes(role)) {
    return NextResponse.json({ error: "Rol inválido" }, { status: 400 });
  }

  // Verificar que el username no esté ocupado en esta empresa
  const { data: existente } = await supabase
    .from("profiles")
    .select("id")
    .eq("company_id", perfil.company_id)
    .eq("username", username.trim())
    .single();

  if (existente) {
    return NextResponse.json(
      { error: `El nombre de usuario "${username}" ya está en uso en esta empresa` },
      { status: 400 },
    );
  }

  // El correo es técnico — el empleado nunca lo ve ni lo necesita.
  // Lo generamos con el company_id para que sea único globalmente
  // entre todos los proyectos de Ventastack.
  const emailTecnico = `${username.trim().toLowerCase().replace(/\s+/g, "_")}@${perfil.company_id}.ventastack.local`;

  const admin = createAdminClient();

  const { data: nuevoUser, error: crearError } = await admin.auth.admin.createUser({
    email: emailTecnico,
    password,
    email_confirm: true,
    user_metadata: {
      company_id: perfil.company_id,
      role,
      full_name: full_name.trim(),
      username: username.trim(),
    },
  });

  if (crearError) {
    return NextResponse.json({ error: crearError.message }, { status: 400 });
  }

  // Guardamos el username en el perfil que ya creó el trigger
  await supabase
    .from("profiles")
    .update({ username: username.trim() })
    .eq("id", nuevoUser.user.id);

  return NextResponse.json({ ok: true });
}
