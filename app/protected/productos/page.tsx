import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { crearProducto, desactivarProducto, reactivarProducto } from "./actions";
import { ImportarExcel } from "@/components/importar-excel";
import { ModalAgregarProducto } from "@/components/modal-agregar-producto";
import { TablaCatalogo } from "@/components/tabla-catalogo";
import { Tags } from "lucide-react";

export default async function ProductosPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error: errorParam } = await searchParams;
  const supabase = await createClient();

  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) {
    redirect("/auth/login");
  }

  const userId = data.claims.sub as string;

  const { data: miPerfil } = await supabase
    .from("profiles")
    .select("role, company_id")
    .eq("id", userId)
    .single();

  if (miPerfil?.role !== "admin") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-paper px-4 text-center">
        <p className="text-sm text-ink/70">
          Solo el admin de la empresa puede ver esta página.
        </p>
        <Link href="/protected" className="text-sm text-primario hover:underline">
          Regresar
        </Link>
      </div>
    );
  }

  const { data: categorias } = await supabase
    .from("categorias")
    .select("id, nombre")
    .order("nombre");

  const { data: productosRaw } = await supabase
    .from("productos")
    .select("id, nombre, precio, costo, activo, stock, codigo_barras, imagen_url, categorias(nombre)")
    .order("nombre");

  const { data: empresa } = await supabase
    .from("companies")
    .select("umbral_stock_bajo")
    .eq("id", miPerfil.company_id)
    .single();

  const productos = (productosRaw ?? []).map((p) => ({
    id: p.id,
    nombre: p.nombre,
    precio: p.precio,
    costo: p.costo,
    activo: p.activo,
    stock: p.stock,
    codigo_barras: p.codigo_barras,
    imagen_url: p.imagen_url,
    categoria: Array.isArray(p.categorias)
      ? p.categorias[0]?.nombre ?? null
      : (p.categorias as { nombre: string } | null)?.nombre ?? null,
  }));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-ink">Catálogo</h1>
        <div className="flex items-center gap-4">
          <Link
            href="/protected/productos/conteo"
            className="flex items-center gap-1.5 text-sm text-primario hover:underline"
          >
            🔢 Conteo físico
          </Link>
          <Link
            href="/protected/productos/categorias"
            className="flex items-center gap-1.5 text-sm text-primario hover:underline"
          >
            <Tags size={15} />
            Categorías
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-linea bg-white p-4 shadow-sm">
        <ModalAgregarProducto categorias={categorias ?? []} crearProducto={crearProducto} />
        <details className="ml-auto">
          <summary className="cursor-pointer list-none text-sm font-medium text-primario hover:underline">
            Importar desde Excel
          </summary>
          <div className="mt-3">
            <ImportarExcel />
          </div>
        </details>
      </div>

      {errorParam && <p className="text-sm text-red-600">{errorParam}</p>}

      <TablaCatalogo
        productos={productos}
        umbralStockBajo={empresa?.umbral_stock_bajo ?? null}
        desactivarProducto={desactivarProducto}
        reactivarProducto={reactivarProducto}
      />

      <Link href="/protected" className="text-sm text-primario hover:underline">
        Regresar
      </Link>
    </div>
  );
}
