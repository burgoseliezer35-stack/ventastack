"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Proveedor = { id: string; nombre: string };
type Producto = { id: string; nombre: string };
type ItemCarrito = {
  producto_id: string;
  nombre: string;
  cantidad: number;
  costo_unitario: number;
};

export function CompraForm({
  proveedores,
  productos,
}: {
  proveedores: Proveedor[];
  productos: Producto[];
}) {
  const [proveedorId, setProveedorId] = useState(proveedores[0]?.id ?? "");
  const [carrito, setCarrito] = useState<ItemCarrito[]>([]);
  const [productoSeleccionado, setProductoSeleccionado] = useState(
    productos[0]?.id ?? "",
  );
  const [cantidad, setCantidad] = useState("1");
  const [costoUnitario, setCostoUnitario] = useState("");
  const [nota, setNota] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const agregarAlCarrito = () => {
    const producto = productos.find((p) => p.id === productoSeleccionado);
    const cant = Number(cantidad);
    const costo = Number(costoUnitario);

    if (!producto || !Number.isFinite(cant) || cant <= 0) {
      setError("Pon una cantidad válida");
      return;
    }
    if (!Number.isFinite(costo) || costo < 0) {
      setError("Pon un costo válido");
      return;
    }

    setError(null);
    setCarrito((prev) => [
      ...prev,
      {
        producto_id: producto.id,
        nombre: producto.nombre,
        cantidad: cant,
        costo_unitario: costo,
      },
    ]);
    setCantidad("1");
    setCostoUnitario("");
  };

  const quitarDelCarrito = (index: number) => {
    setCarrito((prev) => prev.filter((_, i) => i !== index));
  };

  const total = carrito.reduce(
    (suma, i) => suma + i.cantidad * i.costo_unitario,
    0,
  );

  const registrar = async () => {
    setError(null);

    if (carrito.length === 0) {
      setError("Agrega al menos un producto");
      return;
    }
    if (!proveedorId) {
      setError("Elige un proveedor");
      return;
    }

    setIsLoading(true);
    const supabase = createClient();

    const { data: compraId, error: rpcError } = await supabase.rpc(
      "registrar_compra",
      {
        p_proveedor_id: proveedorId,
        p_items: carrito.map((i) => ({
          producto_id: i.producto_id,
          cantidad: i.cantidad,
          costo_unitario: i.costo_unitario,
        })),
        p_nota: nota || null,
      },
    );

    setIsLoading(false);

    if (rpcError) {
      setError(rpcError.message);
      return;
    }

    router.push(`/protected/compras/${compraId}`);
  };

  return (
    <div className="flex w-full max-w-sm flex-col gap-6">
      <div className="rounded-lg border border-linea bg-white p-4">
        <label htmlFor="proveedor" className="block text-sm font-medium text-ink">
          Proveedor
        </label>
        <select
          id="proveedor"
          value={proveedorId}
          onChange={(e) => setProveedorId(e.target.value)}
          className="mt-1 w-full rounded-md border border-linea px-3 py-2 text-ink focus:border-primario focus:outline-none"
        >
          {proveedores.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nombre}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-3 rounded-lg border border-linea bg-white p-4">
        <label className="text-sm font-medium text-ink">Agregar producto</label>
        <select
          value={productoSeleccionado}
          onChange={(e) => setProductoSeleccionado(e.target.value)}
          className="w-full rounded-md border border-linea px-3 py-2 text-ink focus:border-primario focus:outline-none"
        >
          {productos.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nombre}
            </option>
          ))}
        </select>
        <div className="flex gap-2">
          <input
            type="number"
            min="0.01"
            step="0.01"
            placeholder="Cantidad"
            value={cantidad}
            onChange={(e) => setCantidad(e.target.value)}
            className="w-1/2 rounded-md border border-linea px-3 py-2 text-ink focus:border-primario focus:outline-none"
          />
          <input
            type="number"
            min="0"
            step="0.01"
            placeholder="Costo c/u"
            value={costoUnitario}
            onChange={(e) => setCostoUnitario(e.target.value)}
            className="w-1/2 rounded-md border border-linea px-3 py-2 text-ink focus:border-primario focus:outline-none"
          />
        </div>
        <button
          type="button"
          onClick={agregarAlCarrito}
          className="rounded-md bg-primario px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
        >
          Agregar
        </button>
      </div>

      <div className="rounded-lg border border-linea bg-white p-4">
        <h2 className="mb-3 text-sm font-medium text-ink">Productos en esta compra</h2>
        {carrito.length === 0 ? (
          <p className="text-sm text-ink/40">Vacío</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {carrito.map((item, i) => (
              <li key={i} className="flex items-center justify-between gap-2 text-sm">
                <span className="flex-1 text-ink">{item.nombre}</span>
                <span className="cifra text-ink/70">
                  {item.cantidad} × ${item.costo_unitario.toFixed(2)}
                </span>
                <button
                  type="button"
                  onClick={() => quitarDelCarrito(i)}
                  className="text-red-500 hover:underline"
                >
                  Quitar
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-3 flex justify-between border-t border-linea pt-3 text-sm font-semibold text-ink">
          <span>Total</span>
          <span className="cifra">${total.toFixed(2)}</span>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-lg border border-linea bg-white p-4">
        <div>
          <label htmlFor="nota" className="block text-sm font-medium text-ink">
            Nota (opcional)
          </label>
          <input
            id="nota"
            type="text"
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            placeholder="Primer pedido del mes..."
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
          {isLoading ? "Registrando..." : "Registrar compra"}
        </button>
      </div>
    </div>
  );
}
