import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { actualizarPrecio, cambiarEstado, registrarPago, borrarEmpresa, actualizarTipoNegocio, guardarBuscadores } from "./actions";
import { ConfiguradorBuscadores } from "@/components/configurador-buscadores";

export default async function EmpresaDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: empresa } = await supabase
    .from("companies")
    .select("id, name, created_at, precio_mensual, activa, tipo_negocio, buscador_productos, buscadores_config")
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

      {/* Tipo de negocio */}
      <form
        action={actualizarTipoNegocio.bind(null, empresa.id)}
        className="flex flex-col gap-3 rounded-lg border border-linea bg-white p-4"
      >
        <label className="text-sm font-medium text-ink">Giro / tipo de negocio</label>
        <select
          name="tipo_negocio"
          defaultValue={empresa.tipo_negocio ?? "tienda"}
          className="w-full rounded-md border border-linea px-3 py-2 text-sm text-ink focus:border-primario focus:outline-none"
        >
          <option value="tienda">🏪 Tienda / Miscelánea / Abarrotes</option>
          <option value="distribuidor">🚚 Distribuidor / Ruta de ventas</option>
          <option value="restaurante">🍽️ Restaurante / Cafetería</option>
          <option value="taller">🔧 Taller / Servicio técnico</option>
        </select>

        <label className="text-sm font-medium text-ink">Buscador de productos</label>
        <select
          name="buscador_productos"
          defaultValue={empresa.buscador_productos ?? "openfoodfacts"}
          className="w-full rounded-md border border-linea px-3 py-2 text-sm text-ink focus:border-primario focus:outline-none"
        >
          <option value="openfoodfacts">🥫 Open Food Facts — abarrotes / alimentos</option>
          <option value="upcitemdb">📦 UPCitemdb — electrónicos / productos en general</option>
          <option value="ambos">🔍 Ambos — Food Facts primero, UPCitemdb como fallback</option>
        </select>
        <button
          type="submit"
          className="rounded-md bg-primario px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
        >
          Guardar
        </button>
      </form>

      {/* Buscadores de productos */}
      <div className="flex flex-col gap-3 rounded-lg border border-linea bg-white p-4">
        <div>
          <p className="text-sm font-semibold text-ink">Buscadores de productos</p>
          <p className="text-xs text-ink/50 mt-0.5">
            Define qué APIs se usan al escanear un código de barras en el catálogo de esta empresa.
          </p>
        </div>
        <ConfiguradorBuscadores
          companyId={empresa.id}
          configActual={empresa.buscadores_config as Parameters<typeof ConfiguradorBuscadores>[0]["configActual"]}
          onGuardar={guardarBuscadores}
        />
      </div>

      {/* Zona de peligro — borrar empresa */}
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 flex flex-col gap-3">
        <div>
          <p className="text-sm font-semibold text-red-800">Zona de peligro</p>
          <p className="text-xs text-red-600 mt-0.5">
            Si el negocio tiene historial de ventas, solo se desactivará. Si es una cuenta de prueba sin ventas, se borrará permanentemente.
          </p>
        </div>
        <form action={borrarEmpresa.bind(null, empresa.id)}>
          <button
            type="submit"
            className="rounded-md border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 transition hover:bg-red-100"
            onClick={(e) => {
              if (!confirm(`¿Seguro que quieres eliminar "${empresa.name}"? Esta acción puede no ser reversible.`)) {
                e.preventDefault();
              }
            }}
          >
            Borrar empresa
          </button>
        </form>
      </div>

      <Link href="/reseller" className="text-sm text-primario hover:underline">
        Regresar
      </Link>
    </div>
  );
}
