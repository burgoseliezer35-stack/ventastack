import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { FileText, Clock, CheckCircle, XCircle, AlertCircle } from "lucide-react";

const ESTADOS: Record<string, { label: string; color: string; Icono: typeof Clock }> = {
  pendiente:   { label: "Pendiente",   color: "text-amber-600 bg-amber-50 border-amber-200",   Icono: Clock },
  en_proceso:  { label: "En proceso",  color: "text-blue-600 bg-blue-50 border-blue-200",       Icono: AlertCircle },
  enviada:     { label: "Enviada",     color: "text-green-600 bg-green-50 border-green-200",    Icono: CheckCircle },
  rechazada:   { label: "Rechazada",   color: "text-red-600 bg-red-50 border-red-200",          Icono: XCircle },
};

export default async function FacturasPage() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) redirect("/auth/login");

  const { data: perfil } = await supabase
    .from("profiles")
    .select("role, company_id")
    .eq("id", data.claims.sub as string)
    .single();

  if (perfil?.role !== "admin") redirect("/protected");

  const { data: solicitudes } = await supabase
    .from("solicitudes_factura")
    .select(`
      id, folio, uso_cfdi, estado, created_at,
      clientes_fiscales(rfc, nombre, email, whatsapp),
      pedidos(total)
    `)
    .eq("company_id", perfil.company_id)
    .order("created_at", { ascending: false });

  const pendientes = solicitudes?.filter((s) => s.estado === "pendiente").length ?? 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-ink">Solicitudes de Factura</h1>
          <p className="text-xs text-ink/50 mt-0.5">
            {pendientes > 0
              ? `${pendientes} solicitud${pendientes > 1 ? "es" : ""} pendiente${pendientes > 1 ? "s" : ""}`
              : "Todo al día"}
          </p>
        </div>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Object.entries(ESTADOS).map(([estado, { label, color, Icono }]) => {
          const count = solicitudes?.filter((s) => s.estado === estado).length ?? 0;
          return (
            <div key={estado} className={`rounded-xl border p-3 ${color}`}>
              <div className="flex items-center gap-2">
                <Icono size={14} />
                <span className="text-xs font-semibold">{label}</span>
              </div>
              <p className="text-2xl font-bold mt-1">{count}</p>
            </div>
          );
        })}
      </div>

      {/* Lista */}
      {!solicitudes?.length ? (
        <div className="rounded-xl border border-linea bg-white p-12 text-center">
          <FileText size={32} className="mx-auto mb-2 text-ink/20" />
          <p className="text-sm text-ink/50">Aún no hay solicitudes de factura.</p>
          <p className="text-xs text-ink/30 mt-1">
            Cuando un cliente escanee el QR del ticket y llene sus datos, aparecerá aquí.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {solicitudes.map((s) => {
            const cf = Array.isArray(s.clientes_fiscales) ? s.clientes_fiscales[0] : s.clientes_fiscales;
            const pedido = Array.isArray(s.pedidos) ? s.pedidos[0] : s.pedidos;
            const { label, color, Icono } = ESTADOS[s.estado] ?? ESTADOS.pendiente;
            return (
              <Link key={s.id} href={`/protected/facturas/${s.id}`}
                className="flex items-center gap-4 rounded-xl border border-linea bg-white px-4 py-3 hover:border-primario transition">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold text-ink">{s.folio}</span>
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold flex items-center gap-1 ${color}`}>
                      <Icono size={9} />{label}
                    </span>
                  </div>
                  <p className="text-xs text-ink/70 truncate mt-0.5">
                    {cf?.nombre ?? "—"} · {cf?.rfc ?? "—"}
                  </p>
                  <p className="text-xs text-ink/40">
                    {new Date(s.created_at).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" })}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="cifra text-sm font-bold text-ink">
                    ${(pedido?.total ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-ink/40">{s.uso_cfdi}</p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
