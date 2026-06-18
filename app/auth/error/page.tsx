export default function AuthErrorPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm rounded-lg border border-gray-200 bg-white p-6 text-center shadow-sm">
        <h1 className="mb-2 text-xl font-semibold text-gray-900">
          Hubo un problema
        </h1>
        <p className="text-sm text-gray-600">
          El enlace de confirmación no es válido o ya expiró. Intenta
          registrarte de nuevo o pide un nuevo enlace.
        </p>
      </div>
    </div>
  );
}
