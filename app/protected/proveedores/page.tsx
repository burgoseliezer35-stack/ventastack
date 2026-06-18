import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { crearProveedor, borrarProveedor } from "./actions";

export default async function ProveedoresPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const supabase = await createClient();

  const { data, error: authError } = await supabase.auth.getClaims();
  if (authError || !data?.claims) {
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

  const { data: proveedores } = await supabase
    .from("proveedores")
    .select("id, nombre, contacto, telefono")
    .order("nombre");

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-bold text-ink">Proveedores</h1>

      <div className="rounded-lg border border-linea bg-white p-6">
        <h2 className="mb-4 text-sm font-semibold text-ink">Agregar proveedor</h2>
        <form action={crearProveedor} className="flex flex-col gap-4">
          <div>
            <label htmlFor="nombre" className="block text-sm font-medium text-ink">
              Nombre
            </label>
            <input
              id="nombre"
              name="nombre"
              type="text"
              required
              placeholder="Distribuidora ABC"
              className="mt-1 w-full rounded-md border border-linea px-3 py-2 text-ink focus:border-primario focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="contacto" className="block text-sm font-medium text-ink">
              Persona de contacto (opcional)
            </label>
            <input
              id="contacto"
              name="contacto"
              type="text"
              className="mt-1 w-full rounded-md border border-linea px-3 py-2 text-ink focus:border-primario focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="telefono" className="block text-sm font-medium text-ink">
              Teléfono (opcional)
            </label>
            <input
              id="telefono"
              name="telefono"
              type="text"
              className="mt-1 w-full rounded-md border border-linea px-3 py-2 text-ink focus:border-primario focus:outline-none"
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-md bg-primario px-4 py-2 font-medium text-white transition hover:opacity-90"
          >
            Agregar
          </button>
        </form>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="rounded-lg border border-linea bg-white p-6">
        <h2 className="mb-3 text-sm font-semibold text-ink">Tus proveedores</h2>
        {proveedores?.length ? (
          <ul className="flex flex-col gap-2">
            {proveedores.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between border-b border-linea pb-2 text-sm last:border-0"
              >
                <div className="flex flex-col">
                  <span className="text-ink">{p.nombre}</span>
                  {(p.contacto || p.telefono) && (
                    <span className="text-xs text-ink/50">
                      {[p.contacto, p.telefono].filter(Boolean).join(" · ")}
                    </span>
                  )}
                </div>
                <form action={borrarProveedor.bind(null, p.id)}>
                  <button type="submit" className="text-xs text-red-500 hover:underline">
                    Borrar
                  </button>
                </form>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-ink/50">Todavía no tienes proveedores.</p>
        )}
      </div>

      <Link href="/protected/compras" className="text-sm text-primario hover:underline">
        Ver historial de compras
      </Link>
    </div>
  );
}
