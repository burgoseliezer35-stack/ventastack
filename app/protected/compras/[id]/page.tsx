import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";

export default async function CompraDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims) redirect("/auth/login");

  // Obtener company_id del usuario para que RLS permita la lectura
  const { data: perfil } = await supabase
    .from("profiles")
    .select("company_id")
    .eq("id", auth.claims.sub as string)
    .single();

  const { data: compra } = await supabase
    .from("compras")
    .select(`
      id, total, total_ticket, folio_proveedor, nota,
      created_at, fecha_ticket, impuestos_incluidos,
      proveedores(nombre),
      profiles(full_name)
    `)
    .eq("id", id)
    .eq("company_id", perfil?.company_id)
    .single();

  if (!compra) notFound();

  const { data: detalle } = await supabase
    .from("detalle_compras")
    .select(`
      cantidad, costo_unitario, subtotal,
      costo_base, ieps_porcentaje, monto_ieps,
      iva_porcentaje, monto_iva, subtotal_con_impuestos,
      productos(nombre, codigo_barras)
    `)
    .eq("compra_id", id)
    .eq("company_id", perfil?.company_id);

  const proveedor = Array.isArray(compra.proveedores)
    ? compra.proveedores[0]?.nombre
    : (compra.proveedores as { nombre: string } | null)?.nombre;

  const registradoPor = Array.isArray(compra.profiles)
    ? compra.profiles[0]?.full_name
    : (compra.profiles as { full_name: string } | null)?.full_name;

  // Totales del desglose fiscal
  const r2 = (n: number) => Math.round(n * 100) / 100;
  const totalBase = r2(detalle?.reduce((s, d) => s + (d.costo_base ?? d.costo_unitario) * d.cantidad, 0) ?? 0);
  const totalIeps = r2(detalle?.reduce((s, d) => s + (d.monto_ieps ?? 0) * d.cantidad, 0) ?? 0);
  const totalIva  = r2(detalle?.reduce((s, d) => s + (d.monto_iva ?? 0) * d.cantidad, 0) ?? 0);
  const totalConImpuestos = r2(detalle?.reduce((s, d) => s + (d.subtotal_con_impuestos ?? d.subtotal), 0) ?? 0);
  const totalTicket = compra.total_ticket ?? compra.total;
  const diferencia = r2(totalTicket - totalConImpuestos);

  return (
    <div className="flex flex-col gap-4 max-w-2xl">

      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/protected/compras" className="text-sm text-primario hover:underline">
          ← Compras
        </Link>
        <span className="text-ink/20">/</span>
        <span className="text-sm font-semibold text-ink truncate">
          {proveedor ?? "Sin proveedor"}
        </span>
      </div>

      {/* Datos del ticket */}
      <div className="rounded-xl border border-linea bg-white overflow-hidden">
        <div className="border-b border-linea bg-primario-suave px-5 py-3">
          <p className="text-sm font-semibold text-ink">Ticket del proveedor</p>
        </div>
        <div className="p-5 grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <div>
            <p className="text-xs text-ink/40 mb-0.5">Proveedor</p>
            <p className="font-semibold text-ink">{proveedor ?? "Sin proveedor"}</p>
          </div>
          <div>
            <p className="text-xs text-ink/40 mb-0.5">Folio del ticket</p>
            <p className="font-mono font-semibold text-ink">{compra.folio_proveedor ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs text-ink/40 mb-0.5">Fecha del ticket</p>
            <p className="text-ink">
              {compra.fecha_ticket
                ? new Date(compra.fecha_ticket).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" })
                : new Date(compra.created_at).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" })}
            </p>
          </div>
          <div>
            <p className="text-xs text-ink/40 mb-0.5">Registrado por</p>
            <p className="text-ink">{registradoPor ?? "—"}</p>
          </div>
          <div className="col-span-2">
            <p className="text-xs text-ink/40 mb-0.5">Precios en el ticket</p>
            <p className="text-ink">
              {compra.impuestos_incluidos ? "Con IVA/IEPS incluido" : "Sin impuestos (base)"}
            </p>
          </div>
          {compra.nota && (
            <div className="col-span-2">
              <p className="text-xs text-ink/40 mb-0.5">Nota</p>
              <p className="text-ink">{compra.nota}</p>
            </div>
          )}
        </div>
      </div>

      {/* Productos recibidos */}
      <div className="rounded-xl border border-linea bg-white overflow-hidden">
        <div className="border-b border-linea bg-primario-suave px-5 py-3">
          <p className="text-sm font-semibold text-ink">Productos recibidos</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-primario text-left text-xs font-semibold uppercase tracking-wide text-white">
                <th className="px-4 py-2.5">Producto</th>
                <th className="px-4 py-2.5 text-right">Cant.</th>
                <th className="px-4 py-2.5 text-right">Base c/u</th>
                <th className="px-4 py-2.5 text-right">IEPS</th>
                <th className="px-4 py-2.5 text-right">IVA</th>
                <th className="px-4 py-2.5 text-right">Subtotal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-linea">
              {detalle?.map((d, i) => {
                const prod = Array.isArray(d.productos) ? d.productos[0] : d.productos;
                const base = d.costo_base ?? d.costo_unitario;
                const subtotal = d.subtotal_con_impuestos ?? d.subtotal;
                return (
                  <tr key={i} className={i % 2 === 1 ? "bg-paper/60" : ""}>
                    <td className="px-4 py-2.5">
                      <p className="font-medium text-ink">{prod?.nombre ?? "—"}</p>
                      {prod?.codigo_barras && (
                        <p className="text-[10px] font-mono text-ink/40">{prod.codigo_barras}</p>
                      )}
                    </td>
                    <td className="cifra px-4 py-2.5 text-right text-ink">{d.cantidad}</td>
                    <td className="cifra px-4 py-2.5 text-right text-ink/70">
                      ${base.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="cifra px-4 py-2.5 text-right text-ink/70">
                      {d.ieps_porcentaje ? (
                        <span>
                          ${(d.monto_ieps ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          <span className="text-[10px] text-ink/30 ml-0.5">{d.ieps_porcentaje}%</span>
                        </span>
                      ) : <span className="text-ink/30">—</span>}
                    </td>
                    <td className="cifra px-4 py-2.5 text-right text-ink/70">
                      {d.iva_porcentaje ? (
                        <span>
                          ${(d.monto_iva ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          <span className="text-[10px] text-ink/30 ml-0.5">{d.iva_porcentaje}%</span>
                        </span>
                      ) : <span className="text-ink/30">—</span>}
                    </td>
                    <td className="cifra px-4 py-2.5 text-right font-semibold text-ink">
                      ${subtotal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Desglose fiscal total */}
        <div className="border-t border-linea bg-paper px-5 py-4 text-sm space-y-1.5">
          <div className="flex justify-between text-ink/60">
            <span>Base (sin impuestos)</span>
            <span className="cifra">${totalBase.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
          {totalIeps > 0 && (
            <div className="flex justify-between text-ink/60">
              <span>IEPS</span>
              <span className="cifra">${totalIeps.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          )}
          {totalIva > 0 && (
            <div className="flex justify-between text-ink/60">
              <span>IVA 16%</span>
              <span className="cifra">${totalIva.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-ink border-t border-linea pt-2 mt-1">
            <span>Total calculado</span>
            <span className="cifra">${totalConImpuestos.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>

          {/* Cuadre con el ticket */}
          <div className="flex justify-between text-ink/60 mt-1">
            <span>Total del ticket del proveedor</span>
            <span className="cifra">${totalTicket.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
          <div className={`flex justify-between font-semibold ${Math.abs(diferencia) < 0.02 ? "text-verde" : "text-red-600"}`}>
            <span>Diferencia</span>
            <span className="cifra">
              {Math.abs(diferencia) < 0.02
                ? "✓ Cuadra"
                : `${diferencia > 0 ? "+" : ""}$${diferencia.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
