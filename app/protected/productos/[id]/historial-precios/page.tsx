import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { TrendingUp, TrendingDown, Minus, Trash2 } from "lucide-react";

async function borrarEntrada(id: string, productoId: string) {
  "use server";
  const supabase = await createClient();
  await supabase.from("historial_precios").delete().eq("id", id);
  revalidatePath(`/protected/productos/${productoId}/historial-precios`);
}

async function borrarTodo(productoId: string) {
  "use server";
  const supabase = await createClient();
  await supabase.from("historial_precios").delete().eq("producto_id", productoId);
  revalidatePath(`/protected/productos/${productoId}/historial-precios`);
}

export default async function HistorialPreciosPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) redirect("/auth/login");

  const { data: miPerfil } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", data.claims.sub as string)
    .single();

  if (miPerfil?.role !== "admin") redirect("/protected");

  const { data: producto } = await supabase
    .from("productos")
    .select("id, nombre, precio, costo")
    .eq("id", id)
    .single();

  if (!producto) redirect("/protected/productos");

  const { data: historial } = await supabase
    .from("historial_precios")
    .select("*")
    .eq("producto_id", id)
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div className="flex flex-col gap-4 max-w-2xl">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-ink">Historial de precios</h1>
          <p className="text-sm text-ink/60">{producto.nombre}</p>
        </div>
        <Link href="/protected/productos" className="text-sm text-primario hover:underline">
          Regresar
        </Link>
      </div>

      {/* Precio actual */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-linea bg-white p-4 text-center shadow-sm">
          <p className="text-xs text-ink/50">Precio actual</p>
          <p className="text-2xl font-bold text-primario cifra">
            ${producto.precio.toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="rounded-xl border border-linea bg-white p-4 text-center shadow-sm">
          <p className="text-xs text-ink/50">Costo actual</p>
          <p className="text-2xl font-bold text-ink cifra">
            ${producto.costo.toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-verde mt-0.5">
            Margen: ${(producto.precio - producto.costo).toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      {/* Tabla de historial */}
      <div className="overflow-hidden rounded-xl border border-linea bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-linea bg-primario-suave px-4 py-3">
          <h2 className="font-semibold text-ink">
            Cambios registrados — {historial?.length ?? 0}
          </h2>
          {historial && historial.length > 0 && (
            <form action={borrarTodo.bind(null, id)}>
              <button
                type="submit"
                onClick={(e) => {
                  if (!confirm("¿Borrar TODO el historial de este producto?")) e.preventDefault();
                }}
                className="flex items-center gap-1.5 text-xs text-red-600 hover:underline"
              >
                <Trash2 size={13} />
                Borrar todo
              </button>
            </form>
          )}
        </div>

        {!historial?.length ? (
          <p className="px-4 py-8 text-center text-sm text-ink/40">
            Sin cambios registrados todavía. El historial se guarda automáticamente
            cada vez que editas el precio o costo desde Catálogo.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-primario text-left text-xs font-semibold uppercase tracking-wide text-white">
                <th className="px-4 py-2.5">Fecha</th>
                <th className="px-4 py-2.5">Cambió</th>
                <th className="px-4 py-2.5 text-right">Antes</th>
                <th className="px-4 py-2.5 text-right">Después</th>
                <th className="px-4 py-2.5">Por</th>
                <th className="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-linea">
              {historial.map((h, idx) => {
                const esPrecio = h.tipo_cambio === "precio" || h.tipo_cambio === "ambos";
                
                const antes = esPrecio ? h.precio_anterior : h.costo_anterior;
                const despues = esPrecio ? h.precio_nuevo : h.costo_nuevo;
                const subio = (despues ?? 0) > (antes ?? 0);
                const bajo = (despues ?? 0) < (antes ?? 0);

                return (
                  <tr key={h.id} className={idx % 2 === 1 ? "bg-paper/60" : ""}>
                    <td className="px-4 py-2.5 text-xs text-ink/60">
                      {new Date(h.created_at).toLocaleString("es-MX", {
                        dateStyle: "short", timeStyle: "short",
                      })}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        h.tipo_cambio === "precio"
                          ? "bg-primario-suave text-primario"
                          : h.tipo_cambio === "costo"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-paper text-ink/70"
                      }`}>
                        {h.tipo_cambio === "ambos" ? "precio + costo" : h.tipo_cambio}
                      </span>
                    </td>
                    <td className="cifra px-4 py-2.5 text-right text-ink/60">
                      ${(antes ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {subio ? (
                          <TrendingUp size={13} className="text-red-500" />
                        ) : bajo ? (
                          <TrendingDown size={13} className="text-verde" />
                        ) : (
                          <Minus size={13} className="text-ink/30" />
                        )}
                        <span className={`cifra font-medium ${
                          subio ? "text-red-600" : bajo ? "text-verde" : "text-ink"
                        }`}>
                          ${(despues ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-ink/60">
                      {h.cambiado_por_nombre ?? "Sistema"}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <form action={borrarEntrada.bind(null, h.id, id)}>
                        <button
                          type="submit"
                          className="text-ink/20 hover:text-red-600 transition-colors"
                          title="Borrar este registro"
                        >
                          <Trash2 size={14} />
                        </button>
                      </form>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
