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
  { val: "625", label: "625 - Régimen de las Actividades Empresariales con ingresos a través de Plataformas Tecnológicas" },
  { val: "626", label: "626 - Régimen Simplificado de Confianza (RESICO)" },
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

type Props = {
  pedidoId: string;
  companyId: string;
  folio: string;
  total: number;
};

type Campos = {
  rfc: string;
  nombre: string;
  codigo_postal: string;
  regimen_fiscal: string;
  uso_cfdi: string;
  email: string;
  whatsapp: string;
};

const CAMPOS_VACIOS: Campos = {
  rfc: "", nombre: "", codigo_postal: "",
  regimen_fiscal: "", uso_cfdi: "G03",
  email: "", whatsapp: "",
};

// Extrae datos del PDF de Constancia de Situación Fiscal del SAT
async function extraerDatosConstancia(archivo: File): Promise<Partial<Campos>> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdfjsLib = await import("pdfjs-dist" as any);
  const { getDocument, GlobalWorkerOptions } = pdfjsLib;
  GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@6.0.227/build/pdf.worker.min.mjs`;

  const arrayBuffer = await archivo.arrayBuffer();
  const pdf = await getDocument({ data: arrayBuffer }).promise;

  let texto = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
      texto += content.items.map((item: any) => item.str ?? "").join(" ") + "\n";
  }

  const datos: Partial<Campos> = {};

  // RFC — patrón estándar SAT
  const rfcMatch = texto.match(/RFC[:\s]+([A-Z&Ñ]{3,4}[0-9]{6}[A-Z0-9]{3})/i);
  if (rfcMatch) datos.rfc = rfcMatch[1].trim();

  // CP — "Código Postal:" seguido de 5 dígitos
  const cpMatch = texto.match(/[Cc]ódigo\s+[Pp]ostal[:\s]+(\d{5})/);
  if (cpMatch) datos.codigo_postal = cpMatch[1];

  // Email
  const emailMatch = texto.match(/([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})/);
  if (emailMatch) datos.email = emailMatch[1];

  // Nombre — entre "RFC:" y "CURP:" en constancia
  const nombreMatch = texto.match(/(?:Nombre[^:]*:|NOMBRE[^:]*:)\s*([A-ZÁÉÍÓÚÑ\s]+?)(?:\s{2,}|RFC|CURP|Fecha|$)/i);
  if (nombreMatch) datos.nombre = nombreMatch[1].trim();

  // Si nombre viene como apellidos separados, reconstruir
  if (!datos.nombre) {
    const primerNombre = texto.match(/Nombre\s*\(s\)[:\s]+([A-ZÁÉÍÓÚÑ\s]+?)(?:\s{2,}|Primer)/i);
    const primerAp = texto.match(/Primer\s+Apellido[:\s]+([A-ZÁÉÍÓÚÑ]+)/i);
    const segundoAp = texto.match(/Segundo\s+Apellido[:\s]+([A-ZÁÉÍÓÚÑ]+)/i);
    if (primerAp) {
      datos.nombre = [
        primerAp[1].trim(),
        segundoAp?.[1]?.trim() ?? "",
        primerNombre?.[1]?.trim() ?? "",
      ].filter(Boolean).join(" ");
    }
  }

  // Régimen — buscar el código
  for (const r of REGIMENES) {
    if (texto.includes(r.label.split(" - ")[1]) || texto.includes(r.val)) {
      datos.regimen_fiscal = r.val;
      break;
    }
  }

  return datos;
}

export function FormularioFactura({ pedidoId, companyId, folio, total }: Props) {
  const [campos, setCampos] = useState<Campos>(CAMPOS_VACIOS);
  const [leyendoPdf, setLeyendoPdf] = useState(false);
  const [subiendoConstancia, setSubiendoConstancia] = useState(false);
  const [constanciaUrl, setConstanciaUrl] = useState<string | null>(null);
  const [constanciaNombre, setConstanciaNombre] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const set = (k: keyof Campos, v: string) => setCampos((p) => ({ ...p, [k]: v }));

  const manejarConstancia = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const archivo = e.target.files?.[0];
    if (!archivo) return;

    setConstanciaNombre(archivo.name);
    setLeyendoPdf(true);
    setError(null);

    try {
      // Extraer datos del PDF
      const datos = await extraerDatosConstancia(archivo);
      setCampos((prev) => ({ ...prev, ...datos }));

      // Subir a Storage
      setSubiendoConstancia(true);
      const supabase = createClient();
      const ruta = `constancias/${companyId}/${folio}-${Date.now()}.pdf`;
      const { error: upErr } = await supabase.storage
        .from("facturas")
        .upload(ruta, archivo, { contentType: "application/pdf", upsert: true });

      if (!upErr) {
        const { data } = supabase.storage.from("facturas").getPublicUrl(ruta);
        setConstanciaUrl(data.publicUrl);
      }
    } catch (err) {
      console.error(err);
      setError("No se pudieron leer los datos del PDF. Llena los campos manualmente.");
    } finally {
      setLeyendoPdf(false);
      setSubiendoConstancia(false);
    }
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

      // Upsert cliente fiscal (si el RFC ya existe, actualiza)
      const { data: clienteFiscal, error: cfErr } = await supabase
        .from("clientes_fiscales")
        .upsert({
          company_id: companyId,
          rfc: campos.rfc.toUpperCase().trim(),
          nombre: campos.nombre.trim(),
          codigo_postal: campos.codigo_postal.trim(),
          regimen_fiscal: campos.regimen_fiscal,
          email: campos.email.trim() || null,
          whatsapp: campos.whatsapp.trim() || null,
          constancia_url: constanciaUrl,
          updated_at: new Date().toISOString(),
        }, { onConflict: "company_id,rfc" })
        .select("id")
        .single();

      if (cfErr) throw cfErr;

      // Insertar solicitud
      const { error: solErr } = await supabase
        .from("solicitudes_factura")
        .insert({
          company_id: companyId,
          pedido_id: pedidoId,
          cliente_fiscal_id: clienteFiscal.id,
          folio,
          uso_cfdi: campos.uso_cfdi,
          estado: "pendiente",
        });

      if (solErr) throw solErr;

      setEnviado(true);
    } catch (err) {
      console.error(err);
      setError("Error al enviar la solicitud. Intenta de nuevo.");
    } finally {
      setEnviando(false);
    }
  };

  if (enviado) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center shadow-sm">
        <CheckCircle size={48} className="mx-auto mb-4 text-green-500" />
        <h2 className="text-xl font-bold text-gray-900 mb-2">Solicitud enviada</h2>
        <p className="text-sm text-gray-500 mb-1">
          Recibirás tu factura en el correo y WhatsApp que proporcionaste.
        </p>
        <p className="text-xs text-gray-400 mt-4">Folio: {folio}</p>
      </div>
    );
  }

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
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={leyendoPdf || subiendoConstancia}
          className="w-full rounded-xl border-2 border-dashed border-gray-200 hover:border-blue-400 transition p-4 flex flex-col items-center gap-2 disabled:opacity-50"
        >
          {leyendoPdf ? (
            <>
              <div className="h-6 w-6 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
              <span className="text-xs text-blue-600">Leyendo PDF...</span>
            </>
          ) : subiendoConstancia ? (
            <>
              <div className="h-6 w-6 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
              <span className="text-xs text-blue-600">Subiendo...</span>
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

      {/* Formulario */}
      <div className="p-5 flex flex-col gap-4">
        <p className="text-xs text-gray-500">
          Revisa o completa los datos. Los campos marcados con * son obligatorios.
        </p>

        {[
          { key: "rfc", label: "RFC *", placeholder: "AAPU790804II9", upper: true },
          { key: "nombre", label: "Nombre / Razón social *", placeholder: "ULISES ALCANTARA PEREZ" },
          { key: "codigo_postal", label: "Código postal fiscal *", placeholder: "07400" },
          { key: "email", label: "Correo electrónico", placeholder: "tu@correo.com" },
          { key: "whatsapp", label: "WhatsApp (con lada)", placeholder: "5557578026" },
        ].map(({ key, label, placeholder, upper }) => (
          <div key={key}>
            <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
            <input
              type={key === "email" ? "email" : key === "whatsapp" ? "tel" : "text"}
              value={campos[key as keyof Campos]}
              onChange={(e) => set(key as keyof Campos, upper ? e.target.value.toUpperCase() : e.target.value)}
              placeholder={placeholder}
              className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 focus:border-blue-400 focus:outline-none"
            />
          </div>
        ))}

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Régimen fiscal *</label>
          <select value={campos.regimen_fiscal} onChange={(e) => set("regimen_fiscal", e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 focus:border-blue-400 focus:outline-none">
            <option value="">Seleccionar...</option>
            {REGIMENES.map((r) => (
              <option key={r.val} value={r.val}>{r.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Uso del CFDI</label>
          <select value={campos.uso_cfdi} onChange={(e) => set("uso_cfdi", e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 focus:border-blue-400 focus:outline-none">
            {USOS_CFDI.map((u) => (
              <option key={u.val} value={u.val}>{u.label}</option>
            ))}
          </select>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2.5">
            <AlertCircle size={14} className="text-red-500 shrink-0" />
            <p className="text-xs text-red-700">{error}</p>
          </div>
        )}

        <button type="button" onClick={enviar} disabled={enviando}
          className="w-full rounded-xl bg-blue-600 py-3.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50 mt-2">
          {enviando ? "Enviando solicitud..." : "Solicitar factura"}
        </button>

        <p className="text-center text-xs text-gray-400">
          Tus datos fiscales son confidenciales y se usan solo para emitir tu factura.
        </p>
      </div>
    </div>
  );
}
