"use client";

import { useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { FileText, CheckCircle, AlertCircle, Upload } from "lucide-react";

const REGIMENES = [
  { val: "601", label: "601 - General de Ley Personas Morales" },
  { val: "603", label: "603 - Personas Morales con Fines no Lucrativos" },
  { val: "606", label: "606 - Arrendamiento" },
  { val: "608", label: "608 - Demás ingresos" },
  { val: "612", label: "612 - Personas Físicas con Actividades Empresariales" },
  { val: "616", label: "616 - Sin obligaciones fiscales" },
  { val: "621", label: "621 - Incorporación Fiscal" },
  { val: "625", label: "625 - Plataformas Tecnológicas" },
  { val: "626", label: "626 - RESICO" },
];

const USOS_CFDI = [
  { val: "G01", label: "G01 - Adquisición de mercancias" },
  { val: "G02", label: "G02 - Devoluciones, descuentos o bonificaciones" },
  { val: "G03", label: "G03 - Gastos en general" },
  { val: "I01", label: "I01 - Construcciones" },
  { val: "I02", label: "I02 - Mobilario y equipo de oficina" },
  { val: "I04", label: "I04 - Equipo de computo y accesorios" },
  { val: "I08", label: "I08 - Otra maquinaria y equipo" },
  { val: "D01", label: "D01 - Honorarios médicos y gastos hospitalarios" },
  { val: "D10", label: "D10 - Pagos por servicios educativos" },
  { val: "S01", label: "S01 - Sin efectos fiscales" },
];

type Campos = {
  rfc: string; nombre: string; codigo_postal: string;
  regimen_fiscal: string; uso_cfdi: string;
  email: string; whatsapp: string;
};

const VACIOS: Campos = {
  rfc: "", nombre: "", codigo_postal: "",
  regimen_fiscal: "", uso_cfdi: "G03",
  email: "", whatsapp: "",
};

export function FormularioFactura({
  pedidoId, companyId, folio, total,
}: {
  pedidoId: string; companyId: string; folio: string; total: number;
}) {
  const [campos, setCampos] = useState<Campos>(VACIOS);
  const [leyendo, setLeyendo] = useState(false);
  const [subiendo, setSubiendo] = useState(false);
  const [constanciaUrl, setConstanciaUrl] = useState<string | null>(null);
  const [constanciaNombre, setConstanciaNombre] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rfcConocido, setRfcConocido] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const set = (k: keyof Campos, v: string) =>
    setCampos((p) => ({ ...p, [k]: v }));

  // Cuando el RFC tiene formato válido, buscar si ya existe
  const buscarRfcExistente = async (rfc: string) => {
    if (rfc.length < 12) return;
    const supabase = createClient();
    // RPC pública (security definer): igual que el folio, esta
    // página no tiene sesión de empleado, así que un select directo
    // contra clientes_fiscales siempre regresa 0 filas por RLS.
    const { data } = await supabase
      .rpc("buscar_cliente_fiscal_publico", {
        p_company_id: companyId,
        p_rfc: rfc,
      })
      .maybeSingle<{
        rfc: string;
        nombre: string | null;
        codigo_postal: string | null;
        regimen_fiscal: string | null;
        email: string | null;
        whatsapp: string | null;
      }>();
    if (data) {
      setCampos((prev) => ({
        ...prev,
        nombre: data.nombre ?? prev.nombre,
        codigo_postal: data.codigo_postal ?? prev.codigo_postal,
        regimen_fiscal: data.regimen_fiscal ?? prev.regimen_fiscal,
        email: data.email ?? prev.email,
        whatsapp: data.whatsapp ?? prev.whatsapp,
      }));
      setRfcConocido(true);
    } else {
      setRfcConocido(false);
    }
  };

  const manejarConstancia = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const archivo = e.target.files?.[0];
    if (!archivo) return;
    setConstanciaNombre(archivo.name);
    setError(null);

    // 1. Leer datos del PDF via API del servidor
    setLeyendo(true);
    try {
      const fd = new FormData();
      fd.append("pdf", archivo);
      const res = await fetch("/api/leer-constancia", { method: "POST", body: fd });
      if (res.ok) {
        const datos = await res.json();
        setCampos((prev) => ({ ...prev, ...datos }));
      }
    } catch {
      setError("No se pudieron leer los datos. Llena los campos manualmente.");
    } finally {
      setLeyendo(false);
    }

    // 2. Subir PDF a Storage
    setSubiendo(true);
    try {
      const supabase = createClient();
      const ruta = `constancias/${companyId}/${folio}-${Date.now()}.pdf`;
      const { error: upErr } = await supabase.storage
        .from("facturas")
        .upload(ruta, archivo, { contentType: "application/pdf", upsert: true });
      if (!upErr) {
        const { data } = supabase.storage.from("facturas").getPublicUrl(ruta);
        setConstanciaUrl(data.publicUrl);
      }
    } catch { /* storage opcional */ }
    finally { setSubiendo(false); }
  };

  const enviar = async () => {
    if (!campos.rfc || !campos.nombre || !campos.codigo_postal || !campos.regimen_fiscal) {
      setError("RFC, nombre, CP y régimen son obligatorios.");
      return;
    }
    setEnviando(true);
    setError(null);
    try {
      const supabase = createClient();

      // RPC pública (security definer): un upsert directo fallaba
      // cuando el RFC ya existía, porque el UPDATE que dispara el
      // upsert exige sesión de empleado (RLS), y esta página no
      // tiene una — el cliente final la abre sin login.
      const { error: rpcError } = await supabase.rpc("enviar_solicitud_factura", {
        p_company_id: companyId,
        p_pedido_id: pedidoId,
        p_folio: folio,
        p_rfc: campos.rfc,
        p_nombre: campos.nombre,
        p_codigo_postal: campos.codigo_postal,
        p_regimen_fiscal: campos.regimen_fiscal,
        p_uso_cfdi: campos.uso_cfdi,
        p_email: campos.email || null,
        p_whatsapp: campos.whatsapp || null,
        p_constancia_url: constanciaUrl,
      });

      if (rpcError) throw rpcError;
      setEnviado(true);
    } catch {
      setError("Error al enviar. Intenta de nuevo.");
    } finally {
      setEnviando(false);
    }
  };

  if (enviado) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center shadow-sm">
        <CheckCircle size={48} className="mx-auto mb-4 text-green-500" />
        <h2 className="text-xl font-bold text-gray-900 mb-2">Solicitud enviada</h2>
        <p className="text-sm text-gray-500">
          Recibirás tu factura en el correo y WhatsApp que proporcionaste.
        </p>
        <p className="text-xs text-gray-400 mt-4">Folio: {folio}</p>
      </div>
    );
  }

  const procesando = leyendo || subiendo;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Subir constancia */}
      <div className="p-5 border-b border-gray-100">
        <p className="text-sm font-semibold text-gray-800 mb-1">
          Constancia de Situación Fiscal
        </p>
        <p className="text-xs text-gray-500 mb-3">
          Sube tu constancia del SAT y llenaremos los datos automáticamente.
        </p>
        <button type="button" onClick={() => fileRef.current?.click()}
          disabled={procesando}
          className="w-full rounded-xl border-2 border-dashed border-gray-200 hover:border-blue-400 transition p-4 flex flex-col items-center gap-2 disabled:opacity-50">
          {procesando ? (
            <>
              <div className="h-6 w-6 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
              <span className="text-xs text-blue-600">
                {leyendo ? "Leyendo datos del PDF..." : "Subiendo archivo..."}
              </span>
            </>
          ) : constanciaNombre ? (
            <>
              <FileText size={24} className="text-green-500" />
              <span className="text-xs text-green-600 font-medium">{constanciaNombre}</span>
              <span className="text-xs text-gray-400">Toca para cambiar</span>
            </>
          ) : (
            <>
              <Upload size={24} className="text-gray-400" />
              <span className="text-sm font-medium text-gray-600">Subir PDF de constancia</span>
              <span className="text-xs text-gray-400">Los datos se llenan solos</span>
            </>
          )}
        </button>
        <input ref={fileRef} type="file" accept="application/pdf"
          className="hidden" onChange={manejarConstancia} />
      </div>

      {/* Campos */}
      <div className="p-5 flex flex-col gap-4">
        {rfcConocido && (
          <div className="flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 px-3 py-2">
            <CheckCircle size={14} className="text-green-600 shrink-0" />
            <p className="text-xs text-green-700 font-medium">RFC encontrado — datos pre-llenados. Verifica y confirma.</p>
          </div>
        )}
        <p className="text-xs text-gray-500">
          Revisa o completa los datos. Los campos con * son obligatorios.
        </p>

        {[
          { key: "rfc",           label: "RFC *",                    placeholder: "AAPU790804II9", upper: true },
          { key: "nombre",        label: "Nombre / Razón social *",  placeholder: "ULISES ALCANTARA PEREZ" },
          { key: "codigo_postal", label: "Código postal fiscal *",   placeholder: "07400" },
          { key: "email",         label: "Correo electrónico",       placeholder: "tu@correo.com" },
          { key: "whatsapp",      label: "WhatsApp (con lada)",      placeholder: "5557578026" },
        ].map(({ key, label, placeholder, upper }) => (
          <div key={key}>
            <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
            <input
              type={key === "email" ? "email" : key === "whatsapp" ? "tel" : "text"}
              value={campos[key as keyof Campos]}
              onChange={(e) => {
                const val = upper ? e.target.value.toUpperCase() : e.target.value;
                set(key as keyof Campos, val);
                if (key === "rfc") buscarRfcExistente(val);
              }}
              placeholder={placeholder}
              className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 focus:border-blue-400 focus:outline-none"
            />
          </div>
        ))}

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Régimen fiscal *</label>
          <select value={campos.regimen_fiscal}
            onChange={(e) => set("regimen_fiscal", e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 focus:border-blue-400 focus:outline-none">
            <option value="">Seleccionar...</option>
            {REGIMENES.map((r) => <option key={r.val} value={r.val}>{r.label}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Uso del CFDI</label>
          <select value={campos.uso_cfdi}
            onChange={(e) => set("uso_cfdi", e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 focus:border-blue-400 focus:outline-none">
            {USOS_CFDI.map((u) => <option key={u.val} value={u.val}>{u.label}</option>)}
          </select>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2.5">
            <AlertCircle size={14} className="text-red-500 shrink-0" />
            <p className="text-xs text-red-700">{error}</p>
          </div>
        )}

        <button type="button" onClick={enviar} disabled={enviando || procesando}
          className="w-full rounded-xl bg-blue-600 py-3.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50 mt-2">
          {enviando ? "Enviando..." : "Solicitar factura"}
        </button>

        <p className="text-center text-xs text-gray-400">
          Tus datos son confidenciales y se usan solo para tu factura.
        </p>
      </div>
    </div>
  );
}
