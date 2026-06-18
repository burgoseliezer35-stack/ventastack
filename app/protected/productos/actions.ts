"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function crearProducto(formData: FormData) {
  const supabase = await createClient();

  const nombre = (formData.get("nombre") as string)?.trim();
  const precio = Number(formData.get("precio"));
  const categoriaId = (formData.get("categoria_id") as string) || null;
  const codigoBarras = (formData.get("codigo_barras") as string)?.trim() || null;

  if (!nombre || !Number.isFinite(precio) || precio <= 0) {
    return;
  }

  // No mandamos company_id: la columna lo rellena sola (ver
  // 006_catalogo_y_punto_de_venta.sql), y RLS revisa que coincida.
  const { error } = await supabase
    .from("productos")
    .insert({ nombre, precio, categoria_id: categoriaId, codigo_barras: codigoBarras });

  if (error) {
    // El error más probable aquí: ese código de barras ya lo tiene
    // otro producto de tu catálogo.
    redirect(`/protected/productos?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/protected/productos");
}

export async function desactivarProducto(productoId: string) {
  const supabase = await createClient();

  // No borramos la fila de verdad: si ese producto ya se vendió
  // alguna vez, borrarlo de verdad rompería el historial de esas
  // ventas. Solo lo "apagamos".
  await supabase
    .from("productos")
    .update({ activo: false })
    .eq("id", productoId);

  revalidatePath("/protected/productos");
}
