"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

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

export async function borrarEmpresa(companyId: string) {
  const supabase = await createClient();

  // Solo borramos si no tiene pedidos — para no perder historial
  // de un negocio que ya operó de verdad.
  const { count } = await supabase
    .from("pedidos")
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId);

  if (count && count > 0) {
    // Tiene historial — solo desactivamos, no borramos
    await supabase.from("companies").update({ activa: false }).eq("id", companyId);
  } else {
    // Sin historial (cuenta de prueba) — borramos directo
    await supabase.from("companies").delete().eq("id", companyId);
  }

  revalidatePath("/reseller");
  redirect("/reseller");
}

export async function actualizarTipoNegocio(companyId: string, formData: FormData) {
  const supabase = await createClient();
  const tipoNegocio = formData.get("tipo_negocio") as string;
  const buscadorProductos = formData.get("buscador_productos") as string;
  await supabase.from("companies").update({
    tipo_negocio: tipoNegocio,
    buscador_productos: buscadorProductos || undefined,
  }).eq("id", companyId);
  revalidatePath(`/reseller/empresas/${companyId}`);
}

export async function guardarBuscadores(
  companyId: string,
  config: Record<string, { activo: boolean; api_key: string | null }>
) {
  const supabase = await createClient();
  await supabase
    .from("companies")
    .update({ buscadores_config: config })
    .eq("id", companyId);
  revalidatePath(`/reseller/empresas/${companyId}`);
}
