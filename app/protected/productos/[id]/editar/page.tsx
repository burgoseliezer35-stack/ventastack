import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { actualizarProducto } from "./actions";

export default async function EditarProductoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error: errorParam } = await searchParams;
  const supabase = await createClient();

  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) {
    redirect("/auth/login");
  }

  const userId = data.claims.sub as string;

  const { data: miPerfil } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();

  if (miPerfil?.role !== "admin") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-paper px-4 text-center">
        <p className="text-sm text-ink/70">
          Solo el admin de la empresa puede ver esta página.
        </p>
        <Link href="/protected" className="text-sm text-primario hover:underline">
          Regresar
        </Link>
      </div>
    );
  }

  const { data: categorias } = await supabase
    .from("categorias")
    .select("id, nombre")
    .order("nombre");

  const { data: producto } = await supabase
    .from("productos")
    .select("id, nombre, precio, activo, stock, categoria_id, codigo_barras")
    .eq("id", id)
    .single();

  if (!producto) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-bold text-ink">Editar producto</h1>

      {errorParam && <p className="text-sm text-red-600">{errorParam}</p>}

      <div className="rounded-lg border border-linea bg-white p-6">
        <div className="mb-4 flex items-center justify-between rounded-md bg-paper px-3 py-2 text-sm">
          <span className="text-ink/60">
            <span className="cifra font-medium text-ink">{producto.stock}</span>{" "}
            en existencia
          </span>
          <div className="flex gap-3 text-xs">
            <Link
              href={`/protected/productos/${producto.id}/ajustar`}
              className="text-primario hover:underline"
            >
              Ajustar
            </Link>
            <Link
              href={`/protected/productos/${producto.id}/kardex`}
              className="text-primario hover:underline"
            >
              Ver kardex
            </Link>
          </div>
        </div>

        <form
          action={actualizarProducto.bind(null, producto.id)}
          className="flex flex-col gap-4"
        >
          <div>
            <label htmlFor="nombre" className="block text-sm font-medium text-ink">
              Nombre
            </label>
            <input
              id="nombre"
              name="nombre"
              type="text"
              required
              defaultValue={producto.nombre}
              className="mt-1 w-full rounded-md border border-linea px-3 py-2 text-ink focus:border-primario focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="precio" className="block text-sm font-medium text-ink">
              Precio
            </label>
            <input
              id="precio"
              name="precio"
              type="number"
              step="0.01"
              min="0"
              required
              defaultValue={producto.precio}
              className="mt-1 w-full rounded-md border border-linea px-3 py-2 text-ink focus:border-primario focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="categoria_id" className="block text-sm font-medium text-ink">
              Categoría (opcional)
            </label>
            <select
              id="categoria_id"
              name="categoria_id"
              defaultValue={producto.categoria_id ?? ""}
              className="mt-1 w-full rounded-md border border-linea px-3 py-2 text-ink focus:border-primario focus:outline-none"
            >
              <option value="">Sin categoría</option>
              {categorias?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="codigo_barras" className="block text-sm font-medium text-ink">
              Código de barras (opcional)
            </label>
            <input
              id="codigo_barras"
              name="codigo_barras"
              type="text"
              defaultValue={producto.codigo_barras ?? ""}
              className="mt-1 w-full rounded-md border border-linea px-3 py-2 text-ink focus:border-primario focus:outline-none"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-ink">
            <input type="checkbox" name="activo" defaultChecked={producto.activo} />
            Activo (visible en el punto de venta)
          </label>
          <button
            type="submit"
            className="w-full rounded-md bg-primario px-4 py-2 font-medium text-white transition hover:opacity-90"
          >
            Guardar cambios
          </button>
        </form>
      </div>

      <Link href="/protected/productos" className="text-sm text-primario hover:underline">
        Regresar
      </Link>
    </div>
  );
}
