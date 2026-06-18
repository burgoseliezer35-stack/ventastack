"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { geocodificarDireccion } from "@/lib/mapbox";
import { normalizarDireccion } from "@/lib/gemini";

export async function actualizarCliente(
  clienteId: string,
  formData: FormData,
) {
  const supabase = await createClient();

  const nombre = (formData.get("nombre") as string)?.trim();
  const telefono = (formData.get("telefono") as string)?.trim() || null;
  const direccion = (formData.get("direccion") as string)?.trim() || null;
  const limiteCredito = Number(formData.get("limite_credito") || 0);

  if (!nombre) {
    return;
  }

  // Igual que al crear: limpiamos la dirección con IA solo para
  // geocodificar mejor (nunca cambia lo guardado), con respaldo a
  // la dirección original si no hay llave o algo falla.
  const direccionParaUbicar = direccion
    ? (await normalizarDireccion(direccion)) ?? direccion
    : null;

  const coordenadas = direccionParaUbicar
    ? await geocodificarDireccion(direccionParaUbicar)
    : null;

  await supabase
    .from("clientes")
    .update({
      nombre,
      telefono,
      direccion,
      limite_credito: Number.isFinite(limiteCredito) ? limiteCredito : 0,
      latitud: coordenadas?.latitud ?? null,
      longitud: coordenadas?.longitud ?? null,
    })
    .eq("id", clienteId);

  revalidatePath("/protected/clientes");
  redirect("/protected/clientes");
}
