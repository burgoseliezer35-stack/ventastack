"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { Search, X, Plus, User, Phone, Building2, ChevronDown } from "lucide-react";
import { DireccionForm, type DireccionData } from "@/components/direccion-form";

export type ClientePOS = {
  id: string;
  nombre: string;
  telefono?: string | null;
  direccion?: string | null;
  ciudad?: string | null;
  codigo_postal?: string | null;
  dir_calle_principal?: string | null;
  dir_entre1?: string | null;
  dir_entre2?: string | null;
  dir_numero?: string | null;
  dir_colonia?: string | null;
  dir_municipio?: string | null;
  dir_estado?: string | null;
};

type Props = {
  clientes: ClientePOS[];
  companyId: string;
  formatoDireccion: "general" | "merida" | "libre";
  onSeleccionar: (cliente: ClientePOS) => void;
  onCerrar: () => void;
};

const TIPOS = [
  { val: "fisica", label: "Persona física" },
  { val: "moral", label: "Persona moral" },
  { val: "extranjero", label: "Extranjero" },
  { val: "publico_general", label: "Público general" },
] as const;

const inputCls =
  "w-full rounded-xl border border-linea px-3 py-2.5 text-sm text-ink focus:border-primario focus:outline-none focus:ring-2 focus:ring-primario/20";

const labelCls =
  "block text-xs font-semibold uppercase tracking-wide text-ink/50 mb-1.5";

