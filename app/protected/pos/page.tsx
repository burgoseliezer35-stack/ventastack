import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { PosForm } from "@/components/pos-form";
import { geminiDisponible } from "@/lib/gemini";

export default async function PosPage() {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) redirect("/auth/login");

  const userId = data.claims.sub as string;
  const { data: miPerfil } = await supabase
    .from("profiles")
    .select("company_id")
    .eq("id", userId)
    .limit(1)
    .maybeSingle();

  const { data: empresa } = await supabase
    .from("companies")
    .select("precios_con_iva_incluido, tipos_negocio, formato_direccion")
    .eq("id", miPerfil?.company_id ?? "")
    .single();

  const { data: productosRaw } = await supabase
    .from("productos")
    .select("id, nombre, precio, stock, codigo_barras, imagen_url, ieps_porcentaje, iva_porcentaje, unidad_medida, step_cantidad")
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
    .select("id, nombre, telefono, direccion, ciudad, codigo_postal, dir_calle_principal, dir_entre1, dir_entre2, dir_numero, dir_colonia, dir_municipio, dir_estado")
    .eq("activo", true)
    .order("nombre");

  const tiposNegocio = (empresa as { tipos_negocio?: string[] } | null)?.tipos_negocio ?? [];
  const esDistribuidor = tiposNegocio.includes("distribuidor");
  const formatoDireccion = (empresa as { formato_direccion?: string } | null)?.formato_direccion ?? "general";

  const { data: repartidores } = esDistribuidor
    ? await supabase
        .from("profiles")
        .select("id, full_name")
        .eq("company_id", miPerfil?.company_id ?? "")
        .eq("role", "vendedor")
        .order("full_name")
    : { data: [] };

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-bold text-ink">Punto de venta</h1>
      {productos.length ? (
        <PosForm
          productos={productos}
          clientes={clientes ?? []}
          geminiDisponible={geminiDisponible()}
          ivaIncluido={(empresa as { precios_con_iva_incluido?: boolean } | null)?.precios_con_iva_incluido ?? true}
          companyId={miPerfil?.company_id ?? ""}
          esDistribuidor={esDistribuidor}
          repartidores={repartidores ?? []}
          formatoDireccion={formatoDireccion as "general" | "merida" | "libre"}
        />
      ) : (
        <p className="max-w-sm text-sm text-ink/60">
          Todavía no tienes productos en tu catálogo.{" "}
          <Link href="/protected/productos" className="text-primario hover:underline">
            Agregar productos
          </Link>
        </p>
      )}
    </div>
  );
}
