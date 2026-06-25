"use client";

import { useState, useMemo, type KeyboardEvent } from "react";
import { EscanerCamara } from "@/components/escaner-camara";
import { Camera } from "lucide-react";

type NivelMayoreo = { cantidad_minima: number; precio_unitario: number };
type Producto = {
  id: string;
  nombre: string;
  precio: number;
  stock: number;
  codigo_barras: string | null;
  niveles: NivelMayoreo[];
};

export function VerificadorPrecios({ productos }: { productos: Producto[] }) {
  const [busqueda, setBusqueda] = useState("");
  const [seleccionado, setSeleccionado] = useState<Producto | null>(null);
  const [escanerAbierto, setEscanerAbierto] = useState(false);

  const manejarEscaneo = (codigo: string) => {
    const producto = productos.find((p) => p.codigo_barras === codigo);
    if (producto) {
      setSeleccionado(producto);
      setBusqueda("");
      setEscanerAbierto(false);
    } else {
      setBusqueda(codigo);
      setEscanerAbierto(false);
    }
  };

  const coincidencias = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    if (!texto) return [];
    return productos
      .filter((p) => p.nombre.toLowerCase().includes(texto))
      .slice(0, 8);
  }, [busqueda, productos]);

  const buscarPorCodigoBarras = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") return;
    e.preventDefault();

    const codigo = busqueda.trim();
    const producto = productos.find((p) => p.codigo_barras === codigo);
    if (producto) {
      setSeleccionado(producto);
      setBusqueda("");
    }
  };

  return (
    <div className="flex w-full max-w-sm flex-col gap-4">
      {escanerAbierto && (
        <EscanerCamara
          onEscaneo={manejarEscaneo}
          onCerrar={() => setEscanerAbierto(false)}
        />
      )}
      <div className="rounded-lg border border-linea bg-white p-4">
        <label htmlFor="busqueda" className="text-sm font-medium text-ink">
          Escanea, escribe el código, o busca por nombre
        </label>
        <div className="mt-1 flex gap-2">
          <input
            id="busqueda"
            type="text"
            autoFocus
            value={busqueda}
            onChange={(e) => { setBusqueda(e.target.value); setSeleccionado(null); }}
            onKeyDown={buscarPorCodigoBarras}
            placeholder="Refresco, o escanea el código..."
            className="flex-1 rounded-md border border-linea px-3 py-2 text-ink focus:border-primario focus:outline-none"
          />
          <button type="button" onClick={() => setEscanerAbierto(true)}
            className="rounded-md border border-linea px-3 py-2 text-ink/60 hover:border-primario hover:text-primario transition">
            <Camera size={18} />
          </button>
        </div>
      </div>

      {!seleccionado && coincidencias.length > 0 && (
        <div className="rounded-lg border border-linea bg-white p-2">
          <ul className="flex flex-col">
            {coincidencias.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => {
                    setSeleccionado(p);
                    setBusqueda("");
                  }}
                  className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm text-ink hover:bg-paper"
                >
                  <span>{p.nombre}</span>
                  <span className="cifra text-ink/50">${p.precio.toFixed(2)}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {seleccionado && (
        <div className="rounded-lg border border-linea bg-white p-6 text-center">
          <p className="text-base font-medium text-ink">{seleccionado.nombre}</p>
          <p className="cifra mt-2 text-3xl font-bold text-primario">
            ${seleccionado.precio.toFixed(2)}
          </p>
          <p className="mt-1 text-xs text-ink/50">
            {seleccionado.stock > 0
              ? `${seleccionado.stock} en existencia`
              : "Sin existencia"}
          </p>
          {seleccionado.niveles.length > 0 && (
            <div className="mt-4 border-t border-linea pt-3 text-left">
              <p className="mb-1 text-xs font-medium text-ink/60">Por mayoreo:</p>
              <ul className="flex flex-col gap-1">
                {seleccionado.niveles.map((n, i) => (
                  <li key={i} className="flex justify-between text-sm text-ink/70">
                    <span>Desde {n.cantidad_minima}</span>
                    <span className="cifra">${n.precio_unitario.toFixed(2)} c/u</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <button
            type="button"
            onClick={() => setSeleccionado(null)}
            className="mt-4 text-xs text-primario hover:underline"
          >
            Buscar otro
          </button>
        </div>
      )}
    </div>
  );
}
