"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

export async function guardarConfiguracion(
  companyId: string,
  tab: string,
  formData: FormData,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();

  const str = (k: string) => (formData.get(k) as string)?.trim() || null;

  let campos: Record<string, unknown> = {};

  if (tab === "negocio") {
    campos = {
      name: str("name") ?? "Mi Negocio",
      logo_url: str("logo_url"),
      razon_social: str("razon_social"),
      rfc: str("rfc"),
      telefono: str("telefono"),
      calle: str("calle"),
      colonia: str("colonia"),
      ciudad: str("ciudad"),
      estado_empresa: str("estado_empresa"),
      codigo_postal: str("codigo_postal"),
      pie_ticket: str("pie_ticket"),
    };
  } else if (tab === "impuestos") {
    campos = {
      precios_con_iva_incluido: formData.get("precios_con_iva_incluido") === "true",
    };
  } else if (tab === "cfdi") {
    campos = {
      cfdi_habilitado: formData.get("cfdi_habilitado") === "true",
      regimen_fiscal: str("regimen_fiscal"),
      cp_fiscal: str("cp_fiscal"),
      pac_nombre: str("pac_nombre"),
      pac_usuario: str("pac_usuario"),
      pac_password: str("pac_password"),
      pac_modo: (formData.get("pac_modo") as string) || "sandbox",
      csd_cer: str("csd_cer"),
      csd_key: str("csd_key"),
      csd_password: str("csd_password"),
    };
  } else if (tab === "acceso") {
    const slugRaw = str("slug");
    campos = {
      slug: slugRaw?.toLowerCase().replace(/[^a-z0-9-]/g, "") ?? null,
    };
  } else if (tab === "whatsapp") {
    const umbralRaw = formData.get("umbral_stock_bajo") as string;
    campos = {
      whatsapp_admin: str("whatsapp_admin"),
      umbral_stock_bajo: umbralRaw?.trim() ? Number(umbralRaw) : null,
    };
  }

  // Verificar que el usuario es admin de esta empresa
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims?.sub) return { ok: false, error: "No autenticado" };

  const { data: perfil } = await supabase
    .from("profiles")
    .select("company_id, role, es_superadmin")
    .eq("id", claims.claims.sub)
    .single();

  const esAdminDeEmpresa = perfil?.company_id === companyId && perfil?.role === "admin";
  const esSuperadmin = perfil?.es_superadmin === true;

  if (!esAdminDeEmpresa && !esSuperadmin) {
    return { ok: false, error: "Sin permisos para editar esta empresa" };
  }

  // Usar admin client para saltarse RLS en companies
  const admin = createAdminClient();
  const { error } = await admin
    .from("companies")
    .update(campos)
    .eq("id", companyId);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/protected");
  revalidatePath("/protected/configuracion");
  return { ok: true };
}
