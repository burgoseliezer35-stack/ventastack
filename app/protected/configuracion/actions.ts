"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function guardarConfiguracion(
  companyId: string,
  formData: FormData,
) {
  const supabase = await createClient();

  const str = (k: string) => (formData.get(k) as string)?.trim() || null;
  const num = (k: string) => {
    const v = Number(formData.get(k));
    return Number.isFinite(v) ? v : 0;
  };
  const bool = (k: string) => formData.get(k) === "true" || formData.get(k) === "on" || formData.get(k) === "true";

  const umbralRaw = formData.get("umbral_stock_bajo") as string;
  const umbral = umbralRaw?.trim() ? Number(umbralRaw) : null;

  const { error } = await supabase
    .from("companies")
    .update({
      name: str("name"),
      logo_url: str("logo_url"),
      razon_social: str("razon_social"),
      rfc: str("rfc"),
      calle: str("calle"),
      colonia: str("colonia"),
      ciudad: str("ciudad"),
      estado_empresa: str("estado_empresa"),
      codigo_postal: str("codigo_postal"),
      telefono: str("telefono"),
      whatsapp_admin: str("whatsapp_admin"),
      umbral_stock_bajo: umbral,
      slug: str("slug")?.toLowerCase().replace(/[^a-z0-9-]/g, "") ?? null,
      iva_porcentaje: num("iva_porcentaje"),
      iva_incluido: bool("iva_incluido"),
      ieps_habilitado: formData.get("ieps_habilitado") === "true",
      ieps_porcentaje: num("ieps_porcentaje"),
      // CFDI
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
    })
    .eq("id", companyId);

  if (error) {
    redirect(
      `/protected/configuracion?error=${encodeURIComponent(error.message)}`,
    );
  }

  redirect("/protected/configuracion?guardado=1");
}
