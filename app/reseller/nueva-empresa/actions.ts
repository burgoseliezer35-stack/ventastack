"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";

export async function crearEmpresa(
  formData: FormData
): Promise<{ error: string } | undefined> {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) {
    redirect("/auth/login");
  }

  const userId = data.claims.sub as string;

  const { data: perfil } = await supabase
    .from("profiles")
    .select("es_superadmin")
    .eq("id", userId)
    .single();

  if (!perfil?.es_superadmin) {
    redirect("/protected");
  }

  const nombre = (formData.get("nombre") as string)?.trim();
  const nombreAdmin = (formData.get("nombre_admin") as string)?.trim();
  const correoAdmin = (formData.get("correo_admin") as string)?.trim();
  const passwordAdmin = (formData.get("password_admin") as string) ?? "";
  const precioMensual = Number(formData.get("precio_mensual") || 0);
  const tipoNegocio = (formData.get("tipo_negocio") as string) || "tienda";
  const buscadorProductos = (formData.get("buscador_productos") as string) || "openfoodfacts";

  if (!nombre || !correoAdmin || !nombreAdmin || passwordAdmin.length < 6) {
    return { error: "Todos los campos son obligatorios y la contraseña debe tener al menos 6 caracteres." };
  }

  // Verificar que el correo no exista antes de crear la empresa
  // (evita empresas huérfanas si el correo ya está registrado).
  const admin = createAdminClient();
  const { data: existentes } = await admin.auth.admin.listUsers();
  const correoYaExiste = existentes?.users?.some(
    (u) => u.email?.toLowerCase() === correoAdmin.toLowerCase()
  );
  if (correoYaExiste) {
    return { error: `El correo "${correoAdmin}" ya está registrado en otra empresa.` };
  }

  // 1. Crear la empresa
  const { data: empresaNueva, error: errorEmpresa } = await supabase
    .from("companies")
    .insert({
      name: nombre,
      precio_mensual: Number.isFinite(precioMensual) ? precioMensual : 0,
      // Escribir en tipos_negocio (array) en vez de tipo_negocio
      // (columna vieja de texto con CHECK restrictivo de 4 valores).
      tipos_negocio: [tipoNegocio],
      buscador_productos: buscadorProductos,
    })
    .select("id")
    .single();

  if (errorEmpresa || !empresaNueva) {
    return { error: errorEmpresa?.message ?? "Error al crear la empresa." };
  }

  // 2. Crear la cuenta del admin
  const { error: errorUser } = await admin.auth.admin.createUser({
    email: correoAdmin,
    password: passwordAdmin,
    email_confirm: true,
    user_metadata: {
      company_id: empresaNueva.id,
      role: "admin",
      full_name: nombreAdmin,
    },
  });

  if (errorUser) {
    // Si falla la cuenta, borrar la empresa para no dejar huérfana
    await supabase.from("companies").delete().eq("id", empresaNueva.id);
    return { error: `Error al crear la cuenta: ${errorUser.message}` };
  }

  redirect(`/reseller/empresas/${empresaNueva.id}`);
}
