"use client";

import { useState } from "react";
import { borrarEmpresa } from "./actions";

export function BotonBorrarEmpresa({
  companyId,
  nombre,
}: {
  companyId: string;
  nombre: string;
}) {
  const [cargando, setCargando] = useState(false);

  const handleClick = async () => {
    if (!confirm(`¿Seguro que quieres eliminar "${nombre}"?\nEsta acción puede no ser reversible.`)) {
      return;
    }
    setCargando(true);
    await borrarEmpresa(companyId);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={cargando}
      className="rounded-md border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 transition hover:bg-red-100 disabled:opacity-50"
    >
      {cargando ? "Eliminando..." : "Borrar empresa"}
    </button>
  );
}
