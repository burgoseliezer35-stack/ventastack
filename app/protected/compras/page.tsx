import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function ComprasPage() {
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

  const { data: compras } = await supabase
    .from("compras")
    .select("id, total, nota, created_at, proveedores(nombre)")
    .order("created_at", { ascending: false });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-ink">Compras</h1>
        <Link
          href="/protected/proveedores"
          className="text-sm text-primario hover:underline"
        >
          Proveedores
        </Link>
      </div>

      <div className="flex flex-wrap gap-3">
        <Link
          href="/protected/compras/recibir"
          className="flex-1 rounded-md bg-primario px-4 py-3 text-center text-sm font-medium text-white transition hover:opacity-90"
        >
          📦 Recibir mercancía (express)
        </Link>
        <Link
          href="/protected/compras/nueva"
          className="flex-1 rounded-md border border-primario px-4 py-3 text-center text-sm font-medium text-primario transition hover:bg-primario-suave"
        >
          + Registrar compra completa
        </Link>
      </div>

      <div className="rounded-lg border border-linea bg-white p-4">
        {compras?.length ? (
          <ul className="flex flex-col gap-2">
            {compras.map((c) => {
              const proveedor = Array.isArray(c.proveedores)
                ? c.proveedores[0]?.nombre
                : (c.proveedores as { nombre: string } | null)?.nombre;
              return (
                <li key={c.id} className="border-b border-linea pb-2 last:border-0">
                  <Link
                    href={`/protected/compras/${c.id}`}
                    className="flex items-center justify-between gap-2 text-sm"
                  >
                    <div className="flex flex-col">
                      <span className="text-ink">{proveedor ?? "Proveedor"}</span>
                      <span className="text-xs text-ink/50">
                        {new Date(c.created_at).toLocaleDateString("es-MX")}
                        {c.nota ? ` · ${c.nota}` : ""}
                      </span>
                    </div>
                    <span className="cifra font-medium text-ink">
                      ${c.total.toFixed(2)}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-ink/50">Todavía no has registrado compras.</p>
        )}
      </div>
    </div>
  );
}
