import { UsernameLoginForm } from "@/components/username-login-form";
import { createClient } from "@/lib/supabase/server";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function VendedorLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ empresa?: string }>;
}) {
  const { empresa } = await searchParams;
  let companyId: string | null = null;

  if (empresa) {
    if (UUID_REGEX.test(empresa)) {
      companyId = empresa;
    } else {
      // Es un slug — lo resolvemos a UUID en el servidor
      const supabase = await createClient();
      const { data } = await supabase.rpc("company_id_por_slug", { p_slug: empresa });
      companyId = data ?? null;
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-4">
      <div className="w-full max-w-sm rounded-lg border border-linea bg-white p-6 shadow-sm">
        <h1 className="mb-1 text-xl font-bold text-ink">Acceso</h1>
        <p className="mb-6 text-sm text-ink/60">
          Entra con tu usuario y contraseña.
        </p>
        {companyId ? (
          <UsernameLoginForm companyId={companyId} />
        ) : (
          <p className="text-sm text-red-600">
            Enlace inválido — pídele a tu administrador el enlace correcto.
          </p>
        )}
      </div>
    </div>
  );
}
