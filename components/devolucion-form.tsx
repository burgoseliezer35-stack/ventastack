"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState } from "react";

type ItemDisponible = {
  producto_id: string;
  nombre: string;
  precio_unitario: number;
  disponible: number;
};

export function DevolucionForm({
  pedidoId,
  items,
}: {
  pedidoId: string;
  items: ItemDisponible[];
}) {
  const [cantidades, setCantidades] = useState<Record<string, string>>({});
  const [nota, setNota] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const cambiarCantidad = (productoId: string, valor: string) => {
    setCantidades((prev) => ({ ...prev, [productoId]: valor }));
  };

  const total = items.reduce((suma, item) => {
    const cant = Number(cantidades[item.producto_id] ?? 0);
    return suma + (Number.isFinite(cant) ? cant : 0) * item.precio_unitario;
  }, 0);

  const registrar = async () => {
    setError(null);

    const seleccion = items
      .map((item) => ({
        producto_id: item.producto_id,
        cantidad: Number(cantidades[item.producto_id] ?? 0),
        precio_unitario: item.precio_unitario,
      }))
      .filter((i) => i.cantidad > 0);

    if (seleccion.length === 0) {
      setError("Pon una cantidad para devolver en al menos un producto");
      return;
    }

    setIsLoading(true);
    const supabase = createClient();

    const { data: devolucionId, error: rpcError } = await supabase.rpc(
      "registrar_devolucion",
      {
        p_pedido_id: pedidoId,
        p_items: seleccion,
        p_nota: nota || null,
      },
    );

    setIsLoading(false);

    if (rpcError) {
      setError(rpcError.message);
      return;
    }

    router.push(`/protected/devoluciones/${devolucionId}`);
  };

  if (items.every((i) => i.disponible <= 0)) {
    return (
      <p className="max-w-sm text-center text-sm text-ink/60">
        Ya no queda nada disponible para devolver de este pedido — todo lo
        que se vendió ya fue devuelto antes.
      </p>
    );
  }

  return (
    <div className="flex w-full max-w-sm flex-col gap-6">
      <div className="rounded-lg border border-linea bg-white p-4">
        <h2 className="mb-3 text-sm font-medium text-ink">
          ¿Cuánto se devuelve de cada producto?
        </h2>
        <ul className="flex flex-col gap-3">
          {items.map((item) => (
            <li key={item.producto_id} className="flex items-center gap-2 text-sm">
              <div className="flex flex-1 flex-col">
                <span className="text-ink">{item.nombre}</span>
                <span className="text-xs text-ink/50">
                  {item.disponible} disponibles para devolver
                </span>
              </div>
              <input
                type="number"
                min="0"
                max={item.disponible}
                step="0.01"
                disabled={item.disponible <= 0}
                placeholder="0"
                value={cantidades[item.producto_id] ?? ""}
                onChange={(e) => cambiarCantidad(item.producto_id, e.target.value)}
                className="w-20 rounded-md border border-linea px-2 py-1 text-center disabled:bg-paper"
              />
            </li>
          ))}
        </ul>
        <div className="mt-3 flex justify-between border-t border-linea pt-3 text-sm font-semibold text-ink">
          <span>Total a devolver</span>
          <span className="cifra">${total.toFixed(2)}</span>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-lg border border-linea bg-white p-4">
        <div>
          <label htmlFor="nota" className="block text-sm font-medium text-ink">
            Motivo (opcional)
          </label>
          <input
            id="nota"
            type="text"
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            placeholder="Llegó dañado, no era lo que pidió..."
            className="mt-1 w-full rounded-md border border-linea px-3 py-2 text-ink focus:border-primario focus:outline-none"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="button"
          onClick={registrar}
          disabled={isLoading}
          className="w-full rounded-md bg-primario px-4 py-2 font-medium text-white transition hover:opacity-90 disabled:opacity-50"
        >
          {isLoading ? "Registrando..." : "Registrar devolución"}
        </button>
      </div>
    </div>
  );
}
