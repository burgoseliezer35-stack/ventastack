import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { guardarConfiguracion } from "./actions";
import { whatsappDisponible } from "@/lib/whatsapp";

export default async function ConfiguracionPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; guardado?: string }>;
}) {
  const { error: errorParam, guardado } = await searchParams;
  const supabase = await createClient();

  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) {
    redirect("/auth/login");
  }

  const userId = data.claims.sub as string;

  const { data: miPerfil } = await supabase
    .from("profiles")
    .select("role, company_id")
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

  const { data: empresa } = await supabase
    .from("companies")
    .select("id, whatsapp_admin, umbral_stock_bajo, slug, tipo_negocio, iva_porcentaje, iva_incluido")
    .eq("id", miPerfil.company_id)
    .single();

  if (!empresa) {
    return null;
  }

  return (
    <div className="flex max-w-md flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-ink">Configuración</h1>
        <p className="text-sm text-ink/60">
          Resumen diario y alertas de stock bajo por WhatsApp.
        </p>
      </div>

      {!whatsappDisponible() && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">
          El envío de WhatsApp todavía no está activado en esta instalación
          de Ventastack (falta configurar las llaves de UltraMsg). Puedes
          guardar tus datos de todos modos — en cuanto se active, empiezan
          a funcionar solos, sin que tengas que volver a esta pantalla.
        </div>
      )}

      <div className="rounded-lg border border-linea bg-white p-6">
        <form
          action={guardarConfiguracion.bind(null, empresa.id)}
          className="flex flex-col gap-4"
        >
          <div>
            <label htmlFor="slug" className="block text-sm font-medium text-ink">
              URL corta de acceso
            </label>
            <div className="mt-1 flex items-center gap-2">
              <span className="text-sm text-ink/50">ventastack.vercel.app/auth/vendedor?empresa=</span>
              <input
                id="slug"
                name="slug"
                type="text"
                defaultValue={empresa.slug ?? ""}
                placeholder="mitienda"
                pattern="[a-z0-9-]+"
                className="w-32 rounded-md border border-linea px-3 py-2 text-ink focus:border-primario focus:outline-none"
              />
            </div>
            <p className="mt-1 text-xs text-ink/50">
              Solo minúsculas, números y guiones. Sin espacios.
            </p>
          </div>

          <div className="border-t border-linea pt-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink/50">Tipo de negocio</p>
            <select
              name="tipo_negocio"
              defaultValue={empresa.tipo_negocio ?? "tienda"}
              className="w-full rounded-md border border-linea px-3 py-2 text-ink focus:border-primario focus:outline-none"
            >
              <option value="tienda">🏪 Tienda / Miscelánea / Abarrotes</option>
              <option value="distribuidor">🚚 Distribuidor / Ruta de ventas</option>
              <option value="restaurante">🍽️ Restaurante / Cafetería</option>
              <option value="taller">🔧 Taller / Servicio técnico</option>
            </select>
          </div>

          <div className="border-t border-linea pt-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink/50">IVA</p>
            <div className="flex flex-col gap-3">
              <div>
                <label className="block text-sm font-medium text-ink">Porcentaje de IVA</label>
                <div className="mt-1 flex items-center gap-2">
                  <input
                    name="iva_porcentaje"
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    defaultValue={empresa.iva_porcentaje ?? 0}
                    className="w-24 rounded-md border border-linea px-3 py-2 text-ink focus:border-primario focus:outline-none"
                  />
                  <span className="text-sm text-ink/60">% (0 = sin IVA, 16 = IVA estándar México)</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-ink mb-1">¿Cómo manejas los precios?</label>
                <select
                  name="iva_incluido"
                  defaultValue={empresa.iva_incluido ? "true" : "false"}
                  className="w-full rounded-md border border-linea px-3 py-2 text-ink focus:border-primario focus:outline-none"
                >
                  <option value="true">El precio ya incluye IVA (precio final al cliente)</option>
                  <option value="false">El precio no incluye IVA (se agrega al cobrar)</option>
                </select>
                <p className="mt-1 text-xs text-ink/50">
                  La mayoría de tiendas de abarrotes usan &quot;precio final&quot;. Negocios que facturan usan &quot;precio + IVA&quot;.
                </p>
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="whatsapp_admin" className="block text-sm font-medium text-ink">
              Tu número de WhatsApp
            </label>
            <input
              id="whatsapp_admin"
              name="whatsapp_admin"
              type="text"
              defaultValue={empresa.whatsapp_admin ?? ""}
              placeholder="5219991234567"
              className="mt-1 w-full rounded-md border border-linea px-3 py-2 text-ink focus:border-primario focus:outline-none"
            />
            <p className="mt-1 text-xs text-ink/50">
              Con código de país, sin espacios ni signo +. Aquí llega el
              resumen diario y las alertas de stock bajo.
            </p>
          </div>

          <div>
            <label htmlFor="umbral_stock_bajo" className="block text-sm font-medium text-ink">
              Avisar cuando un producto tenga menos de
            </label>
            <input
              id="umbral_stock_bajo"
              name="umbral_stock_bajo"
              type="number"
              min="0"
              step="1"
              defaultValue={empresa.umbral_stock_bajo ?? ""}
              placeholder="5"
              className="mt-1 w-full rounded-md border border-linea px-3 py-2 text-ink focus:border-primario focus:outline-none"
            />
            <p className="mt-1 text-xs text-ink/50">
              Déjalo vacío para apagar las alertas de stock bajo.
            </p>
          </div>

          {errorParam && <p className="text-sm text-red-600">{errorParam}</p>}
          {guardado && (
            <p className="text-sm text-emerald-700">Guardado correctamente.</p>
          )}

          <button
            type="submit"
            className="w-full rounded-md bg-primario px-4 py-2 font-medium text-white transition hover:opacity-90"
          >
            Guardar
          </button>
        </form>
      </div>
    </div>
  );
}
