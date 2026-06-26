import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { AccionesFactura } from "./acciones";

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

  return (
    <div className="flex flex-col gap-4 max-w-xl">
      <div className="flex items-center gap-3">
        <Link href="/protected/facturas" className="text-sm text-primario hover:underline">
          ← Facturas
        </Link>
        <span className="text-ink/30">/</span>
        <span className="font-mono text-sm font-bold text-ink">{sol.folio}</span>
      </div>

      {/* Datos del cliente fiscal */}
      <div className="rounded-xl border border-linea bg-white p-5">
        <p className="text-sm font-semibold text-ink mb-3">Datos fiscales del cliente</p>
        <div className="grid grid-cols-2 gap-2 text-sm">
          {[
            { label: "RFC", valor: cf?.rfc },
            { label: "CP fiscal", valor: cf?.codigo_postal },
            { label: "Nombre / Razón social", valor: cf?.nombre, full: true },
            { label: "Régimen", valor: cf?.regimen_fiscal ? `${cf.regimen_fiscal} - ${REGIMENES[cf.regimen_fiscal] ?? ""}` : null, full: true },
            { label: "Uso CFDI", valor: sol.uso_cfdi },
            { label: "Email", valor: cf?.email },
            { label: "WhatsApp", valor: cf?.whatsapp },
          ].filter((c) => c.valor).map(({ label, valor, full }) => (
            <div key={label} className={full ? "col-span-2" : ""}>
              <p className="text-xs text-ink/40">{label}</p>
              <p className="font-medium text-ink">{valor}</p>
            </div>
          ))}
        </div>
        {cf?.constancia_url && (
          <a href={cf.constancia_url} target="_blank" rel="noopener noreferrer"
            className="mt-3 flex items-center gap-2 text-xs text-primario hover:underline">
            Ver Constancia de Situación Fiscal (PDF)
          </a>
        )}
      </div>

      {/* Venta original */}
      {pedido && (
        <div className="rounded-xl border border-linea bg-white p-5">
          <p className="text-sm font-semibold text-ink mb-3">Venta original</p>
          <div className="flex justify-between text-sm">
            <span className="text-ink/60">Total</span>
            <span className="cifra font-bold text-ink">
              ${pedido.total.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="flex justify-between text-sm mt-1">
            <span className="text-ink/60">Fecha</span>
            <span className="text-ink">
              {new Date(pedido.created_at).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" })}
            </span>
          </div>
          <div className="flex justify-between text-sm mt-1">
            <span className="text-ink/60">Pago</span>
            <span className="text-ink capitalize">{pedido.metodo_pago}</span>
          </div>
        </div>
      )}

      {/* Acciones — subir CFDI, cambiar estado, enviar */}
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
  );
}
