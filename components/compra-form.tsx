"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState, useRef } from "react";
import { EscanerCamara } from "@/components/escaner-camara";
import { ScanLine, Plus, Trash2, AlertTriangle, CheckCircle } from "lucide-react";

type Proveedor = { id: string; nombre: string };
type Producto = { id: string; nombre: string; costo: number; ieps_porcentaje?: number };

type ItemCompra = {
  producto_id: string;
  nombre: string;
  cantidad: number;
  precio_ticket: number;   // lo que dice el ticket del proveedor
  ieps_porcentaje: number;
  iva_porcentaje: number;
  // Calculados
  base: number;
  monto_ieps: number;
  monto_iva: number;
  subtotal_con_impuestos: number;
};

const r2 = (n: number) => Math.round(n * 100) / 100;

function calcularDesglose(
  precio_ticket: number,
  ieps_pct: number,
  iva_pct: number,
  impuestos_incluidos: boolean
): { base: number; monto_ieps: number; monto_iva: number } {
  if (impuestos_incluidos) {
    // Ingeniería inversa — extraer base del precio con impuestos
    const factor = 1 + (ieps_pct / 100) + (iva_pct / 100) + (ieps_pct / 100) * (iva_pct / 100);
    const base = r2(precio_ticket / factor);
    const monto_ieps = r2(base * (ieps_pct / 100));
    const monto_iva = r2((base + monto_ieps) * (iva_pct / 100));
    return { base, monto_ieps, monto_iva };
  } else {
    // El precio ES la base — calcular impuestos hacia adelante
    const base = precio_ticket;
    const monto_ieps = r2(base * (ieps_pct / 100));
    const monto_iva = r2((base + monto_ieps) * (iva_pct / 100));
    return { base, monto_ieps, monto_iva };
  }
}

