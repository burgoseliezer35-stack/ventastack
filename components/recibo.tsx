"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import QRCode from "qrcode";

type Renglon = {
  nombre: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
};

// Anchos estándar de papel térmico en mm
const ANCHOS = [58, 72, 80] as const;
type Ancho = (typeof ANCHOS)[number];

export function Recibo({
  pedidoId,
  empresa,
  cliente,
  metodoPago,
  total,
  fecha,
  renglones,
  anchoMm = 72,
}: {
  pedidoId: string;
  empresa: string;
  cliente: string;
  metodoPago: string;
  total: number;
  fecha: string;
  renglones: Renglon[];
  anchoMm?: number;
}) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [ancho, setAncho] = useState<Ancho>(
    (ANCHOS.includes(anchoMm as Ancho) ? anchoMm : 72) as Ancho
  );
  const folio = pedidoId.slice(0, 8).toUpperCase();

  // px aproximados para cada ancho de papel
  const anchoPx = ancho === 58 ? 210 : ancho === 72 ? 260 : 302;

  useEffect(() => {
    const texto = `Ventastack\nFolio: ${folio}\nTotal: $${total.toFixed(2)}`;
    QRCode.toDataURL(texto, { width: 120, margin: 1 })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(null));
  }, [folio, total]);

  return (
    <>
      {/* CSS de impresión — define el tamaño de página exacto del
          rollo térmico y elimina los headers/footers del navegador */}
      <style>{`
        @media print {
          @page {
            size: ${ancho}mm auto;
            margin: 2mm;
          }
          body > * { display: none !important; }
          #ticket-print { display: block !important; }
          #ticket-print * { -webkit-print-color-adjust: exact; }
        }
        #ticket-print { display: none; }
        @media print { #ticket-print { display: block; } }
      `}</style>

      <div className="flex min-h-screen flex-col items-center gap-4 bg-paper px-4 py-8 print:hidden">
        {/* Selector de ancho — solo visible en pantalla, no imprime */}
        <div className="flex items-center gap-3 rounded-lg border border-linea bg-white px-4 py-2 shadow-sm">
          <span className="text-xs text-ink/60">Ancho de papel:</span>
          {ANCHOS.map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => setAncho(a)}
              className={`rounded px-3 py-1 text-xs font-medium transition ${
                ancho === a
                  ? "bg-primario text-white"
                  : "border border-linea text-ink hover:bg-paper"
              }`}
            >
              {a}mm
            </button>
          ))}
        </div>

        {/* Vista previa del ticket */}
        <div
          style={{ width: anchoPx, fontFamily: "monospace", fontSize: 11 }}
          className="rounded-lg border border-linea bg-white p-3 shadow-sm"
        >
          <TicketContent
            empresa={empresa}
            folio={folio}
            fecha={fecha}
            cliente={cliente}
            metodoPago={metodoPago}
            renglones={renglones}
            total={total}
            qrDataUrl={qrDataUrl}
          />
        </div>

        <div className="flex w-full flex-col gap-2" style={{ maxWidth: anchoPx }}>
          <button
            type="button"
            onClick={() => window.print()}
            className="w-full rounded-md bg-primario px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
          >
            Imprimir / Guardar PDF
          </button>
          <Link
            href="/protected/pos"
            className="text-center text-sm text-primario hover:underline"
          >
            Nueva venta →
          </Link>
        </div>
      </div>

      {/* Versión solo para impresión — sin el selector ni botones */}
      <div id="ticket-print" style={{ fontFamily: "monospace", fontSize: 11, padding: "2mm" }}>
        <TicketContent
          empresa={empresa}
          folio={folio}
          fecha={fecha}
          cliente={cliente}
          metodoPago={metodoPago}
          renglones={renglones}
          total={total}
          qrDataUrl={qrDataUrl}
        />
      </div>
    </>
  );
}

function TicketContent({
  empresa, folio, fecha, cliente, metodoPago, renglones, total, qrDataUrl,
}: {
  empresa: string; folio: string; fecha: string; cliente: string;
  metodoPago: string; renglones: Renglon[]; total: number; qrDataUrl: string | null;
}) {
  return (
    <>
      <div style={{ textAlign: "center", marginBottom: 6 }}>
        <div style={{ fontWeight: "bold", fontSize: 13 }}>{empresa}</div>
        <div>Folio: {folio}</div>
        <div>{new Date(fecha).toLocaleString("es-MX")}</div>
      </div>

      <div style={{ borderTop: "1px dashed #999", padding: "4px 0" }}>
        <div>Cliente: {cliente}</div>
        <div>Pago: {metodoPago}</div>
      </div>

      <div style={{ borderTop: "1px dashed #999", padding: "4px 0" }}>
        {renglones.map((r, i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
            <span>{r.cantidad} x {r.nombre}</span>
            <span>${r.subtotal.toFixed(2)}</span>
          </div>
        ))}
      </div>

      <div style={{ borderTop: "1px dashed #999", display: "flex", justifyContent: "space-between", padding: "4px 0", fontWeight: "bold", fontSize: 13 }}>
        <span>TOTAL</span>
        <span>${total.toFixed(2)}</span>
      </div>

      {qrDataUrl && (
        <div style={{ textAlign: "center", borderTop: "1px dashed #999", paddingTop: 6 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrDataUrl} alt="QR" width={90} height={90} style={{ margin: "0 auto" }} />
          <div style={{ fontSize: 9, color: "#666", marginTop: 2 }}>Gracias por tu compra</div>
        </div>
      )}
    </>
  );
}
