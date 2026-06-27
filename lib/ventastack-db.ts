/**
 * ventastack-db.ts
 * Base de datos local IndexedDB usando Dexie.js
 * Colócalo en: lib/ventastack-db.ts
 *
 * Instala: npm install dexie
 */

import Dexie, { type Table } from 'dexie'

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type EstadoSync = 'pendiente' | 'sincronizando' | 'sincronizado' | 'error'

export interface ProductoLocal {
  id: string           // UUID del producto en Supabase
  company_id: string
  nombre: string
  precio: number
  costo: number
  stock: number
  sku: string | null
  codigo_barras: string | null
  iva_porcentaje: number
  ieps_porcentaje: number
  activo: boolean
  // Cuándo se cacheó — para saber si está fresco
  cached_at: number    // Date.now()
}

export interface ItemVentaLocal {
  producto_id: string
  nombre: string
  cantidad: number
  precio_unitario: number
  iva_porcentaje: number
  ieps_porcentaje: number
  subtotal: number
  iva_monto: number
  ieps_monto: number
  total: number
}

export interface VentaPendiente {
  id?: number            // Auto-increment local (clave primaria)
  local_id: string       // UUID local generado al crear (para deduplicación)
  company_id: string
  sucursal_id: string | null
  user_id: string
  folio_local: string    // Folio temporal visible al cajero: "OFF-001"
  items: ItemVentaLocal[]
  subtotal: number
  iva_total: number
  ieps_total: number
  total: number
  efectivo_recibido: number
  cambio: number
  metodo_pago: string
  pie_ticket: string
  estado_sync: EstadoSync
  intentos_sync: number  // Cuántas veces se intentó sincronizar
  creado_at: number      // Date.now() — para mostrar hora en recibo offline
  error_msg: string | null
  // Una vez sincronizado, guardamos el ID real de Supabase
  pedido_id_supabase: string | null
  folio_supabase: string | null
}

// ─── Clase de la base de datos ────────────────────────────────────────────────

class VentastackDatabase extends Dexie {
  productos!: Table<ProductoLocal, string>     // clave: id (UUID)
  ventas_pendientes!: Table<VentaPendiente, number> // clave: id (auto)

  constructor() {
    super('ventastack_v1')

    this.version(1).stores({
      // Índices que necesitamos para queries rápidas
      productos: 'id, company_id, sku, codigo_barras, activo',
      ventas_pendientes: '++id, local_id, company_id, estado_sync, creado_at',
    })
  }
}

export const db = new VentastackDatabase()

// ─── Helpers de productos ─────────────────────────────────────────────────────

const CACHE_TTL_MS = 1000 * 60 * 30 // 30 minutos

export async function cachearProductos(
  productos: ProductoLocal[]
): Promise<void> {
  const ahora = Date.now()
  const conTimestamp = productos.map((p) => ({ ...p, cached_at: ahora }))
  // bulkPut: inserta o actualiza
  await db.productos.bulkPut(conTimestamp)
}

export async function obtenerProductosLocales(
  company_id: string
): Promise<ProductoLocal[]> {
  return db.productos
    .where('company_id')
    .equals(company_id)
    .and((p) => p.activo === true)
    .toArray()
}

export async function cacheEstaFresco(company_id: string): Promise<boolean> {
  const masAntiguo = await db.productos
    .where('company_id')
    .equals(company_id)
    .first()

  if (!masAntiguo) return false
  return Date.now() - masAntiguo.cached_at < CACHE_TTL_MS
}

// Actualiza el stock local después de una venta offline
// para que el cajero vea el stock correcto aunque siga sin internet
export async function decrementarStockLocal(
  items: ItemVentaLocal[]
): Promise<void> {
  await db.transaction('rw', db.productos, async () => {
    for (const item of items) {
      const producto = await db.productos.get(item.producto_id)
      if (producto) {
        await db.productos.update(item.producto_id, {
          stock: Math.max(0, producto.stock - item.cantidad),
        })
      }
    }
  })
}

// ─── Helpers de ventas pendientes ─────────────────────────────────────────────

export async function guardarVentaPendiente(
  venta: Omit<VentaPendiente, 'id' | 'estado_sync' | 'intentos_sync' | 'error_msg' | 'pedido_id_supabase' | 'folio_supabase'>
): Promise<number> {
  return db.ventas_pendientes.add({
    ...venta,
    estado_sync: 'pendiente',
    intentos_sync: 0,
    error_msg: null,
    pedido_id_supabase: null,
    folio_supabase: null,
  })
}

export async function obtenerVentasPendientes(
  company_id: string
): Promise<VentaPendiente[]> {
  return db.ventas_pendientes
    .where('company_id')
    .equals(company_id)
    .and((v) => v.estado_sync === 'pendiente' || v.estado_sync === 'error')
    .toArray()
}

export async function contarVentasPendientes(
  company_id: string
): Promise<number> {
  return db.ventas_pendientes
    .where('company_id')
    .equals(company_id)
    .and((v) => v.estado_sync === 'pendiente' || v.estado_sync === 'error')
    .count()
}

export async function marcarComoSincronizando(id: number): Promise<void> {
  await db.ventas_pendientes.update(id, {
    estado_sync: 'sincronizando',
  })
}

export async function marcarComoSincronizado(
  id: number,
  pedido_id_supabase: string,
  folio_supabase: string
): Promise<void> {
  await db.ventas_pendientes.update(id, {
    estado_sync: 'sincronizado',
    pedido_id_supabase,
    folio_supabase,
  })
}

export async function marcarComoError(
  id: number,
  error_msg: string
): Promise<void> {
  const venta = await db.ventas_pendientes.get(id)
  await db.ventas_pendientes.update(id, {
    estado_sync: 'error',
    intentos_sync: (venta?.intentos_sync ?? 0) + 1,
    error_msg,
  })
}

// Genera un folio temporal legible para el cajero
export async function generarFolioLocal(company_id: string): Promise<string> {
  const total = await db.ventas_pendientes
    .where('company_id')
    .equals(company_id)
    .count()
  return `OFF-${String(total + 1).padStart(4, '0')}`
}
