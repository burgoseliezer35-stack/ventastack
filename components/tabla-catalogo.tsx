"use client";

import { useState } from "react";
import Link from "next/link";
import { Pencil, Layers, History, PlusCircle, PowerOff, Power } from "lucide-react";

type Producto = {
  id: string;
  nombre: string;
  precio: number;
  costo: number;
  activo: boolean;
  stock: number;
  codigo_barras: string | null;
  categoria: string | null;
  imagen_url: string | null;
};

export function TablaCatalogo({
  productos,
  umbralStockBajo,
  desactivarProducto,
  reactivarProducto,
}: {
  productos: Producto[];
  umbralStockBajo: number | null;
  desactivarProducto: (productoId: string) => Promise<void>;
  reactivarProducto: (productoId: string) => Promise<void>;
}) {
  const [busqueda, setBusqueda] = useState("");

  const filtrados = productos.filter((p) => {
    const texto = busqueda.trim().toLowerCase();
    if (!texto) return true;
    return (
      p.nombre.toLowerCase().includes(texto) ||
      p.codigo_barras?.toLowerCase().includes(texto) ||
      p.categoria?.toLowerCase().includes(texto)
    );
  });

  return (
    <div className="overflow-hidden rounded-xl border border-linea bg-white shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-linea px-4 py-3">
        <h2 className="font-semibold text-ink">Tu catálogo</h2>
        <input
          type="text"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por nombre, código o categoría..."
          className="w-56 rounded-md border border-linea px-3 py-1.5 text-sm text-ink focus:border-primario focus:outline-none"
        />
      </div>

      {filtrados.length === 0 ? (
        <p className="px-4 py-10 text-center text-sm text-ink/40">
          {productos.length === 0
            ? "Todavía no tienes productos."
            : "Ningún producto coincide con esa búsqueda."}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-primario text-left text-xs font-semibold uppercase tracking-wide text-white">
                <th className="px-4 py-2.5">Producto</th>
                <th className="px-4 py-2.5">Categoría</th>
                <th className="px-4 py-2.5 text-right">Costo</th>
                <th className="px-4 py-2.5 text-right">Venta</th>
                <th className="px-4 py-2.5 text-right">Utilidad</th>
                <th className="px-4 py-2.5 text-right">Stock</th>
                <th className="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-linea">
              {filtrados.map((p, idx) => {
                const bajo = umbralStockBajo != null && p.stock < umbralStockBajo;
                return (
                  <tr
                    key={p.id}
                    className={bajo ? "bg-red-50" : idx % 2 === 1 ? "bg-paper/60" : ""}
                  >
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-3">
                        {p.imagen_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={p.imagen_url}
                            alt={p.nombre}
                            className="h-9 w-9 rounded-md object-contain border border-linea bg-white shrink-0"
                          />
                        ) : (
                          <div className="h-9 w-9 rounded-md border border-linea bg-paper shrink-0 flex items-center justify-center text-ink/20 text-xs">
                            📦
                          </div>
                        )}
                        <div>
                          <span className={p.activo ? "text-ink" : "text-ink/40 line-through"}>
                            {p.nombre}
                          </span>
                          {p.codigo_barras && (
                            <span className="ml-2 text-xs text-ink/40">#{p.codigo_barras}</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-ink/60">{p.categoria ?? "—"}</td>
                    <td className="cifra px-4 py-2.5 text-right text-ink/60">
                      ${p.costo.toFixed(2)}
                    </td>
                    <td className="cifra px-4 py-2.5 text-right text-ink">
                      ${p.precio.toFixed(2)}
                    </td>
                    <td className="cifra px-4 py-2.5 text-right text-verde">
                      ${(p.precio - p.costo).toFixed(2)}
                    </td>
                    <td
                      className={`cifra px-4 py-2.5 text-right font-medium ${
                        bajo ? "text-red-600" : "text-ink"
                      }`}
                    >
                      {p.stock}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center justify-end gap-2.5 text-ink/50">
                        <Link
                          href={`/protected/productos/${p.id}/editar`}
                          title="Editar"
                          className="hover:text-primario"
                        >
                          <Pencil size={16} />
                        </Link>
                        <Link
                          href={`/protected/productos/${p.id}/mayoreo`}
                          title="Mayoreo"
                          className="hover:text-primario"
                        >
                          <Layers size={16} />
                        </Link>
                        <Link
                          href={`/protected/productos/${p.id}/ajustar`}
                          title="Ajustar stock"
                          className="hover:text-primario"
                        >
                          <PlusCircle size={16} />
                        </Link>
                        <Link
                          href={`/protected/productos/${p.id}/kardex`}
                          title="Kardex"
                          className="hover:text-primario"
                        >
                          <History size={16} />
                        </Link>
                        {p.activo ? (
                          <form action={desactivarProducto.bind(null, p.id)}>
                            <button type="submit" title="Desactivar" className="hover:text-red-600">
                              <PowerOff size={16} />
                            </button>
                          </form>
                        ) : (
                          <form action={reactivarProducto.bind(null, p.id)}>
                            <button type="submit" title="Reactivar" className="hover:text-verde">
                              <Power size={16} />
                            </button>
                          </form>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
