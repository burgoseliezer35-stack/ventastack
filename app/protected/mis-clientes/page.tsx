import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { BuscadorClientes } from "@/components/buscador-clientes";

export default async function MisClientesPage() {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) {
    redirect("/auth/login");
  }

  // Gracias a la política de RLS de 007_clientes_por_vendedor.sql,
  // esta consulta YA regresa solo los clientes asignados a este
  // vendedor — no hace falta filtrar nada a mano en el código.
  const { data: clientes } = await supabase
    .from("clientes")
    .select("id, nombre, telefono, direccion")
    .order("nombre");

  return (
    <div className="flex min-h-screen flex-col items-center gap-6 bg-gray-50 px-4 py-10">
      <h1 className="text-xl font-semibold text-gray-900">Mis clientes</h1>
      <BuscadorClientes clientes={clientes ?? []} />
      <Link
        href="/protected"
        className="text-sm text-emerald-600 hover:underline"
      >
        Regresar
      </Link>
    </div>
  );
}
