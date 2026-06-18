import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { crearCategoria, borrarCategoria } from "./actions";

export default async function CategoriasPage() {
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

  // Contamos cuántos productos tiene cada categoría, para que se
  // sepa si borrarla deja productos "sueltos".
  const { data: categorias } = await supabase
    .from("categorias")
    .select("id, nombre, productos(count)")
    .order("nombre");

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-bold text-ink">Categorías</h1>

      <div className="rounded-lg border border-linea bg-white p-6">
        <h2 className="mb-4 text-sm font-semibold text-ink">Agregar categoría</h2>
        <form action={crearCategoria} className="flex gap-2">
          <input
            name="nombre"
            type="text"
            required
            placeholder="Bebidas, Abarrotes, Limpieza..."
            className="flex-1 rounded-md border border-linea px-3 py-2 text-ink focus:border-primario focus:outline-none"
          />
          <button
            type="submit"
            className="rounded-md bg-primario px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
          >
            Agregar
          </button>
        </form>
      </div>

      <div className="rounded-lg border border-linea bg-white p-6">
        <h2 className="mb-3 text-sm font-semibold text-ink">Tus categorías</h2>
        {categorias?.length ? (
          <ul className="flex flex-col gap-2">
            {categorias.map((c) => {
              const conteo = Array.isArray(c.productos)
                ? c.productos[0]?.count ?? 0
                : 0;
              return (
                <li
                  key={c.id}
                  className="flex items-center justify-between border-b border-linea pb-2 text-sm last:border-0"
                >
                  <span className="text-ink">{c.nombre}</span>
                  <div className="flex items-center gap-3">
                    <span className="cifra text-xs text-ink/50">
                      {conteo} producto{conteo === 1 ? "" : "s"}
                    </span>
                    <form action={borrarCategoria.bind(null, c.id)}>
                      <button type="submit" className="text-red-500 hover:underline">
                        Borrar
                      </button>
                    </form>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-ink/50">Todavía no tienes categorías.</p>
        )}
      </div>

      <Link href="/protected/productos" className="text-sm text-primario hover:underline">
        Regresar a Catálogo
      </Link>
    </div>
  );
}
