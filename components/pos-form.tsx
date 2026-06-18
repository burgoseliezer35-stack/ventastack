"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState, useRef, type KeyboardEvent } from "react";

type NivelMayoreo = { cantidad_minima: number; precio_unitario: number };
type Producto = {
  id: string;
  nombre: string;
  precio: number;
  stock: number;
  codigo_barras: string | null;
  niveles: NivelMayoreo[];
};
type Cliente = { id: string; nombre: string };
type ItemCarrito = {
  producto_id: string;
  nombre: string;
  precio_unitario: number;
  cantidad: number;
  stock_disponible: number;
};

// Los niveles ya vienen ordenados de mayor a menor cantidad_minima
// desde la página — aquí solo tomamos el primero que SÍ alcance.
function precioParaCantidad(producto: Producto, cantidad: number): number {
  const nivel = producto.niveles.find((n) => cantidad >= n.cantidad_minima);
  return nivel ? nivel.precio_unitario : producto.precio;
}

export function PosForm({
  productos,
  clientes,
  geminiDisponible,
}: {
  productos: Producto[];
  clientes: Cliente[];
  geminiDisponible: boolean;
}) {
  const [carrito, setCarrito] = useState<ItemCarrito[]>([]);
  const [productoSeleccionado, setProductoSeleccionado] = useState(
    productos[0]?.id ?? "",
  );
  const [codigoBarras, setCodigoBarras] = useState("");
  const [clienteId, setClienteId] = useState("");
  const [metodoPago, setMetodoPago] = useState("efectivo");
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [grabando, setGrabando] = useState(false);
  const [procesandoVoz, setProcesandoVoz] = useState(false);
  const [procesandoUpsell, setProcesandoUpsell] = useState(false);
  const [sugerencias, setSugerencias] = useState<
    { producto_id: string; nombre: string; razon: string }[]
  >([]);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const fragmentosRef = useRef<Blob[]>([]);
  const router = useRouter();

  const agregarProductoAlCarrito = (
    producto: Producto,
    cantidadAAgregar: number = 1,
  ) => {
    setError(null);

    setCarrito((prev) => {
      const existente = prev.find((i) => i.producto_id === producto.id);
      const cantidadActual = existente?.cantidad ?? 0;
      const nuevaCantidad = cantidadActual + cantidadAAgregar;

      if (nuevaCantidad > producto.stock) {
        setError(`Solo quedan ${producto.stock} de "${producto.nombre}"`);
        return prev;
      }

      const precio = precioParaCantidad(producto, nuevaCantidad);

      if (existente) {
        return prev.map((i) =>
          i.producto_id === producto.id
            ? { ...i, cantidad: nuevaCantidad, precio_unitario: precio }
            : i,
        );
      }
      return [
        ...prev,
        {
          producto_id: producto.id,
          nombre: producto.nombre,
          precio_unitario: precio,
          cantidad: cantidadAAgregar,
          stock_disponible: producto.stock,
        },
      ];
    });
  };

  const agregarAlCarrito = () => {
    const producto = productos.find((p) => p.id === productoSeleccionado);
    if (!producto) return;
    agregarProductoAlCarrito(producto);
  };

  const iniciarGrabacion = async () => {
    setError(null);
    setAviso(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      fragmentosRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) fragmentosRef.current.push(e.data);
      };

      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        const blob = new Blob(fragmentosRef.current, {
          type: recorder.mimeType || "audio/webm",
        });
        procesarAudio(blob);
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setGrabando(true);
    } catch {
      setError(
        "No pudimos usar el micrófono — revisa que le hayas dado permiso a esta página.",
      );
    }
  };

  const detenerGrabacion = () => {
    mediaRecorderRef.current?.stop();
    setGrabando(false);
  };

  const procesarAudio = async (blob: Blob) => {
    setProcesandoVoz(true);

    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const resultado = reader.result as string;
          resolve(resultado.split(",")[1] ?? "");
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      const res = await fetch("/api/voz-a-pedido", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ audioBase64: base64, mimeType: blob.type }),
      });

      const respuesta = await res.json();

      if (!res.ok) {
        setError(respuesta.error ?? "No se pudo procesar el audio");
        setProcesandoVoz(false);
        return;
      }

      const items: { producto_id: string; cantidad: number }[] =
        respuesta.items ?? [];

      if (items.length === 0) {
        setError(
          "No entendimos ningún producto en lo que dijiste — intenta de nuevo o agrégalo a mano",
        );
        setProcesandoVoz(false);
        return;
      }

      const agregados: string[] = [];
      for (const item of items) {
        const producto = productos.find((p) => p.id === item.producto_id);
        if (producto) {
          agregarProductoAlCarrito(producto, item.cantidad);
          agregados.push(`${item.cantidad}x ${producto.nombre}`);
        }
      }
      setAviso(`Se agregaron del audio: ${agregados.join(", ")}`);
    } catch {
      setError("No se pudo conectar para procesar el audio");
    }

    setProcesandoVoz(false);
  };

  const pedirSugerencias = async () => {
    setError(null);
    setSugerencias([]);

    if (carrito.length === 0) return;

    setProcesandoUpsell(true);

    try {
      const res = await fetch("/api/sugerir-upsell", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombresEnCarrito: carrito.map((i) => i.nombre),
        }),
      });

      const respuesta = await res.json();

      if (!res.ok) {
        setError(respuesta.error ?? "No se pudo pedir sugerencias");
        setProcesandoUpsell(false);
        return;
      }

      const items: { producto_id: string; razon: string }[] =
        respuesta.items ?? [];

      const conNombre = items
        .map((item) => {
          const producto = productos.find((p) => p.id === item.producto_id);
          return producto
            ? { producto_id: item.producto_id, nombre: producto.nombre, razon: item.razon }
            : null;
        })
        .filter((i): i is { producto_id: string; nombre: string; razon: string } => i !== null);

      if (conNombre.length === 0) {
        setError("No encontramos ninguna sugerencia esta vez");
      }
      setSugerencias(conNombre);
    } catch {
      setError("No se pudo conectar para pedir sugerencias");
    }

    setProcesandoUpsell(false);
  };

  const agregarSugerencia = (productoId: string) => {
    const producto = productos.find((p) => p.id === productoId);
    if (producto) agregarProductoAlCarrito(producto);
    setSugerencias((prev) => prev.filter((s) => s.producto_id !== productoId));
  };

  const buscarPorCodigoBarras = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") return;
    e.preventDefault();

    const codigo = codigoBarras.trim();
    if (!codigo) return;

    const producto = productos.find((p) => p.codigo_barras === codigo);
    if (!producto) {
      setError(`No encontramos ningún producto con el código "${codigo}"`);
      setCodigoBarras("");
      return;
    }

    agregarProductoAlCarrito(producto);
    setCodigoBarras("");
  };

  const cambiarCantidad = (productoId: string, cantidad: number) => {
    setError(null);
    const producto = productos.find((p) => p.id === productoId);
    setCarrito((prev) =>
      prev
        .map((i) => {
          if (i.producto_id !== productoId) return i;
          if (cantidad > i.stock_disponible) {
            setError(`Solo quedan ${i.stock_disponible} de "${i.nombre}"`);
            return { ...i, cantidad: i.stock_disponible };
          }
          const precio = producto ? precioParaCantidad(producto, cantidad) : i.precio_unitario;
          return { ...i, cantidad, precio_unitario: precio };
        })
        .filter((i) => i.cantidad > 0),
    );
  };

  const quitarDelCarrito = (productoId: string) => {
    setCarrito((prev) => prev.filter((i) => i.producto_id !== productoId));
  };

  const total = carrito.reduce(
    (suma, i) => suma + i.precio_unitario * i.cantidad,
    0,
  );

  const cobrar = async () => {
    setError(null);

    if (carrito.length === 0) {
      setError("Agrega al menos un producto");
      return;
    }
    if (metodoPago === "credito" && !clienteId) {
      setError("Una venta a crédito necesita un cliente seleccionado");
      return;
    }

    setIsLoading(true);
    const supabase = createClient();

    const { data: pedidoId, error: rpcError } = await supabase.rpc(
      "crear_pedido_con_detalle",
      {
        p_cliente_id: clienteId || null,
        p_origen: "pos",
        p_metodo_pago: metodoPago,
        p_items: carrito.map((i) => ({
          producto_id: i.producto_id,
          cantidad: i.cantidad,
          precio_unitario: i.precio_unitario,
        })),
      },
    );

    setIsLoading(false);

    if (rpcError) {
      // Si fue por falta de stock, la base de datos ya manda el
      // mensaje exacto de qué producto y cuánto queda — lo
      // mostramos tal cual.
      setError(rpcError.message);
      return;
    }

    // Aviso de cortesía, sin bloquear nada — si esto tarda o falla,
    // la venta ya se hizo bien y el recibo se muestra igual.
    fetch("/api/verificar-stock-bajo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productoIds: carrito.map((i) => i.producto_id),
      }),
    }).catch(() => {});

    router.push(`/protected/pos/recibo/${pedidoId}`);
  };

  return (
    <div className="flex w-full max-w-sm flex-col gap-6">
      <div className="flex flex-col gap-2 rounded-lg border border-linea bg-white p-4">
        <label htmlFor="codigoBarras" className="text-sm font-medium text-ink">
          Buscar por código de barras
        </label>
        <input
          id="codigoBarras"
          type="text"
          value={codigoBarras}
          onChange={(e) => setCodigoBarras(e.target.value)}
          onKeyDown={buscarPorCodigoBarras}
          placeholder="Escanea o escribe y presiona Enter"
          className="w-full rounded-md border border-linea px-3 py-2 text-ink focus:border-primario focus:outline-none"
        />
      </div>

      {geminiDisponible && (
        <div className="flex flex-col gap-2 rounded-lg border border-linea bg-white p-4">
          <span className="text-sm font-medium text-ink">Hablar el pedido</span>
          <button
            type="button"
            onClick={grabando ? detenerGrabacion : iniciarGrabacion}
            disabled={procesandoVoz}
            className={`w-full rounded-md px-4 py-2 text-sm font-medium text-white transition disabled:opacity-50 ${
              grabando ? "bg-red-600 hover:opacity-90" : "bg-primario hover:opacity-90"
            }`}
          >
            {procesandoVoz
              ? "Entendiendo lo que dijiste..."
              : grabando
                ? "⏹ Detener grabación"
                : "🎤 Hablar pedido"}
          </button>
          {aviso && <p className="text-xs text-emerald-700">{aviso}</p>}
        </div>
      )}

      <div className="flex flex-col gap-2 rounded-lg border border-linea bg-white p-4">
        <label htmlFor="producto" className="text-sm font-medium text-ink">
          Agregar producto
        </label>
        <div className="flex gap-2">
          <select
            id="producto"
            value={productoSeleccionado}
            onChange={(e) => setProductoSeleccionado(e.target.value)}
            className="flex-1 rounded-md border border-linea px-3 py-2 text-ink focus:border-primario focus:outline-none"
          >
            {productos.map((p) => (
              <option key={p.id} value={p.id} disabled={p.stock <= 0}>
                {p.nombre} — ${p.precio.toFixed(2)}{" "}
                {p.stock <= 0 ? "(sin stock)" : `(${p.stock} disp.)`}
                {p.niveles.length > 0 ? " · tiene mayoreo" : ""}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={agregarAlCarrito}
            className="rounded-md bg-primario px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
          >
            Agregar
          </button>
        </div>
      </div>

      <div className="rounded-lg border border-linea bg-white p-4">
        <h2 className="mb-3 text-sm font-medium text-ink">Carrito</h2>
        {carrito.length === 0 ? (
          <p className="text-sm text-ink/40">Vacío</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {carrito.map((item) => (
              <li
                key={item.producto_id}
                className="flex items-center justify-between gap-2 text-sm"
              >
                <span className="flex-1 text-ink">{item.nombre}</span>
                <input
                  type="number"
                  min={1}
                  max={item.stock_disponible}
                  value={item.cantidad}
                  onChange={(e) =>
                    cambiarCantidad(item.producto_id, Number(e.target.value))
                  }
                  className="w-14 rounded-md border border-linea px-2 py-1 text-center"
                />
                <span className="cifra w-16 text-right text-ink/70">
                  ${(item.precio_unitario * item.cantidad).toFixed(2)}
                </span>
                <button
                  type="button"
                  onClick={() => quitarDelCarrito(item.producto_id)}
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

        {geminiDisponible && carrito.length > 0 && (
          <div className="mt-3 border-t border-linea pt-3">
            <button
              type="button"
              onClick={pedirSugerencias}
              disabled={procesandoUpsell}
              className="text-xs text-primario hover:underline disabled:opacity-50"
            >
              {procesandoUpsell ? "Pensando..." : "💡 Sugerir algo más"}
            </button>
            {sugerencias.length > 0 && (
              <ul className="mt-2 flex flex-col gap-2">
                {sugerencias.map((s) => (
                  <li
                    key={s.producto_id}
                    className="flex items-center justify-between gap-2 rounded-md bg-paper px-3 py-2 text-xs"
                  >
                    <span className="text-ink">
                      {s.nombre} <span className="text-ink/50">— {s.razon}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => agregarSugerencia(s.producto_id)}
                      className="shrink-0 text-primario hover:underline"
                    >
                      Agregar
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3 rounded-lg border border-linea bg-white p-4">
        <div>
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

        <div>
          <label htmlFor="metodoPago" className="block text-sm font-medium text-ink">
            Método de pago
          </label>
          <select
            id="metodoPago"
            value={metodoPago}
            onChange={(e) => setMetodoPago(e.target.value)}
            className="mt-1 w-full rounded-md border border-linea px-3 py-2 text-ink focus:border-primario focus:outline-none"
          >
            <option value="efectivo">Efectivo</option>
            <option value="transferencia">Transferencia</option>
            <option value="credito">Crédito</option>
          </select>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="button"
          onClick={cobrar}
          disabled={isLoading}
          className="w-full rounded-md bg-primario px-4 py-2 font-medium text-white transition hover:opacity-90 disabled:opacity-50"
        >
          {isLoading ? "Cobrando..." : "Cobrar"}
        </button>
      </div>
    </div>
  );
}
