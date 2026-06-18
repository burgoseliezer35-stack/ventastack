"use client";

import { useState } from "react";
import { CheckinButton } from "@/components/checkin-button";

type Cliente = {
  id: string;
  nombre: string;
  telefono: string | null;
  direccion: string | null;
};

export function BuscadorClientes({ clientes }: { clientes: Cliente[] }) {
  const [busqueda, setBusqueda] = useState("");

  const filtrados = clientes.filter((c) =>
    c.nombre.toLowerCase().includes(busqueda.toLowerCase()),
  );

  return (
    <div className="flex w-full max-w-sm flex-col gap-3">
      <input
        type="text"
        placeholder="Buscar cliente..."
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        className="rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
      />

      {filtrados.length ? (
        <ul className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-white p-4">
          {filtrados.map((c) => (
            <li key={c.id} className="flex items-start justify-between gap-2 text-sm">
              <div>
                <div className="font-medium text-gray-800">{c.nombre}</div>
                <div className="text-xs text-gray-500">
                  {c.telefono ?? "Sin teléfono"} · {c.direccion ?? "Sin dirección"}
                </div>
              </div>
              <CheckinButton clienteId={c.id} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-gray-400">Sin resultados.</p>
      )}
    </div>
  );
}
