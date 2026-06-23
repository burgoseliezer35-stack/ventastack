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

  const umbralRaw = formData.get("umbral_stock_bajo") as string;
  const umbral = umbralRaw?.trim() ? Number(umbralRaw) : null;

  // Campos base — siempre existen
  const camposBase = {
    name: str("name") ?? "Mi Negocio",
    whatsapp_admin: str("whatsapp_admin"),
    umbral_stock_bajo: umbral,
    slug: str("slug")?.toLowerCase().replace(/[^a-z0-9-]/g, "") ?? null,
  };

  // Campos extendidos — solo los mandamos si la columna ya existe
  // Si el SQL 028+ no se ha corrido, Supabase ignora columnas desconocidas
  // pero para mayor seguridad separamos el update.
  const camposExtendidos = {
    logo_url: str("logo_url"),
    razon_social: str("razon_social"),
    rfc: str("rfc"),
    calle: str("calle"),
    colonia: str("colonia"),
    ciudad: str("ciudad"),
    estado_empresa: str("estado_empresa"),
    codigo_postal: str("codigo_postal"),
    telefono: str("telefono"),
    iva_porcentaje: num("iva_porcentaje"),
    iva_incluido: formData.get("iva_incluido") === "true",
    ieps_habilitado: formData.get("ieps_habilitado") === "true",
    ieps_porcentaje: num("ieps_porcentaje"),
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

  // Primero guardamos los campos base (siempre funciona)
  const { error: errorBase } = await supabase
    .from("companies")
    .update(camposBase)
    .eq("id", companyId);

  if (errorBase) {
    redirect(`/protected/configuracion?error=${encodeURIComponent(errorBase.message)}`);
  }

  // Luego intentamos los extendidos — si fallan no bloqueamos
  try {
    await supabase
      .from("companies")
      .update(camposExtendidos)
      .eq("id", companyId);
  } catch { /* columnas no existen todavía, se ignora */ }

  redirect("/protected/configuracion?guardado=1");
}
