import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { PosForm } from "@/components/pos-form";
import { geminiDisponible } from "@/lib/gemini";

export default async function PosPage() {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) {
    redirect("/auth/login");
  }

  const userId = data.claims.sub as string;
  const { data: miPerfil } = await supabase
    .from("profiles")
    .select("company_id")
    .eq("id", userId)
    .single();

  const { data: empresa } = await supabase
    .from("companies")
    .select("iva_porcentaje, iva_incluido, ieps_habilitado, ieps_porcentaje")
    .eq("id", miPerfil?.company_id)
    .single();

  const { data: productosRaw } = await supabase
    .from("productos")
    .select("id, nombre, precio, stock, codigo_barras, imagen_url, ieps_porcentaje, iva_porcentaje")
    .eq("company_id", miPerfil?.company_id ?? "")
    .eq("activo", true)
    .order("nombre");

  const { data: niveles } = await supabase
    .from("precios_mayoreo")
    .select("producto_id, cantidad_minima, precio_unitario")
    .eq("company_id", miPerfil?.company_id ?? "")
    .order("cantidad_minima", { ascending: false });

  const productos = (productosRaw ?? []).map((p) => ({
    ...p,
    niveles: (niveles ?? []).filter((n) => n.producto_id === p.id),
  }));

  const { data: clientes } = await supabase
    .from("clientes")
    .select("id, nombre")
    .order("nombre");

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-bold text-ink">Punto de venta</h1>

      {productos.length ? (
        <PosForm
          productos={productos}
          clientes={clientes ?? []}
          geminiDisponible={geminiDisponible()}
          ivaPorcentaje={empresa?.iva_porcentaje ?? 0}
          ivaIncluido={empresa?.iva_incluido ?? true}
          iepsHabilitado={empresa?.ieps_habilitado ?? false}
          iepsPorcentaje={empresa?.ieps_porcentaje ?? 0}
          companyId={miPerfil?.company_id ?? ""}
        />
      ) : (
        <p className="max-w-sm text-sm text-ink/60">
          Todavía no tienes productos en tu catálogo. Agrega al menos uno en{" "}
          <Link href="/protected/productos" className="text-primario hover:underline">
            Catálogo
          </Link>{" "}
          antes de vender.
        </p>
      )}
    </div>
  );
}
