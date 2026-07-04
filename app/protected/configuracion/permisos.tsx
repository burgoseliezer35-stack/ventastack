"use client";

import { useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";

type Permiso = {
  modulo: string;
  activo: boolean;
};

type Props = {
  cajero: Permiso[];
  vendedor: Permiso[];
  companyId: string;
};

const ETIQUETAS: Record<string, string> = {
  pos:           "Punto de venta",
  caja:          "Caja / Turnos",
  historial:     "Historial de ventas",
  devoluciones:  "Devoluciones",
  cotizaciones:  "Cotizaciones",
  clientes:      "Clientes",
  verificador:   "Verificador de precios",
  compras:       "Compras / Mercancía",
  productos:     "Catálogo de productos",
  proveedores:   "Proveedores",
  reportes:      "Reportes",
  rutas:         "Ver rutas (mapa flotilla)",
  pedidos_ruta:  "Mis pedidos asignados",
  almacenes:     "Almacenes",
  equipo:        "Equipo (crear usuarios)",
  auditoria:     "Auditoría",
  configuracion: "Configuración",
};

function TablaPermisos({
  rol, permisos, onToggle,
}: {
  rol: "cajero" | "vendedor";
  permisos: Permiso[];
  onToggle: (rol: "cajero" | "vendedor", modulo: string, valor: boolean) => void;
}) {
  return (
    <div className="rounded-xl border border-linea bg-white shadow-sm overflow-hidden">
      <div className="bg-primario-suave px-4 py-3 border-b border-linea">
        <p className="font-semibold text-ink capitalize">
          {rol === "cajero" ? "🏪 Cajero" : "🚚 Vendedor de ruta"}
        </p>
        <p className="text-xs text-ink/50 mt-0.5">
          {rol === "cajero"
            ? "Trabaja en el mostrador. Admin no aparece aquí — siempre tiene todo."
            : "Trabaja en campo entregando pedidos y visitando clientes."}
        </p>
      </div>
      <div className="divide-y divide-linea">
        {permisos.map(p => (
          <label
            key={p.modulo}
            className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-paper/60 transition"
          >
            <span className="text-sm text-ink">
              {ETIQUETAS[p.modulo] ?? p.modulo}
            </span>
            <input
              type="checkbox"
              checked={p.activo}
              onChange={e => onToggle(rol, p.modulo, e.target.checked)}
              className="rounded border-linea text-primario focus:ring-primario/30 h-4 w-4"
            />
          </label>
        ))}
      </div>
    </div>
  );
}

export function PermisosEditor({ cajero, vendedor, companyId }: Props) {
  const [cajeroPermisos, setCajeroPermisos] = useState(cajero);
  const [vendedorPermisos, setVendedorPermisos] = useState(vendedor);
  const [guardado, setGuardado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const togglePermiso = (
    rol: "cajero" | "vendedor",
    modulo: string,
    valor: boolean
  ) => {
    if (rol === "cajero") {
      setCajeroPermisos(prev =>
        prev.map(p => p.modulo === modulo ? { ...p, activo: valor } : p)
      );
    } else {
      setVendedorPermisos(prev =>
        prev.map(p => p.modulo === modulo ? { ...p, activo: valor } : p)
      );
    }
  };

  const guardar = () => {
    setError(null);
    setGuardado(false);
    startTransition(async () => {
      const supabase = createClient();
      const todos = [
        ...cajeroPermisos.map(p => ({ ...p, rol: "cajero" })),
        ...vendedorPermisos.map(p => ({ ...p, rol: "vendedor" })),
      ];

      for (const p of todos) {
        const { error: err } = await supabase
          .from("roles_permisos")
          .update({ activo: p.activo })
          .eq("company_id", companyId)
          .eq("rol", p.rol)
          .eq("modulo", p.modulo);
        if (err) { setError(err.message); return; }
      }
      setGuardado(true);
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-semibold text-ink">Permisos por rol</h2>
        <p className="text-sm text-ink/60 mt-0.5">
          Marca qué módulos puede ver cada rol. Los cambios aplican la próxima vez que el usuario inicie sesión.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <TablaPermisos rol="cajero" permisos={cajeroPermisos} onToggle={togglePermiso} />
        <TablaPermisos rol="vendedor" permisos={vendedorPermisos} onToggle={togglePermiso} />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {guardado && <p className="text-sm text-verde">Permisos guardados correctamente.</p>}

      <button
        type="button"
        onClick={guardar}
        disabled={pending}
        className="self-start rounded-md bg-primario px-5 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
      >
        {pending ? "Guardando..." : "Guardar cambios"}
      </button>
    </div>
  );
}
