import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function HistorialCajaPage() {
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

  const { data: cajas } = await supabase
    .from("cajas")
    .select("id, estado, fondo_inicial, monto_contado, diferencia, abierta_en, cerrada_en")
    .order("abierta_en", { ascending: false });

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-bold text-ink">Historial de cajas</h1>

      <div className="rounded-lg border border-linea bg-white p-4">
        {cajas?.length ? (
          <ul className="flex flex-col gap-2">
            {cajas.map((c) => (
              <li key={c.id} className="border-b border-linea pb-2 last:border-0">
                <Link
                  href={`/protected/caja/historial/${c.id}`}
                  className="flex items-center justify-between gap-2 text-sm"
                >
                  <div className="flex flex-col">
                    <span className="text-ink">
                      {new Date(c.abierta_en).toLocaleDateString("es-MX")}
                    </span>
                    <span className="text-xs text-ink/50">
                      {c.estado === "abierta"
                        ? "abierta"
                        : `cerrada ${new Date(c.cerrada_en!).toLocaleTimeString("es-MX")}`}
                    </span>
                  </div>
                  {c.estado === "cerrada" && c.diferencia !== null && (
                    <span
                      className={`cifra font-medium ${
                        c.diferencia === 0
                          ? "text-verde"
                          : c.diferencia > 0
                            ? "text-verde"
                            : "text-red-600"
                      }`}
                    >
                      {c.diferencia === 0
                        ? "exacto"
                        : `${c.diferencia > 0 ? "+" : ""}$${c.diferencia.toFixed(2)}`}
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-ink/50">Todavía no hay cajas registradas.</p>
        )}
      </div>

      <Link href="/protected/caja" className="text-sm text-primario hover:underline">
        Regresar a la caja
      </Link>
    </div>
  );
}
