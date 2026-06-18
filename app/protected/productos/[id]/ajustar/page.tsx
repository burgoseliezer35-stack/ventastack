import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ajustarStock } from "./actions";

export default async function AjustarStockPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const supabase = await createClient();

  const { data: producto } = await supabase
    .from("productos")
    .select("id, nombre, stock")
    .eq("id", id)
    .single();

  if (!producto) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-ink">Ajustar inventario</h1>
        <p className="text-sm text-ink/60">
          {producto.nombre} — <span className="cifra">{producto.stock}</span>{" "}
          en existencia ahora
        </p>
      </div>

      <form
        action={ajustarStock.bind(null, producto.id)}
        className="flex flex-col gap-4 rounded-lg border border-linea bg-white p-6"
      >
        <div>
          <label htmlFor="tipo" className="block text-sm font-medium text-ink">
            Tipo de movimiento
          </label>
          <select
            id="tipo"
            name="tipo"
            className="mt-1 w-full rounded-md border border-linea px-3 py-2 text-ink focus:border-primario focus:outline-none"
          >
            <option value="entrada">Entrada (llegó mercancía, conteo inicial...)</option>
            <option value="salida">Salida (merma, conteo no cuadraba...)</option>
          </select>
        </div>

        <div>
          <label htmlFor="cantidad" className="block text-sm font-medium text-ink">
            Cantidad
          </label>
          <input
            id="cantidad"
            name="cantidad"
            type="number"
            step="0.01"
            min="0.01"
            required
            className="mt-1 w-full rounded-md border border-linea px-3 py-2 text-ink focus:border-primario focus:outline-none"
          />
        </div>

        <div>
          <label htmlFor="nota" className="block text-sm font-medium text-ink">
            Nota (opcional)
          </label>
          <input
            id="nota"
            name="nota"
            type="text"
            placeholder="Inventario inicial, llegó pedido del proveedor, se rompieron 2..."
            className="mt-1 w-full rounded-md border border-linea px-3 py-2 text-ink focus:border-primario focus:outline-none"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          className="rounded-md bg-primario px-4 py-2 font-medium text-white transition hover:opacity-90"
        >
          Registrar ajuste
        </button>
      </form>

      <Link href="/protected/productos" className="text-sm text-primario hover:underline">
        Regresar
      </Link>
    </div>
  );
}
