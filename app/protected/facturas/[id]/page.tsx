import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { AccionesFactura } from "./acciones";
import { FileText, CreditCard, Calendar, Wallet } from "lucide-react";

export default async function DetalleFacturaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) redirect("/auth/login");

  const { data: perfil } = await supabase
    .from("profiles")
    .select("role, company_id")
    .eq("id", data.claims.sub as string)
    .single();

  if (perfil?.role !== "admin") redirect("/protected");

  const { data: sol } = await supabase
    .from("solicitudes_factura")
    .select(`
      id, folio, uso_cfdi, estado, cfdi_url, notas, created_at,
      clientes_fiscales(id, rfc, nombre, codigo_postal, regimen_fiscal, email, whatsapp, constancia_url),
      pedidos(id, total, created_at, metodo_pago)
    `)
    .eq("id", id)
    .eq("company_id", perfil.company_id)
    .single();

  if (!sol) notFound();

  const cf = Array.isArray(sol.clientes_fiscales) ? sol.clientes_fiscales[0] : sol.clientes_fiscales;
  const pedido = Array.isArray(sol.pedidos) ? sol.pedidos[0] : sol.pedidos;

  const REGIMENES: Record<string, string> = {
    "601": "General de Ley Personas Morales",
    "603": "Personas Morales con Fines no Lucrativos",
    "606": "Arrendamiento",
    "608": "Demás ingresos",
    "612": "Personas Físicas con Actividades Empresariales",
    "616": "Sin obligaciones fiscales",
    "621": "Incorporación Fiscal",
    "625": "Plataformas Tecnológicas",
    "626": "RESICO",
  };

  const ESTADOS: Record<string, { label: string; color: string }> = {
    pendiente:  { label: "Pendiente",  color: "bg-amber-100 text-amber-700 border-amber-200" },
    en_proceso: { label: "En proceso", color: "bg-blue-100 text-blue-700 border-blue-200" },
    enviada:    { label: "Enviada",    color: "bg-green-100 text-green-700 border-green-200" },
    rechazada:  { label: "Rechazada", color: "bg-red-100 text-red-700 border-red-200" },
  };

  const estadoInfo = ESTADOS[sol.estado] ?? ESTADOS.pendiente;

  return (
    <div className="flex flex-col gap-5 max-w-5xl">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/protected/facturas" className="text-sm text-primario hover:underline">
            ← Facturas
          </Link>
          <span className="text-ink/20">/</span>
          <span className="font-mono text-sm font-bold text-ink">{sol.folio}</span>
          <span className={`rounded-full border px-3 py-0.5 text-xs font-semibold ${estadoInfo.color}`}>
            {estadoInfo.label}
          </span>
        </div>
        <p className="text-xs text-ink/40 hidden md:block">
          Solicitada el {new Date(sol.created_at).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" })}
        </p>
      </div>

      {/* Layout 2 columnas en web, 1 en móvil */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

        {/* Columna izquierda */}
        <div className="flex flex-col gap-4">

          {/* Datos fiscales */}
          <div className="rounded-xl border border-linea bg-white overflow-hidden">
            <div className="px-5 py-3.5 border-b border-linea flex items-center gap-2">
              <FileText size={15} className="text-primario" />
              <p className="text-sm font-semibold text-ink">Datos fiscales del cliente</p>
            </div>
            <div className="p-5 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <div>
                <p className="text-xs text-ink/40 mb-0.5">RFC</p>
                <p className="font-mono font-semibold text-ink">{cf?.rfc ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs text-ink/40 mb-0.5">CP fiscal</p>
                <p className="font-medium text-ink">{cf?.codigo_postal ?? "—"}</p>
              </div>
              <div className="col-span-2">
                <p className="text-xs text-ink/40 mb-0.5">Nombre / Razón social</p>
                <p className="font-semibold text-ink">{cf?.nombre ?? "—"}</p>
              </div>
              <div className="col-span-2">
                <p className="text-xs text-ink/40 mb-0.5">Régimen fiscal</p>
                <p className="font-medium text-ink text-xs">
                  {cf?.regimen_fiscal
                    ? `${cf.regimen_fiscal} — ${REGIMENES[cf.regimen_fiscal] ?? ""}`
                    : "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-ink/40 mb-0.5">Uso CFDI</p>
                <p className="font-semibold text-ink">{sol.uso_cfdi}</p>
              </div>
              <div>
                <p className="text-xs text-ink/40 mb-0.5">Email</p>
                <p className="text-ink text-xs truncate">{cf?.email ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs text-ink/40 mb-0.5">WhatsApp</p>
                <p className="font-medium text-ink">{cf?.whatsapp ?? "—"}</p>
              </div>
            </div>
            {cf?.constancia_url && (
              <div className="px-5 pb-4 flex items-center gap-3 border-t border-linea pt-3">
                <a href={cf.constancia_url} target="_blank" rel="noopener noreferrer"
                  className="text-xs text-primario hover:underline">
                  Ver constancia
                </a>
                <a href={cf.constancia_url} download={`constancia-${cf.rfc}.pdf`}
                  className="text-xs font-semibold text-white bg-primario rounded-lg px-3 py-1.5 hover:opacity-90 transition">
                  Descargar PDF
                </a>
              </div>
            )}
          </div>

          {/* Venta original */}
          {pedido && (
            <div className="rounded-xl border border-linea bg-white overflow-hidden">
              <div className="px-5 py-3.5 border-b border-linea flex items-center gap-2">
                <CreditCard size={15} className="text-primario" />
                <p className="text-sm font-semibold text-ink">Venta original</p>
              </div>
              <div className="p-5 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-ink/60 text-sm">
                    <Wallet size={14} />
                    <span>Total</span>
                  </div>
                  <span className="cifra text-xl font-bold text-ink">
                    ${pedido.total.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 text-ink/60">
                    <Calendar size={14} />
                    <span>Fecha</span>
                  </div>
                  <span className="text-ink">
                    {new Date(pedido.created_at).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" })}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-ink/60">Método de pago</span>
                  <span className="capitalize font-medium text-ink">{pedido.metodo_pago}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Columna derecha — acciones */}
        <div>
          <AccionesFactura
            solicitudId={sol.id}
            companyId={perfil.company_id}
            folio={sol.folio}
            estado={sol.estado}
            cfdiUrl={sol.cfdi_url}
            clienteEmail={cf?.email ?? null}
            clienteWhatsapp={cf?.whatsapp ?? null}
            clienteNombre={cf?.nombre ?? null}
            pedidoId={pedido?.id ?? null}
          />
        </div>
      </div>
    </div>
  );
}
