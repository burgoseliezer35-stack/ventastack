"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { geocodificarDireccion } from "@/lib/mapbox";
import { normalizarDireccion } from "@/lib/gemini";

export async function crearCliente(formData: FormData) {
  const supabase = await createClient();

  const nombre = (formData.get("nombre") as string)?.trim();
  const telefono = (formData.get("telefono") as string)?.trim() || null;
  const direccion = (formData.get("direccion") as string)?.trim() || null;
  const limiteCredito = Number(formData.get("limite_credito") || 0);
  const vendedorId = (formData.get("vendedor_id") as string) || null;

  if (!nombre) {
    return;
  }

  // Si hay dirección, primero intentamos limpiarla con IA (corrige
  // typos y abreviaturas — solo para geocodificar mejor, NUNCA
  // cambia lo que el usuario guardó). Si no hay llave de Gemini, o
  // falla, usamos la dirección tal cual la escribieron.
  const direccionParaUbicar = direccion
    ? (await normalizarDireccion(direccion)) ?? direccion
    : null;

  // Tratamos de ubicarla en el mapa. Si Mapbox no la encuentra (o
  // no hay token todavía), el cliente se guarda igual, solo que sin
  // coordenadas — el check-in no funcionará en él hasta que se
  // corrija la dirección.
  const coordenadas = direccionParaUbicar
    ? await geocodificarDireccion(direccionParaUbicar)
    : null;

  // company_id se rellena solo (ver 006_catalogo_y_punto_de_venta.sql).
  await supabase.from("clientes").insert({
    nombre,
    telefono,
    direccion,
    limite_credito: Number.isFinite(limiteCredito) ? limiteCredito : 0,
    vendedor_id: vendedorId,
    latitud: coordenadas?.latitud ?? null,
    longitud: coordenadas?.longitud ?? null,
  });

  revalidatePath("/protected/clientes");
}

export async function asignarVendedor(clienteId: string, formData: FormData) {
  const supabase = await createClient();
  const vendedorId = (formData.get("vendedor_id") as string) || null;

  await supabase
    .from("clientes")
    .update({ vendedor_id: vendedorId })
    .eq("id", clienteId);

  revalidatePath("/protected/clientes");
}
