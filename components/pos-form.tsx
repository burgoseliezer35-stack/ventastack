"use client";

import { imgUrl } from "@/lib/img-proxy";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState, useRef, type KeyboardEvent } from "react";
import { Mic, ShoppingCart, Trash2, Lightbulb, ScanLine, Camera } from "lucide-react";
import { useSpeechRecognition, interpretarPedidoVoz } from "@/lib/speech-recognition";
import { EscanerCamara } from "@/components/escaner-camara";

type NivelMayoreo = { cantidad_minima: number; precio_unitario: number };
type Producto = {
  id: string;
  nombre: string;
  precio: number;
  stock: number;
  codigo_barras: string | null;
  imagen_url: string | null;
  niveles: NivelMayoreo[];
  ieps_porcentaje: number;
  iva_porcentaje: number;
  unidad_medida: string;
  step_cantidad: number;
};
type Cliente = { id: string; nombre: string; direccion?: string | null; ciudad?: string | null };
type ItemCarrito = {
  producto_id: string;
  nombre: string;
  precio_unitario: number;
  cantidad: number;
  stock_disponible: number;
  ieps_porcentaje: number;
  iva_porcentaje: number;
  unidad_medida: string;
  step_cantidad: number;
};

// Los niveles ya vienen ordenados de mayor a menor cantidad_minima
// desde la página — aquí solo tomamos el primero que SÍ alcance.
function precioParaCantidad(producto: Producto, cantidad: number): number {
  const nivel = producto.niveles.find((n) => cantidad >= n.cantidad_minima);
  return nivel ? nivel.precio_unitario : producto.precio;
}

import { useOfflineMode } from "@/lib/offline-mode";

