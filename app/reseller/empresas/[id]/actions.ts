"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function actualizarPrecio(companyId: string, formData: FormData) {
  const supabase = await createClient();

  const precioMensual = Number(formData.get("precio_mensual"));
  if (!Number.isFinite(precioMensual) || precioMensual < 0) {
    return;
  }

  // RLS deja hacer este update solo porque somos superadmin.
  await supabase
    .from("companies")
    .update({ precio_mensual: precioMensual })
    .eq("id", companyId);

  revalidatePath(`/reseller/empresas/${companyId}`);
}

export async function cambiarEstado(companyId: string, activa: boolean) {
  const supabase = await createClient();

  await supabase.from("companies").update({ activa }).eq("id", companyId);

  revalidatePath(`/reseller/empresas/${companyId}`);
  revalidatePath("/reseller");
}

export async function registrarPago(companyId: string, formData: FormData) {
  const supabase = await createClient();

  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub as string | undefined;

  const monto = Number(formData.get("monto"));
  const nota = (formData.get("nota") as string)?.trim() || null;

  if (!Number.isFinite(monto) || monto <= 0) {
    return;
  }

  await supabase.from("pagos_plataforma").insert({
    company_id: companyId,
    monto,
    nota,
    registrado_por: userId,
  });

  // Si pagó, lo más razonable es reactivarlo de una vez —el mismo
  // criterio que ya usamos con el crédito de los clientes: pagar
  // desbloquea.
  await supabase.from("companies").update({ activa: true }).eq("id", companyId);

  revalidatePath(`/reseller/empresas/${companyId}`);
  revalidatePath("/reseller");
}
