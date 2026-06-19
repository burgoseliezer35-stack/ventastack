"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";

export async function crearEmpresa(formData: FormData) {
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

  if (!nombre || !correoAdmin || !nombreAdmin || passwordAdmin.length < 6) {
    return;
  }

  // 1. La empresa nueva. RLS deja hacer este insert solo porque
  // somos superadmin (política "superadmin_crea_empresas" de
  // 010_reseller_superadmin.sql).
  const { data: empresaNueva, error: errorEmpresa } = await supabase
    .from("companies")
    .insert({
      name: nombre,
      precio_mensual: Number.isFinite(precioMensual) ? precioMensual : 0,
    })
    .select("id")
    .single();

  if (errorEmpresa || !empresaNueva) {
    return;
  }

  // 2. Creamos la cuenta del dueño real de ese negocio directo, ya
  // lista para entrar — sin mandar ningún correo (el de prueba de
  // Supabase tiene un límite de 2 por hora y ni le llega a alguien
  // fuera de tu propio equipo de Supabase, así que no sirve para
  // esto).
  const admin = createAdminClient();
  await admin.auth.admin.createUser({
    email: correoAdmin,
    password: passwordAdmin,
    email_confirm: true,
    user_metadata: {
      company_id: empresaNueva.id,
      role: "admin",
      full_name: nombreAdmin,
    },
  });

  redirect(`/reseller/empresas/${empresaNueva.id}`);
}
