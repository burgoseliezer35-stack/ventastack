import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { abrirCaja, registrarMovimiento, cerrarCaja } from "./actions";

export default async function CajaPage({
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

  if (miPerfil?.role !== "admin" && miPerfil?.role !== "cajero") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-paper px-4 text-center">
        <p className="text-sm text-ink/70">
          Solo el admin o un cajero pueden ver esta página.
        </p>
        <Link href="/protected" className="text-sm text-primario hover:underline">
          Regresar
        </Link>
      </div>
    );
  }

  const { data: caja } = await supabase
    .from("cajas")
    .select("id, fondo_inicial, abierta_en")
    .eq("estado", "abierta")
    .single();

  if (!caja) {
    return (
      <div className="flex flex-col items-center gap-6">
        <h1 className="text-xl font-bold text-ink">Caja</h1>
        <div className="w-full max-w-sm rounded-lg border border-linea bg-white p-6">
          <p className="mb-4 text-sm text-ink/60">
            No hay una caja abierta. Abre una para empezar a registrar el
            efectivo del día.
          </p>
          <form action={abrirCaja} className="flex flex-col gap-4">
            <div>
              <label htmlFor="fondo_inicial" className="block text-sm font-medium text-ink">
                Fondo inicial
              </label>
              <input
                id="fondo_inicial"
                name="fondo_inicial"
                type="number"
                min="0"
                step="0.01"
                required
                placeholder="0.00"
                className="mt-1 w-full rounded-md border border-linea px-3 py-2 text-ink focus:border-primario focus:outline-none"
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              className="w-full rounded-md bg-primario px-4 py-2 font-medium text-white transition hover:opacity-90"
            >
              Abrir caja
            </button>
          </form>
        </div>
        <Link
          href="/protected/caja/historial"
          className="text-sm text-primario hover:underline"
        >
          Ver historial de cajas
        </Link>
      </div>
    );
  }

  const { data: movimientos } = await supabase
    .from("movimientos_caja")
    .select("tipo, monto, motivo, nota, created_at")
    .eq("caja_id", caja.id)
    .order("created_at", { ascending: false });

  const entradas = (movimientos ?? [])
    .filter((m) => m.tipo === "entrada")
    .reduce((s, m) => s + m.monto, 0);
  const salidas = (movimientos ?? [])
    .filter((m) => m.tipo === "salida")
    .reduce((s, m) => s + m.monto, 0);
  const esperadoAhora = caja.fondo_inicial + entradas - salidas;

  return (
    <div className="flex flex-col items-center gap-6">
      <h1 className="text-xl font-bold text-ink">Caja</h1>

      <div className="w-full max-w-sm rounded-lg border border-linea bg-white p-6 text-center">
        <p className="text-xs text-ink/50">Debería haber ahora</p>
        <p className="cifra text-2xl font-bold text-ink">
          ${esperadoAhora.toFixed(2)}
        </p>
        <p className="mt-1 text-xs text-ink/40">
          Fondo inicial ${caja.fondo_inicial.toFixed(2)} · abierta{" "}
          {new Date(caja.abierta_en).toLocaleString("es-MX")}
        </p>
      </div>

      <div className="w-full max-w-sm rounded-lg border border-linea bg-white p-4">
        <h2 className="mb-3 text-sm font-medium text-ink">
          Movimientos de hoy
        </h2>
        {movimientos?.length ? (
          <ul className="flex flex-col gap-2">
            {movimientos.map((m, i) => (
              <li
                key={i}
                className="flex items-center justify-between gap-2 border-b border-linea pb-2 text-sm last:border-0"
              >
                <div className="flex flex-col">
                  <span className="text-ink/70">
                    {new Date(m.created_at).toLocaleTimeString("es-MX")}
                  </span>
                  <span className="text-xs text-ink/50">
                    {m.motivo}
                    {m.nota ? ` · ${m.nota}` : ""}
                  </span>
                </div>
                <span
                  className={`cifra font-medium ${
                    m.tipo === "entrada" ? "text-verde" : "text-red-600"
                  }`}
                >
                  {m.tipo === "entrada" ? "+" : "−"}${m.monto.toFixed(2)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-ink/40">
            Sin movimientos todavía — las ventas en efectivo van a aparecer
            aquí solas.
          </p>
        )}
      </div>

      <div className="w-full max-w-sm rounded-lg border border-linea bg-white p-4">
        <h2 className="mb-3 text-sm font-medium text-ink">
          Registrar retiro o depósito
        </h2>
        <form action={registrarMovimiento} className="flex flex-col gap-3">
          <select
            name="tipo"
            className="w-full rounded-md border border-linea px-3 py-2 text-ink focus:border-primario focus:outline-none"
          >
            <option value="salida">Retiro (sale dinero de la caja)</option>
            <option value="entrada">Depósito (entra dinero a la caja)</option>
          </select>
          <input
            name="monto"
            type="number"
            min="0.01"
            step="0.01"
            required
            placeholder="Monto"
            className="w-full rounded-md border border-linea px-3 py-2 text-ink focus:border-primario focus:outline-none"
          />
          <input
            name="nota"
            type="text"
            placeholder="Para cambio en el banco, gasto de..."
            className="w-full rounded-md border border-linea px-3 py-2 text-ink focus:border-primario focus:outline-none"
          />
          <button
            type="submit"
            className="rounded-md border border-linea px-4 py-2 text-sm font-medium text-ink transition hover:border-primario"
          >
            Registrar
          </button>
        </form>
      </div>

      <div className="w-full max-w-sm rounded-lg border border-linea bg-white p-4">
        <h2 className="mb-3 text-sm font-medium text-ink">Cerrar caja</h2>
        <form action={cerrarCaja.bind(null, caja.id)} className="flex flex-col gap-3">
          <label htmlFor="monto_contado" className="text-sm text-ink/60">
            Cuenta el efectivo físico y anota lo que de verdad hay:
          </label>
          <input
            id="monto_contado"
            name="monto_contado"
            type="number"
            min="0"
            step="0.01"
            required
            placeholder="0.00"
            className="w-full rounded-md border border-linea px-3 py-2 text-ink focus:border-primario focus:outline-none"
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            className="rounded-md bg-primario px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
          >
            Cerrar caja
          </button>
        </form>
      </div>

      <Link
        href="/protected/caja/historial"
        className="text-sm text-primario hover:underline"
      >
        Ver historial de cajas
      </Link>
    </div>
  );
}