export function CompraForm({
  proveedores,
  productos,
  ivaEmpresa = 16,
  iepsEmpresa = 0,
  iepsHabilitado = false,
}: {
  proveedores: Proveedor[];
  productos: Producto[];
  ivaEmpresa?: number;
  iepsEmpresa?: number;
  iepsHabilitado?: boolean;
}) {
  const [proveedorId, setProveedorId] = useState(proveedores[0]?.id ?? "");
  const [folioProveedor, setFolioProveedor] = useState("");
  const [fechaTicket, setFechaTicket] = useState(new Date().toISOString().split("T")[0]);
  const [totalTicket, setTotalTicket] = useState("");
  const [impuestosIncluidos, setImpuestosIncluidos] = useState(true);
  const [nota, setNota] = useState("");

  // Línea actual
  const [busqueda, setBusqueda] = useState("");
  const [productoSeleccionado, setProductoSeleccionado] = useState<Producto | null>(null);
  const [cantidad, setCantidad] = useState("1");
  const [precioTicket, setPrecioTicket] = useState("");
  const [iepsPct, setIepsPct] = useState(iepsHabilitado ? String(iepsEmpresa) : "0");
  const [ivaPct, setIvaPct] = useState(String(ivaEmpresa));

  const [carrito, setCarrito] = useState<ItemCompra[]>([]);
  const [escanerAbierto, setEscanerAbierto] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const router = useRouter();

  const productosFiltrados = productos.filter((p) =>
    p.nombre.toLowerCase().includes(busqueda.toLowerCase())
  );

  const seleccionarProducto = (p: Producto) => {
    setProductoSeleccionado(p);
    setBusqueda(p.nombre);
    // Pre-llenar IEPS del producto si tiene
    if (p.ieps_porcentaje !== undefined) setIepsPct(String(p.ieps_porcentaje));
  };

  const manejarEscaneo = (codigo: string) => {
    setBusqueda(codigo);
    setEscanerAbierto(false);
  };

  // Desglose de la línea actual
  const precio = Number(precioTicket) || 0;
  const cant = Number(cantidad) || 0;
  const desglose = precio > 0
    ? calcularDesglose(precio, Number(iepsPct), Number(ivaPct), impuestosIncluidos)
    : null;

  const agregarLinea = () => {
    if (!productoSeleccionado) { setError("Selecciona un producto"); return; }
    if (cant <= 0) { setError("Cantidad inválida"); return; }
    if (precio <= 0) { setError("Precio inválido"); return; }

    const d = calcularDesglose(precio, Number(iepsPct), Number(ivaPct), impuestosIncluidos);
    const subtotal_con_impuestos = impuestosIncluidos
      ? r2(precio * cant)
      : r2((d.base + d.monto_ieps + d.monto_iva) * cant);

    setCarrito((prev) => [...prev, {
      producto_id: productoSeleccionado.id,
      nombre: productoSeleccionado.nombre,
      cantidad: cant,
      precio_ticket: precio,
      ieps_porcentaje: Number(iepsPct),
      iva_porcentaje: Number(ivaPct),
      base: d.base,
      monto_ieps: d.monto_ieps,
      monto_iva: d.monto_iva,
      subtotal_con_impuestos,
    }]);

    // Limpiar línea
    setBusqueda(""); setProductoSeleccionado(null);
    setCantidad("1"); setPrecioTicket("");
    setIepsPct(iepsHabilitado ? String(iepsEmpresa) : "0");
    setIvaPct(String(ivaEmpresa));
    setError(null);
  };

  // Totales del carrito
  const totalCalculado = r2(carrito.reduce((s, i) => s + i.subtotal_con_impuestos, 0));
  const totalBase = r2(carrito.reduce((s, i) => s + i.base * i.cantidad, 0));
  const totalIeps = r2(carrito.reduce((s, i) => s + i.monto_ieps * i.cantidad, 0));
  const totalIva = r2(carrito.reduce((s, i) => s + i.monto_iva * i.cantidad, 0));
  const ticketNum = Number(totalTicket) || 0;
  const diferencia = r2(ticketNum - totalCalculado);
  const cuadra = totalTicket !== "" && Math.abs(diferencia) < 0.02;

  const registrar = async () => {
    if (carrito.length === 0) { setError("Agrega al menos un producto"); return; }
    setGuardando(true);
    setError(null);
    const supabase = createClient();

    const { data: compraId, error: rpcError } = await supabase.rpc("registrar_compra", {
      p_proveedor_id: proveedorId || null,
      p_items: carrito.map((i) => ({
        producto_id: i.producto_id,
        cantidad: i.cantidad,
        precio_ticket: i.precio_ticket,
        ieps_porcentaje: i.ieps_porcentaje,
        iva_porcentaje: i.iva_porcentaje,
      })),
      p_nota: nota || null,
      p_folio_proveedor: folioProveedor || null,
      p_total_ticket: ticketNum || null,
      p_impuestos_incluidos: impuestosIncluidos,
      p_fecha_ticket: fechaTicket,
    });

    setGuardando(false);
    if (rpcError) { setError(rpcError.message); return; }
    router.push(`/protected/compras/${compraId}`);
  };

  return (
    <div className="flex w-full max-w-2xl flex-col gap-4">

      {escanerAbierto && (
        <EscanerCamara onEscaneo={manejarEscaneo} onCerrar={() => setEscanerAbierto(false)} />
      )}

      {/* Datos del ticket */}
      <div className="rounded-xl border border-linea bg-white p-5">
        <p className="text-sm font-semibold text-ink mb-3">Datos del ticket del proveedor</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="block text-xs font-medium text-ink/60 mb-1">Proveedor (opcional)</label>
            <select value={proveedorId} onChange={(e) => setProveedorId(e.target.value)}
              className="w-full rounded-lg border border-linea px-3 py-2 text-sm text-ink focus:border-primario focus:outline-none">
              <option value="">Sin proveedor</option>
              {proveedores.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-ink/60 mb-1">Folio del ticket</label>
            <input type="text" value={folioProveedor} onChange={(e) => setFolioProveedor(e.target.value)}
              placeholder="F-001234"
              className="w-full rounded-lg border border-linea px-3 py-2 text-sm text-ink focus:border-primario focus:outline-none" />
          </div>
          <div>
            <label className="block text-xs font-medium text-ink/60 mb-1">Fecha del ticket</label>
            <input type="date" value={fechaTicket} onChange={(e) => setFechaTicket(e.target.value)}
              className="w-full rounded-lg border border-linea px-3 py-2 text-sm text-ink focus:border-primario focus:outline-none" />
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-medium text-ink/60 mb-1">¿Cómo vienen los precios en el ticket?</label>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setImpuestosIncluidos(true)}
                className={`rounded-lg border py-2.5 text-xs font-semibold transition ${impuestosIncluidos ? "bg-primario text-white border-primario" : "border-linea text-ink hover:border-primario"}`}>
                Con IVA/IEPS incluido
              </button>
              <button type="button" onClick={() => setImpuestosIncluidos(false)}
                className={`rounded-lg border py-2.5 text-xs font-semibold transition ${!impuestosIncluidos ? "bg-primario text-white border-primario" : "border-linea text-ink hover:border-primario"}`}>
                Sin impuestos (base)
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Agregar producto */}
      <div className="rounded-xl border border-linea bg-white p-5">
        <p className="text-sm font-semibold text-ink mb-3">Agregar producto del ticket</p>

        {/* Buscador */}
        <div className="flex gap-2 mb-2">
          <div className="flex-1 relative">
            <input type="text" value={busqueda} onChange={(e) => { setBusqueda(e.target.value); setProductoSeleccionado(null); }}
              placeholder="Buscar producto..."
              className="w-full rounded-lg border border-linea px-3 py-2 text-sm text-ink focus:border-primario focus:outline-none" />
            {busqueda && !productoSeleccionado && productosFiltrados.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-linea rounded-lg shadow-lg max-h-40 overflow-y-auto">
                {productosFiltrados.slice(0, 6).map((p) => (
                  <button key={p.id} type="button" onClick={() => seleccionarProducto(p)}
                    className="w-full text-left px-3 py-2 text-sm text-ink hover:bg-paper transition">
                    {p.nombre}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button type="button" onClick={() => setEscanerAbierto(true)}
            className="rounded-lg border border-linea px-3 text-ink/60 hover:border-primario hover:text-primario transition">
            <ScanLine size={18} />
          </button>
        </div>

        {productoSeleccionado && (
          <div className="mb-3 rounded-lg bg-primario/5 border border-primario/20 px-3 py-2">
            <p className="text-xs font-semibold text-primario">{productoSeleccionado.nombre}</p>
            <p className="text-xs text-ink/50">Costo actual: ${productoSeleccionado.costo.toFixed(2)}</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 mb-2">
          <div>
            <label className="block text-xs font-medium text-ink/60 mb-1">Cantidad</label>
            <input type="number" min="0.01" step="0.01" value={cantidad}
              onChange={(e) => setCantidad(e.target.value)}
              className="w-full rounded-lg border border-linea px-3 py-2 text-sm text-ink focus:border-primario focus:outline-none" />
          </div>
          <div>
            <label className="block text-xs font-medium text-ink/60 mb-1">
              Precio del ticket (c/u)
            </label>
            <input type="number" min="0" step="0.01" value={precioTicket}
              placeholder="0.00"
              onChange={(e) => setPrecioTicket(e.target.value)}
              className="w-full rounded-lg border border-linea px-3 py-2 text-sm text-ink focus:border-primario focus:outline-none" />
          </div>
          <div>
            <label className="block text-xs font-medium text-ink/60 mb-1">IEPS %</label>
            <select value={iepsPct} onChange={(e) => setIepsPct(e.target.value)}
              className="w-full rounded-lg border border-linea px-3 py-2 text-sm text-ink focus:border-primario focus:outline-none">
              <option value="0">0% — Sin IEPS</option>
              <option value="8">8% — Bebidas azucaradas</option>
              <option value="26.5">26.5% — Tabacos</option>
              <option value="30">30% — Bebidas alcohólicas</option>
              <option value="160">160% — Cigarros</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-ink/60 mb-1">IVA %</label>
            <select value={ivaPct} onChange={(e) => setIvaPct(e.target.value)}
              className="w-full rounded-lg border border-linea px-3 py-2 text-sm text-ink focus:border-primario focus:outline-none">
              <option value="0">0% — Exento</option>
              <option value="16">16% — General</option>
            </select>
          </div>
        </div>

        {/* Desglose en tiempo real */}
        {desglose && precio > 0 && (
          <div className="mb-3 rounded-lg bg-paper border border-linea p-3 text-xs">
            <p className="font-semibold text-ink/60 mb-1.5">Desglose por unidad:</p>
            <div className="flex justify-between"><span className="text-ink/60">Base (costo real):</span><span className="cifra font-medium">${desglose.base.toFixed(2)}</span></div>
            {Number(iepsPct) > 0 && <div className="flex justify-between"><span className="text-ink/60">IEPS {iepsPct}%:</span><span className="cifra">${desglose.monto_ieps.toFixed(2)}</span></div>}
            {Number(ivaPct) > 0 && <div className="flex justify-between"><span className="text-ink/60">IVA {ivaPct}%:</span><span className="cifra">${desglose.monto_iva.toFixed(2)}</span></div>}
            <div className="flex justify-between border-t border-linea mt-1.5 pt-1.5 font-semibold">
              <span>Total c/u:</span>
              <span className="cifra">${(impuestosIncluidos ? precio : r2(desglose.base + desglose.monto_ieps + desglose.monto_iva)).toFixed(2)}</span>
            </div>
            {cant > 1 && (
              <div className="flex justify-between text-primario font-bold mt-0.5">
                <span>Subtotal {cant} pzas:</span>
                <span className="cifra">${r2((impuestosIncluidos ? precio : r2(desglose.base + desglose.monto_ieps + desglose.monto_iva)) * cant).toFixed(2)}</span>
              </div>
            )}
          </div>
        )}

        <button type="button" onClick={agregarLinea}
          className="w-full flex items-center justify-center gap-2 rounded-lg bg-primario py-2.5 text-sm font-semibold text-white hover:opacity-90 transition">
          <Plus size={16} /> Agregar al registro
        </button>
      </div>

      {/* Tabla de productos */}
      {carrito.length > 0 && (
        <div className="rounded-xl border border-linea bg-white overflow-hidden">
          <div className="px-5 py-3 border-b border-linea">
            <p className="text-sm font-semibold text-ink">Productos registrados</p>
          </div>
          <div className="divide-y divide-linea">
            {carrito.map((item, i) => (
              <div key={i} className="px-5 py-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-ink truncate">{item.nombre}</p>
                    <div className="text-xs text-ink/50 mt-0.5 space-y-0.5">
                      <div className="flex gap-4">
                        <span>{item.cantidad} pzas × ${item.precio_ticket.toFixed(2)}</span>
                        <span className="text-ink/30">|</span>
                        <span>Base: ${item.base.toFixed(2)}</span>
                        {item.ieps_porcentaje > 0 && <span>IEPS: ${item.monto_ieps.toFixed(2)}</span>}
                        {item.iva_porcentaje > 0 && <span>IVA: ${item.monto_iva.toFixed(2)}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="cifra text-sm font-bold text-ink">${item.subtotal_con_impuestos.toFixed(2)}</p>
                    <button type="button" onClick={() => setCarrito((p) => p.filter((_, j) => j !== i))}
                      className="text-xs text-red-400 hover:text-red-600 transition mt-0.5">
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Totales */}
          <div className="border-t border-linea bg-paper px-5 py-3 text-xs space-y-1">
            <div className="flex justify-between text-ink/60"><span>Base total:</span><span className="cifra">${totalBase.toFixed(2)}</span></div>
            {totalIeps > 0 && <div className="flex justify-between text-ink/60"><span>IEPS total:</span><span className="cifra">${totalIeps.toFixed(2)}</span></div>}
            {totalIva > 0 && <div className="flex justify-between text-ink/60"><span>IVA total:</span><span className="cifra">${totalIva.toFixed(2)}</span></div>}
            <div className="flex justify-between font-bold text-ink text-sm border-t border-linea pt-1 mt-1">
              <span>Total calculado:</span>
              <span className="cifra">${totalCalculado.toFixed(2)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Cuadre con ticket */}
      {carrito.length > 0 && (
        <div className="rounded-xl border border-linea bg-white p-5">
          <p className="text-sm font-semibold text-ink mb-3">Cuadre con el ticket del proveedor</p>
          <div>
            <label className="block text-xs font-medium text-ink/60 mb-1">Total que dice el ticket</label>
            <input type="number" min="0" step="0.01" value={totalTicket}
              onChange={(e) => setTotalTicket(e.target.value)}
              placeholder="0.00"
              className="w-full rounded-lg border border-linea px-3 py-2 text-sm text-ink focus:border-primario focus:outline-none" />
          </div>
          {totalTicket && (
            <div className={`mt-3 rounded-lg px-4 py-3 flex items-center justify-between ${cuadra ? "bg-verde-suave border border-verde/30" : "bg-red-50 border border-red-200"}`}>
              <div className="flex items-center gap-2">
                {cuadra
                  ? <CheckCircle size={16} className="text-verde shrink-0" />
                  : <AlertTriangle size={16} className="text-red-500 shrink-0" />}
                <span className={`text-sm font-semibold ${cuadra ? "text-verde" : "text-red-700"}`}>
                  {cuadra ? "Cuadra perfectamente" : `Diferencia: $${Math.abs(diferencia).toFixed(2)}`}
                </span>
              </div>
              <span className="cifra text-sm font-bold">${totalCalculado.toFixed(2)} vs ${ticketNum.toFixed(2)}</span>
            </div>
          )}
        </div>
      )}

      {/* Nota y guardar */}
      <div className="rounded-xl border border-linea bg-white p-5 flex flex-col gap-3">
        <div>
          <label className="block text-xs font-medium text-ink/60 mb-1">Nota (opcional)</label>
          <input type="text" value={nota} onChange={(e) => setNota(e.target.value)}
            placeholder="Primer pedido del mes..."
            className="w-full rounded-lg border border-linea px-3 py-2 text-sm text-ink focus:border-primario focus:outline-none" />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button type="button" onClick={registrar} disabled={guardando || carrito.length === 0}
          className="w-full rounded-xl bg-primario py-3 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 transition">
          {guardando ? "Registrando..." : "Registrar entrada de mercancía"}
        </button>
      </div>
    </div>
  );
}
