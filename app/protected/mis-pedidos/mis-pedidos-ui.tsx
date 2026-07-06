"use client";

import { useState, useTransition } from "react";
import {
  MapPin, Phone, Package, Truck, CheckCircle2, XCircle,
  Clock, Banknote, CreditCard, ChevronDown, ChevronUp,
  Navigation, Camera, X, Send, Route, Loader2,
} from "lucide-react";

// Abre el mapa nativo según el dispositivo del repartidor.
// iOS → Apple Maps (waze://), Android → Google Maps.
// Si tenemos coordenadas exactas las usamos; si no, geocodificamos
// con OpenStreetMap Nominatim (gratis, sin API key) antes de abrir.
async function abrirNavegacion(direccion: string, lat?: number | null, lng?: number | null) {
  let destLat = lat;
  let destLng = lng;

  // Si no hay coordenadas, geocodificar con OSM Nominatim
  if (!destLat || !destLng) {
    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(direccion)}&format=json&limit=1&countrycodes=mx`;
      const res = await fetch(url, { headers: { "Accept-Language": "es" } });
      const data = await res.json();
      if (data?.[0]) {
        destLat = parseFloat(data[0].lat);
        destLng = parseFloat(data[0].lon);
      }
    } catch { /* si falla, usar texto */ }
  }

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

  if (destLat && destLng) {
    // Coordenadas exactas — navegación perfecta
    const dest = `${destLat},${destLng}`;
    window.open(
      isIOS
        ? `maps://maps.apple.com/?daddr=${dest}&dirflg=d`
        : `https://www.google.com/maps/dir/?api=1&destination=${dest}&travelmode=driving`,
      "_blank"
    );
  } else {
    // Fallback: texto de la dirección
    window.open(
      isIOS
        ? `maps://maps.apple.com/?daddr=${encodeURIComponent(direccion)}&dirflg=d`
        : `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(direccion)}&travelmode=driving`,
      "_blank"
    );
  }
}

type Item = { nombre: string; cantidad: number; precio: number };

