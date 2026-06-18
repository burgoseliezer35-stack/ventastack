import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { actualizarPrecio, cambiarEstado, registrarPago } from "./actions";

export default async function EmpresaDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: empresa } = await supabase
    .from("companies")
    .select("id, name, created_at, precio_mensual, activa")
    .eq("id", id)
    .single();

  if (!empresa) {
    notFound();
  }

  const { data: pagos } = await supabase
    .from("pagos_plataforma")
    .select("id, monto, nota, created_at")
    .eq("company_id", id)
    .order("created_at", { ascending: false });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-ink">{empresa.name}</h1>
        <p className="text-xs text-ink/50">
          Desde {new Date(empresa.created_at).toLocaleDateString("es-MX")}
        </p>
      </div>

      <div className="flex items-center justify-between rounded-lg border border-linea bg-white p-4">
        <span className={`insignia ${empresa.activa ? "text-verde" : "text-primario"}`}>
          {empresa.activa ? "activo" : "desactivado"}
        </span>
        <form action={cambiarEstado.bind(null, empresa.id, !empresa.activa)}>
          <button
            type="submit"
            className="rounded-md border border-linea px-4 py-2 text-sm font-medium text-ink transition hover:border-primario"
          >
            {empresa.activa ? "Desactivar" : "Activar"}
          </button>
        </form>
      </div>

      <form
        action={actualizarPrecio.bind(null, empresa.id)}
        className="flex flex-col gap-3 rounded-lg border border-linea bg-white p-4"
      >
        <label htmlFor="precio_mensual" className="text-sm font-medium text-ink">
          Precio mensual
        </label>
        <div className="flex gap-2">
          <input
            id="precio_mensual"
            name="precio_mensual"
            type="number"
            step="0.01"
            min="0"
            defaultValue={empresa.precio_mensual}
            className="flex-1 rounded-md border border-linea px-3 py-2 text-ink focus:border-primario focus:outline-none"
          />
          <button
            type="submit"
            className="rounded-md bg-primario px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
          >
            Guardar
          </button>
        </div>
      </form>

      <form
        action={registrarPago.bind(null, empresa.id)}
        className="flex flex-col gap-3 rounded-lg border border-linea bg-white p-4"
      >
        <h2 className="text-sm font-medium text-ink">Registrar un pago</h2>
        <input
          name="monto"
          type="number"
          step="0.01"
          min="0.01"
          required
          placeholder="Monto"
          className="rounded-md border border-linea px-3 py-2 text-ink focus:border-primario focus:outline-none"
        />
        <input
          name="nota"
          type="text"
          placeholder="Nota (opcional)"
          className="rounded-md border border-linea px-3 py-2 text-ink focus:border-primario focus:outline-none"
        />
        <button
          type="submit"
          className="rounded-md bg-primario px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
        >
          Registrar pago (y reactivar si estaba desactivado)
        </button>
      </form>

      <div className="rounded-lg border border-linea bg-white p-4">
        <h2 className="mb-3 text-sm font-medium text-ink">Historial de pagos</h2>
        {pagos?.length ? (
          <ul className="flex flex-col gap-2 text-sm">
            {pagos.map((p) => (
              <li
                key={p.id}
                className="flex justify-between border-b border-linea pb-2 last:border-0"
              >
                <span className="text-ink/70">
                  {new Date(p.created_at).toLocaleDateString("es-MX")}
                  {p.nota ? ` · ${p.nota}` : ""}
                </span>
                <span className="cifra font-medium text-ink">
                  ${p.monto.toFixed(2)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-ink/50">Todavía no hay pagos registrados.</p>
        )}
      </div>

      <Link href="/reseller" className="text-sm text-primario hover:underline">
        Regresar
      </Link>
    </div>
  );
}
