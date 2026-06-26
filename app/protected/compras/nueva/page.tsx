import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { CompraForm } from "@/components/compra-form";

export default async function NuevaCompraPage() {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) redirect("/auth/login");

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
    .select("id, nombre, costo, imagen_url, codigo_barras")
    .eq("company_id", perfil?.company_id)
    .eq("activo", true)
    .order("nombre");

  const { data: categorias } = await supabase
    .from("categorias")
    .select("id, nombre")
    .eq("company_id", perfil?.company_id)
    .order("nombre");

  return (
    <div className="flex flex-col gap-4">
      {/* Guía rápida para el usuario */}
      <div className="rounded-xl border border-blue-200 bg-blue-50 px-5 py-4">
        <p className="text-sm font-semibold text-blue-800 mb-1">¿Cómo funciona esta pantalla?</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
          <div className="flex items-start gap-2">
            <span className="rounded-full bg-blue-600 text-white text-xs font-bold w-5 h-5 flex items-center justify-center shrink-0 mt-0.5">1</span>
            <p className="text-xs text-blue-700">
              <strong>Producto nuevo</strong> — escanea o escribe el código. Si no existe, lo creas aquí mismo sin salir.
            </p>
          </div>
          <div className="flex items-start gap-2">
            <span className="rounded-full bg-blue-600 text-white text-xs font-bold w-5 h-5 flex items-center justify-center shrink-0 mt-0.5">2</span>
            <p className="text-xs text-blue-700">
              <strong>Producto existente</strong> — solo captura cantidad y precio del ticket. El stock sube automáticamente.
            </p>
          </div>
        </div>
      </div>

      <CompraForm
        proveedores={proveedores ?? []}
        productos={productos ?? []}
        categorias={categorias ?? []}
        ivaEmpresa={empresa?.iva_porcentaje ?? 16}
        iepsHabilitado={empresa?.ieps_habilitado ?? false}
        iepsEmpresa={empresa?.ieps_porcentaje ?? 0}
      />
    </div>
  );
}
