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

  // RPC pública (security definer): esta página la abre el cliente
  // final sin sesión de empleado, así que una consulta normal contra
  // "pedidos" siempre da 0 filas por RLS (get_my_company_id() = NULL
  // sin sesión). La RPC resuelve el folio del lado del servidor con
  // permiso controlado, exponiendo solo los campos que la página usa.
  const { data: rows, error } = await supabase.rpc("obtener_pedido_por_folio", {
    p_folio: folio,
  });

  const pedido = rows?.[0];

  if (error || !pedido) notFound();

  const empresa = {
    name: pedido.empresa_nombre,
    logo_url: pedido.empresa_logo_url,
  };

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
          pedidoId={pedido.pedido_id}
          companyId={pedido.company_id}
          folio={folio}
          total={pedido.total}
        />
      </div>
    </div>
  );
}
