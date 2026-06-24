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

  const ejecutarBorrado = async (forzar: boolean) => {
    setCargando(true);
    setError(null);
    const resultado = await borrarEmpresa(companyId, forzar);

    if (resultado.ok) {
      router.push("/reseller");
      router.refresh();
      return;
    }

    if (resultado.tieneHistorial) {
      // Tiene pedidos — pedir confirmación extra para borrado forzado
      setCargando(false);
      const confirmar = confirm(
        `"${nombre}" tiene historial de ventas.\n\n¿Borrar permanentemente junto con todos sus pedidos y usuarios?\n\nEsta acción NO se puede deshacer.`
      );
      if (confirmar) {
        await ejecutarBorrado(true);
      }
      return;
    }

    setError(resultado.error ?? "Error al eliminar");
    setCargando(false);
  };

  const handleClick = async () => {
    if (!confirm(`¿Eliminar "${nombre}"?`)) return;
    await ejecutarBorrado(false);
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
