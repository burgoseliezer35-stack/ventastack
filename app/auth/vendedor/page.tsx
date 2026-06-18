import { LoginForm } from "@/components/login-form";

export default function VendedorLoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-4">
      <div className="w-full max-w-sm rounded-lg border border-linea bg-white p-6">
        <h1 className="mb-1 text-xl font-bold text-ink">Entrada vendedores</h1>
        <p className="mb-6 text-sm text-ink/60">Para el equipo en ruta.</p>
        <LoginForm />
      </div>
    </div>
  );
}
