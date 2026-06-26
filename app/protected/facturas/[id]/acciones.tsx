"use client";

import { useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { Upload, MessageCircle, Mail, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";

type Estado = "pendiente" | "en_proceso" | "enviada" | "rechazada";

const ESTADOS: { val: Estado; label: string }[] = [
  { val: "pendiente",  label: "Pendiente" },
  { val: "en_proceso", label: "En proceso" },
  { val: "enviada",    label: "Enviada" },
  { val: "rechazada",  label: "Rechazada" },
];

export function AccionesFactura({
  solicitudId, companyId, folio, estado: estadoInicial,
  cfdiUrl: cfdiUrlInicial, clienteEmail, clienteWhatsapp, clienteNombre, pedidoId,
}: {
  solicitudId: string;
  companyId: string;
  folio: string;
  estado: string;
  cfdiUrl: string | null;
  clienteEmail: string | null;
  clienteWhatsapp: string | null;
  clienteNombre: string | null;
  pedidoId: string | null;
}) {
  const [estado, setEstado] = useState(estadoInicial);
  const [cfdiUrl, setCfdiUrl] = useState(cfdiUrlInicial);
  const [subiendoCfdi, setSubiendoCfdi] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [exito, setExito] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const subirCfdi = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const archivo = e.target.files?.[0];
    if (!archivo) return;
    setSubiendoCfdi(true);
    setError(null);
    try {
      const supabase = createClient();
      const ruta = `cfdis/${companyId}/${folio}-${Date.now()}.pdf`;
      const { error: upErr } = await supabase.storage
        .from("facturas")
        .upload(ruta, archivo, { contentType: "application/pdf", upsert: true });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from("facturas").getPublicUrl(ruta);
      setCfdiUrl(data.publicUrl);

      // Actualizar en BD
      await supabase
        .from("solicitudes_factura")
        .update({ cfdi_url: data.publicUrl, estado: "en_proceso", updated_at: new Date().toISOString() })
        .eq("id", solicitudId);

      setEstado("en_proceso");
      setExito("CFDI subido correctamente");
      setTimeout(() => setExito(null), 3000);
      router.refresh();
    } catch {
      setError("Error al subir el CFDI.");
    } finally {
      setSubiendoCfdi(false);
    }
  };

  const cambiarEstado = async (nuevoEstado: Estado) => {
    setGuardando(true);
    const supabase = createClient();
    await supabase
      .from("solicitudes_factura")
      .update({ estado: nuevoEstado, updated_at: new Date().toISOString() })
      .eq("id", solicitudId);
    setEstado(nuevoEstado);
    setGuardando(false);
    router.refresh();
  };

  const enviarWhatsApp = () => {
    if (!clienteWhatsapp || !cfdiUrl) return;
    const numero = clienteWhatsapp.replace(/\D/g, "");
    const msg = encodeURIComponent(
      `Hola ${clienteNombre ?? ""},\n\nAquí está tu factura CFDI (folio ${folio}):\n${cfdiUrl}\n\n¡Gracias por tu compra!`
    );
    window.open(`https://wa.me/52${numero}?text=${msg}`, "_blank");
  };

  const enviarEmail = () => {
    if (!clienteEmail || !cfdiUrl) return;
    const subject = encodeURIComponent(`Tu factura CFDI - Folio ${folio}`);
    const body = encodeURIComponent(
      `Hola ${clienteNombre ?? ""},\n\nAquí está el enlace a tu factura CFDI:\n${cfdiUrl}\n\n¡Gracias por tu compra!`
    );
    window.open(`mailto:${clienteEmail}?subject=${subject}&body=${body}`, "_blank");
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Estado */}
      <div className="rounded-xl border border-linea bg-white p-5">
        <p className="text-sm font-semibold text-ink mb-3">Estado de la solicitud</p>
        <div className="grid grid-cols-2 gap-2">
          {ESTADOS.map(({ val, label }) => (
            <button key={val} type="button"
              onClick={() => cambiarEstado(val)}
              disabled={guardando || estado === val}
              className={`rounded-lg py-2 text-xs font-semibold border transition ${
                estado === val
                  ? "bg-primario text-white border-primario"
                  : "bg-white text-ink border-linea hover:border-primario"
              } disabled:opacity-50`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Subir CFDI */}
      <div className="rounded-xl border border-linea bg-white p-5">
        <p className="text-sm font-semibold text-ink mb-1">CFDI generado</p>
        <p className="text-xs text-ink/50 mb-3">
          Sube el PDF que te mandó tu contador para enviárselo al cliente.
        </p>

        {cfdiUrl ? (
          <div className="flex flex-col gap-2">
            <a href={cfdiUrl} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 text-xs text-primario hover:underline">
              Ver CFDI subido (PDF)
            </a>
            <label className="text-xs text-ink/40 hover:text-primario cursor-pointer">
              Reemplazar PDF
              <input type="file" accept="application/pdf" className="hidden" onChange={subirCfdi} />
            </label>
          </div>
        ) : (
          <>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={subiendoCfdi}
              className={`w-full flex flex-col items-center gap-2 rounded-xl border-2 border-dashed p-4 transition ${
                subiendoCfdi ? "border-primario/50 opacity-50" : "border-linea hover:border-primario"
              }`}>
              {subiendoCfdi ? (
                <div className="h-5 w-5 rounded-full border-2 border-primario border-t-transparent animate-spin" />
              ) : (
                <Upload size={20} className="text-ink/40" />
              )}
              <span className="text-xs text-ink/60">
                {subiendoCfdi ? "Subiendo..." : "Subir PDF del CFDI"}
              </span>
            </button>
            <input ref={fileRef} type="file" accept="application/pdf" className="hidden" onChange={subirCfdi} disabled={subiendoCfdi} />
          </>
        )}
      </div>

      {/* Enviar al cliente */}
      {cfdiUrl && (
        <div className="rounded-xl border border-linea bg-white p-5">
          <p className="text-sm font-semibold text-ink mb-3">Enviar al cliente</p>
          <div className="flex flex-col gap-2">
            {clienteWhatsapp && (
              <button type="button" onClick={enviarWhatsApp}
                className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-800 hover:bg-green-100 transition">
                <MessageCircle size={16} />
                Enviar por WhatsApp · {clienteWhatsapp}
              </button>
            )}
            {clienteEmail && (
              <button type="button" onClick={enviarEmail}
                className="flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-800 hover:bg-blue-100 transition">
                <Mail size={16} />
                Enviar por Email · {clienteEmail}
              </button>
            )}
            {!clienteWhatsapp && !clienteEmail && (
              <p className="text-xs text-ink/40">El cliente no proporcionó WhatsApp ni email.</p>
            )}
          </div>
          {cfdiUrl && (estado === "en_proceso" || estado === "pendiente") && (
            <button type="button" onClick={() => cambiarEstado("enviada")}
              className="mt-3 w-full flex items-center justify-center gap-2 rounded-lg bg-primario py-2.5 text-sm font-semibold text-white hover:opacity-90 transition">
              <CheckCircle size={14} />
              Marcar como Enviada
            </button>
          )}
        </div>
      )}

      {/* Ver ticket original */}
      {pedidoId && (
        <a href={`/protected/pos/recibo/${pedidoId}`} target="_blank"
          className="flex items-center justify-center gap-2 rounded-xl border border-linea bg-white px-4 py-3 text-sm font-medium text-primario hover:border-primario transition">
          Ver ticket original
        </a>
      )}

      {exito && (
        <div className="rounded-xl border border-verde/30 bg-verde-suave p-3 flex items-center gap-2">
          <CheckCircle size={14} className="text-verde" />
          <p className="text-sm text-verde font-medium">{exito}</p>
        </div>
      )}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}
    </div>
  );
}
