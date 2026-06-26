import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { CompraForm } from "@/components/compra-form";

export default async function NuevaCompraPage() {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) {
    redirect("/auth/login");
  }

  const { data: perfil } = await supabase
    .from("profiles")
    .select("company_id")
    .eq("id", data.claims.sub as string)
    .single();

  const { data: empresa } = await supabase
    .from("companies")
    .select("iva_porcentaje, ieps_habilitado, ieps_porcentaje")
    .eq("id", perfil?.company_id)
    .single();

  const { data: proveedores } = await supabase
    .from("proveedores")
    .select("id, nombre")
    .eq("company_id", perfil?.company_id)
    .order("nombre");

  const { data: productos } = await supabase
    .from("productos")
    .select("id, nombre, costo, imagen_url")
    .eq("company_id", perfil?.company_id)
    .order("nombre");

  return (
    <div className="flex flex-col items-center gap-6">
      <h1 className="text-xl font-bold text-ink">Registrar compra</h1>
      <CompraForm
        proveedores={proveedores ?? []}
        productos={productos ?? []}
        ivaEmpresa={empresa?.iva_porcentaje ?? 16}
        iepsHabilitado={empresa?.ieps_habilitado ?? false}
        iepsEmpresa={empresa?.ieps_porcentaje ?? 0}
      />
    </div>
  );
}
