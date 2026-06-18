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

  const { data: productosRaw } = await supabase
    .from("productos")
    .select("id, nombre, precio, stock, codigo_barras")
    .eq("activo", true)
    .order("nombre");

  const { data: niveles } = await supabase
    .from("precios_mayoreo")
    .select("producto_id, cantidad_minima, precio_unitario")
    .order("cantidad_minima", { ascending: false });

  // Le pegamos sus niveles de mayoreo a cada producto, ya
  // ordenados de mayor a menor cantidad — así el formulario solo
  // tiene que tomar el primero que SÍ alcance, sin tener que
  // ordenar nada por su cuenta.
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
