import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { CotizacionForm } from "@/components/cotizacion-form";

export default async function NuevaCotizacionPage() {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) {
    redirect("/auth/login");
  }

  const { data: productos } = await supabase
    .from("productos")
    .select("id, nombre, precio")
    .order("nombre");

  const { data: clientes } = await supabase
    .from("clientes")
    .select("id, nombre")
    .order("nombre");

  return (
    <div className="flex flex-col items-center gap-6">
      <h1 className="text-xl font-bold text-ink">Nueva cotización</h1>
      <CotizacionForm productos={productos ?? []} clientes={clientes ?? []} />
    </div>
  );
}
