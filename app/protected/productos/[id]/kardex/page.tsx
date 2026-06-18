import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";

export default async function KardexProductoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: producto } = await supabase
    .from("productos")
    .select("id, nombre, stock")
    .eq("id", id)
    .single();

  if (!producto) {
    notFound();
  }

  const { data: movimientos } = await supabase
    .from("movimientos_inventario")
    .select("id, tipo, cantidad, motivo, nota, created_at")
    .eq("producto_id", id)
    .order("created_at", { ascending: false });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-ink">Kardex — {producto.nombre}</h1>
        <p className="text-sm text-ink/60">
          <span className="cifra">{producto.stock}</span> en existencia ahora
        </p>
      </div>

      <div className="rounded-lg border border-linea bg-white p-4">
        {movimientos?.length ? (
          <ul className="flex flex-col gap-2">
            {movimientos.map((m) => (
              <li
                key={m.id}
                className="flex items-center justify-between gap-2 border-b border-linea pb-2 text-sm last:border-0"
              >
                <div className="flex flex-col">
                  <span className="text-ink/70">
                    {new Date(m.created_at).toLocaleString("es-MX")}
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
                  {m.tipo === "entrada" ? "+" : "−"}
                  {m.cantidad}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-ink/50">
            Todavía no hay movimientos registrados para este producto.
          </p>
        )}
      </div>

      <Link href="/protected/productos" className="text-sm text-primario hover:underline">
        Regresar
      </Link>
    </div>
  );
}
