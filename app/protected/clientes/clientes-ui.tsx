"use client";

import { useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { Search, Plus, Pencil, Trash2, X, Phone, Mail, MapPin, User, Building2 } from "lucide-react";

type Cliente = {
  id: string;
  nombre: string;
  tipo_persona: string | null;
  rfc: string | null;
  telefono: string | null;
  whatsapp: string | null;
  email: string | null;
  direccion: string | null;
  ciudad: string | null;
  codigo_postal: string | null;
  observaciones: string | null;
  limite_credito: number;
  saldo_actual: number;
  bloqueado: boolean;
  vendedor_id: string | null;
};

type Vendedor = { id: string; full_name: string };

const TIPO_ETIQUETA: Record<string, string> = {
  fisica: "Persona física",
  moral: "Persona moral",
  extranjero: "Extranjero",
  publico_general: "Público general",
};

function Badge({ tipo }: { tipo: string | null }) {
  const label = TIPO_ETIQUETA[tipo ?? "fisica"] ?? "Persona física";
  const isMoral = tipo === "moral";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
      isMoral ? "bg-primario/10 text-primario" : "bg-ink/5 text-ink/60"
    }`}>
      {label}
    </span>
  );
}

function FormCliente({
  inicial,
  vendedores,
  esAdmin,
  onGuardar,
  onCancelar,
  cargando,
}: {
  inicial?: Partial<Cliente>;
  vendedores: Vendedor[];
  esAdmin: boolean;
  onGuardar: (data: Record<string, string>) => void;
  onCancelar?: () => void;
  cargando: boolean;
}) {
  const [tipo, setTipo] = useState(inicial?.tipo_persona ?? "fisica");

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const data: Record<string, string> = {};
    fd.forEach((v, k) => { data[k] = v as string; });
    onGuardar(data);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {/* Tipo de persona */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wide text-ink/50 mb-2">Tipo de persona</label>
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(TIPO_ETIQUETA).map(([val, label]) => (
            <label key={val} className={`flex items-center gap-2 rounded-lg border px-3 py-2 cursor-pointer text-sm transition ${
              tipo === val ? "border-primario bg-primario/5 text-primario font-medium" : "border-linea text-ink hover:bg-ink/[0.02]"
            }`}>
              <input type="radio" name="tipo_persona" value={val} checked={tipo === val}
                onChange={() => setTipo(val)} className="sr-only" />
              {val === "moral" ? <Building2 size={14} /> : <User size={14} />}
              {label}
            </label>
          ))}
        </div>
      </div>

      {/* Nombre */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-ink/50 mb-1">
            {tipo === "moral" ? "Razón social *" : "Nombre completo *"}
          </label>
          <input name="nombre" required defaultValue={inicial?.nombre}
            className="w-full rounded-xl border border-linea px-3 py-2.5 text-sm text-ink focus:border-primario focus:outline-none focus:ring-2 focus:ring-primario/20" />
        </div>
        {tipo === "moral" && (
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-ink/50 mb-1">Nombre comercial</label>
            <input name="nombre_comercial" defaultValue={inicial?.observaciones ?? ""}
              className="w-full rounded-xl border border-linea px-3 py-2.5 text-sm text-ink focus:border-primario focus:outline-none focus:ring-2 focus:ring-primario/20" />
          </div>
        )}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-ink/50 mb-1">RFC</label>
          <input name="rfc" defaultValue={inicial?.rfc ?? ""}
            placeholder={tipo === "publico_general" ? "XAXX010101000" : ""}
            className="w-full rounded-xl border border-linea px-3 py-2.5 text-sm text-ink focus:border-primario focus:outline-none focus:ring-2 focus:ring-primario/20 uppercase" />
        </div>
      </div>

      {/* Contacto */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-ink/50 mb-1">Teléfono</label>
          <div className="relative">
            <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/30" />
            <input name="telefono" type="tel" defaultValue={inicial?.telefono ?? ""}
              className="w-full rounded-xl border border-linea pl-8 pr-3 py-2.5 text-sm text-ink focus:border-primario focus:outline-none focus:ring-2 focus:ring-primario/20" />
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-ink/50 mb-1">WhatsApp</label>
          <div className="relative">
            <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/30" />
            <input name="whatsapp" type="tel" defaultValue={inicial?.whatsapp ?? ""}
              className="w-full rounded-xl border border-linea pl-8 pr-3 py-2.5 text-sm text-ink focus:border-primario focus:outline-none focus:ring-2 focus:ring-primario/20" />
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-ink/50 mb-1">Correo electrónico</label>
          <div className="relative">
            <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/30" />
            <input name="email" type="email" defaultValue={inicial?.email ?? ""}
              className="w-full rounded-xl border border-linea pl-8 pr-3 py-2.5 text-sm text-ink focus:border-primario focus:outline-none focus:ring-2 focus:ring-primario/20" />
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-ink/50 mb-1">Ciudad</label>
          <input name="ciudad" defaultValue={inicial?.ciudad ?? ""}
            className="w-full rounded-xl border border-linea px-3 py-2.5 text-sm text-ink focus:border-primario focus:outline-none focus:ring-2 focus:ring-primario/20" />
        </div>
      </div>

      {/* Dirección */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wide text-ink/50 mb-1">Dirección</label>
        <div className="relative">
          <MapPin size={14} className="absolute left-3 top-3 text-ink/30" />
          <input name="direccion" defaultValue={inicial?.direccion ?? ""}
            placeholder="Calle, número, colonia, CP"
            className="w-full rounded-xl border border-linea pl-8 pr-3 py-2.5 text-sm text-ink focus:border-primario focus:outline-none focus:ring-2 focus:ring-primario/20" />
        </div>
        <p className="text-[10px] text-ink/40 mt-0.5">Se ubica automáticamente en el mapa para check-in</p>
      </div>

      {/* Crédito y vendedor */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-ink/50 mb-1">Límite de crédito</label>
          <input name="limite_credito" type="number" step="0.01" min="0"
            defaultValue={inicial?.limite_credito ?? 0}
            className="w-full rounded-xl border border-linea px-3 py-2.5 text-sm text-ink focus:border-primario focus:outline-none focus:ring-2 focus:ring-primario/20" />
        </div>
        {esAdmin && (
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-ink/50 mb-1">Vendedor asignado</label>
            <select name="vendedor_id" defaultValue={inicial?.vendedor_id ?? ""}
              className="w-full rounded-xl border border-linea px-3 py-2.5 text-sm text-ink focus:border-primario focus:outline-none focus:ring-2 focus:ring-primario/20">
              <option value="">Sin asignar (mostrador)</option>
              {vendedores.map(v => <option key={v.id} value={v.id}>{v.full_name}</option>)}
            </select>
          </div>
        )}
      </div>

      {/* Observaciones */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wide text-ink/50 mb-1">Observaciones</label>
        <textarea name="observaciones" rows={2} defaultValue={inicial?.observaciones ?? ""}
          className="w-full rounded-xl border border-linea px-3 py-2.5 text-sm text-ink focus:border-primario focus:outline-none focus:ring-2 focus:ring-primario/20 resize-none" />
      </div>

      <div className="flex gap-2">
        <button type="submit" disabled={cargando}
          className="flex-1 rounded-xl bg-primario py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50">
          {cargando ? "Guardando..." : inicial?.id ? "Guardar cambios" : "Agregar cliente"}
        </button>
        {onCancelar && (
          <button type="button" onClick={onCancelar}
            className="rounded-xl border border-linea px-4 py-2.5 text-sm text-ink hover:bg-ink/[0.03] transition">
            Cancelar
          </button>
        )}
      </div>
    </form>
  );
}

export function ClientesUI({
  clientesIniciales,
  vendedores,
  esAdmin,
}: {
  clientesIniciales: Cliente[];
  vendedores: Vendedor[];
  esAdmin: boolean;
}) {
  const [clientes, setClientes] = useState(clientesIniciales);
  const [busqueda, setBusqueda] = useState("");
  const [mostrarForm, setMostrarForm] = useState(false);
  const [editando, setEditando] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const filtrados = clientes.filter(c =>
    c.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    (c.rfc ?? "").toLowerCase().includes(busqueda.toLowerCase()) ||
    (c.telefono ?? "").includes(busqueda)
  );

  const guardarNuevo = (data: Record<string, string>) => {
    setError(null);
    startTransition(async () => {
      const supabase = createClient();
      const { data: nuevo, error: err } = await supabase.from("clientes").insert({
        nombre: data.nombre?.trim(),
        tipo_persona: data.tipo_persona || "fisica",
        rfc: data.rfc?.trim().toUpperCase() || null,
        telefono: data.telefono?.trim() || null,
        whatsapp: data.whatsapp?.trim() || null,
        email: data.email?.trim() || null,
        direccion: data.direccion?.trim() || null,
        ciudad: data.ciudad?.trim() || null,
        codigo_postal: data.codigo_postal?.trim() || null,
        observaciones: data.observaciones?.trim() || null,
        limite_credito: Number(data.limite_credito) || 0,
        vendedor_id: data.vendedor_id || null,
      }).select().single();
      if (err) { setError(err.message); return; }
      if (nuevo) setClientes(prev => [...prev, nuevo as Cliente].sort((a,b) => a.nombre.localeCompare(b.nombre)));
      setMostrarForm(false);
    });
  };

  const guardarEdicion = (id: string, data: Record<string, string>) => {
    setError(null);
    startTransition(async () => {
      const supabase = createClient();
      const { error: err } = await supabase.from("clientes").update({
        nombre: data.nombre?.trim(),
        tipo_persona: data.tipo_persona || "fisica",
        rfc: data.rfc?.trim().toUpperCase() || null,
        telefono: data.telefono?.trim() || null,
        whatsapp: data.whatsapp?.trim() || null,
        email: data.email?.trim() || null,
        direccion: data.direccion?.trim() || null,
        ciudad: data.ciudad?.trim() || null,
        observaciones: data.observaciones?.trim() || null,
        limite_credito: Number(data.limite_credito) || 0,
        vendedor_id: data.vendedor_id || null,
      }).eq("id", id);
      if (err) { setError(err.message); return; }
      setClientes(prev => prev.map(c => c.id === id ? {
        ...c, ...data,
        limite_credito: Number(data.limite_credito) || 0,
        vendedor_id: data.vendedor_id || null,
      } : c));
      setEditando(null);
    });
  };

  const borrar = (id: string, nombre: string) => {
    if (!confirm(`¿Borrar a "${nombre}"? Esta acción no se puede deshacer.`)) return;
    startTransition(async () => {
      const supabase = createClient();
      const { error: err } = await supabase.from("clientes").delete().eq("id", id);
      if (err) { setError(err.message); return; }
      setClientes(prev => prev.filter(c => c.id !== id));
    });
  };

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-ink">Clientes</h1>
          <p className="text-sm text-ink/50">{clientes.length} registrado{clientes.length !== 1 ? "s" : ""}</p>
        </div>
        <button onClick={() => { setMostrarForm(true); setEditando(null); }}
          className="flex items-center gap-2 rounded-xl bg-primario px-4 py-2 text-sm font-semibold text-white hover:opacity-90 transition">
          <Plus size={16} /> Nuevo cliente
        </button>
      </div>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {/* Formulario nuevo */}
      {mostrarForm && (
        <div className="rounded-2xl border border-primario/20 bg-primario/[0.02] p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="font-semibold text-ink">Nuevo cliente</p>
            <button onClick={() => setMostrarForm(false)} className="text-ink/40 hover:text-ink transition"><X size={18} /></button>
          </div>
          <FormCliente vendedores={vendedores} esAdmin={esAdmin}
            onGuardar={guardarNuevo} onCancelar={() => setMostrarForm(false)} cargando={pending} />
        </div>
      )}

      {/* Buscador */}
      <div className="relative">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink/30" />
        <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
          placeholder="Buscar por nombre, RFC o teléfono..."
          className="w-full rounded-xl border border-linea pl-10 pr-4 py-2.5 text-sm text-ink focus:border-primario focus:outline-none focus:ring-2 focus:ring-primario/20" />
      </div>

      {/* Lista */}
      <div className="flex flex-col gap-3">
        {filtrados.length === 0 && (
          <div className="rounded-2xl border border-dashed border-linea p-8 text-center">
            <p className="text-ink/40 text-sm">{busqueda ? "Sin resultados para esa búsqueda." : "Aún no hay clientes. Agrega el primero."}</p>
          </div>
        )}
        {filtrados.map(c => (
          <div key={c.id} className="rounded-2xl border border-linea bg-white shadow-sm overflow-hidden">
            {editando === c.id ? (
              <div className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <p className="font-semibold text-ink">Editando cliente</p>
                  <button onClick={() => setEditando(null)} className="text-ink/40 hover:text-ink"><X size={18} /></button>
                </div>
                <FormCliente inicial={c} vendedores={vendedores} esAdmin={esAdmin}
                  onGuardar={data => guardarEdicion(c.id, data)}
                  onCancelar={() => setEditando(null)} cargando={pending} />
              </div>
            ) : (
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-ink">{c.nombre}</p>
                      <Badge tipo={c.tipo_persona} />
                      {c.bloqueado && <span className="text-[10px] font-semibold text-red-500 bg-red-50 rounded-full px-2 py-0.5">Bloqueado</span>}
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1">
                      {c.rfc && <span className="text-xs text-ink/50 font-mono">{c.rfc}</span>}
                      {c.telefono && <span className="text-xs text-ink/50">{c.telefono}</span>}
                      {c.email && <span className="text-xs text-ink/50">{c.email}</span>}
                      {c.ciudad && <span className="text-xs text-ink/50">{c.ciudad}</span>}
                    </div>
                    {(c.limite_credito > 0 || c.saldo_actual > 0) && (
                      <p className="text-xs text-ink/40 mt-1">
                        Crédito: ${c.saldo_actual.toFixed(2)} / ${c.limite_credito.toFixed(2)}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => setEditando(c.id)}
                      className="rounded-lg p-1.5 text-ink/40 hover:text-primario hover:bg-primario/5 transition">
                      <Pencil size={15} />
                    </button>
                    <button onClick={() => borrar(c.id, c.nombre)}
                      className="rounded-lg p-1.5 text-ink/40 hover:text-red-500 hover:bg-red-50 transition">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
