import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";

export default async function CompraDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: compra } = await supabase
    .from("compras")
    .select("id, total, nota, created_at, proveedores(nombre)")
    .eq("id", id)
    .single();

  if (!compra) {
    notFound();
  }

  const { data: detalle } = await supabase
    .from("detalle_compras")
    .select("cantidad, costo_unitario, subtotal, productos(nombre)")
    .eq("compra_id", id);

  const proveedor = Array.isArray(compra.proveedores)
    ? compra.proveedores[0]?.nombre
    : (compra.proveedores as { nombre: string } | null)?.nombre;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-ink">{proveedor ?? "Proveedor"}</h1>
        <p className="text-sm text-ink/60">
          {new Date(compra.created_at).toLocaleString("es-MX")}
          {compra.nota ? ` · ${compra.nota}` : ""}
        </p>
      </div>

      <div className="rounded-lg border border-linea bg-white p-4">
        <ul className="flex flex-col gap-2">
          {detalle?.map((d, i) => {
            const producto = Array.isArray(d.productos)
              ? d.productos[0]?.nombre
              : (d.productos as { nombre: string } | null)?.nombre;
            return (
              <li
                key={i}
                className="flex items-center justify-between border-b border-linea pb-2 text-sm last:border-0"
              >
                <span className="text-ink">{producto ?? "Producto"}</span>
                <span className="cifra text-ink/60">
                  {d.cantidad} × ${d.costo_unitario.toFixed(2)} = $
                  {d.subtotal.toFixed(2)}
                </span>
              </li>
            );
          })}
        </ul>
        <div className="mt-3 flex justify-between border-t border-linea pt-3 text-sm font-semibold text-ink">
          <span>Total</span>
          <span className="cifra">${compra.total.toFixed(2)}</span>
        </div>
      </div>

      <Link href="/protected/compras" className="text-sm text-primario hover:underline">
        Regresar al historial
      </Link>
    </div>
  );
}
