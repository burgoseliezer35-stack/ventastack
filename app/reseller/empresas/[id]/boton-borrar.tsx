"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { borrarEmpresa } from "./actions";

export function BotonBorrarEmpresa({
  companyId,
  nombre,
}: {
  companyId: string;
  nombre: string;
}) {
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleClick = async () => {
    if (!confirm(`¿Seguro que quieres eliminar "${nombre}"?\nEsta acción puede no ser reversible.`)) {
      return;
    }
    setCargando(true);
    setError(null);
    const resultado = await borrarEmpresa(companyId);
    if (resultado.ok) {
      router.push("/reseller");
      router.refresh();
    } else {
      setError(resultado.error ?? "Error al eliminar");
      setCargando(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={cargando}
        className="rounded-md border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 transition hover:bg-red-100 disabled:opacity-50"
      >
        {cargando ? "Eliminando..." : "Borrar empresa"}
      </button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
