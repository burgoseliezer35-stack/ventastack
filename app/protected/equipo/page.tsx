import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { InviteForm } from "@/components/invite-form";
import Link from "next/link";

export default async function EquipoPage() {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) {
    redirect("/auth/login");
  }

  const userId = data.claims.sub as string;

  const { data: miPerfil } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();

  if (miPerfil?.role !== "admin") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gray-50 px-4 text-center">
        <p className="text-sm text-gray-600">
          Solo el admin de la empresa puede ver esta página.
        </p>
        <Link href="/protected" className="text-sm text-emerald-600 hover:underline">
          Regresar
        </Link>
      </div>
    );
  }

  // RLS deja ver solo a los perfiles de la MISMA empresa — no hace
  // falta filtrar por company_id a mano en esta consulta.
  const { data: equipo } = await supabase
    .from("profiles")
    .select("id, full_name, role")
    .order("created_at", { ascending: true });

  return (
    <div className="flex min-h-screen flex-col items-center gap-6 bg-gray-50 px-4 py-10">
      <div className="w-full max-w-sm rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h1 className="mb-1 text-xl font-semibold text-gray-900">
          Invitar a tu equipo
        </h1>
        <p className="mb-4 text-sm text-gray-500">
          Se unen a tu misma empresa, no crean una nueva.
        </p>
        <InviteForm />
      </div>

      <div className="w-full max-w-sm rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-3 text-sm font-medium text-gray-700">Tu equipo</h2>
        <ul className="flex flex-col gap-2">
          {equipo?.map((persona) => (
            <li
              key={persona.id}
              className="flex justify-between text-sm text-gray-600"
            >
              <span>{persona.full_name}</span>
              <span className="text-gray-400">{persona.role}</span>
            </li>
          ))}
        </ul>
      </div>

      <Link href="/protected" className="text-sm text-emerald-600 hover:underline">
        Regresar
      </Link>
    </div>
  );
}
