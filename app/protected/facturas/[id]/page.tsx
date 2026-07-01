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
      clientes_fiscales(id, rfc, nombre, codigo_postal, regimen_fiscal, email, whatsapp, constancia_url, constancia_subida_at),
      pedidos(id, total, created_at, metodo_pago)
    `)
    .eq("id", id)
    .eq("company_id", perfil.company_id)
    .single();

  if (!sol) notFound();

  const cf = Array.isArray(sol.clientes_fiscales) ? sol.clientes_fiscales[0] : sol.clientes_fiscales;
  const pedido = Array.isArray(sol.pedidos) ? sol.pedidos[0] : sol.pedidos;

  // Generar URL firmada para la constancia (expira en 1 hora)
  // El bucket es privado — nadie sin sesión puede acceder
  let constanciaSignedUrl: string | null = null;
  let cfdiSignedUrl: string | null = null;

  if (cf?.constancia_url) {
    // Extraer la ruta del archivo desde la URL pública o privada
    const match = cf.constancia_url.match(/\/facturas\/(.+)$/);
    if (match) {
      const { data: signed } = await supabase.storage
        .from("facturas")
        .createSignedUrl(match[1], 3600); // 1 hora
      constanciaSignedUrl = signed?.signedUrl ?? cf.constancia_url;
    } else {
      constanciaSignedUrl = cf.constancia_url;
    }
  }

  if (sol.cfdi_url) {
    const match = sol.cfdi_url.match(/\/facturas\/(.+)$/);
    if (match) {
      const { data: signed } = await supabase.storage
        .from("facturas")
        .createSignedUrl(match[1], 3600);
      cfdiSignedUrl = signed?.signedUrl ?? sol.cfdi_url;
    } else {
      cfdiSignedUrl = sol.cfdi_url;
    }
  }

  // Calcular días restantes si tiene fecha de subida
  const cfRecord = cf as { constancia_url?: string | null; constancia_subida_at?: string | null; rfc?: string } & typeof cf;
  // Date.now() no puede usarse directamente en render (función impura).
  // Se calcula aquí, fuera del JSX, una sola vez al montar el server component.
  const ahora = new Date().getTime();
  const diasRestantes = cfRecord?.constancia_subida_at
    ? Math.max(0, 30 - Math.floor((ahora - new Date(cfRecord.constancia_subida_at).getTime()) / (1000 * 60 * 60 * 24)))
    : null;

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
            {constanciaSignedUrl && (
              <div className="px-5 pb-4 border-t border-linea pt-3">
                {/* Aviso de expiración */}
                {diasRestantes !== null && (
                  <div className={`mb-2 rounded-lg px-3 py-2 text-xs font-medium flex items-center gap-2 ${
                    diasRestantes <= 5
                      ? "bg-red-50 border border-red-200 text-red-700"
                      : diasRestantes <= 10
                      ? "bg-amber-50 border border-amber-200 text-amber-700"
                      : "bg-blue-50 border border-blue-200 text-blue-700"
                  }`}>
                    <span>{diasRestantes <= 0 ? "⚠ La constancia ya expiró del servidor" : `⏱ La constancia se borra del servidor en ${diasRestantes} día${diasRestantes !== 1 ? "s" : ""}`}</span>
                  </div>
                )}
                {diasRestantes === null && (
                  <div className="mb-2 rounded-lg px-3 py-2 text-xs font-medium flex items-center gap-2 bg-blue-50 border border-blue-200 text-blue-700">
                    <span>⏱ Las constancias se borran automáticamente a los 30 días por seguridad. Descárgala si la necesitas.</span>
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <a href={constanciaSignedUrl} target="_blank" rel="noopener noreferrer"
                    className="text-xs text-primario hover:underline">
                    Ver constancia
                  </a>
                  <a href={constanciaSignedUrl} download={`constancia-${cf?.rfc}.pdf`}
                    className="text-xs font-semibold text-white bg-primario rounded-lg px-3 py-1.5 hover:opacity-90 transition">
                    ⬇ Descargar PDF
                  </a>
                </div>
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
            cfdiUrl={cfdiSignedUrl}
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
