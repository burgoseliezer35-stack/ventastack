import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Verificar que quien llama es admin y que el usuario a editar/
// borrar pertenece a SU misma empresa (no puede tocar a los de
// otra empresa aunque conozca el ID).
async function verificarPermiso(userId: string, targetId: string) {
  const supabase = await createClient();

  const { data: miPerfil } = await supabase
    .from("profiles")
    .select("company_id, role")
    .eq("id", userId)
    .single();

  if (miPerfil?.role !== "admin") return { ok: false, error: "Sin permiso" };

  const { data: targetPerfil } = await supabase
    .from("profiles")
    .select("company_id, role")
    .eq("id", targetId)
    .single();

  if (!targetPerfil) return { ok: false, error: "Usuario no encontrado" };
  if (targetPerfil.company_id !== miPerfil.company_id) {
    return { ok: false, error: "Sin permiso" };
  }
  if (targetPerfil.role === "admin") {
    return { ok: false, error: "No puedes modificar una cuenta de admin" };
  }

  return { ok: true, supabase, miPerfil };
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const check = await verificarPermiso(data.claims.sub as string, id);
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: 403 });

  const body = await request.json();
  const { full_name, username, password, role } = body;

  // Actualizar el perfil
  const updates: Record<string, string> = {};
  if (full_name?.trim()) updates.full_name = full_name.trim();
  if (username?.trim()) updates.username = username.trim();
  if (role && ["vendedor", "cajero"].includes(role)) updates.role = role;

  if (Object.keys(updates).length > 0) {
    const adminClient = createAdminClient();
    // company_id explícito aquí también: aunque verificarPermiso ya
    // valida el tenant arriba, el admin client se salta RLS por
    // completo — este filtro es la última barrera si algún día se
    // reutiliza este patrón sin pasar por verificarPermiso primero.
    await adminClient
      .from("profiles")
      .update(updates)
      .eq("id", id)
      .eq("company_id", check.miPerfil!.company_id);
  }

  // Actualizar contraseña si se mandó una nueva
  if (password && password.length >= 6) {
    const admin = createAdminClient();
    const { error } = await admin.auth.admin.updateUserById(id, { password });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const check = await verificarPermiso(data.claims.sub as string, id);
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: 403 });

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}
