"use server";

import { createClient } from "@/lib/supabase/server";

export async function guardarConfiguracion(
  companyId: string,
  tab: string,
  formData: FormData,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();

  const str = (k: string) => (formData.get(k) as string)?.trim() || null;
  const num = (k: string) => {
    const v = Number(formData.get(k));
    return Number.isFinite(v) ? v : 0;
  };

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
    };
  } else if (tab === "impuestos") {
    campos = {
      iva_porcentaje: num("iva_porcentaje"),
      iva_incluido: formData.get("iva_incluido") === "true",
      ieps_habilitado: formData.get("ieps_habilitado") === "true",
      ieps_porcentaje: num("ieps_porcentaje"),
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

  const { error } = await supabase
    .from("companies")
    .update(campos)
    .eq("id", companyId);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
