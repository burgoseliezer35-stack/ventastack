import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { crearProducto, desactivarProducto } from "./actions";
import { ImportarExcel } from "@/components/importar-excel";

export default async function ProductosPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
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

  const { data: productos } = await supabase
    .from("productos")
    .select("id, nombre, precio, activo, stock, codigo_barras, categorias(nombre)")
    .order("nombre");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-ink">Catálogo</h1>
        <Link
          href="/protected/productos/categorias"
          className="text-sm text-primario hover:underline"
        >
          Administrar categorías
        </Link>
      </div>

      <ImportarExcel />

      {errorParam && <p className="text-sm text-red-600">{errorParam}</p>}

      <div className="rounded-lg border border-linea bg-white p-6">
        <h2 className="mb-4 text-sm font-semibold text-ink">Agregar producto</h2>
        <form action={crearProducto} className="flex flex-col gap-4">
          <div>
            <label htmlFor="nombre" className="block text-sm font-medium text-ink">
              Nombre
            </label>
            <input
              id="nombre"
              name="nombre"
              type="text"
              required
              placeholder="Refresco 600ml"
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
              placeholder="Escanéalo aquí o escríbelo a mano"
              className="mt-1 w-full rounded-md border border-linea px-3 py-2 text-ink focus:border-primario focus:outline-none"
            />
          </div>
          <p className="text-xs text-ink/50">
            Arranca con 0 en existencia — después de crearlo, usa
            &quot;Ajustar&quot; para entrar la cantidad inicial real.
          </p>
          <button
            type="submit"
            className="w-full rounded-md bg-primario px-4 py-2 font-medium text-white transition hover:opacity-90"
          >
            Agregar
          </button>
        </form>
      </div>

      <div className="rounded-lg border border-linea bg-white p-6">
        <h2 className="mb-3 text-sm font-semibold text-ink">Tu catálogo</h2>
        {productos?.length ? (
          <ul className="flex flex-col gap-3">
            {productos.map((p) => {
              const categoria = Array.isArray(p.categorias)
                ? p.categorias[0]?.nombre
                : (p.categorias as { nombre: string } | null)?.nombre;
              return (
                <li
                  key={p.id}
                  className="flex flex-wrap items-center justify-between gap-2 border-b border-linea pb-3 text-sm last:border-0"
                >
                  <div className="flex flex-col">
                    <span className={p.activo ? "text-ink" : "text-ink/40 line-through"}>
                      {p.nombre}
                    </span>
                    <span className="cifra text-xs text-ink/50">
                      ${p.precio.toFixed(2)} · {p.stock} en existencia
                      {categoria ? ` · ${categoria}` : ""}
                      {p.codigo_barras ? ` · #${p.codigo_barras}` : ""}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <Link
                      href={`/protected/productos/${p.id}/ajustar`}
                      className="text-primario hover:underline"
                    >
                      Ajustar
                    </Link>
                    <Link
                      href={`/protected/productos/${p.id}/mayoreo`}
                      className="text-primario hover:underline"
                    >
                      Mayoreo
                    </Link>
                    <Link
                      href={`/protected/productos/${p.id}/kardex`}
                      className="text-primario hover:underline"
                    >
                      Kardex
                    </Link>
                    <Link
                      href={`/protected/productos/${p.id}/editar`}
                      className="text-primario hover:underline"
                    >
                      Editar
                    </Link>
                    {p.activo && (
                      <form action={desactivarProducto.bind(null, p.id)}>
                        <button type="submit" className="text-red-500 hover:underline">
                          Quitar
                        </button>
                      </form>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-ink/50">Todavía no tienes productos.</p>
        )}
      </div>

      <Link href="/protected" className="text-sm text-primario hover:underline">
        Regresar
      </Link>
    </div>
  );
}