export function ClienteSheet({
  clientes: inicial,
  companyId,
  formatoDireccion,
  onSeleccionar,
  onCerrar,
}: Props) {
  const [busqueda, setBusqueda] = useState("");
  const [modoNuevo, setModoNuevo] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [clientes, setClientes] = useState(inicial);
  const inputRef = useRef<HTMLInputElement>(null);

  // Formulario nuevo cliente
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [rfc, setRfc] = useState("");
  const [email, setEmail] = useState("");
  const [tipoPersona, setTipoPersona] = useState<string>("fisica");
  const [direccion, setDireccion] = useState<DireccionData | null>(null);

  // Focus en búsqueda al abrir
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  const filtrados = clientes.filter((c) => {
    const q = busqueda.toLowerCase();
    return (
      c.nombre.toLowerCase().includes(q) ||
      (c.telefono ?? "").includes(q)
    );
  });

  const resetNuevo = () => {
    setNombre(""); setTelefono(""); setWhatsapp("");
    setRfc(""); setEmail(""); setTipoPersona("fisica");
    setDireccion(null); setError(null);
  };

  const guardarNuevo = () => {
    if (!nombre.trim()) { setError("El nombre es obligatorio"); return; }
    setError(null);

    startTransition(async () => {
      const supabase = createClient();
      const { data: nuevo, error: err } = await supabase
        .from("clientes")
        .insert({
          company_id: companyId,
          nombre: nombre.trim(),
          telefono: telefono.trim() || null,
          whatsapp: whatsapp.trim() || null,
          rfc: rfc.trim().toUpperCase() || null,
          email: email.trim() || null,
          tipo_persona: tipoPersona,
          // Dirección estructurada
          direccion: direccion?.direccion || null,
          ciudad: direccion?.ciudad || null,
          codigo_postal: direccion?.cp || null,
          dir_calle_principal: direccion?.dir_calle_principal || null,
          dir_entre1: direccion?.dir_entre1 || null,
          dir_entre2: direccion?.dir_entre2 || null,
          dir_numero: direccion?.dir_numero || null,
          dir_colonia: direccion?.dir_colonia || null,
          dir_municipio: direccion?.dir_municipio || null,
          dir_estado: direccion?.dir_estado || null,
        })
        .select()
        .single();

      if (err) { setError(err.message); return; }
      if (!nuevo) return;

      const clienteNuevo: ClientePOS = {
        id: nuevo.id,
        nombre: nuevo.nombre,
        telefono: nuevo.telefono,
        direccion: nuevo.direccion,
        ciudad: nuevo.ciudad,
        codigo_postal: nuevo.codigo_postal,
        dir_calle_principal: nuevo.dir_calle_principal,
        dir_entre1: nuevo.dir_entre1,
        dir_entre2: nuevo.dir_entre2,
        dir_numero: nuevo.dir_numero,
        dir_colonia: nuevo.dir_colonia,
        dir_municipio: nuevo.dir_municipio,
        dir_estado: nuevo.dir_estado,
      };

      // Agregar a la lista local y seleccionarlo
      setClientes(prev => [...prev, clienteNuevo].sort((a, b) => a.nombre.localeCompare(b.nombre)));
      onSeleccionar(clienteNuevo);
    });
  };

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
        onClick={onCerrar}
      />

      {/* Sheet */}
      <div className="fixed inset-x-0 bottom-0 z-50 flex max-h-[92dvh] flex-col rounded-t-2xl bg-white shadow-2xl">
        {/* Handle */}
        <div className="mx-auto mt-3 h-1 w-10 rounded-full bg-linea" />

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-linea">
          <p className="font-semibold text-ink">
            {modoNuevo ? "Nuevo cliente" : "Seleccionar cliente"}
          </p>
          <button
            type="button"
            onClick={modoNuevo ? () => { setModoNuevo(false); resetNuevo(); } : onCerrar}
            className="rounded-lg p-1.5 text-ink/40 hover:text-ink hover:bg-ink/[0.05] transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Contenido scrollable */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          {!modoNuevo ? (
            <div className="flex flex-col">
              {/* Buscador */}
              <div className="sticky top-0 bg-white px-4 py-3 border-b border-linea z-10">
                <div className="relative">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/30" />
                  <input
                    ref={inputRef}
                    value={busqueda}
                    onChange={e => setBusqueda(e.target.value)}
                    placeholder="Buscar por nombre o teléfono..."
                    className="w-full rounded-xl border border-linea pl-9 pr-4 py-2.5 text-sm text-ink focus:border-primario focus:outline-none focus:ring-2 focus:ring-primario/20"
                  />
                </div>
              </div>

              {/* Lista de clientes */}
              <div className="divide-y divide-linea">
                {/* Público general siempre primero */}
                <button
                  type="button"
                  onClick={() => onSeleccionar({ id: "", nombre: "Público general" })}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-paper/60 transition"
                >
                  <div className="w-8 h-8 rounded-full bg-ink/10 flex items-center justify-center shrink-0">
                    <User size={14} className="text-ink/40" />
                  </div>
                  <p className="text-sm text-ink/60">Público general</p>
                </button>

                {filtrados.map(c => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => onSeleccionar(c)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-paper/60 transition"
                  >
                    <div className="w-8 h-8 rounded-full bg-primario/10 flex items-center justify-center shrink-0">
                      <span className="text-xs font-bold text-primario">
                        {c.nombre.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-ink truncate">{c.nombre}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {c.telefono && (
                          <span className="text-xs text-ink/40">{c.telefono}</span>
                        )}
                        {(c.dir_colonia || c.ciudad) && (
                          <span className="text-xs text-ink/30 truncate">
                            {c.dir_colonia || c.ciudad}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                ))}

                {filtrados.length === 0 && busqueda && (
                  <div className="px-4 py-6 text-center">
                    <p className="text-sm text-ink/40">
                      No encontrado — ¿deseas agregarlo como cliente nuevo?
                    </p>
                  </div>
                )}
              </div>

              {/* Botón nuevo cliente */}
              <div className="sticky bottom-0 bg-white border-t border-linea p-4">
                <button
                  type="button"
                  onClick={() => {
                    setModoNuevo(true);
                    if (busqueda) setNombre(busqueda); // precarga lo que buscó
                  }}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-primario py-3 text-sm font-semibold text-white hover:opacity-90 transition"
                >
                  <Plus size={16} /> Nuevo cliente
                </button>
              </div>
            </div>
          ) : (
            /* ── Formulario nuevo cliente ── */
            <div className="flex flex-col gap-4 p-4 pb-8">
              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              {/* Tipo de persona */}
              <div>
                <label className={labelCls}>Tipo de persona</label>
                <div className="grid grid-cols-2 gap-2">
                  {TIPOS.map(t => (
                    <label
                      key={t.val}
                      className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 cursor-pointer text-sm transition ${
                        tipoPersona === t.val
                          ? "border-primario bg-primario/5 text-primario font-medium"
                          : "border-linea text-ink hover:bg-ink/[0.02]"
                      }`}
                    >
                      <input
                        type="radio"
                        name="tipo_persona"
                        value={t.val}
                        checked={tipoPersona === t.val}
                        onChange={() => setTipoPersona(t.val)}
                        className="sr-only"
                      />
                      {t.val === "moral" ? <Building2 size={13} /> : <User size={13} />}
                      {t.label}
                    </label>
                  ))}
                </div>
              </div>

              {/* Nombre */}
              <div>
                <label className={labelCls}>
                  {tipoPersona === "moral" ? "Razón social *" : "Nombre completo *"}
                </label>
                <input
                  value={nombre}
                  onChange={e => setNombre(e.target.value)}
                  placeholder="Juan Pérez"
                  className={inputCls}
                />
              </div>

              {/* Contacto */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Teléfono</label>
                  <div className="relative">
                    <Phone size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/30" />
                    <input
                      value={telefono}
                      onChange={e => setTelefono(e.target.value)}
                      type="tel"
                      inputMode="numeric"
                      placeholder="9991234567"
                      className={`${inputCls} pl-8`}
                    />
                  </div>
                </div>
                <div>
                  <label className={labelCls}>WhatsApp</label>
                  <div className="relative">
                    <Phone size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/30" />
                    <input
                      value={whatsapp}
                      onChange={e => setWhatsapp(e.target.value)}
                      type="tel"
                      inputMode="numeric"
                      placeholder="9991234567"
                      className={`${inputCls} pl-8`}
                    />
                  </div>
                </div>
              </div>

              {/* Fiscal */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>RFC</label>
                  <input
                    value={rfc}
                    onChange={e => setRfc(e.target.value.toUpperCase())}
                    placeholder="XAXX010101000"
                    className={`${inputCls} uppercase`}
                  />
                </div>
                <div>
                  <label className={labelCls}>Email</label>
                  <input
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    type="email"
                    placeholder="correo@ejemplo.com"
                    className={inputCls}
                  />
                </div>
              </div>

              {/* Dirección */}
              <div>
                <label className={labelCls}>Dirección</label>
                <DireccionForm
                  formato={formatoDireccion}
                  onChange={setDireccion}
                />
              </div>

              {/* Botón guardar */}
              <button
                type="button"
                onClick={guardarNuevo}
                disabled={pending || !nombre.trim()}
                className="w-full rounded-xl bg-primario py-3 text-sm font-semibold text-white hover:opacity-90 transition disabled:opacity-50 mt-2"
              >
                {pending ? "Guardando..." : "Guardar y seleccionar"}
              </button>

              {/* Detalle de los campos opcionales */}
              <div className="rounded-xl border border-dashed border-linea p-3">
                <div className="flex items-center gap-1.5 text-ink/40">
                  <ChevronDown size={13} />
                  <p className="text-xs">
                    Límite de crédito, observaciones y otros datos los puedes completar después desde el catálogo de Clientes.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
