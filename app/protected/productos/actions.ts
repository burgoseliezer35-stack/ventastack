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

  // Impuestos: ahora vienen como checkboxes con name="impuesto_ids"
  // (múltiples values). Extraemos los IDs seleccionados.
  const impuestoIds = formData.getAll("impuesto_ids") as string[];

  // Para retrocompatibilidad con el RPC y las columnas viejas,
  // calculamos la suma de IVA e IEPS de los impuestos seleccionados.
  // Esto mantiene productos.iva_porcentaje y ieps_porcentaje correctos
  // mientras el POS siga leyéndolos.
  let ivaSuma = 0;
  let iepsSuma = 0;
  if (impuestoIds.length > 0) {
    const { data: seleccionados } = await supabase
      .from("impuestos")
      .select("tipo, factor, porcentaje")
      .in("id", impuestoIds);
    for (const imp of seleccionados ?? []) {
      if (imp.factor === "Tasa" && imp.porcentaje != null) {
        if (imp.tipo === "iva") ivaSuma += imp.porcentaje;
        else if (imp.tipo === "ieps") iepsSuma += imp.porcentaje;
      }
    }
  }

  // Unidad de medida
  const UNIDADES_VALIDAS = ['pieza','kg','g','litro','ml','metro','caja','paquete'];
  const unidadRaw = (formData.get("unidad_medida") as string)?.trim();
  const unidadMedida = UNIDADES_VALIDAS.includes(unidadRaw) ? unidadRaw : 'pieza';
  const stepCantidad = Number(formData.get("step_cantidad")) || 1;

  if (!nombre || !Number.isFinite(precio) || precio <= 0) return;
  if (!Number.isFinite(stepCantidad) || stepCantidad <= 0) return;

  // Crear el producto (el RPC sigue usando las columnas viejas para
  // retrocompatibilidad; el trigger trg_sync_impuestos_producto de la
  // 049 creará automáticamente los vínculos N:M a partir de estos %).
  const { data: productoId, error } = await supabase.rpc("crear_producto_con_stock", {
    p_nombre: nombre,
    p_precio: precio,
    p_costo: costo,
    p_stock_inicial: stockInicial,
    p_codigo_barras: codigoBarras,
    p_imagen_url: imagenUrl,
    p_categoria_id: categoriaId || null,
    p_iva_porcentaje: ivaSuma,
    p_ieps_porcentaje: iepsSuma,
    p_unidad_medida: unidadMedida,
    p_step_cantidad: stepCantidad,
  });

  if (error) {
    redirect(`/protected/productos?error=${encodeURIComponent(error.message)}`);
  }

  // Si el RPC devolvió el ID del producto nuevo Y hay impuestos
  // seleccionados que el trigger de sync no cubrió (ej. "Exento"
  // que no tiene porcentaje), insertarlos directo en la N:M.
  if (productoId && impuestoIds.length > 0) {
    // Primero limpiamos lo que el trigger ya creó (para evitar
    // duplicados si el trigger y nosotros insertamos los mismos)
    await supabase
      .from("productos_impuestos")
      .delete()
      .eq("producto_id", productoId);

    // Insertamos exactamente los que el usuario seleccionó
    await supabase
      .from("productos_impuestos")
      .insert(impuestoIds.map((impId) => ({
        producto_id: productoId,
        impuesto_id: impId,
      })));
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
