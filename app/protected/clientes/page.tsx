import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { crearCliente, asignarVendedor } from "./actions";

export default async function ClientesPage() {
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
    .limit(1)
    .maybeSingle();

  // Vendedor va a su vista propia (RLS filtra sus clientes)
  if (miPerfil?.role === "vendedor") {
    redirect("/protected/mis-clientes");
  }

  // Cajero y admin pueden ver la lista completa
  if (miPerfil?.role !== "admin" && miPerfil?.role !== "cajero") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gray-50 px-4 text-center">
        <p className="text-sm text-gray-600">
          No tienes permiso para ver esta página.
        </p>
        <Link href="/protected" className="text-sm text-emerald-600 hover:underline">
          Regresar
        </Link>
      </div>
    );
  }

  const esAdmin = miPerfil?.role === "admin";

  const { data: clientes } = await supabase
    .from("clientes")
    .select(
      "id, nombre, telefono, limite_credito, saldo_actual, bloqueado, vendedor_id, latitud, longitud",
    )
    .order("nombre");

  // Para llenar el selector de "a qué vendedor se lo asigno".
  const { data: vendedores } = await supabase
    .from("profiles")
    .select("id, full_name")
    .eq("role", "vendedor")
    .order("full_name");

  return (
    <div className="flex min-h-screen flex-col items-center gap-6 bg-gray-50 px-4 py-10">
      <div className="w-full max-w-sm rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h1 className="mb-4 text-xl font-semibold text-gray-900">
          Agregar cliente
        </h1>
        <form action={crearCliente} className="flex flex-col gap-4">
          <div>
            <label
              htmlFor="nombre"
              className="block text-sm font-medium text-gray-700"
            >
              Nombre
            </label>
            <input
              id="nombre"
              name="nombre"
              type="text"
              required
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
          <div>
            <label
              htmlFor="telefono"
              className="block text-sm font-medium text-gray-700"
            >
              Teléfono (opcional)
            </label>
            <input
              id="telefono"
              name="telefono"
              type="tel"
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
          <div>
            <label
              htmlFor="direccion"
              className="block text-sm font-medium text-gray-700"
            >
              Dirección (opcional)
            </label>
            <input
              id="direccion"
              name="direccion"
              type="text"
              placeholder="Calle, número, colonia, ciudad"
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
            <p className="mt-1 text-xs text-gray-400">
              Se ubica sola en el mapa para poder usar el check-in.
            </p>
          </div>
          <div>
            <label
              htmlFor="limite_credito"
              className="block text-sm font-medium text-gray-700"
            >
              Límite de crédito
            </label>
            <input
              id="limite_credito"
              name="limite_credito"
              type="number"
              step="0.01"
              min="0"
              defaultValue={0}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
          {/* Solo admin puede asignar clientes a un vendedor de ruta */}
          {esAdmin && (
            <div>
              <label
                htmlFor="vendedor_id"
                className="block text-sm font-medium text-gray-700"
              >
                Asignar a vendedor (opcional)
              </label>
              <select
                id="vendedor_id"
                name="vendedor_id"
                defaultValue=""
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="">Sin asignar (mostrador)</option>
                {vendedores?.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.full_name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <button
            type="submit"
            className="w-full rounded-md bg-emerald-600 px-4 py-2 font-medium text-white transition hover:bg-emerald-700"
          >
            Agregar
          </button>
        </form>
      </div>

      <div className="w-full max-w-sm rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-3 text-sm font-medium text-gray-700">
          Tus clientes
        </h2>
        {clientes?.length ? (
          <ul className="flex flex-col gap-3">
            {clientes.map((c) => (
              <li key={c.id} className="text-sm">
                <div className="flex justify-between text-gray-700">
                  <span>{c.nombre}</span>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/protected/clientes/${c.id}/editar`}
                      className="text-xs text-emerald-600 hover:underline"
                    >
                      Editar
                    </Link>
                    {c.bloqueado && (
                      <span className="text-xs font-medium text-red-600">
                        Bloqueado
                      </span>
                    )}
                  </div>
                </div>
                <div className="mb-1 text-xs text-gray-400">
                  Debe ${c.saldo_actual.toFixed(2)} de ${c.limite_credito.toFixed(2)}
                  {" · "}
                  {c.latitud && c.longitud ? (
                    <span className="text-emerald-600">ubicado en el mapa</span>
                  ) : (
                    <span>sin ubicar</span>
                  )}
                </div>
                <form
                  action={asignarVendedor.bind(null, c.id)}
                  className="flex gap-2"
                >
                  <select
                    name="vendedor_id"
                    defaultValue={c.vendedor_id ?? ""}
                    className="flex-1 rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-700"
                  >
                    <option value="">Sin asignar (mostrador)</option>
                    {vendedores?.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.full_name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="submit"
                    className="rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-700 hover:bg-gray-50"
                  >
                    Asignar
                  </button>
                </form>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-400">Todavía no tienes clientes.</p>
        )}
      </div>

      <Link
        href="/protected"
        className="text-sm text-emerald-600 hover:underline"
      >
        Regresar
      </Link>
    </div>
  );
}
