import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-paper px-4 text-center">
      <h1 className="text-2xl font-bold text-ink">Ventastack</h1>
      <p className="max-w-sm text-ink/60">
        Tu plataforma de ventas en ruta y punto de venta.
      </p>
      <Link
        href="/auth/login"
        className="rounded-md bg-primario px-6 py-2 text-sm font-medium text-white transition hover:opacity-90"
      >
        Entrar
      </Link>
    </div>
  );
}
