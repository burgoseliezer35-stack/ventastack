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
  const ivaPorcentaje = Number(formData.get("iva_porcentaje")) || 16;
  const iepsPorcentaje = Number(formData.get("ieps_porcentaje")) || 0;

  // Unidad de medida: si no viene o viene fuera del catálogo, cae
  // en "pieza" (comportamiento antiguo). El CHECK de la BD igual
  // lo bloquearía, pero mejor filtrar aquí con un mensaje útil.
  const UNIDADES_VALIDAS = ['pieza','kg','g','litro','ml','metro','caja','paquete'];
  const unidadRaw = (formData.get("unidad_medida") as string)?.trim();
  const unidadMedida = UNIDADES_VALIDAS.includes(unidadRaw) ? unidadRaw : 'pieza';
  const stepCantidad = Number(formData.get("step_cantidad")) || 1;

  if (!nombre || !Number.isFinite(precio) || precio <= 0) return;
  if (!Number.isFinite(stepCantidad) || stepCantidad <= 0) return;

  const { error } = await supabase.rpc("crear_producto_con_stock", {
    p_nombre: nombre,
    p_precio: precio,
    p_costo: costo,
    p_stock_inicial: stockInicial,
    p_codigo_barras: codigoBarras,
    p_imagen_url: imagenUrl,
    p_categoria_id: categoriaId || null,
    p_iva_porcentaje: ivaPorcentaje,
    p_ieps_porcentaje: iepsPorcentaje,
    p_unidad_medida: unidadMedida,
    p_step_cantidad: stepCantidad,
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
