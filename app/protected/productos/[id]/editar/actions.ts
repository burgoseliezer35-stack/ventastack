"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function actualizarProducto(
  productoId: string,
  formData: FormData,
) {
  const supabase = await createClient();

  const nombre = (formData.get("nombre") as string)?.trim();
  const precio = Number(formData.get("precio"));
  const activo = formData.get("activo") === "on";
  const categoriaId = (formData.get("categoria_id") as string) || null;
  const codigoBarras = (formData.get("codigo_barras") as string)?.trim() || null;

  if (!nombre || !Number.isFinite(precio) || precio <= 0) {
    return;
  }

  const { error } = await supabase
    .from("productos")
    .update({ nombre, precio, activo, categoria_id: categoriaId, codigo_barras: codigoBarras })
    .eq("id", productoId);

  if (error) {
    redirect(
      `/protected/productos/${productoId}/editar?error=${encodeURIComponent(error.message)}`,
    );
  }

  revalidatePath("/protected/productos");
  redirect("/protected/productos");
}
