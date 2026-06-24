"use client";

import { borrarEmpresa } from "./actions";

export function BotonBorrarEmpresa({
  companyId,
  nombre,
}: {
  companyId: string;
  nombre: string;
}) {
  return (
    <form
      action={async () => {
        if (!confirm(`¿Seguro que quieres eliminar "${nombre}"? Esta acción puede no ser reversible.`)) {
          return;
        }
        await borrarEmpresa(companyId);
      }}
    >
      <button
        type="submit"
        className="rounded-md border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 transition hover:bg-red-100"
      >
        Borrar empresa
      </button>
    </form>
  );
}
