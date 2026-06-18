"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function abrirCaja(formData: FormData) {
  const supabase = await createClient();

  const fondoInicial = Number(formData.get("fondo_inicial"));
  if (!Number.isFinite(fondoInicial) || fondoInicial < 0) {
    return;
  }

  const { error } = await supabase.rpc("abrir_caja", {
    p_fondo_inicial: fondoInicial,
  });

  if (error) {
    redirect(`/protected/caja?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/protected/caja");
}

export async function registrarMovimiento(formData: FormData) {
  const supabase = await createClient();

  const tipo = formData.get("tipo") as string;
  const monto = Number(formData.get("monto"));
  const nota = (formData.get("nota") as string)?.trim() || null;

  if (!Number.isFinite(monto) || monto <= 0) {
    return;
  }

  // Las entradas/salidas manuales solo pueden ser "retiro" o
  // "deposito" — "venta", "cobro" y "devolucion" los anota el
  // sistema solo, nunca a mano.
  const motivo = tipo === "entrada" ? "deposito" : "retiro";

  const { error } = await supabase.rpc("registrar_movimiento_caja", {
    p_tipo: tipo,
    p_monto: monto,
    p_motivo: motivo,
    p_nota: nota,
  });

  if (error) {
    redirect(`/protected/caja?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/protected/caja");
}

export async function cerrarCaja(cajaId: string, formData: FormData) {
  const supabase = await createClient();

  const montoContado = Number(formData.get("monto_contado"));
  if (!Number.isFinite(montoContado) || montoContado < 0) {
    return;
  }

  const { error } = await supabase.rpc("cerrar_caja", {
    p_caja_id: cajaId,
    p_monto_contado: montoContado,
  });

  if (error) {
    redirect(`/protected/caja?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/protected/caja");
  revalidatePath("/protected/caja/historial");
  redirect(`/protected/caja/historial/${cajaId}`);
}
