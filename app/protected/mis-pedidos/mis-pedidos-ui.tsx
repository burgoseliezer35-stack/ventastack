"use client";

import { useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  MapPin, Phone, Package, Truck, CheckCircle2, XCircle,
  Clock, Banknote, CreditCard, ChevronDown, ChevronUp,
} from "lucide-react";

type Item = { nombre: string; cantidad: number; precio: number };

type Pedido = {
  id: string;
  total: number;
  metodo_pago: string;
  direccion_entrega: string | null;
  estado_reparto: string | null;
  created_at: string;
  cliente_nombre: string;
  cliente_telefono: string | null;
  items: Item[];
};

const ESTADO_CONFIG: Record<string, { label: string; color: string; icono: typeof Clock }> = {
  pendiente:    { label: "Pendiente",    color: "bg-amber-50 text-amber-600 border-amber-200",   icono: Clock },
  en_camino:    { label: "En camino",    color: "bg-blue-50 text-blue-600 border-blue-200",       icono: Truck },
  entregado:    { label: "Entregado",    color: "bg-emerald-50 text-emerald-600 border-emerald-200", icono: CheckCircle2 },
  no_entregado: { label: "No entregado", color: "bg-red-50 text-red-500 border-red-200",          icono: XCircle },
};

function BadgeEstado({ estado }: { estado: string | null }) {
  const cfg = ESTADO_CONFIG[estado ?? "pendiente"] ?? ESTADO_CONFIG.pendiente;
  const Icono = cfg.icono;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${cfg.color}`}>
      <Icono size={12} /> {cfg.label}
    </span>
  );
}

export function MisPedidosUI({ pedidos: iniciales }: { pedidos: Pedido[] }) {
  const [pedidos, setPedidos] = useState(iniciales);
  const [expandido, setExpandido] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const activos = pedidos.filter(p => p.estado_reparto === "pendiente" || p.estado_reparto === "en_camino");
  const completados = pedidos.filter(p => p.estado_reparto === "entregado" || p.estado_reparto === "no_entregado");

  const cambiarEstado = (id: string, nuevo: "en_camino" | "entregado" | "no_entregado") => {
    const confirmaciones: Record<string, string> = {
      en_camino: "¿Marcar que ya saliste con este pedido?",
      entregado: "¿Confirmar que el pedido fue ENTREGADO al cliente?",
      no_entregado: "¿El cliente no estaba? El pedido quedará para reprogramar.",
    };
    if (!confirm(confirmaciones[nuevo])) return;

    setError(null);
    startTransition(async () => {
      const supabase = createClient();
      const { error: err } = await supabase.rpc("actualizar_estado_reparto", {
        p_pedido_id: id,
        p_estado: nuevo,
      });
      if (err) { setError(err.message); return; }
      setPedidos(prev => prev.map(p => p.id === id ? { ...p, estado_reparto: nuevo } : p));
    });
  };

  const TarjetaPedido = ({ p }: { p: Pedido }) => {
    const abierto = expandido === p.id;
    const esEfectivo = p.metodo_pago === "efectivo";
    const folio = p.id.replace(/-/g, "").slice(0, 8).toUpperCase();

    return (
      <div className="rounded-2xl border border-linea bg-white shadow-sm overflow-hidden">
        {/* Encabezado de la tarjeta */}
        <button
          type="button"
          onClick={() => setExpandido(abierto ? null : p.id)}
          className="w-full flex items-start justify-between gap-3 p-4 text-left"
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold text-ink truncate">{p.cliente_nombre}</p>
              <BadgeEstado estado={p.estado_reparto} />
            </div>
            <p className="text-xs text-ink/40 mt-0.5">Folio {folio} · {new Date(p.created_at).toLocaleDateString("es-MX", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</p>
            {p.direccion_entrega && (
              <p className="flex items-center gap-1 text-xs text-ink/60 mt-1">
                <MapPin size={12} className="shrink-0" /> {p.direccion_entrega}
              </p>
            )}
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <p className="cifra font-bold text-ink">${p.total.toLocaleString("en-US", { minimumFractionDigits: 2 })}</p>
            <span className={`inline-flex items-center gap-1 text-[10px] font-medium rounded-full px-2 py-0.5 ${esEfectivo ? "bg-emerald-50 text-emerald-600" : "bg-ink/5 text-ink/50"}`}>
              {esEfectivo ? <Banknote size={11} /> : <CreditCard size={11} />}
              {esEfectivo ? "Cobrar al entregar" : p.metodo_pago}
            </span>
            {abierto ? <ChevronUp size={16} className="text-ink/30" /> : <ChevronDown size={16} className="text-ink/30" />}
          </div>
        </button>

        {/* Detalle expandible */}
        {abierto && (
          <div className="border-t border-linea px-4 py-3 flex flex-col gap-3 bg-paper/40">
            {/* Productos */}
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-ink/40 mb-1.5 flex items-center gap-1">
                <Package size={11} /> Productos
              </p>
              <div className="flex flex-col gap-1">
                {p.items.map((it, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="text-ink/80">{it.cantidad} × {it.nombre}</span>
                    <span className="cifra text-ink/60">${(it.precio * it.cantidad).toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Acciones de contacto */}
            <div className="flex gap-2">
              {p.cliente_telefono && (
                <a href={`tel:${p.cliente_telefono}`}
                  className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-linea py-2 text-xs font-medium text-ink hover:bg-ink/[0.03] transition">
                  <Phone size={13} /> Llamar
                </a>
              )}
              {p.direccion_entrega && (
                <a href={`https://maps.google.com/?q=${encodeURIComponent(p.direccion_entrega)}`}
                  target="_blank" rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-linea py-2 text-xs font-medium text-ink hover:bg-ink/[0.03] transition">
                  <MapPin size={13} /> Abrir en Maps
                </a>
              )}
            </div>

            {/* Botones de estado */}
            {p.estado_reparto === "pendiente" && (
              <button onClick={() => cambiarEstado(p.id, "en_camino")} disabled={pending}
                className="w-full rounded-xl bg-primario py-3 text-sm font-bold text-white hover:opacity-90 transition disabled:opacity-50">
                🚚 Salir a entregar
              </button>
            )}
            {p.estado_reparto === "en_camino" && (
              <div className="flex gap-2">
                <button onClick={() => cambiarEstado(p.id, "entregado")} disabled={pending}
                  className="flex-1 rounded-xl bg-verde py-3 text-sm font-bold text-white hover:opacity-90 transition disabled:opacity-50">
                  ✓ Entregado
                </button>
                <button onClick={() => cambiarEstado(p.id, "no_entregado")} disabled={pending}
                  className="rounded-xl border border-red-200 px-4 py-3 text-sm font-medium text-red-500 hover:bg-red-50 transition disabled:opacity-50">
                  No estaba
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-6 max-w-lg mx-auto w-full">
      <div>
        <h1 className="text-xl font-bold text-ink">Mis entregas</h1>
        <p className="text-sm text-ink/50">
          {activos.length} pendiente{activos.length !== 1 ? "s" : ""} de entregar
        </p>
      </div>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {/* Entregas activas */}
      {activos.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-linea p-8 text-center">
          <Truck size={32} className="mx-auto text-ink/20 mb-2" />
          <p className="text-sm text-ink/40">No tienes entregas pendientes por ahora.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {activos.map(p => <TarjetaPedido key={p.id} p={p} />)}
        </div>
      )}

      {/* Historial */}
      {completados.length > 0 && (
        <div className="flex flex-col gap-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink/40 mt-2">
            Historial reciente
          </p>
          {completados.map(p => <TarjetaPedido key={p.id} p={p} />)}
        </div>
      )}
    </div>
  );
}
