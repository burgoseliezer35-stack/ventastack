"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { verificarYNotificarStockBajo } from "@/lib/alertas-stock";

export async function ajustarStock(productoId: string, formData: FormData) {
  const supabase = await createClient();

  const tipo = formData.get("tipo") as string;
  const cantidad = Number(formData.get("cantidad"));
  const nota = (formData.get("nota") as string)?.trim() || null;

  if (!Number.isFinite(cantidad) || cantidad <= 0) {
    return;
  }

  const delta = tipo === "salida" ? -cantidad : cantidad;

  const { error } = await supabase.rpc("ajustar_inventario", {
    p_producto_id: productoId,
    p_cantidad: delta,
    p_nota: nota,
  });

  if (error) {
    // Lo más común aquí: querer restar más de lo que hay en
    // existencia (el constraint "stock >= 0" lo rechaza).
    redirect(
      `/protected/productos/${productoId}/ajustar?error=${encodeURIComponent(error.message)}`,
    );
  }

  // Si esto bajó el producto del umbral configurado, avisa por
  // WhatsApp — y si no hay WhatsApp configurado, esto no hace nada.
  await verificarYNotificarStockBajo(supabase, [productoId]);

  revalidatePath("/protected/productos");
  revalidatePath(`/protected/productos/${productoId}/kardex`);
  redirect("/protected/productos");
}
