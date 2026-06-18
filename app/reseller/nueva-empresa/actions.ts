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
  const correoAdmin = (formData.get("correo_admin") as string)?.trim();
  const precioMensual = Number(formData.get("precio_mensual") || 0);

  if (!nombre || !correoAdmin) {
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

  // 2. Invitamos al dueño real de ese negocio como "admin" de ESA
  // empresa específica, con la llave de administrador — igual que
  // "Invitar a mi equipo", solo que aquí SÍ podemos elegir la
  // empresa porque somos el reseller.
  const admin = createAdminClient();
  await admin.auth.admin.inviteUserByEmail(correoAdmin, {
    data: { company_id: empresaNueva.id, role: "admin" },
  });

  redirect(`/reseller/empresas/${empresaNueva.id}`);
}
