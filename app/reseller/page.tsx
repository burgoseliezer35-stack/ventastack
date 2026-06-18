import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function ResellerPage() {
  const supabase = await createClient();

  const { data: empresas } = await supabase
    .from("companies")
    .select("id, name, created_at, precio_mensual, activa")
    .order("created_at", { ascending: false });

  const { data: pagos } = await supabase
    .from("pagos_plataforma")
    .select("monto, created_at");

  const inicioMes = new Date();
  inicioMes.setDate(1);
  inicioMes.setHours(0, 0, 0, 0);

  const ingresosTotales = (pagos ?? []).reduce((suma, p) => suma + p.monto, 0);
  const ingresosMes = (pagos ?? [])
    .filter((p) => new Date(p.created_at) >= inicioMes)
    .reduce((suma, p) => suma + p.monto, 0);

  const activas = (empresas ?? []).filter((e) => e.activa).length;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-bold text-ink">Tus negocios</h1>
        <p className="text-sm text-ink/60">
          {empresas?.length ?? 0} en total · {activas} activos
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-linea bg-white p-4">
          <p className="text-xs text-ink/50">Ingresos del mes</p>
          <p className="cifra text-lg font-semibold text-ink">
            ${ingresosMes.toFixed(2)}
          </p>
        </div>
        <div className="rounded-lg border border-linea bg-white p-4">
          <p className="text-xs text-ink/50">Ingresos totales</p>
          <p className="cifra text-lg font-semibold text-ink">
            ${ingresosTotales.toFixed(2)}
          </p>
        </div>
      </div>

      <Link
        href="/reseller/nueva-empresa"
        className="rounded-md bg-primario px-4 py-3 text-center text-sm font-medium text-white transition hover:opacity-90"
      >
        + Dar de alta un negocio nuevo
      </Link>

      <div className="flex flex-col gap-2">
        {empresas?.map((e) => (
          <Link
            key={e.id}
            href={`/reseller/empresas/${e.id}`}
            className="flex items-center justify-between rounded-lg border border-linea bg-white p-4 transition hover:border-primario"
          >
            <div>
              <p className="font-medium text-ink">{e.name}</p>
              <p className="cifra text-xs text-ink/50">
                ${e.precio_mensual.toFixed(2)} / mes
              </p>
            </div>
            <span className={`insignia ${e.activa ? "text-verde" : "text-primario"}`}>
              {e.activa ? "activo" : "desactivado"}
            </span>
          </Link>
        ))}
        {!empresas?.length && (
          <p className="text-sm text-ink/50">
            Todavía no tienes negocios dados de alta.
          </p>
        )}
      </div>
    </div>
  );
}
