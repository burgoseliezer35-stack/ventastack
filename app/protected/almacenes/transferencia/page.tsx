import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { revalidatePath } from "next/cache";

async function crearTransferencia(formData: FormData) {
  "use server";
  const supabase = await createClient();
  const origenId = formData.get("origen_id") as string;
  const destinoId = formData.get("destino_id") as string;
  const nota = (formData.get("nota") as string)?.trim() || null;

  if (!origenId || !destinoId || origenId === destinoId) return;

  const productoIds = (formData.getAll("producto_id") as string[]);
  const cantidades = (formData.getAll("cantidad") as string[]);

  const items = productoIds
    .map((pid, i) => ({ producto_id: pid, cantidad: Number(cantidades[i]) }))
    .filter((i) => i.cantidad > 0);

  if (!items.length) return;

  const { data: transferencia } = await supabase
    .from("transferencias_almacen")
    .insert({ almacen_origen_id: origenId, almacen_destino_id: destinoId, nota, estado: "aprobada" })
    .select("id").single();

  if (!transferencia) return;

  await supabase.from("detalle_transferencias").insert(
    items.map((i) => ({ transferencia_id: transferencia.id, ...i }))
  );

  await supabase.rpc("completar_transferencia", { p_transferencia_id: transferencia.id });

  revalidatePath("/protected/almacenes");
  redirect("/protected/almacenes");
}

export default async function TransferenciaPage() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) redirect("/auth/login");

  const { data: miPerfil } = await supabase
    .from("profiles").select("role, company_id").eq("id", data.claims.sub as string).single();
  if (miPerfil?.role !== "admin") redirect("/protected");

  const { data: almacenes } = await supabase
    .from("almacenes").select("id, nombre, tipo").eq("activo", true).order("nombre");

  const { data: productos } = await supabase
    .from("productos").select("id, nombre").eq("company_id", miPerfil?.company_id ?? "").eq("activo", true).order("nombre");

  return (
    <div className="flex flex-col gap-4 max-w-xl">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-ink">Nueva transferencia</h1>
        <Link href="/protected/almacenes" className="text-sm text-primario hover:underline">Cancelar</Link>
      </div>

      <form action={crearTransferencia} className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-ink/60 mb-1">Origen</label>
            <select name="origen_id" required
              className="w-full rounded-md border border-linea px-3 py-2 text-sm text-ink focus:border-primario focus:outline-none">
              <option value="">Seleccionar...</option>
              {almacenes?.map((a) => <option key={a.id} value={a.id}>{a.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-ink/60 mb-1">Destino</label>
            <select name="destino_id" required
              className="w-full rounded-md border border-linea px-3 py-2 text-sm text-ink focus:border-primario focus:outline-none">
              <option value="">Seleccionar...</option>
              {almacenes?.map((a) => <option key={a.id} value={a.id}>{a.nombre}</option>)}
            </select>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-linea bg-white shadow-sm">
          <div className="border-b border-linea bg-primario-suave px-4 py-3">
            <h2 className="text-sm font-semibold text-ink">Productos a transferir</h2>
          </div>
          <div className="divide-y divide-linea max-h-64 overflow-y-auto">
            {productos?.map((p) => (
              <div key={p.id} className="flex items-center gap-3 px-4 py-2.5">
                <span className="flex-1 text-sm text-ink">{p.nombre}</span>
                <input type="hidden" name="producto_id" value={p.id} />
                <input
                  type="number"
                  name="cantidad"
                  min="0"
                  defaultValue="0"
                  inputMode="numeric"
                  className="w-20 rounded-md border border-linea px-2 py-1 text-right text-sm focus:border-primario focus:outline-none"
                />
              </div>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-ink/60 mb-1">Nota (opcional)</label>
          <input name="nota" type="text" placeholder="Ej: Surtido semanal camión 1"
            className="w-full rounded-md border border-linea px-3 py-2 text-sm text-ink focus:border-primario focus:outline-none" />
        </div>

        <button type="submit"
          className="w-full rounded-xl bg-primario px-4 py-3 font-semibold text-white hover:opacity-90 transition">
          Confirmar transferencia
        </button>
      </form>
    </div>
  );
}
