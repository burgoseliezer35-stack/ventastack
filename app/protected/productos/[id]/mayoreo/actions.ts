"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function agregarNivelMayoreo(productoId: string, formData: FormData) {
  const supabase = await createClient();

  const cantidadMinima = Number(formData.get("cantidad_minima"));
  const precioUnitario = Number(formData.get("precio_unitario"));

  if (
    !Number.isFinite(cantidadMinima) ||
    cantidadMinima <= 0 ||
    !Number.isFinite(precioUnitario) ||
    precioUnitario < 0
  ) {
    return;
  }

  const { error } = await supabase.from("precios_mayoreo").insert({
    producto_id: productoId,
    cantidad_minima: cantidadMinima,
    precio_unitario: precioUnitario,
  });

  if (error) {
    redirect(
      `/protected/productos/${productoId}/mayoreo?error=${encodeURIComponent(
        "Ya existe un nivel para esa cantidad — bórralo primero si quieres cambiar el precio.",
      )}`,
    );
  }

  revalidatePath(`/protected/productos/${productoId}/mayoreo`);
}

export async function borrarNivelMayoreo(productoId: string, nivelId: string) {
  const supabase = await createClient();

  await supabase.from("precios_mayoreo").delete().eq("id", nivelId);
  revalidatePath(`/protected/productos/${productoId}/mayoreo`);
}
