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

export function Recibo({
  pedidoId,
  empresa,
  cliente,
  metodoPago,
  total,
  fecha,
  renglones,
}: {
  pedidoId: string;
  empresa: string;
  cliente: string;
  metodoPago: string;
  total: number;
  fecha: string;
  renglones: Renglon[];
}) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const folio = pedidoId.slice(0, 8).toUpperCase();

  useEffect(() => {
    // El QR es "dinámico" en el sentido de que se genera al momento,
    // con los datos reales de ESTA venta — no es una imagen fija.
    const texto = `Ventastack\nFolio: ${folio}\nTotal: $${total.toFixed(2)}`;
    QRCode.toDataURL(texto, { width: 160, margin: 1 })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(null));
  }, [folio, total]);

  return (
    <div className="flex min-h-screen flex-col items-center gap-4 bg-gray-50 px-4 py-10 print:bg-white print:py-0">
      {/* Ancho de ~72mm, el tamaño típico de un rollo de papel
          térmico. Fuente monoespaciada para que se vea como ticket. */}
      <div className="w-full max-w-[280px] rounded-lg border border-gray-200 bg-white p-4 font-mono text-xs text-gray-800 shadow-sm print:rounded-none print:border-0 print:shadow-none">
        <div className="mb-2 text-center">
          <p className="text-sm font-bold">{empresa}</p>
          <p>Folio: {folio}</p>
          <p>{new Date(fecha).toLocaleString("es-MX")}</p>
        </div>

        <div className="border-t border-dashed border-gray-300 py-2">
          <p>Cliente: {cliente}</p>
          <p>Pago: {metodoPago}</p>
        </div>

        <div className="border-t border-dashed border-gray-300 py-2">
          {renglones.map((r, i) => (
            <div key={i} className="mb-1 flex justify-between gap-2">
              <span className="flex-1">
                {r.cantidad} x {r.nombre}
              </span>
              <span>${r.subtotal.toFixed(2)}</span>
            </div>
          ))}
        </div>

        <div className="flex justify-between border-t border-dashed border-gray-300 py-2 text-sm font-bold">
          <span>TOTAL</span>
          <span>${total.toFixed(2)}</span>
        </div>

        {qrDataUrl && (
          <div className="flex flex-col items-center gap-1 border-t border-dashed border-gray-300 py-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrDataUrl} alt="Código QR del folio" width={120} height={120} />
            <p className="text-center text-[10px] text-gray-500">
              Gracias por tu compra
            </p>
          </div>
        )}
      </div>

      <div className="flex w-full max-w-[280px] flex-col gap-2 print:hidden">
        <button
          type="button"
          onClick={() => window.print()}
          className="w-full rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700"
        >
          Imprimir
        </button>
        <Link
          href="/protected/pos"
          className="text-center text-sm text-emerald-600 hover:underline"
        >
          Nueva venta →
        </Link>
      </div>
    </div>
  );
}
