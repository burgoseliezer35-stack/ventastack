"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function crearCategoria(formData: FormData) {
  const supabase = await createClient();

  const nombre = (formData.get("nombre") as string)?.trim();
  if (!nombre) {
    return;
  }

  await supabase.from("categorias").insert({ nombre });
  revalidatePath("/protected/productos/categorias");
}

export async function borrarCategoria(categoriaId: string) {
  const supabase = await createClient();

  await supabase.from("categorias").delete().eq("id", categoriaId);
  revalidatePath("/protected/productos/categorias");
  revalidatePath("/protected/productos");
}