type Pedido = {
  id: string;
  total: number;
  metodo_pago: string;
  direccion_entrega: string | null;
  lat?: number | null;
  lng?: number | null;
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
  const [fotos, setFotos] = useState<Record<string, { file: File; preview: string }>>({});
  const [entregando, setEntregando] = useState<string | null>(null);
  const [optimizando, setOptimizando] = useState(false);
  const [resumenRuta, setResumenRuta] = useState<{ km: number; min: number } | null>(null);

  const optimizarRuta = async () => {
    setOptimizando(true);
    setError(null);
    try {
      // Obtener ubicación actual del repartidor
      const pos = await new Promise<GeolocationPosition>((res, rej) =>
        navigator.geolocation.getCurrentPosition(res, rej, { timeout: 8000 })
      );

      const pendientes = activos.filter(p => p.direccion_entrega);
      const res = await fetch("/api/reparto/optimizar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pedidos: pendientes.map(p => ({
            id: p.id,
            direccion_entrega: p.direccion_entrega,
            lat: p.lat,
            lng: p.lng,
          })),
          repartidor_lat: pos.coords.latitude,
          repartidor_lng: pos.coords.longitude,
        }),
      });

      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Error al optimizar"); return; }

      // Reordenar pedidos según el orden óptimo
      const orden: string[] = data.orden;
      setPedidos(prev => {
        const mapa = Object.fromEntries(prev.map(p => [p.id, p]));
        const actOrdenados = orden
          .map(id => mapa[id])
          .filter(Boolean);
        const completados = prev.filter(p =>
          p.estado_reparto === "entregado" || p.estado_reparto === "no_entregado"
        );
        return [...actOrdenados, ...completados];
      });

      setResumenRuta({ km: data.distancia_km, min: data.duracion_min });
    } catch (err) {
      const msg = err instanceof GeolocationPositionError
        ? "Necesitas activar el GPS para optimizar la ruta"
        : "Error al calcular la ruta óptima";
      setError(msg);
    } finally {
      setOptimizando(false);
    }
  };

  const activos = pedidos.filter(p => p.estado_reparto === "pendiente" || p.estado_reparto === "en_camino");
  const completados = pedidos.filter(p => p.estado_reparto === "entregado" || p.estado_reparto === "no_entregado");

  const cambiarEstado = (id: string, nuevo: "en_camino" | "no_entregado") => {
    const msg = nuevo === "en_camino"
      ? "¿Marcar que ya saliste con este pedido?"
      : "¿El cliente no estaba? El pedido quedará para reprogramar.";
    if (!confirm(msg)) return;
    setError(null);
    startTransition(async () => {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const { error: err } = await supabase.rpc("actualizar_estado_reparto", {
        p_pedido_id: id,
        p_estado: nuevo,
      });
      if (err) { setError(err.message); return; }
      setPedidos(prev => prev.map(p => p.id === id ? { ...p, estado_reparto: nuevo } : p));
    });
  };

  const seleccionarFoto = (id: string, file: File) => {
    const preview = URL.createObjectURL(file);
    setFotos(prev => ({ ...prev, [id]: { file, preview } }));
  };

  const confirmarEntrega = async (id: string) => {
    if (!confirm("¿Confirmar que el pedido fue ENTREGADO?")) return;
    setEntregando(id);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("pedido_id", id);
      const foto = fotos[id];
      if (foto) fd.append("foto", foto.file);

      const res = await fetch("/api/reparto/entregar", { method: "POST", body: fd });
      const data = await res.json();

      if (!res.ok) { setError(data.error ?? "Error al registrar entrega"); return; }

      setPedidos(prev => prev.map(p => p.id === id ? { ...p, estado_reparto: "entregado" } : p));
      // Liberar el object URL
      if (foto) URL.revokeObjectURL(foto.preview);
      setFotos(prev => { const next = { ...prev }; delete next[id]; return next; });
    } catch {
      setError("Error de conexión. Intenta de nuevo.");
    } finally {
      setEntregando(null);
    }
  };

  const TarjetaPedido = ({ p, parada }: { p: Pedido; parada?: number }) => {
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
              {parada && resumenRuta && (
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-primario text-white text-[10px] font-bold shrink-0">
                  {parada}
                </span>
              )}
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
                <button
                  type="button"
                  onClick={() => abrirNavegacion(p.direccion_entrega!, p.lat, p.lng)}
                  className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-linea py-2 text-xs font-medium text-ink hover:bg-ink/[0.03] transition"
                >
                  <Navigation size={13} /> Navegar
                </button>
              )}
            </div>

            {/* Botones de estado */}
            {p.estado_reparto === "pendiente" && (
              <button onClick={() => cambiarEstado(p.id, "en_camino")} disabled={pending}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-primario py-3 text-sm font-semibold text-white hover:opacity-90 transition disabled:opacity-50">
                <Truck size={15} /> Salir a entregar
              </button>
            )}
            {p.estado_reparto === "en_camino" && (
              <div className="flex flex-col gap-2">
                {/* Foto de comprobante */}
                {fotos[p.id] ? (
                  <div className="relative rounded-xl overflow-hidden border border-linea">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={fotos[p.id].preview} alt="Foto de entrega" className="w-full h-40 object-cover" />
                    <button
                      type="button"
                      onClick={() => { URL.revokeObjectURL(fotos[p.id].preview); setFotos(prev => { const n = {...prev}; delete n[p.id]; return n; }); }}
                      className="absolute top-2 right-2 rounded-full bg-black/50 p-1 text-white hover:bg-black/70 transition"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <label className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-linea py-3 text-sm text-ink/60 cursor-pointer hover:bg-ink/[0.02] transition">
                    <Camera size={15} />
                    <span>Tomar foto de comprobante</span>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="sr-only"
                      onChange={e => { const f = e.target.files?.[0]; if (f) seleccionarFoto(p.id, f); }}
                    />
                  </label>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={() => confirmarEntrega(p.id)}
                    disabled={entregando === p.id}
                    className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-verde py-3 text-sm font-semibold text-white hover:opacity-90 transition disabled:opacity-50"
                  >
                    <Send size={14} />
                    {entregando === p.id ? "Enviando..." : fotos[p.id] ? "Confirmar y enviar foto" : "Confirmar entrega"}
                  </button>
                  <button onClick={() => cambiarEstado(p.id, "no_entregado")} disabled={!!entregando}
                    className="rounded-xl border border-red-200 px-4 py-3 text-sm font-medium text-red-500 hover:bg-red-50 transition disabled:opacity-50">
                    No estaba
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-6 max-w-lg mx-auto w-full">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-ink">Mis entregas</h1>
          <p className="text-sm text-ink/50">
            {activos.length} pendiente{activos.length !== 1 ? "s" : ""} de entregar
          </p>
          {resumenRuta && (
            <p className="text-xs text-primario mt-0.5 font-medium">
              Ruta optimizada · {resumenRuta.km} km · ~{resumenRuta.min} min
            </p>
          )}
        </div>
        {/* Botón de optimización — solo si hay 2+ entregas con dirección */}
        {activos.filter(p => p.direccion_entrega).length >= 2 && (
          <button
            type="button"
            onClick={optimizarRuta}
            disabled={optimizando}
            className="flex items-center gap-1.5 rounded-xl border border-primario px-3 py-2 text-xs font-semibold text-primario hover:bg-primario/5 transition disabled:opacity-50 shrink-0"
          >
            {optimizando
              ? <><Loader2 size={13} className="animate-spin" /> Calculando...</>
              : <><Route size={13} /> Optimizar ruta</>
            }
          </button>
        )}
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
          {activos.map((p, idx) => <TarjetaPedido key={p.id} p={p} parada={idx + 1} />)}
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
