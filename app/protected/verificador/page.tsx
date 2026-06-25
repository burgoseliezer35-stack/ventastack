import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { VerificadorPrecios } from "@/components/verificador-precios";

export default async function VerificadorPage() {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) {
    redirect("/auth/login");
  }

  const { data: miPerfil } = await supabase
    .from("profiles")
    .select("company_id")
    .eq("id", data.claims.sub as string)
    .single();

  const { data: productosRaw } = await supabase
    .from("productos")
    .select("id, nombre, precio, stock, codigo_barras")
    .eq("company_id", miPerfil?.company_id ?? "")
    .eq("activo", true)
    .order("nombre");

  const { data: niveles } = await supabase
    .from("precios_mayoreo")
    .select("producto_id, cantidad_minima, precio_unitario")
    .order("cantidad_minima");

  const productos = (productosRaw ?? []).map((p) => ({
    ...p,
    niveles: (niveles ?? []).filter((n) => n.producto_id === p.id),
  }));

  return (
    <div className="flex flex-col items-center gap-6">
      <h1 className="text-xl font-bold text-ink">Verificador de precios</h1>
      <VerificadorPrecios productos={productos} />
    </div>
  );
}
