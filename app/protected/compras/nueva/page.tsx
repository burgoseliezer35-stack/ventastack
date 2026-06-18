import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { CompraForm } from "@/components/compra-form";

export default async function NuevaCompraPage() {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) {
    redirect("/auth/login");
  }

  const { data: proveedores } = await supabase
    .from("proveedores")
    .select("id, nombre")
    .order("nombre");

  const { data: productos } = await supabase
    .from("productos")
    .select("id, nombre")
    .order("nombre");

  if (!proveedores?.length) {
    return (
      <div className="flex flex-col items-center gap-4 py-12 text-center">
        <p className="max-w-sm text-sm text-ink/60">
          Necesitas al menos un proveedor antes de registrar una compra.
        </p>
        <Link
          href="/protected/proveedores"
          className="rounded-md bg-primario px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
        >
          Agregar proveedor
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-6">
      <h1 className="text-xl font-bold text-ink">Registrar compra</h1>
      <CompraForm proveedores={proveedores} productos={productos ?? []} />
    </div>
  );
}
