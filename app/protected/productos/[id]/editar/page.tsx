import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { actualizarProducto } from "./actions";
import { EditarProductoForm } from "./form";

export default async function EditarProductoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error: errorParam } = await searchParams;
  const supabase = await createClient();

  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) redirect("/auth/login");

  const userId = data.claims.sub as string;
  const { data: miPerfil } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();

  if (miPerfil?.role !== "admin") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="text-sm text-ink/70">Solo el admin puede ver esta página.</p>
        <Link href="/protected" className="text-sm text-primario hover:underline">Regresar</Link>
      </div>
    );
  }

  const { data: categorias } = await supabase
    .from("categorias")
    .select("id, nombre")
    .order("nombre");

  const { data: producto } = await supabase
    .from("productos")
    .select("id, nombre, precio, activo, stock, categoria_id, codigo_barras, imagen_url")
    .eq("id", id)
    .single();

  if (!producto) notFound();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-bold text-ink">Editar producto</h1>
      {errorParam && <p className="text-sm text-red-600">{errorParam}</p>}
      <EditarProductoForm
        producto={producto}
        categorias={categorias ?? []}
        actualizarProducto={actualizarProducto}
      />
      <Link href="/protected/productos" className="text-sm text-primario hover:underline">
        Regresar
      </Link>
    </div>
  );
}
