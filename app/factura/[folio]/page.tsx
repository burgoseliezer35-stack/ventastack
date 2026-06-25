import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { FormularioFactura } from "./formulario";

export default async function FacturaPublicaPage({
  params,
}: {
  params: Promise<{ folio: string }>;
}) {
  const { folio } = await params;
  const supabase = await createClient();

  // Buscar el pedido por folio (los primeros 8 chars del ID en mayúsculas)
  const { data: pedidos } = await supabase
    .from("pedidos")
    .select("id, total, created_at, company_id, companies(name, logo_url)")
    .order("created_at", { ascending: false });

  // Buscar pedido cuyo ID empiece con el folio
  const pedido = pedidos?.find(
    (p) => p.id.replace(/-/g, "").toUpperCase().slice(0, 8) === folio.toUpperCase()
  );

  if (!pedido) notFound();

  const empresa = Array.isArray(pedido.companies)
    ? pedido.companies[0]
    : pedido.companies;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-8 px-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-6">
          {empresa?.logo_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={empresa.logo_url} alt="Logo" className="h-16 mx-auto mb-3 object-contain" />
          )}
          <h1 className="text-xl font-bold text-gray-900">{empresa?.name ?? "Negocio"}</h1>
          <p className="text-sm text-gray-500 mt-1">Solicitud de Factura CFDI</p>
          <div className="mt-2 inline-flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-4 py-2">
            <span className="text-xs text-gray-500">Folio:</span>
            <span className="font-mono font-bold text-gray-900">{folio}</span>
            <span className="text-gray-300">·</span>
            <span className="font-bold text-gray-900">
              ${pedido.total.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        <FormularioFactura
          pedidoId={pedido.id}
          companyId={pedido.company_id}
          folio={folio}
          total={pedido.total}
        />
      </div>
    </div>
  );
}
