"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Producto = { id: string; nombre: string; precio: number };
type Cliente = { id: string; nombre: string };
type ItemCarrito = {
  producto_id: string;
  nombre: string;
  cantidad: number;
  precio_unitario: number;
};

export function CotizacionForm({
  productos,
  clientes,
}: {
  productos: Producto[];
  clientes: Cliente[];
}) {
  const [clienteId, setClienteId] = useState("");
  const [carrito, setCarrito] = useState<ItemCarrito[]>([]);
  const [productoSeleccionado, setProductoSeleccionado] = useState(
    productos[0]?.id ?? "",
  );
  const [cantidad, setCantidad] = useState("1");
  const [precioUnitario, setPrecioUnitario] = useState("");
  const [validaHasta, setValidaHasta] = useState("");
  const [nota, setNota] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const onCambiarProducto = (id: string) => {
    setProductoSeleccionado(id);
    const producto = productos.find((p) => p.id === id);
    setPrecioUnitario(producto ? producto.precio.toFixed(2) : "");
  };

  const agregarAlCarrito = () => {
    const producto = productos.find((p) => p.id === productoSeleccionado);
    const cant = Number(cantidad);
    const precio = Number(precioUnitario);

    if (!producto || !Number.isFinite(cant) || cant <= 0) {
      setError("Pon una cantidad válida");
      return;
    }
    if (!Number.isFinite(precio) || precio < 0) {
      setError("Pon un precio válido");
      return;
    }

    setError(null);
    setCarrito((prev) => [
      ...prev,
      {
        producto_id: producto.id,
        nombre: producto.nombre,
        cantidad: cant,
        precio_unitario: precio,
      },
    ]);
    setCantidad("1");
  };

  const quitarDelCarrito = (index: number) => {
    setCarrito((prev) => prev.filter((_, i) => i !== index));
  };

  const total = carrito.reduce(
    (suma, i) => suma + i.cantidad * i.precio_unitario,
    0,
  );

  const registrar = async () => {
    setError(null);

    if (carrito.length === 0) {
      setError("Agrega al menos un producto");
      return;
    }

    setIsLoading(true);
    const supabase = createClient();

    const { data: cotizacionId, error: rpcError } = await supabase.rpc(
      "registrar_cotizacion",
      {
        p_cliente_id: clienteId || null,
        p_items: carrito.map((i) => ({
          producto_id: i.producto_id,
          cantidad: i.cantidad,
          precio_unitario: i.precio_unitario,
        })),
        p_nota: nota || null,
        p_valida_hasta: validaHasta || null,
      },
    );

    setIsLoading(false);

    if (rpcError) {
      setError(rpcError.message);
      return;
    }

    router.push(`/protected/cotizaciones/${cotizacionId}`);
  };

  return (
    <div className="flex w-full max-w-sm flex-col gap-6">
      <div className="rounded-lg border border-linea bg-white p-4">
        <label htmlFor="cliente" className="block text-sm font-medium text-ink">
          Cliente (opcional)
        </label>
        <select
          id="cliente"
          value={clienteId}
          onChange={(e) => setClienteId(e.target.value)}
          className="mt-1 w-full rounded-md border border-linea px-3 py-2 text-ink focus:border-primario focus:outline-none"
        >
          <option value="">Público general</option>
          {clientes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-3 rounded-lg border border-linea bg-white p-4">
        <label className="text-sm font-medium text-ink">Agregar producto</label>
        <select
          value={productoSeleccionado}
          onChange={(e) => onCambiarProducto(e.target.value)}
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
            placeholder="Precio c/u"
            value={precioUnitario}
            onChange={(e) => setPrecioUnitario(e.target.value)}
            className="w-1/2 rounded-md border border-linea px-3 py-2 text-ink focus:border-primario focus:outline-none"
          />
        </div>
        <p className="text-xs text-ink/40">
          El precio se puede ajustar — una cotización puede llevar un precio
          distinto al de catálogo.
        </p>
        <button
          type="button"
          onClick={agregarAlCarrito}
          className="rounded-md bg-primario px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
        >
          Agregar
        </button>
      </div>

      <div className="rounded-lg border border-linea bg-white p-4">
        <h2 className="mb-3 text-sm font-medium text-ink">Productos cotizados</h2>
        {carrito.length === 0 ? (
          <p className="text-sm text-ink/40">Vacío</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {carrito.map((item, i) => (
              <li key={i} className="flex items-center justify-between gap-2 text-sm">
                <span className="flex-1 text-ink">{item.nombre}</span>
                <span className="cifra text-ink/70">
                  {item.cantidad} × ${item.precio_unitario.toFixed(2)}
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
          <label htmlFor="validaHasta" className="block text-sm font-medium text-ink">
            Válida hasta (opcional)
          </label>
          <input
            id="validaHasta"
            type="date"
            value={validaHasta}
            onChange={(e) => setValidaHasta(e.target.value)}
            className="mt-1 w-full rounded-md border border-linea px-3 py-2 text-ink focus:border-primario focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="nota" className="block text-sm font-medium text-ink">
            Nota (opcional)
          </label>
          <input
            id="nota"
            type="text"
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            placeholder="Precio especial por volumen..."
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
          {isLoading ? "Guardando..." : "Guardar cotización"}
        </button>
      </div>
    </div>
  );
}
