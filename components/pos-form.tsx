"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState, useRef, type KeyboardEvent } from "react";
import { Mic, ShoppingCart, Trash2, Lightbulb, ScanLine } from "lucide-react";

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
  const [efectivoRecibido, setEfectivoRecibido] = useState("");
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

  // Solo tiene sentido cuando el cajero de verdad escribió un
  // monto — si lo deja vacío, no mostramos ni bloqueamos nada (a
  // veces el pago es exacto y no hace falta calcular nada).
  const cambio =
    metodoPago === "efectivo" && efectivoRecibido !== ""
      ? Number(efectivoRecibido) - total
      : null;
  const faltaEfectivo = cambio !== null && cambio < 0;

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
    if (faltaEfectivo) {
      setError("El efectivo recibido es menor que el total");
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
    <div className="flex w-full max-w-5xl flex-col gap-4">
      {/* Barra superior: código de barras, selector de producto, voz */}
      <div className="flex flex-col gap-3 rounded-xl border border-linea bg-white p-4 shadow-sm sm:flex-row sm:items-end">
        <div className="flex-1">
          <label htmlFor="codigoBarras" className="mb-1 block text-xs font-medium uppercase tracking-wide text-ink/50">
            Código de barras
          </label>
          <div className="flex items-center gap-2 rounded-md border border-linea px-3 focus-within:border-primario">
            <ScanLine size={16} className="text-ink/40" />
            <input
              id="codigoBarras"
              type="text"
              value={codigoBarras}
              onChange={(e) => setCodigoBarras(e.target.value)}
              onKeyDown={buscarPorCodigoBarras}
              placeholder="Escanea o escribe y presiona Enter"
              className="w-full py-2 text-sm text-ink outline-none"
            />
          </div>
        </div>

        <div className="flex flex-[2] gap-2">
          <div className="flex flex-1 flex-col gap-1">
            <input
              type="text"
              placeholder="Filtrar productos..."
              onChange={(e) => {
                const texto = e.target.value.toLowerCase();
                const opts = document.querySelectorAll<HTMLOptionElement>("#productoSelect option");
                opts.forEach((opt) => {
                  opt.style.display = !texto || opt.text.toLowerCase().includes(texto) ? "" : "none";
                });
              }}
              className="rounded-md border border-linea px-3 py-2 text-sm text-ink focus:border-primario focus:outline-none"
            />
            <select
              id="productoSelect"
              value={productoSeleccionado}
              onChange={(e) => setProductoSeleccionado(e.target.value)}
              className="flex-1 rounded-md border border-linea px-3 py-2 text-sm text-ink focus:border-primario focus:outline-none"
              size={3}
            >
              {productos.map((p) => (
                <option key={p.id} value={p.id} disabled={p.stock <= 0}>
                  {p.nombre} — ${p.precio.toFixed(2)}{" "}
                  {p.stock <= 0 ? "(sin stock)" : `(${p.stock})`}
                  {p.niveles.length > 0 ? " · mayoreo" : ""}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={agregarAlCarrito}
            className="rounded-md bg-primario px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
          >
            Agregar
          </button>
        </div>

        {geminiDisponible && (
          <button
            type="button"
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              iniciarGrabacion();
            }}
            onPointerUp={detenerGrabacion}
            onPointerLeave={detenerGrabacion}
            disabled={procesandoVoz}
            className={`flex items-center justify-center gap-2 rounded-md px-4 py-3 text-sm font-medium text-white transition select-none disabled:opacity-50 ${
              grabando
                ? "bg-red-600 scale-95"
                : "bg-primario hover:opacity-90 active:scale-95"
            }`}
            style={{ touchAction: "none" }}
          >
            <Mic size={15} />
            {procesandoVoz
              ? "Entendiendo..."
              : grabando
              ? "🔴 Grabando..."
              : "Mantén para hablar"}
          </button>
        )}
      </div>

      {aviso && (
        <p className="rounded-md bg-verde-suave px-3 py-2 text-sm text-verde">{aviso}</p>
      )}

      <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
        {/* Columna del carrito */}
        <div className="overflow-hidden rounded-xl border border-linea bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-linea bg-primario-suave px-4 py-3">
            <h2 className="flex items-center gap-2 font-semibold text-ink">
              <ShoppingCart size={18} className="text-primario" />
              Carrito
            </h2>
            <span className="text-xs text-ink/50">
              {carrito.length} producto{carrito.length === 1 ? "" : "s"}
            </span>
          </div>

          {carrito.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-ink/40">
              Agrega productos para empezar una venta
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-primario text-left text-xs font-semibold uppercase tracking-wide text-white">
                  <th className="px-4 py-2.5">Producto</th>
                  <th className="px-4 py-2.5">Cant.</th>
                  <th className="px-4 py-2.5 text-right">Precio</th>
                  <th className="px-4 py-2.5 text-right">Subtotal</th>
                  <th className="px-4 py-2.5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-linea">
                {carrito.map((item, idx) => (
                  <tr key={item.producto_id} className={idx % 2 === 1 ? "bg-paper/60" : ""}>
                    <td className="px-4 py-2.5 text-ink">{item.nombre}</td>
                    <td className="px-4 py-2.5">
                      <input
                        type="number"
                        min={1}
                        max={item.stock_disponible}
                        value={item.cantidad}
                        onChange={(e) =>
                          cambiarCantidad(item.producto_id, Number(e.target.value))
                        }
                        className="w-16 rounded-md border border-linea px-2 py-1 text-center"
                      />
                    </td>
                    <td className="cifra px-4 py-2.5 text-right text-ink/70">
                      ${item.precio_unitario.toFixed(2)}
                    </td>
                    <td className="cifra px-4 py-2.5 text-right font-medium text-ink">
                      ${(item.precio_unitario * item.cantidad).toFixed(2)}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <button
                        type="button"
                        onClick={() => quitarDelCarrito(item.producto_id)}
                        className="text-red-500 hover:text-red-700"
                        aria-label={`Quitar ${item.nombre}`}
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {geminiDisponible && carrito.length > 0 && (
            <div className="border-t border-linea px-4 py-3">
              <button
                type="button"
                onClick={pedirSugerencias}
                disabled={procesandoUpsell}
                className="flex items-center gap-1.5 text-xs font-medium text-primario hover:underline disabled:opacity-50"
              >
                <Lightbulb size={14} />
                {procesandoUpsell ? "Pensando..." : "Sugerir algo más"}
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
                        className="shrink-0 font-medium text-primario hover:underline"
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

        {/* Columna de cobro */}
        <div className="flex h-fit flex-col gap-4 rounded-xl bg-primario p-5 text-white shadow-sm">
          <div>
            <p className="text-xs uppercase tracking-wide text-white/70">Total a cobrar</p>
            <p className="cifra text-3xl font-bold">${total.toFixed(2)}</p>
          </div>

          <div>
            <label htmlFor="cliente" className="mb-1 block text-xs font-medium text-white/80">
              Cliente
            </label>
            <select
              id="cliente"
              value={clienteId}
              onChange={(e) => setClienteId(e.target.value)}
              className="w-full rounded-md border border-white/20 bg-white/10 px-3 py-2 text-sm text-white outline-none [&>option]:text-ink"
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
            <label htmlFor="metodoPago" className="mb-1 block text-xs font-medium text-white/80">
              Método de pago
            </label>
            <select
              id="metodoPago"
              value={metodoPago}
              onChange={(e) => {
                setMetodoPago(e.target.value);
                setEfectivoRecibido("");
              }}
              className="w-full rounded-md border border-white/20 bg-white/10 px-3 py-2 text-sm text-white outline-none [&>option]:text-ink"
            >
              <option value="efectivo">Efectivo</option>
              <option value="transferencia">Transferencia</option>
              <option value="credito">Crédito</option>
            </select>
          </div>

          {metodoPago === "efectivo" && (
            <div>
              <label htmlFor="efectivoRecibido" className="mb-1 block text-xs font-medium text-white/80">
                Efectivo recibido
              </label>
              <input
                id="efectivoRecibido"
                type="number"
                min={0}
                step="0.01"
                value={efectivoRecibido}
                onChange={(e) => setEfectivoRecibido(e.target.value)}
                placeholder={total > 0 ? total.toFixed(2) : "0.00"}
                className="w-full rounded-md border border-white/20 bg-white/10 px-3 py-2 text-sm text-white outline-none placeholder:text-white/40"
              />
              {cambio !== null && (
                <div
                  className={`mt-2 flex justify-between rounded-md px-3 py-2 text-sm ${
                    faltaEfectivo ? "bg-red-500/30" : "bg-white/15"
                  }`}
                >
                  <span>{faltaEfectivo ? "Falta" : "Cambio"}</span>
                  <span className="cifra font-bold">
                    ${Math.abs(cambio).toFixed(2)}
                  </span>
                </div>
              )}
            </div>
          )}

          {error && (
            <p className="rounded-md bg-red-500/20 px-3 py-2 text-sm text-white">{error}</p>
          )}

          <button
            type="button"
            onClick={cobrar}
            disabled={isLoading || faltaEfectivo}
            className="w-full rounded-md bg-white py-3 font-semibold text-primario transition hover:opacity-90 disabled:opacity-50"
          >
            {isLoading ? "Cobrando..." : "Cobrar"}
          </button>
        </div>
      </div>
    </div>
  );
}
