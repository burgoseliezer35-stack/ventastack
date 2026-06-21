import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { RecepcionExpressForm } from "@/components/recepcion-express-form";

export default async function RecepcionExpressPage() {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) redirect("/auth/login");

  const userId = data.claims.sub as string;
  const { data: miPerfil } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();

  if (miPerfil?.role !== "admin") redirect("/protected");

  const { data: proveedores } = await supabase
    .from("proveedores")
    .select("id, nombre")
    .order("nombre");

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-bold text-ink">Recepción de mercancía</h1>
        <p className="text-sm text-ink/60">
          Escanea o busca cada producto, pon la cantidad recibida, y el
          stock sube al instante. Proveedor y nota son opcionales.
        </p>
      </div>
      <RecepcionExpressForm proveedores={proveedores ?? []} />
    </div>
  );
}
