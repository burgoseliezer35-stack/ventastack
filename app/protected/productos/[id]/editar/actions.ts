"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function actualizarProducto(
  productoId: string,
  formData: FormData,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();

  const nombre = (formData.get("nombre") as string)?.trim();
  const precio = Number(formData.get("precio"));
  const activo = formData.get("activo") === "on";
  const categoriaId = (formData.get("categoria_id") as string) || null;
  const codigoBarras = (formData.get("codigo_barras") as string)?.trim() || null;
  const imagenUrl = (formData.get("imagen_url") as string)?.trim() || null;

  if (!nombre || !Number.isFinite(precio) || precio <= 0) {
    return { ok: false, error: "Nombre y precio son requeridos" };
  }

  const { error } = await supabase
    .from("productos")
    .update({
      nombre,
      precio,
      activo,
      categoria_id: categoriaId,
      codigo_barras: codigoBarras,
      imagen_url: imagenUrl,
    })
    .eq("id", productoId);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/protected/productos");
  return { ok: true };
}
