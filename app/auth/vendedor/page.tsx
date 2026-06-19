import { UsernameLoginForm } from "@/components/username-login-form";

export default async function VendedorLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ empresa?: string }>;
}) {
  const { empresa } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-4">
      <div className="w-full max-w-sm rounded-lg border border-linea bg-white p-6 shadow-sm">
        <h1 className="mb-1 text-xl font-bold text-ink">Entrada vendedores</h1>
        <p className="mb-6 text-sm text-ink/60">
          Entra con tu usuario y contraseña.
        </p>
        {empresa ? (
          <UsernameLoginForm companyId={empresa} />
        ) : (
          <p className="text-sm text-red-600">
            Enlace inválido — pídele a tu administrador el enlace correcto de
            acceso para tu empresa.
          </p>
        )}
      </div>
    </div>
  );
}
