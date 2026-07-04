import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ClientesUI } from "./clientes-ui";

export default async function ClientesPage() {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) redirect("/auth/login");

  const userId = data.claims.sub as string;

  const { data: miPerfil } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .limit(1)
    .maybeSingle();

  if (miPerfil?.role === "vendedor") redirect("/protected/mis-clientes");

  if (miPerfil?.role !== "admin" && miPerfil?.role !== "cajero") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="text-sm text-ink/60">No tienes permiso para ver esta página.</p>
        <Link href="/protected" className="text-sm text-primario hover:underline">Regresar</Link>
      </div>
    );
  }

  const esAdmin = miPerfil?.role === "admin";

  const { data: clientes } = await supabase
    .from("clientes")
    .select("id, nombre, tipo_persona, rfc, telefono, whatsapp, email, direccion, ciudad, codigo_postal, observaciones, limite_credito, saldo_actual, bloqueado, vendedor_id")
    .order("nombre");

  const { data: vendedores } = await supabase
    .from("profiles")
    .select("id, full_name")
    .eq("role", "vendedor")
    .order("full_name");

  return (
    <ClientesUI
      clientesIniciales={(clientes ?? []) as Parameters<typeof ClientesUI>[0]["clientesIniciales"]}
      vendedores={vendedores ?? []}
      esAdmin={esAdmin}
    />
  );
}
