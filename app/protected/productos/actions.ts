"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function crearProducto(formData: FormData) {
  const supabase = await createClient();

  const nombre = (formData.get("nombre") as string)?.trim();
  const precio = Number(formData.get("precio"));
  const costo = Number(formData.get("costo")) || 0;
  const stockInicial = Number(formData.get("stock_inicial")) || 0;
  const categoriaId = (formData.get("categoria_id") as string) || null;
  const codigoBarras = (formData.get("codigo_barras") as string)?.trim() || null;
  const imagenUrl = (formData.get("imagen_url") as string)?.trim() || null;

  if (!nombre || !Number.isFinite(precio) || precio <= 0) return;

  // Usar RPC para que el stock inicial quede registrado en el kardex
  const { error } = await supabase.rpc("crear_producto_con_stock", {
    p_nombre: nombre,
    p_precio: precio,
    p_costo: costo,
    p_stock_inicial: stockInicial,
    p_codigo_barras: codigoBarras,
    p_imagen_url: imagenUrl,
    p_categoria_id: categoriaId || null,
  });

  if (error) {
    redirect(`/protected/productos?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/protected/productos");
}

export async function desactivarProducto(productoId: string) {
  const supabase = await createClient();
  await supabase.from("productos").update({ activo: false }).eq("id", productoId);
  revalidatePath("/protected/productos");
}

export async function reactivarProducto(productoId: string) {
  const supabase = await createClient();
  await supabase.from("productos").update({ activo: true }).eq("id", productoId);
  revalidatePath("/protected/productos");
}
