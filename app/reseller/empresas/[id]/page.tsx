import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { actualizarPrecio, cambiarEstado, registrarPago, actualizarTipoNegocio, guardarBuscadores } from "./actions";
import { ConfiguradorBuscadores } from "@/components/configurador-buscadores";
import { BotonBorrarEmpresa } from "./boton-borrar";

export default async function EmpresaDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: empresa, error: errorEmpresa } = await supabase
    .from("companies")
    .select("id, name, created_at, precio_mensual, activa, tipos_negocio, buscador_productos, buscadores_config")
    .eq("id", id)
    .single();

  if (errorEmpresa || !empresa) {
    notFound();
  }

  const tiposNegocio: string[] = Array.isArray(empresa.tipos_negocio) ? empresa.tipos_negocio : ["tienda"];
  const buscadorProductos: string = (empresa.buscador_productos as string) ?? "openfoodfacts";
  const buscadoresConfig = (empresa.buscadores_config as Record<string, { activo: boolean; api_key: string | null }>) ?? null;

  let pagos: { id: string; monto: number; nota: string | null; created_at: string }[] = [];
  try {
    const { data: _pagos } = await supabase
      .from("pagos_plataforma")
      .select("id, monto, nota, created_at")
      .eq("company_id", id)
      .order("created_at", { ascending: false });
    pagos = (_pagos ?? []).map((p) => ({
      ...p,
      monto: typeof p.monto === "number" ? p.monto : 0,
    }));
  } catch { pagos = []; }

  const precioMensual = typeof empresa.precio_mensual === "number" ? empresa.precio_mensual : 0;

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
            defaultValue={precioMensual}
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
        {pagos.length ? (
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

      {/* Tipo de negocio — multi-selección */}
      <form
        action={actualizarTipoNegocio.bind(null, empresa.id)}
        className="flex flex-col gap-3 rounded-lg border border-linea bg-white p-4"
      >
        <div>
          <label className="text-sm font-medium text-ink">Giro / tipo de negocio</label>
          <p className="text-xs text-ink/50 mt-0.5">Selecciona uno o más (el menú se adapta)</p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {[
            { val: "tienda", label: "Tienda / Abarrotes" },
            { val: "distribuidor", label: "Distribuidor / Ruta" },
            { val: "restaurante", label: "Restaurante" },
            { val: "taller", label: "Taller / Servicio" },
            { val: "farmacia", label: "Farmacia" },
            { val: "ferreteria", label: "Ferretería" },
            { val: "tecnologia", label: "Tecnología" },
            { val: "papeleria", label: "Papelería" },
          ].map(({ val, label }) => {
            const activo = tiposNegocio.includes(val);
            return (
              <label
                key={val}
                className={`flex items-center gap-2 rounded-lg border p-3 cursor-pointer transition ${
                  activo ? "border-primario bg-primario-suave" : "border-linea hover:border-primario/50"
                }`}
              >
                <input
                  type="checkbox"
                  name="tipos_negocio"
                  value={val}
                  defaultChecked={activo}
                  className="accent-primario"
                />
                <span className="text-xs font-medium text-ink">{label}</span>
              </label>
            );
          })}
        </div>

        <label className="text-sm font-medium text-ink">Buscador de productos</label>
        <select
          name="buscador_productos"
          defaultValue={buscadorProductos ?? "openfoodfacts"}
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
          configActual={buscadoresConfig as Parameters<typeof ConfiguradorBuscadores>[0]["configActual"]}
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
        <BotonBorrarEmpresa companyId={empresa.id} nombre={empresa.name} />
      </div>

      <Link href="/reseller" className="text-sm text-primario hover:underline">
        ← Regresar
      </Link>
    </div>
  );
}
