import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Package, Truck, Store, Plus, ArrowRightLeft } from "lucide-react";
import { revalidatePath } from "next/cache";

async function crearAlmacen(formData: FormData) {
  "use server";
  const supabase = await createClient();
  const nombre = (formData.get("nombre") as string)?.trim();
  const tipo = formData.get("tipo") as string;
  const descripcion = (formData.get("descripcion") as string)?.trim() || null;
  if (!nombre) return;
  await supabase.from("almacenes").insert({ nombre, tipo, descripcion });
  revalidatePath("/protected/almacenes");
}

const TIPO_ICONO: Record<string, { Icono: typeof Package; color: string; label: string }> = {
  bodega: { Icono: Package, color: "text-primario", label: "Bodega" },
  camion: { Icono: Truck, color: "text-amber-600", label: "Camión" },
  tienda: { Icono: Store, color: "text-verde", label: "Tienda" },
  punto_venta: { Icono: Store, color: "text-ink/60", label: "Punto de venta" },
};

export default async function AlmacenesPage() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) redirect("/auth/login");

  const { data: miPerfil } = await supabase
    .from("profiles").select("role").eq("id", data.claims.sub as string).single();
  if (miPerfil?.role !== "admin") redirect("/protected");

  const { data: almacenes } = await supabase
    .from("almacenes")
    .select("id, nombre, tipo, descripcion, activo")
    .eq("activo", true)
    .order("created_at");

  // Stock total por almacén
  const { data: stockResumen } = await supabase
    .from("stock_almacen")
    .select("almacen_id, cantidad, productos(nombre)");

  const stockPorAlmacen = (stockResumen ?? []).reduce<Record<string, number>>((acc, s) => {
    acc[s.almacen_id] = (acc[s.almacen_id] ?? 0) + s.cantidad;
    return acc;
  }, {});

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-ink">Almacenes</h1>
          <p className="text-sm text-ink/60">Bodega central, camiones y puntos de venta.</p>
        </div>
        <Link href="/protected/almacenes/transferencia"
          className="flex items-center gap-1.5 rounded-md border border-primario px-3 py-2 text-sm font-medium text-primario hover:bg-primario-suave transition">
          <ArrowRightLeft size={15} />
          Nueva transferencia
        </Link>
      </div>

      {/* Formulario rápido para crear almacén */}
      <form action={crearAlmacen}
        className="flex flex-wrap gap-3 rounded-xl border border-linea bg-white p-4 shadow-sm">
        <input name="nombre" required placeholder="Nombre del almacén (ej: Bodega principal, Camión 1)"
          className="flex-1 min-w-48 rounded-md border border-linea px-3 py-2 text-sm text-ink focus:border-primario focus:outline-none" />
        <select name="tipo"
          className="rounded-md border border-linea px-3 py-2 text-sm text-ink focus:border-primario focus:outline-none">
          <option value="bodega">📦 Bodega</option>
          <option value="camion">🚚 Camión</option>
          <option value="tienda">🏪 Tienda</option>
          <option value="punto_venta">🖥️ Punto de venta</option>
        </select>
        <button type="submit"
          className="flex items-center gap-1.5 rounded-md bg-primario px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition">
          <Plus size={15} />
          Crear
        </button>
      </form>

      {/* Lista de almacenes */}
      {!almacenes?.length ? (
        <div className="rounded-xl border border-linea bg-white p-8 text-center">
          <Package size={32} className="mx-auto text-ink/20 mb-3" />
          <p className="text-sm text-ink/50">No tienes almacenes. Crea uno arriba para empezar.</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {almacenes.map((a) => {
            const { Icono, color, label } = TIPO_ICONO[a.tipo] ?? TIPO_ICONO.bodega;
            const totalUnidades = stockPorAlmacen[a.id] ?? 0;
            return (
              <Link key={a.id} href={`/protected/almacenes/${a.id}`}
                className="rounded-xl border border-linea bg-white p-5 shadow-sm hover:border-primario hover:shadow-md transition-all group">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Icono size={20} className={color} />
                    <span className={`text-xs font-semibold uppercase tracking-wide ${color}`}>{label}</span>
                  </div>
                  <span className="text-xs text-ink/30 group-hover:text-primario transition-colors">Ver →</span>
                </div>
                <p className="font-semibold text-ink">{a.nombre}</p>
                {a.descripcion && <p className="text-xs text-ink/50 mt-0.5">{a.descripcion}</p>}
                <div className="mt-3 pt-3 border-t border-linea">
                  <p className="text-xs text-ink/50">
                    <span className="text-lg font-bold text-ink">{totalUnidades.toLocaleString("en-US")}</span>
                    {" "}unidades totales
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