export function PosForm({
  productos,
  clientes,
  geminiDisponible,
  ivaIncluido = true,
  companyId = "",
  esDistribuidor = false,
  repartidores = [],
}: {
  productos: Producto[];
  clientes: Cliente[];
  geminiDisponible: boolean;
  ivaIncluido?: boolean;
  companyId?: string;
  esDistribuidor?: boolean;
  repartidores?: { id: string; full_name: string }[];
}) {
  const [carrito, setCarritoRaw] = useState<ItemCarrito[]>(() => {
    // Al montar, intentamos recuperar el carrito de esta sesión —
    // así si el cajero cambia de pantalla y regresa, no pierde lo
    // que estaba armando.
    if (typeof window === "undefined") return [];
    try {
      const guardado = sessionStorage.getItem("ventastack_carrito");
      return guardado ? (JSON.parse(guardado) as ItemCarrito[]) : [];
    } catch {
      return [];
    }
  });

  const setCarrito = (fn: ItemCarrito[] | ((prev: ItemCarrito[]) => ItemCarrito[])) => {
    setCarritoRaw((prev) => {
      const siguiente = typeof fn === "function" ? fn(prev) : fn;
      try {
        sessionStorage.setItem("ventastack_carrito", JSON.stringify(siguiente));
      } catch { /* no pasa nada */ }
      return siguiente;
    });
  };
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
  // Módulo de reparto — solo visible si esDistribuidor
  const [esDomicilio, setEsDomicilio] = useState(false);
  const [repartidorId, setRepartidorId] = useState("");
  const [direccionEntrega, setDireccionEntrega] = useState("");
  const [grabando, setGrabando] = useState(false);
  const [procesandoVoz, setProcesandoVoz] = useState(false);
  const [procesandoUpsell, setProcesandoUpsell] = useState(false);
  const [sugerencias, setSugerencias] = useState<
    { producto_id: string; nombre: string; razon: string }[]
  >([]);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const fragmentosRef = useRef<Blob[]>([]);
  const router = useRouter();
  const [camaraAbierta, setCamaraAbierta] = useState(false);
  const supabase = createClient();
  const { online, sincronizando, pendientes, guardarOffline } = useOfflineMode(companyId);
  const { disponible: vozOfflineDisponible, estado: estadoVoz, error: errorVoz, escuchar } = useSpeechRecognition();

  const agregarProductoAlCarrito = (
    producto: Producto,
    cantidadAAgregar?: number,
  ) => {
    setError(null);

    // Si el que llama no pasó una cantidad explícita (típico: tap a
    // la tarjeta del producto), usamos el step del producto. Así una
    // pieza suma 1 y un kg suma 0.1 con un solo tap, sin que el
    // cajero tenga que abrir el input.
    const suma = cantidadAAgregar ?? (producto.step_cantidad ?? 1);

    setCarrito((prev) => {
      const existente = prev.find((i) => i.producto_id === producto.id);
      const cantidadActual = existente?.cantidad ?? 0;
      const nuevaCantidad = cantidadActual + suma;

      if (nuevaCantidad > producto.stock) {
        setError(`Solo quedan ${producto.stock} ${producto.unidad_medida ?? ''} de "${producto.nombre}"`);
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
          cantidad: suma,
          stock_disponible: producto.stock,
          ieps_porcentaje: producto.ieps_porcentaje ?? 0,
          iva_porcentaje: producto.iva_porcentaje ?? 16,
          unidad_medida: producto.unidad_medida ?? 'pieza',
          step_cantidad: producto.step_cantidad ?? 1,
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

    // Siempre selecciona el producto en el selector para mostrarlo
    setProductoSeleccionado(producto.id);
    setCodigoBarras("");

    // Solo agrega al carrito si tiene stock
    if (producto.stock > 0) {
      agregarProductoAlCarrito(producto);
    } else {
      setError(`"${producto.nombre}" no tiene stock — recíbelo primero en Compras`);
    }
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
    const item = carrito.find((i) => i.producto_id === productoId);
    if (item) {
      // Registrar en auditoría (fire and forget)
      void (async () => {
        try {
          await createClient().rpc("registrar_auditoria", {
            p_accion: "borrar_item_carrito",
            p_detalle: {
              producto_id: productoId,
              nombre: item.nombre,
              cantidad: item.cantidad,
              precio_unitario: item.precio_unitario,
              subtotal: item.precio_unitario * item.cantidad,
            },
          });
        } catch { /* silencioso */ }
      })();
    }
    setCarrito((prev) => prev.filter((i) => i.producto_id !== productoId));
  };

  const subtotal = carrito.reduce(
    (suma, i) => suma + i.precio_unitario * i.cantidad,
    0,
  );

  // Cálculo de impuestos POR PRODUCTO — orden correcto SAT México
  // Base → IEPS → IVA sobre (Base + IEPS)
  const r2 = (n: number) => Math.round(n * 100) / 100;

  // Calcular base, IEPS e IVA para cada item del carrito
  const itemsConImpuestos = carrito.map((item) => {
    const precioLinea = item.precio_unitario * item.cantidad;
    const iepsPct = item.ieps_porcentaje ?? 0;
    const ivaPct = item.iva_porcentaje ?? 16;

    let base = 0;
    let mIeps = 0;
    let mIva = 0;

    if (ivaIncluido) {
      // Precio ya incluye impuestos — extraer base
      const factor = 1 + (iepsPct/100) + (ivaPct/100) + (iepsPct/100)*(ivaPct/100);
      base = r2(precioLinea / factor);
      mIeps = r2(base * (iepsPct/100));
      mIva  = r2((base + mIeps) * (ivaPct/100));
    } else {
      // Precio es base sin impuestos
      base  = precioLinea;
      mIeps = r2(base * (iepsPct/100));
      mIva  = r2((base + mIeps) * (ivaPct/100));
    }

    return { ...item, base, mIeps, mIva, iepsPct, ivaPct };
  });

  const baseGravable = r2(itemsConImpuestos.reduce((s, i) => s + i.base, 0));
  const montoIepsPOS = r2(itemsConImpuestos.reduce((s, i) => s + i.mIeps, 0));
  const montoIva     = r2(itemsConImpuestos.reduce((s, i) => s + i.mIva, 0));
  const total = ivaIncluido
    ? r2(subtotal)
    : r2(baseGravable + montoIepsPOS + montoIva);

  // Agrupar por tasa para mostrar en el desglose del ticket (como Aurrera)
  const desglosePorTasa = itemsConImpuestos.reduce((acc, i) => {
    // IVA
    const keyIva = `iva_${i.ivaPct}`;
    if (!acc[keyIva]) acc[keyIva] = { tipo: "IVA", pct: i.ivaPct, base: 0, monto: 0 };
    acc[keyIva].base  = r2(acc[keyIva].base + i.base);
    acc[keyIva].monto = r2(acc[keyIva].monto + i.mIva);
    // IEPS
    if (i.iepsPct > 0) {
      const keyIeps = `ieps_${i.iepsPct}`;
      if (!acc[keyIeps]) acc[keyIeps] = { tipo: "IEPS", pct: i.iepsPct, base: 0, monto: 0 };
      acc[keyIeps].base  = r2(acc[keyIeps].base + i.base);
      acc[keyIeps].monto = r2(acc[keyIeps].monto + i.mIeps);
    }
    return acc;
  }, {} as Record<string, { tipo: string; pct: number; base: number; monto: number }>);

  // Solo tiene sentido cuando el cajero de verdad escribió un
  // monto — si lo deja vacío, no mostramos ni bloqueamos nada (a
  // veces el pago es exacto y no hace falta calcular nada).
  const cambio =
    metodoPago === "efectivo" && efectivoRecibido !== ""
      ? r2(Number(efectivoRecibido) - total)
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

    // Sin internet — guardar en cola local y continuar
    if (!online) {
      try {
        const efectivoNum = efectivoRecibido !== "" ? Number(efectivoRecibido) : null;
        const cambioNum = cambio !== null && cambio >= 0 ? cambio : null;
        await guardarOffline(
          carrito.map((i) => ({
            producto_id: i.producto_id,
            nombre: i.nombre,
            cantidad: i.cantidad,
            precio_unitario: i.precio_unitario,
          })),
          clienteId || null,
          metodoPago,
          total,
          efectivoNum,
          cambioNum
        );
        setIsLoading(false);
        setCarrito([]);
        try { sessionStorage.removeItem("ventastack_carrito"); } catch { /* ok */ }
        setAviso(`Venta guardada sin internet ($${total.toLocaleString("en-US", { minimumFractionDigits: 2 })}). Se registrará cuando vuelva la conexión.`);
      } catch (err) {
        setIsLoading(false);
        setError(err instanceof Error ? err.message : "No se pudo guardar la venta offline. Intenta de nuevo.");
      }
      return;
    }

    const efectivoNum = efectivoRecibido !== "" ? Number(efectivoRecibido) : null;
    const cambioNum = cambio !== null && cambio >= 0 ? cambio : null;

    const { data: pedidoId, error: rpcError } = await supabase.rpc(
      "crear_pedido_con_detalle",
      {
        p_cliente_id: clienteId || null,
        p_origen: "pos",
        p_metodo_pago: metodoPago,
        p_efectivo_recibido: efectivoNum,
        p_cambio: cambioNum,
        p_total: total,
        p_es_domicilio: esDomicilio,
        p_repartidor_id: esDomicilio && repartidorId ? repartidorId : null,
        p_direccion_entrega: esDomicilio && direccionEntrega ? direccionEntrega : null,
        p_items: carrito.map((i) => ({
          producto_id: i.producto_id,
          cantidad: i.cantidad,
          precio_unitario: i.precio_unitario,
        })),
      },
    );

    setIsLoading(false);

    if (rpcError) {
      setError(rpcError.message);
      return;
    }

    fetch("/api/verificar-stock-bajo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productoIds: carrito.map((i) => i.producto_id) }),
    }).catch(() => {});

    try { sessionStorage.removeItem("ventastack_carrito"); } catch { /* ok */ }
    router.push(`/protected/pos/recibo/${pedidoId}`);
  };

  return (
    <div className="flex w-full max-w-5xl flex-col gap-4">
      {/* Banner de estado de conexión */}
      {!online && (
        <div className="flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-300 px-4 py-2.5">
          <span className="text-amber-600 font-medium text-sm">📵 Sin internet</span>
          <span className="text-amber-700 text-xs">— Las ventas se guardan y se sincronizan cuando vuelva la conexión.</span>
        </div>
      )}
      {online && pendientes > 0 && (
        <div className="flex items-center justify-between rounded-lg bg-primario-suave border border-primario/30 px-4 py-2.5">
          <span className="text-primario text-sm font-medium">
            {sincronizando ? "⏳ Sincronizando ventas offline..." : `✓ Conexión restaurada — ${pendientes} venta${pendientes > 1 ? "s" : ""} pendiente${pendientes > 1 ? "s" : ""} de sincronizar`}
          </span>
        </div>
      )}
      {camaraAbierta && (
        <EscanerCamara
          onEscaneo={(codigo) => {
            const producto = productos.find((p) => p.codigo_barras === codigo);
            if (producto) {
              setProductoSeleccionado(producto.id);
              if (producto.stock > 0) agregarProductoAlCarrito(producto);
              else setError(`"${producto.nombre}" sin stock — recíbelo primero`);
            } else {
              setError(`Sin producto registrado para "${codigo}"`);
            }
            setCamaraAbierta(false);
          }}
          onCerrar={() => setCamaraAbierta(false)}
        />
      )}
      {/* Barra superior: código de barras, selector de producto, voz */}
      <div className="flex flex-col gap-3 rounded-xl border border-linea bg-white p-4 shadow-sm sm:flex-row sm:items-end">
        <div className="flex-1">
          <label htmlFor="codigoBarras" className="mb-1 block text-xs font-medium uppercase tracking-wide text-ink/50">
            Código de barras
          </label>
          <div className="flex gap-2">
            <div className="flex flex-1 items-center gap-2 rounded-md border border-linea px-3 focus-within:border-primario">
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
            <button
              type="button"
              onClick={() => setCamaraAbierta(true)}
              className="flex items-center justify-center rounded-md border border-linea bg-paper px-3 hover:bg-primario-suave hover:border-primario transition-colors"
              title="Usar cámara del celular"
            >
              <Camera size={18} className="text-primario" />
            </button>
          </div>
        </div>

        <div className="flex flex-[2] gap-2 flex-wrap sm:flex-nowrap">
          <div className="flex flex-1 flex-col gap-1 min-w-[180px]">
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
                  {p.nombre} — ${p.precio.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}{" "}
                  {p.stock <= 0 ? "(sin stock)" : `(${p.stock})`}
                  {p.niveles.length > 0 ? " · mayoreo" : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Vista previa elegante del producto seleccionado */}
          {(() => {
            const p = productos.find((x) => x.id === productoSeleccionado);
            if (!p) return null;
            return (
              <div className="flex flex-col items-center gap-1.5 rounded-xl border border-linea bg-white p-3 shadow-sm w-28 shrink-0 text-center">
                <div className="h-16 w-16 rounded-xl border border-linea bg-paper overflow-hidden flex items-center justify-center shadow-inner">
                  {p.imagen_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={imgUrl(p.imagen_url) ?? ""} alt={p.nombre} className="h-full w-full object-contain" />
                  ) : (
                    <span className="text-3xl">📦</span>
                  )}
                </div>
                <p className="text-[10px] font-semibold text-ink leading-tight line-clamp-2">{p.nombre}</p>
                <p className="text-sm font-bold text-primario cifra">${p.precio.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}</p>
                <p className="text-[9px] text-ink/40">{p.stock} disp.</p>
              </div>
            );
          })()}

          <button
            type="button"
            onClick={agregarAlCarrito}
            className="rounded-md bg-primario px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 shrink-0 self-end"
          >
            Agregar
          </button>
        </div>

        {/* Botón de voz — offline primero, Gemini como fallback */}
        {(vozOfflineDisponible || geminiDisponible) && (
          <button
            type="button"
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              if (vozOfflineDisponible) {
                setError(null);
                setAviso(null);
                escuchar().then((resultado) => {
                  if (!resultado) return;
                  const items = interpretarPedidoVoz(resultado.texto, productos);
                  if (items.length === 0) {
                    setError(`No entendí ningún producto en: "${resultado.texto}"`);
                    return;
                  }
                  const agregados: string[] = [];
                  for (const item of items) {
                    const producto = productos.find((p) => p.id === item.productoId);
                    if (producto) {
                      agregarProductoAlCarrito(producto, item.cantidad);
                      agregados.push(`${item.cantidad}× ${producto.nombre}`);
                    }
                  }
                  setAviso(`Agregado: ${agregados.join(", ")}`);
                });
              } else {
                iniciarGrabacion();
              }
            }}
            onPointerUp={() => {
              if (!vozOfflineDisponible) detenerGrabacion();
            }}
            onPointerLeave={() => {
              if (!vozOfflineDisponible) detenerGrabacion();
            }}
            disabled={procesandoVoz || estadoVoz === "procesando"}
            className={`flex items-center justify-center gap-2 rounded-md px-4 py-3 text-sm font-medium text-white transition select-none disabled:opacity-50 ${
              estadoVoz === "escuchando" || grabando
                ? "bg-red-600 scale-95"
                : "bg-primario hover:opacity-90 active:scale-95"
            }`}
            style={{ touchAction: "none" }}
          >
            <Mic size={15} />
            {procesandoVoz || estadoVoz === "procesando"
              ? "Procesando..."
              : estadoVoz === "escuchando" || grabando
              ? "🔴 Escuchando..."
              : vozOfflineDisponible
              ? "Hablar pedido"
              : "Mantén para hablar"}
          </button>
        )}
        {errorVoz && <p className="text-xs text-red-500 mt-1">{errorVoz}</p>}
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
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min={item.step_cantidad}
                          max={item.stock_disponible}
                          step={item.step_cantidad}
                          value={item.cantidad}
                          onChange={(e) =>
                            cambiarCantidad(item.producto_id, Number(e.target.value))
                          }
                          className="w-20 rounded-md border border-linea px-2 py-1 text-center"
                        />
                        {/* Mostrar la unidad solo si no es pieza — para
                            piezas se sobreentiende y ocuparía espacio. */}
                        {item.unidad_medida !== 'pieza' && (
                          <span className="text-xs text-ink/50">{item.unidad_medida}</span>
                        )}
                      </div>
                    </td>
                    <td className="cifra px-4 py-2.5 text-right text-ink/70">
                      ${item.precio_unitario.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}
                    </td>
                    <td className="cifra px-4 py-2.5 text-right font-medium text-ink">
                      ${(item.precio_unitario * item.cantidad).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}
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
            <p className="cifra text-3xl font-bold">${total.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}</p>
            {(montoIva > 0 || Object.values(desglosePorTasa).some(t => t.monto > 0)) && (
              <div className="mt-1 text-xs text-white/70 space-y-0.5">
                <div className="flex justify-between">
                  <span>Subtotal{ivaIncluido ? " (IVA incl.)" : ""}:</span>
                  <span className="cifra">${baseGravable.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}</span>
                </div>
                {montoIva > 0 && (
                <div className="flex justify-between">
                  <span>IVA:</span>
                  <span className="cifra">${montoIva.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}</span>
                </div>
                )}
                {/* Desglose por tasa — como Aurrera */}
                {Object.values(desglosePorTasa)
                  .filter(t => t.tipo === "IEPS" && t.monto > 0)
                  .map(t => (
                    <div key={`ieps_${t.pct}`} className="flex justify-between">
                      <span>IEPS {t.pct}%:</span>
                      <span className="cifra">${t.monto.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}</span>
                    </div>
                  ))
                }
              </div>
            )}
          </div>

          <div>
            <label htmlFor="cliente" className="mb-1 block text-xs font-medium text-white/80">
              Cliente
            </label>
            <select
              id="cliente"
              value={clienteId}
              onChange={(e) => {
                const id = e.target.value;
                setClienteId(id);
                // Si está en modo domicilio, precargar la dirección del cliente
                if (esDomicilio && id) {
                  const c = clientes.find(x => x.id === id);
                  if (c?.direccion) {
                    const dir = [c.direccion, c.ciudad].filter(Boolean).join(", ");
                    setDireccionEntrega(dir);
                  }
                }
              }}
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

          {/* Toggle de envío a domicilio — solo para empresas distribuidoras */}
          {esDistribuidor && (
            <div className="flex flex-col gap-2">
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-xs font-medium text-white/80">Envío a domicilio</span>
                <button
                  type="button"
                  onClick={() => {
                    const nuevoEstado = !esDomicilio;
                    setEsDomicilio(nuevoEstado);
                    setRepartidorId("");
                    if (nuevoEstado && clienteId) {
                      const c = clientes.find(x => x.id === clienteId);
                      if (c?.direccion) {
                        const dir = [c.direccion, c.ciudad].filter(Boolean).join(", ");
                        setDireccionEntrega(dir);
                      } else {
                        setDireccionEntrega("");
                      }
                    } else {
                      setDireccionEntrega("");
                    }
                  }}
                  className={`relative inline-flex h-5 w-9 rounded-full transition-colors ${esDomicilio ? "bg-white" : "bg-white/20"}`}
                >
                  <span className={`inline-block h-4 w-4 rounded-full bg-primario shadow transition-transform mt-0.5 ${esDomicilio ? "translate-x-4 ml-0.5" : "translate-x-0.5"}`} />
                </button>
              </label>
              {esDomicilio && (
                <>
                  <select
                    value={repartidorId}
                    onChange={e => setRepartidorId(e.target.value)}
                    className="w-full rounded-md border border-white/20 bg-white/10 px-3 py-2 text-sm text-white outline-none [&>option]:text-ink"
                  >
                    <option value="">— Seleccionar repartidor —</option>
                    {repartidores.map(r => (
                      <option key={r.id} value={r.id}>{r.full_name}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={direccionEntrega}
                    onChange={e => setDireccionEntrega(e.target.value)}
                    placeholder="Dirección de entrega"
                    className="w-full rounded-md border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/40 outline-none"
                  />
                </>
              )}
            </div>
          )}

          <div>
            <label htmlFor="metodoPago" className="mb-1 block text-xs font-medium text-white/80">
              Método de pago
            </label>
            {/* Botones de método de pago */}
            <div className="grid grid-cols-2 gap-2">
              {[
                { val: "efectivo", label: "Efectivo" },
                { val: "tarjeta", label: "Tarjeta" },
                { val: "transferencia", label: "Transferencia" },
                { val: "credito", label: "Crédito" },
              ].map(({ val, label }) => {
                // Crédito necesita validar el límite del cliente en
                // el servidor — sin internet no hay forma de saber
                // si ya está bloqueado, así que se deshabilita.
                const deshabilitado = val === "credito" && !online;
                return (
                  <button
                    key={val}
                    type="button"
                    disabled={deshabilitado}
                    title={deshabilitado ? "Crédito necesita internet" : undefined}
                    onClick={() => { setMetodoPago(val); setEfectivoRecibido(""); }}
                    className={`rounded-lg py-2 text-sm font-semibold transition border ${
                      deshabilitado
                        ? "bg-white/5 text-white/40 border-white/10 cursor-not-allowed"
                        : metodoPago === val
                        ? "bg-white text-primario border-white"
                        : "bg-white/10 text-white border-white/20 hover:bg-white/20"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Efectivo — cuánto paga y cambio */}
          {metodoPago === "efectivo" && (
            <div className="flex flex-col gap-2">
              <label className="text-xs font-medium text-white/80">Efectivo recibido</label>
              {/* Botones rápidos de billetes */}
              <div className="grid grid-cols-4 gap-1.5">
                {[50, 100, 200, 500].map((billete) => (
                  <button key={billete} type="button"
                    onClick={() => setEfectivoRecibido(String(billete))}
                    className={`rounded-md py-1.5 text-xs font-bold border transition ${
                      Number(efectivoRecibido) === billete
                        ? "bg-white text-primario border-white"
                        : "bg-white/10 text-white border-white/20 hover:bg-white/20"
                    }`}>
                    ${billete}
                  </button>
                ))}
              </div>
              <input
                type="text"
                inputMode="decimal"
                value={efectivoRecibido}
                onChange={(e) => {
                  // Solo permitir números y punto decimal
                  const val = e.target.value.replace(/[^0-9.]/g, "");
                  setEfectivoRecibido(val);
                }}
                placeholder={total > 0 ? `$${total.toLocaleString("en-US", { minimumFractionDigits: 2 })}` : "$0.00"}
                className="w-full rounded-md border border-white/20 bg-white/10 px-3 py-2 text-lg font-bold text-white outline-none placeholder:text-white/40"
              />
              {cambio !== null && (
                <div className={`rounded-xl px-4 py-4 ${faltaEfectivo ? "bg-red-500/40" : "bg-white/25"}`}>
                  <p className="text-xs font-semibold uppercase tracking-wide text-white/70 mb-1">
                    {faltaEfectivo ? "Falta cobrar" : "Cambio al cliente"}
                  </p>
                  <p className={`cifra text-3xl font-bold tracking-tight ${faltaEfectivo ? "text-red-200" : "text-white"}`}>
                    ${Math.abs(cambio).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                  {!faltaEfectivo && Number(efectivoRecibido) > 0 && (
                    <p className="text-xs text-white/60 mt-1">
                      Recibido: ${Number(efectivoRecibido).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Tarjeta — solo confirmación */}
          {metodoPago === "tarjeta" && (
            <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-center">
              <p className="text-sm font-semibold text-white">Pago con tarjeta</p>
              <p className="text-xs text-white/60 mt-0.5">
                Cobra ${total.toLocaleString("en-US", { minimumFractionDigits: 2 })} en tu terminal y confirma aquí
              </p>
            </div>
          )}

          {/* Transferencia */}
          {metodoPago === "transferencia" && (
            <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-center">
              <p className="text-sm font-semibold text-white">Transferencia / OXXO Pay</p>
              <p className="text-xs text-white/60 mt-0.5">Confirma que recibiste el pago antes de cobrar</p>
            </div>
          )}

          {/* Crédito */}
          {metodoPago === "credito" && (
            <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-center">
              <p className="text-sm font-semibold text-white">Venta a crédito</p>
              <p className="text-xs text-white/60 mt-0.5">Se registra como cuenta por cobrar</p>
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
