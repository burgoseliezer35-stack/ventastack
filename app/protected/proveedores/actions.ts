"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function crearProveedor(formData: FormData) {
  const supabase = await createClient();

  const nombre = (formData.get("nombre") as string)?.trim();
  const contacto = (formData.get("contacto") as string)?.trim() || null;
  const telefono = (formData.get("telefono") as string)?.trim() || null;

  if (!nombre) {
    return;
  }

  await supabase.from("proveedores").insert({ nombre, contacto, telefono });
  revalidatePath("/protected/proveedores");
}

export async function borrarProveedor(proveedorId: string) {
  const supabase = await createClient();

  const { error } = await supabase.from("proveedores").delete().eq("id", proveedorId);

  // Si ya tiene compras registradas, la base de datos rechaza el
  // borrado (para no perder de dónde vino esa mercancía) — lo
  // dejamos así a propósito, es mejor avisar que perder historial.
  if (error) {
    redirect(
      `/protected/proveedores?error=${encodeURIComponent(
        "No se puede borrar: este proveedor ya tiene compras registradas.",
      )}`,
    );
  }

  revalidatePath("/protected/proveedores");
}
