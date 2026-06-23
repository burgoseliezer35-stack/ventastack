"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

export type VentaOffline = {
  id: string; // UUID local temporal
  timestamp: number;
  companyId: string;
  items: {
    producto_id: string;
    nombre: string;
    cantidad: number;
    precio_unitario: number;
  }[];
  clienteId: string | null;
  metodoPago: string;
  total: number;
  sincronizado: boolean;
  error?: string;
};

const DB_NAME = "ventastack_offline";
const DB_VERSION = 1;
const STORE_NAME = "ventas_queue";

// Abre (o crea) la base de datos IndexedDB
function abrirDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("sincronizado", "sincronizado", { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function guardarVentaLocal(venta: VentaOffline): Promise<void> {
  const db = await abrirDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(venta);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function obtenerVentasPendientes(): Promise<VentaOffline[]> {
  const db = await abrirDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const idx = store.index("sincronizado");
    const req = idx.getAll(IDBKeyRange.only(false));
    req.onsuccess = () => resolve(req.result as VentaOffline[]);
    req.onerror = () => reject(req.error);
  });
}

async function marcarSincronizada(id: string, error?: string): Promise<void> {
  const db = await abrirDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const req = store.get(id);
    req.onsuccess = () => {
      const venta = req.result as VentaOffline;
      if (venta) {
        venta.sincronizado = !error;
        if (error) venta.error = error;
        store.put(venta);
      }
      resolve();
    };
    req.onerror = () => reject(req.error);
  });
}

export function useOfflineMode(companyId: string) {
  const [online, setOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );
  const [sincronizando, setSincronizando] = useState(false);
  const [pendientes, setPendientes] = useState(0);
  const sincronizandoRef = useRef(false);

  // Actualizar el conteo de pendientes
  const actualizarConteo = useCallback(async () => {
    try {
      const ventas = await obtenerVentasPendientes();
      setPendientes(ventas.length);
    } catch { /* IndexedDB no disponible */ }
  }, []);

  // Sincronizar ventas pendientes cuando vuelve el internet
  const sincronizar = useCallback(async () => {
    if (sincronizandoRef.current) return;
    sincronizandoRef.current = true;
    setSincronizando(true);

    try {
      const ventas = await obtenerVentasPendientes();
      if (ventas.length === 0) return;

      const supabase = createClient();

      for (const venta of ventas) {
        try {
          const { error } = await supabase.rpc("crear_pedido_con_detalle", {
            p_cliente_id: venta.clienteId,
            p_origen: "pos",
            p_metodo_pago: venta.metodoPago,
            p_items: venta.items.map((i) => ({
              producto_id: i.producto_id,
              cantidad: i.cantidad,
              precio_unitario: i.precio_unitario,
            })),
          });

          await marcarSincronizada(venta.id, error?.message);
        } catch (err) {
          await marcarSincronizada(venta.id, String(err));
        }
      }

      await actualizarConteo();
    } finally {
      sincronizandoRef.current = false;
      setSincronizando(false);
    }
  }, [actualizarConteo]);

  useEffect(() => {
    const handleOnline = () => {
      setOnline(true);
      sincronizar();
    };
    const handleOffline = () => setOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    setTimeout(() => actualizarConteo(), 0);

    // Si ya estamos online al montar, intentar sincronizar pendientes
    if (navigator.onLine) sincronizar();

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [sincronizar, actualizarConteo]);

  // Guardar una venta offline
  const guardarOffline = useCallback(
    async (
      items: VentaOffline["items"],
      clienteId: string | null,
      metodoPago: string,
      total: number
    ): Promise<string> => {
      const id = crypto.randomUUID();
      const venta: VentaOffline = {
        id,
        timestamp: Date.now(),
        companyId,
        items,
        clienteId,
        metodoPago,
        total,
        sincronizado: false,
      };
      await guardarVentaLocal(venta);
      await actualizarConteo();
      return id;
    },
    [companyId, actualizarConteo]
  );

  return { online, sincronizando, pendientes, guardarOffline, sincronizar };
}
