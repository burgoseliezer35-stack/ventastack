import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { agregarNivelMayoreo, borrarNivelMayoreo } from "./actions";

export default async function MayoreoProductoPage({
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

  const { data: producto } = await supabase
    .from("productos")
    .select("id, nombre, precio")
    .eq("id", id)
    .single();

  if (!producto) {
    notFound();
  }

  const { data: niveles } = await supabase
    .from("precios_mayoreo")
    .select("id, cantidad_minima, precio_unitario")
    .eq("producto_id", id)
    .order("cantidad_minima");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-ink">Mayoreo — {producto.nombre}</h1>
        <p className="text-sm text-ink/60">
          Precio normal: <span className="cifra">${producto.precio.toFixed(2)}</span> por
          unidad
        </p>
      </div>

      <div className="rounded-lg border border-linea bg-white p-6">
        <h2 className="mb-4 text-sm font-semibold text-ink">Agregar nivel</h2>
        <form
          action={agregarNivelMayoreo.bind(null, id)}
          className="flex flex-col gap-4"
        >
          <div>
            <label htmlFor="cantidad_minima" className="block text-sm font-medium text-ink">
              A partir de cuántas unidades
            </label>
            <input
              id="cantidad_minima"
              name="cantidad_minima"
              type="number"
              min="1"
              step="0.01"
              required
              placeholder="12"
              className="mt-1 w-full rounded-md border border-linea px-3 py-2 text-ink focus:border-primario focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="precio_unitario" className="block text-sm font-medium text-ink">
              Precio por unidad a partir de ahí
            </label>
            <input
              id="precio_unitario"
              name="precio_unitario"
              type="number"
              min="0"
              step="0.01"
              required
              placeholder="16.00"
              className="mt-1 w-full rounded-md border border-linea px-3 py-2 text-ink focus:border-primario focus:outline-none"
            />
          </div>
          {errorParam && <p className="text-sm text-red-600">{errorParam}</p>}
          <button
            type="submit"
            className="w-full rounded-md bg-primario px-4 py-2 font-medium text-white transition hover:opacity-90"
          >
            Agregar nivel
          </button>
        </form>
      </div>

      <div className="rounded-lg border border-linea bg-white p-6">
        <h2 className="mb-3 text-sm font-semibold text-ink">Niveles actuales</h2>
        {niveles?.length ? (
          <ul className="flex flex-col gap-2">
            {niveles.map((n) => (
              <li
                key={n.id}
                className="flex items-center justify-between border-b border-linea pb-2 text-sm last:border-0"
              >
                <span className="text-ink">
                  Desde {n.cantidad_minima} unidades
                </span>
                <span className="cifra text-ink/70">
                  ${n.precio_unitario.toFixed(2)} c/u
                </span>
                <form action={borrarNivelMayoreo.bind(null, id, n.id)}>
                  <button type="submit" className="text-xs text-red-500 hover:underline">
                    Borrar
                  </button>
                </form>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-ink/50">
            Sin niveles de mayoreo — este producto siempre cobra el precio
            normal, sin importar la cantidad.
          </p>
        )}
      </div>

      <Link href="/protected/productos" className="text-sm text-primario hover:underline">
        Regresar al catálogo
      </Link>
    </div>
  );
}
