import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { actualizarCliente } from "./actions";

export default async function EditarClientePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
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
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gray-50 px-4 text-center">
        <p className="text-sm text-gray-600">
          Solo el admin de la empresa puede ver esta página.
        </p>
        <Link href="/protected" className="text-sm text-emerald-600 hover:underline">
          Regresar
        </Link>
      </div>
    );
  }

  const { data: cliente } = await supabase
    .from("clientes")
    .select(
      "id, nombre, telefono, direccion, limite_credito, saldo_actual, bloqueado",
    )
    .eq("id", id)
    .single();

  if (!cliente) {
    notFound();
  }

  return (
    <div className="flex min-h-screen flex-col items-center gap-6 bg-gray-50 px-4 py-10">
      <div className="w-full max-w-sm rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h1 className="mb-1 text-xl font-semibold text-gray-900">
          Editar cliente
        </h1>
        <p className="mb-4 text-xs text-gray-400">
          Debe ${cliente.saldo_actual.toFixed(2)}
          {cliente.bloqueado && (
            <span className="ml-1 font-medium text-red-600">(bloqueado)</span>
          )}
          {" "}— esto lo controla el sistema solo, no se edita aquí.
        </p>
        <form
          action={actualizarCliente.bind(null, cliente.id)}
          className="flex flex-col gap-4"
        >
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
              defaultValue={cliente.nombre}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
          <div>
            <label
              htmlFor="telefono"
              className="block text-sm font-medium text-gray-700"
            >
              Teléfono
            </label>
            <input
              id="telefono"
              name="telefono"
              type="tel"
              defaultValue={cliente.telefono ?? ""}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
          <div>
            <label
              htmlFor="direccion"
              className="block text-sm font-medium text-gray-700"
            >
              Dirección
            </label>
            <input
              id="direccion"
              name="direccion"
              type="text"
              defaultValue={cliente.direccion ?? ""}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
            <p className="mt-1 text-xs text-gray-400">
              Si la cambias, se vuelve a ubicar sola en el mapa.
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
              defaultValue={cliente.limite_credito}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-md bg-emerald-600 px-4 py-2 font-medium text-white transition hover:bg-emerald-700"
          >
            Guardar cambios
          </button>
        </form>
      </div>
      <Link
        href="/protected/clientes"
        className="text-sm text-emerald-600 hover:underline"
      >
        Regresar
      </Link>
    </div>
  );
}
