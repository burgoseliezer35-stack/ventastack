import { LoginForm } from "@/components/login-form";

export default function GPanelLoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-4">
      <div className="w-full max-w-sm rounded-lg border border-linea bg-white p-6">
        <h1 className="mb-1 text-xl font-bold text-ink">Acceso administrador</h1>
        <p className="mb-6 text-sm text-ink/60">
          Entrada para quien administra toda la plataforma.
        </p>
        <LoginForm />
      </div>
    </div>
  );
}
