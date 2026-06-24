"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
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

export async function borrarEmpresa(
  companyId: string,
  forzar = false
): Promise<{ ok: boolean; tieneHistorial?: boolean; error?: string }> {
  try {
    const admin = createAdminClient();

    // Verificar que sea superadmin
    const supabase = await createClient();
    const { data: claims } = await supabase.auth.getClaims();
    if (!claims?.claims?.sub) return { ok: false, error: "No autenticado" };

    const { data: perfil } = await supabase
      .from("profiles")
      .select("es_superadmin")
      .eq("id", claims.claims.sub)
      .single();
    if (!perfil?.es_superadmin) return { ok: false, error: "Sin permisos" };

    // Contar pedidos
    const { count } = await admin
      .from("pedidos")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId);

    const tieneHistorial = (count ?? 0) > 0;

    if (tieneHistorial && !forzar) {
      // Avisamos al cliente para que confirme borrado forzado
      return { ok: false, tieneHistorial: true };
    }

    // Borrar en cascada: detalle_pedidos, pedidos, profiles, y finalmente la empresa
    if (tieneHistorial) {
      // Borrar detalle_pedidos de esta empresa
      const { data: pedidos } = await admin
        .from("pedidos")
        .select("id")
        .eq("company_id", companyId);
      if (pedidos && pedidos.length > 0) {
        const ids = pedidos.map((p: { id: string }) => p.id);
        await admin.from("detalle_pedidos").delete().in("pedido_id", ids);
      }
      await admin.from("pedidos").delete().eq("company_id", companyId);
    }

    // Borrar profiles de esta empresa
    await admin.from("profiles").delete().eq("company_id", companyId);

    // Borrar la empresa
    await admin.from("companies").delete().eq("id", companyId);

    revalidatePath("/reseller");
    return { ok: true };
  } catch (e) {
    console.error("borrarEmpresa error:", e);
    return { ok: false, error: "Error inesperado" };
  }
}

export async function actualizarTipoNegocio(companyId: string, formData: FormData) {
  const supabase = await createClient();
  const tiposNegocio = formData.getAll("tipos_negocio") as string[];
  const buscadorProductos = formData.get("buscador_productos") as string;

  // Mantiene compatibilidad: tipo_negocio = primer tipo seleccionado
  const tipoNegocio = tiposNegocio[0] ?? "tienda";

  await supabase.from("companies").update({
    tipo_negocio: tipoNegocio,
    tipos_negocio: tiposNegocio.length > 0 ? tiposNegocio : ["tienda"],
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
