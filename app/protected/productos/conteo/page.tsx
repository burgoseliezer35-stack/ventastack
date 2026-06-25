import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ConteoFisico } from "./conteo-form";

export default async function ConteoPage() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) redirect("/auth/login");

  const { data: perfil } = await supabase
    .from("profiles")
    .select("role, company_id")
    .eq("id", data.claims.sub as string)
    .single();

  if (perfil?.role !== "admin") redirect("/protected");

  const { data: productos } = await supabase
    .from("productos")
    .select("id, nombre, codigo_barras, stock, imagen_url")
    .eq("company_id", perfil.company_id)
    .eq("activo", true)
    .order("nombre");

  return <ConteoFisico productos={productos ?? []} />;
}
