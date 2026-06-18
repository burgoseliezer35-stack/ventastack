"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";

export function ModalAgregarProducto({
  categorias,
  crearProducto,
}: {
  categorias: { id: string; nombre: string }[];
  crearProducto: (formData: FormData) => Promise<void>;
}) {
  const [abierto, setAbierto] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="flex items-center gap-1.5 rounded-md bg-primario px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
      >
        <Plus size={16} />
        Agregar producto
      </button>

      {abierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white shadow-lg">
            <div className="flex items-center justify-between border-b border-linea px-5 py-4">
              <h2 className="font-semibold text-ink">Agregar producto</h2>
              <button
                type="button"
                onClick={() => setAbierto(false)}
                className="text-ink/40 hover:text-ink"
                aria-label="Cerrar"
              >
                <X size={20} />
              </button>
            </div>

            <form
              action={crearProducto}
              onSubmit={() => setAbierto(false)}
              className="flex flex-col gap-4 px-5 py-4"
            >
              <div>
                <label htmlFor="nombre" className="block text-sm font-medium text-ink">
                  Nombre
                </label>
                <input
                  id="nombre"
                  name="nombre"
                  type="text"
                  required
                  placeholder="Refresco 600ml"
                  className="mt-1 w-full rounded-md border border-linea px-3 py-2 text-ink focus:border-primario focus:outline-none"
                />
              </div>
              <div>
                <label htmlFor="precio" className="block text-sm font-medium text-ink">
                  Precio
                </label>
                <input
                  id="precio"
                  name="precio"
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  className="mt-1 w-full rounded-md border border-linea px-3 py-2 text-ink focus:border-primario focus:outline-none"
                />
              </div>
              <div>
                <label htmlFor="categoria_id" className="block text-sm font-medium text-ink">
                  Categoría (opcional)
                </label>
                <select
                  id="categoria_id"
                  name="categoria_id"
                  className="mt-1 w-full rounded-md border border-linea px-3 py-2 text-ink focus:border-primario focus:outline-none"
                >
                  <option value="">Sin categoría</option>
                  {categorias.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="codigo_barras" className="block text-sm font-medium text-ink">
                  Código de barras (opcional)
                </label>
                <input
                  id="codigo_barras"
                  name="codigo_barras"
                  type="text"
                  placeholder="Escanéalo aquí o escríbelo a mano"
                  className="mt-1 w-full rounded-md border border-linea px-3 py-2 text-ink focus:border-primario focus:outline-none"
                />
              </div>
              <p className="text-xs text-ink/50">
                Arranca con 0 en existencia — después de crearlo, usa
                &quot;Ajustar&quot; para entrar la cantidad inicial real.
              </p>
              <button
                type="submit"
                className="w-full rounded-md bg-primario px-4 py-2 font-medium text-white transition hover:opacity-90"
              >
                Guardar producto
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
