"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function guardarConfiguracion(companyId: string, formData: FormData) {
  const supabase = await createClient();

  const whatsapp = (formData.get("whatsapp_admin") as string)?.trim() || null;
  const umbralRaw = (formData.get("umbral_stock_bajo") as string)?.trim();
  const umbral = umbralRaw ? Number(umbralRaw) : null;
  const slugRaw = (formData.get("slug") as string)?.trim().toLowerCase().replace(/[^a-z0-9-]/g, "") || null;

  if (umbral !== null && (!Number.isFinite(umbral) || umbral < 0)) {
    redirect(
      `/protected/configuracion?error=${encodeURIComponent("El umbral debe ser un número válido")}`,
    );
  }

  const { error } = await supabase
    .from("companies")
    .update({ whatsapp_admin: whatsapp, umbral_stock_bajo: umbral, slug: slugRaw })
    .eq("id", companyId);

  if (error) {
    redirect(`/protected/configuracion?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/protected/configuracion");
  redirect("/protected/configuracion?guardado=1");
}
