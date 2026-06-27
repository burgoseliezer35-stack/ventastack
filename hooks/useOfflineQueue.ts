/**
 * useOfflineQueue.ts
 * Hook central del sistema offline-first de Ventastack
 * Colócalo en: hooks/useOfflineQueue.ts
 *
 * Responsabilidades:
 *  1. Detectar si hay conexión a Supabase (no solo al router local)
 *  2. Al cobrar: intentar Supabase primero → si falla, guardar en IndexedDB
 *  3. Cuando regresa internet: sincronizar automáticamente la cola
 *  4. Cachear catálogo de productos para uso offline
 */

'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { createClient } from '@/utils/supabase/client'
import {
  db,
  cachearProductos,
  obtenerProductosLocales,
  cacheEstaFresco,
  guardarVentaPendiente,
  obtenerVentasPendientes,
  contarVentasPendientes,
  marcarComoSincronizando,
  marcarComoSincronizado,
  marcarComoError,
  decrementarStockLocal,
  generarFolioLocal,
  type ItemVentaLocal,
  type VentaPendiente,
  type ProductoLocal,
} from '@/lib/ventastack-db'
import { v4 as uuidv4 } from 'uuid'

// ─── Tipos del hook ───────────────────────────────────────────────────────────

export interface DatosVenta {
  company_id: string
  sucursal_id: string | null
  user_id: string
  items: ItemVentaLocal[]
  subtotal: number
  iva_total: number
  ieps_total: number
  total: number
  efectivo_recibido: number
  cambio: number
  metodo_pago: string
  pie_ticket: string
}

export interface ResultadoVenta {
  exito: boolean
  modo: 'online' | 'offline'
  // En modo online: el folio y pedido_id reales de Supabase
  folio?: string
  pedido_id?: string
  // En modo offline: el folio temporal local
  folio_local?: string
  error?: string
}

