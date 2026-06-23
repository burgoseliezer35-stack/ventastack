import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ServiceWorkerRegistrar } from "@/components/service-worker-registrar";
import { Sidebar } from "@/components/sidebar";
import { LogoutButton } from "@/components/logout-button";
import { CompartirUbicacion } from "@/components/compartir-ubicacion";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) {
    redirect("/auth/login");
  }

  const userId = data.claims.sub as string;

  const { data: perfil, error: perfilError } = await supabase
    .from("profiles")
    .select("full_name, role, company_id")
    .eq("id", userId)
    .single();

  // Si esto falla, antes el código se caía en silencio a "Usuario"
  // y un menú vacío — sin decir por qué. Ahora, si de verdad hay un
  // problema (la fila no existe, o el query truena), lo mostramos
  // claro en vez de esconderlo detrás de valores de repuesto.
  if (perfilError || !perfil) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-paper px-4 text-center">
        <h1 className="text-xl font-bold text-ink">No pudimos cargar tu perfil</h1>
        <p className="max-w-sm text-sm text-ink/60">
          {perfilError?.message ??
            "No encontramos una fila de perfil para esta cuenta."}
        </p>
        <p className="max-w-sm text-xs text-ink/40">
          ID de usuario: {userId}
        </p>
        <LogoutButton />
      </div>
    );
  }

  const { data: empresa } = await supabase
    .from("companies")
    .select("activa, name, tipo_negocio, tipos_negocio")
    .eq("id", perfil.company_id)
    .single();

  // Si el reseller desactivó esta empresa (no pagó), nadie de ahí
  // entra a nada — ni admin, ni cajero, ni vendedor — hasta que se
  // vuelva a activar desde el panel de reseller.
  if (empresa && empresa.activa === false) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-paper px-4 text-center">
        <h1 className="text-xl font-bold text-ink">Cuenta desactivada</h1>
        <p className="max-w-xs text-sm text-ink/60">
          El acceso a este negocio está pausado. Contacta a quien te dio de
          alta en Ventastack para reactivarlo.
        </p>
        <LogoutButton />
      </div>
    );
  }

  const esAdmin = perfil.role === "admin";
  const esVendedor = perfil.role === "vendedor";

  return (
    <>
      <ServiceWorkerRegistrar />
      <div className="flex min-h-screen flex-col bg-paper md:flex-row print:hidden">
      <Sidebar
        nombre={perfil.full_name ?? "Usuario"}
        rol={perfil.role ?? "—"}
        esAdmin={esAdmin}
        esVendedor={esVendedor}
        nombreEmpresa={empresa?.name ?? undefined}
        tipoNegocio={empresa?.tipo_negocio ?? "tienda"}
        tiposNegocio={(empresa as {tipos_negocio?: string[] | null})?.tipos_negocio ?? []}
      />
      <main className="flex-1 px-4 py-6 md:px-8 md:py-8">{children}</main>
      {esVendedor && <CompartirUbicacion />}
    </div>
    </>
  );
}
