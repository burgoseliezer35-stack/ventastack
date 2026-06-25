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

const ANCHOS = [58, 72, 80] as const;
type Ancho = (typeof ANCHOS)[number];

type ReciboProps = {
  pedidoId: string;
  empresa: string;
  logoUrl: string | null;
  razonSocial: string | null;
  rfc: string | null;
  direccion: string;
  telefono: string | null;
  cliente: string;
  metodoPago: string;
  total: number;
  fecha: string;
  renglones: Renglon[];
  atendidoPor: string | null;
  ivaPorcentaje: number;
  ivaIncluido: boolean;
  iepsHabilitado: boolean;
  iepsPorcentaje: number;
  anchoMm?: number;
  pieTicket?: string | null;
  efectivoRecibido?: number | null;
  cambio?: number | null;
};

export function Recibo({
  pedidoId, empresa, logoUrl, razonSocial, rfc, direccion, telefono,
  cliente, metodoPago, total, fecha, renglones, atendidoPor,
  ivaPorcentaje, ivaIncluido, iepsHabilitado, iepsPorcentaje,
  anchoMm = 72, pieTicket, efectivoRecibido, cambio,
}: ReciboProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [ancho, setAncho] = useState<Ancho>(
    (ANCHOS.includes(anchoMm as Ancho) ? anchoMm : 72) as Ancho
  );
  const folio = pedidoId.slice(0, 8).toUpperCase();
  const anchoPx = ancho === 58 ? 210 : ancho === 72 ? 260 : 302;

  // Cálculo de impuestos
  const subtotalBase = renglones.reduce((s, r) => s + r.subtotal, 0);
  const tieneIva = ivaPorcentaje > 0;
  let baseGravable = subtotalBase;
  let montoIva = 0;
  let montoIeps = 0;
  let totalFinal = total;

  if (tieneIva) {
    if (ivaIncluido) {
      baseGravable = subtotalBase / (1 + ivaPorcentaje / 100);
      montoIva = subtotalBase - baseGravable;
    } else {
      baseGravable = subtotalBase;
      montoIva = subtotalBase * (ivaPorcentaje / 100);
    }
  }
  if (iepsHabilitado && iepsPorcentaje > 0) {
    montoIeps = baseGravable * (iepsPorcentaje / 100);
    totalFinal = ivaIncluido ? total + montoIeps : baseGravable + montoIva + montoIeps;
  }

  useEffect(() => {
    QRCode.toDataURL(`Ventastack\nFolio: ${folio}\nTotal: $${totalFinal.toFixed(2)}`, { width: 120, margin: 1 })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(null));
  }, [folio, totalFinal]);

  const ticketJsx = (
    <>
      {/* Logo */}
      {logoUrl && (
        <div style={{ textAlign: "center", marginBottom: 4 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logoUrl} alt="logo" style={{ maxHeight: 48, maxWidth: "80%", margin: "0 auto" }} />
        </div>
      )}

      {/* Encabezado de la empresa */}
      <div style={{ textAlign: "center", marginBottom: 6 }}>
        <div style={{ fontWeight: "bold", fontSize: 13 }}>{empresa}</div>
        {razonSocial && <div style={{ fontSize: 9 }}>{razonSocial}</div>}
        {rfc && <div style={{ fontSize: 9 }}>RFC: {rfc}</div>}
        {direccion && <div style={{ fontSize: 9 }}>{direccion}</div>}
        {telefono && <div style={{ fontSize: 9 }}>Tel: {telefono}</div>}
      </div>

      {/* Folio y fecha */}
      <div style={{ borderTop: "1px dashed #999", padding: "4px 0", textAlign: "center" }}>
        <div style={{ fontSize: 10 }}>Folio: <strong>{folio}</strong></div>
        <div style={{ fontSize: 9 }}>{new Date(fecha).toLocaleString("es-MX")}</div>
      </div>

      {/* Cliente y pago */}
      <div style={{ borderTop: "1px dashed #999", padding: "4px 0", fontSize: 10 }}>
        <div>Cliente: {cliente}</div>
        <div>Pago: {metodoPago}</div>
        {atendidoPor && <div>Atendió: {atendidoPor}</div>}
      </div>

      {/* Productos */}
      <div style={{ borderTop: "1px dashed #999", padding: "4px 0" }}>
        {renglones.map((r, i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", marginBottom: 2, fontSize: 11 }}>
            <span>{r.cantidad} x {r.nombre}</span>
            <span>${r.subtotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
          </div>
        ))}
      </div>

      {/* Desglose de impuestos y TOTAL */}
      <div style={{ borderTop: "1px dashed #999", padding: "4px 0", fontSize: 10 }}>
        {/* Subtotal e impuestos */}
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span>Subtotal</span>
          <span>${baseGravable.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
        </div>
        {tieneIva && (
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>IVA {ivaPorcentaje}%</span>
            <span>${montoIva.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
          </div>
        )}
        {iepsHabilitado && montoIeps > 0 && (
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>IEPS {iepsPorcentaje}%</span>
            <span>${montoIeps.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
          </div>
        )}

        {/* Efectivo y cambio — antes del TOTAL */}
        {efectivoRecibido != null && (
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 2 }}>
            <span>Efectivo recibido</span>
            <span>${efectivoRecibido.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
          </div>
        )}
        {cambio != null && cambio > 0 && (
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>Cambio</span>
            <span>${cambio.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
          </div>
        )}

        {/* Línea separadora antes del TOTAL */}
        <div style={{ borderTop: "1px solid #333", marginTop: 4, paddingTop: 4, display: "flex", justifyContent: "space-between", fontWeight: "bold", fontSize: 13 }}>
          <span>TOTAL</span>
          <span>${totalFinal.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
        </div>
      </div>

      {/* QR */}
      {qrDataUrl && (
        <div style={{ textAlign: "center", borderTop: "1px dashed #999", paddingTop: 6 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrDataUrl} alt="QR" width={90} height={90} style={{ margin: "0 auto" }} />
        </div>
      )}

      {/* Pie de ticket — siempre visible */}
      <div style={{ borderTop: "1px dashed #999", padding: "6px 0", textAlign: "center" }}>
        {pieTicket ? (
          <div style={{ fontSize: 9, color: "#444", whiteSpace: "pre-line", lineHeight: 1.5 }}>
            {pieTicket}
          </div>
        ) : (
          <div style={{ fontSize: 9, color: "#888" }}>Gracias por tu compra</div>
        )}
      </div>
    </>
  );

  // Genera el HTML del ticket como string para abrirlo en ventana limpia
  // Necesario para iOS Safari que no soporta @media print con body > * { display: none }
  const imprimirTicket = () => {
    const ticketEl = document.getElementById("ticket-screen");
    if (!ticketEl) { window.print(); return; }

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>Recibo ${folio}</title>
  <style>
    @page { size: ${ancho}mm auto; margin: 2mm; }
    body { font-family: monospace; font-size: 11px; margin: 0; padding: 2mm; }
    img { max-width: 100%; }
  </style>
</head>
<body>
${ticketEl.innerHTML}
</body>
</html>`;

    const ventana = window.open("", "_blank", "width=400,height=600");
    if (!ventana) { window.print(); return; }
    ventana.document.write(html);
    ventana.document.close();
    // Esperar a que carguen las imágenes antes de imprimir
    ventana.onload = () => {
      setTimeout(() => {
        ventana.focus();
        ventana.print();
      }, 300);
    };
  };

  return (
    <>
      {/* Vista en pantalla */}
      <div className="flex min-h-screen flex-col items-center gap-4 bg-paper px-4 py-8">
        <div className="flex items-center gap-3 rounded-lg border border-linea bg-white px-4 py-2 shadow-sm">
          <span className="text-xs text-ink/60">Ancho de papel:</span>
          {ANCHOS.map((a) => (
            <button key={a} type="button" onClick={() => setAncho(a)}
              className={`rounded px-3 py-1 text-xs font-medium transition ${
                ancho === a ? "bg-primario text-white" : "border border-linea text-ink hover:bg-paper"
              }`}>
              {a}mm
            </button>
          ))}
        </div>

        {/* El ticket visible en pantalla — también se usa para copiar el HTML al imprimir */}
        <div
          id="ticket-screen"
          style={{ width: anchoPx, fontFamily: "monospace", fontSize: 11 }}
          className="rounded-lg border border-linea bg-white p-3 shadow-sm"
        >
          {ticketJsx}
        </div>

        <div className="flex w-full flex-col gap-2" style={{ maxWidth: anchoPx }}>
          <button type="button" onClick={imprimirTicket}
            className="w-full rounded-md bg-primario px-4 py-2 text-sm font-medium text-white transition hover:opacity-90">
            Imprimir / Guardar PDF
          </button>
          <Link href="/protected/pos" className="text-center text-sm text-primario hover:underline">
            Nueva venta →
          </Link>
        </div>
      </div>
    </>
  );
}