export interface EstadoOffline {
  estaOnline: boolean           // Conectado a Supabase
  pendientes: number            // Ventas en cola sin sincronizar
  sincronizando: boolean        // Hay un proceso de sync activo
  ultimaSync: Date | null       // Cuándo fue la última sincronización exitosa
  productosEnCache: number      // Cuántos productos están cacheados
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const TIMEOUT_SUPABASE_MS = 4000   // Si no responde en 4s, asumimos offline
const MAX_INTENTOS_SYNC = 5        // Después de 5 fallos, no reintentar auto
const INTERVALO_SYNC_MS = 30_000   // Revisar la cola cada 30 segundos

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useOfflineQueue(company_id: string) {
  const supabase = createClient()

  const [estado, setEstado] = useState<EstadoOffline>({
    estaOnline: true,    // Optimista por defecto
    pendientes: 0,
    sincronizando: false,
    ultimaSync: null,
    productosEnCache: 0,
  })

  const syncEnProceso = useRef(false)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  // ── Verificar conectividad real con Supabase ──────────────────────────────
  // navigator.onLine miente: detecta si hay red local, no si Supabase responde.
  // Esta función hace una query mínima con timeout para saber la verdad.
  const verificarConexion = useCallback(async (): Promise<boolean> => {
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), TIMEOUT_SUPABASE_MS)

      const { error } = await supabase
        .from('companies')
        .select('id')
        .limit(1)
        .abortSignal(controller.signal)

      clearTimeout(timeout)

      const online = !error
      setEstado((prev) => ({ ...prev, estaOnline: online }))
      return online
    } catch {
      setEstado((prev) => ({ ...prev, estaOnline: false }))
      return false
    }
  }, [supabase])

  // ── Cachear productos ─────────────────────────────────────────────────────
  const sincronizarCatalogoProductos = useCallback(async (): Promise<void> => {
    const online = await verificarConexion()
    if (!online) return

    try {
      const { data, error } = await supabase
        .from('productos')
        .select('id, nombre, precio, costo, stock, sku, codigo_barras, iva_porcentaje, ieps_porcentaje, activo')
        .eq('company_id', company_id)
        .eq('activo', true)
        .order('nombre')

      if (error) throw error
      if (!data) return

      const productosLocal: ProductoLocal[] = data.map((p) => ({
        ...p,
        company_id,
        cached_at: Date.now(),
      }))

      await cachearProductos(productosLocal)
      setEstado((prev) => ({ ...prev, productosEnCache: productosLocal.length }))
    } catch (err) {
      console.error('[Ventastack offline] Error cacheando productos:', err)
    }
  }, [supabase, company_id, verificarConexion])

  // ── Obtener productos (online preferido, offline como fallback) ───────────
  const obtenerProductos = useCallback(async (): Promise<ProductoLocal[]> => {
    const online = await verificarConexion()

    if (online) {
      // Intentar desde Supabase si el cache está viejo
      const fresco = await cacheEstaFresco(company_id)
      if (!fresco) {
        await sincronizarCatalogoProductos()
      }
    }

    // Siempre devolver desde IndexedDB (puede estar desactualizado, pero funciona)
    return obtenerProductosLocales(company_id)
  }, [company_id, verificarConexion, sincronizarCatalogoProductos])

  // ── Procesar una venta de la cola ─────────────────────────────────────────
  const sincronizarVenta = useCallback(
    async (venta: VentaPendiente): Promise<boolean> => {
      if (!venta.id) return false

      try {
        await marcarComoSincronizando(venta.id)

        // Llamar al RPC existente de Supabase
        // El local_id se pasa como p_local_id para deduplicación:
        // si la venta ya existe en Supabase (por doble sync), el RPC la ignora
        const { data, error } = await supabase.rpc('crear_pedido_con_detalle', {
          p_company_id: venta.company_id,
          p_sucursal_id: venta.sucursal_id,
          p_user_id: venta.user_id,
          p_items: venta.items,
          p_subtotal: venta.subtotal,
          p_iva_total: venta.iva_total,
          p_ieps_total: venta.ieps_total,
          p_total: venta.total,
          p_efectivo_recibido: venta.efectivo_recibido,
          p_cambio: venta.cambio,
          p_metodo_pago: venta.metodo_pago,
          p_local_id: venta.local_id,  // Para deduplicación — ver nota abajo
        })

        if (error) throw error

        // data debe retornar { pedido_id, folio }
        await marcarComoSincronizado(
          venta.id,
          data.pedido_id,
          data.folio
        )

        console.info(
          `[Ventastack offline] Venta ${venta.folio_local} sincronizada → folio ${data.folio}`
        )
        return true
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Error desconocido'
        await marcarComoError(venta.id!, msg)
        console.error(`[Ventastack offline] Error sincronizando ${venta.folio_local}:`, msg)
        return false
      }
    },
    [supabase]
  )

  // ── Procesar toda la cola ─────────────────────────────────────────────────
  const procesarCola = useCallback(async (): Promise<void> => {
    if (syncEnProceso.current) return

    const online = await verificarConexion()
    if (!online) return

    const pendientes = await obtenerVentasPendientes(company_id)
    const paraSync = pendientes.filter(
      (v) => v.intentos_sync < MAX_INTENTOS_SYNC
    )

    if (paraSync.length === 0) return

    syncEnProceso.current = true
    setEstado((prev) => ({ ...prev, sincronizando: true }))

    try {
      // Sincronizar en serie (no paralelo) para evitar conflictos de stock
      for (const venta of paraSync) {
        await sincronizarVenta(venta)
        // Pequeña pausa entre ventas para no saturar el rate limit de Supabase
        await new Promise((r) => setTimeout(r, 300))
      }

      const aun_pendientes = await contarVentasPendientes(company_id)
      setEstado((prev) => ({
        ...prev,
        pendientes: aun_pendientes,
        sincronizando: false,
        ultimaSync: new Date(),
      }))
    } finally {
      syncEnProceso.current = false
      setEstado((prev) => ({ ...prev, sincronizando: false }))
    }
  }, [company_id, verificarConexion, sincronizarVenta])

  // ── Cobrar una venta (entry point principal) ──────────────────────────────
  const cobrarVenta = useCallback(
    async (datos: DatosVenta): Promise<ResultadoVenta> => {
      const online = await verificarConexion()

      if (online) {
        // ─── MODO ONLINE: flujo normal a Supabase ─────────────────────────
        try {
          const { data, error } = await supabase.rpc('crear_pedido_con_detalle', {
            p_company_id: datos.company_id,
            p_sucursal_id: datos.sucursal_id,
            p_user_id: datos.user_id,
            p_items: datos.items,
            p_subtotal: datos.subtotal,
            p_iva_total: datos.iva_total,
            p_ieps_total: datos.ieps_total,
            p_total: datos.total,
            p_efectivo_recibido: datos.efectivo_recibido,
            p_cambio: datos.cambio,
            p_metodo_pago: datos.metodo_pago,
            p_local_id: uuidv4(), // Siempre enviamos local_id aunque seamos online
          })

          if (error) throw error

          // Actualizar también el stock local para consistencia
          await decrementarStockLocal(datos.items)

          return {
            exito: true,
            modo: 'online',
            folio: data.folio,
            pedido_id: data.pedido_id,
          }
        } catch (err: unknown) {
          // Si Supabase falla MID-request, caemos a offline automáticamente
          console.warn('[Ventastack offline] Fallo online, guardando en cola:', err)
        }
      }

      // ─── MODO OFFLINE: guardar en IndexedDB ───────────────────────────────
      const folio_local = await generarFolioLocal(datos.company_id)
      const local_id = uuidv4()

      await guardarVentaPendiente({
        ...datos,
        local_id,
        folio_local,
        creado_at: Date.now(),
      })

      // Descontar stock local para que el cajero vea valores correctos
      await decrementarStockLocal(datos.items)

      const pendientes = await contarVentasPendientes(company_id)
      setEstado((prev) => ({
        ...prev,
        pendientes,
        estaOnline: false,
      }))

      return {
        exito: true,
        modo: 'offline',
        folio_local,
      }
    },
    [supabase, company_id, verificarConexion]
  )

  // ── Efectos: inicialización y listeners ───────────────────────────────────
  useEffect(() => {
    // Carga inicial
    const inicializar = async () => {
      const pendientes = await contarVentasPendientes(company_id)
      const productos = await obtenerProductosLocales(company_id)
      setEstado((prev) => ({
        ...prev,
        pendientes,
        productosEnCache: productos.length,
      }))

      // Intentar cachear productos al iniciar
      await sincronizarCatalogoProductos()
    }

    inicializar()

    // Cuando el browser detecta que regresó internet,
    // lanzar sync inmediatamente (no esperar el intervalo)
    const alVolver = () => {
      console.info('[Ventastack offline] Conexión recuperada — sincronizando...')
      procesarCola()
      sincronizarCatalogoProductos()
    }

    window.addEventListener('online', alVolver)

    // Intervalo de sync cada 30 segundos como respaldo
    intervalRef.current = setInterval(procesarCola, INTERVALO_SYNC_MS)

    return () => {
      window.removeEventListener('online', alVolver)
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [company_id, procesarCola, sincronizarCatalogoProductos])

  // ── API pública del hook ──────────────────────────────────────────────────
  return {
    estado,
    cobrarVenta,
    obtenerProductos,
    procesarCola,          // Para botón manual "Sincronizar ahora"
    sincronizarCatalogo: sincronizarCatalogoProductos,
  }
}
