"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState, type ChangeEvent } from "react";
import * as XLSX from "xlsx";

type FilaProducto = { nombre: string; precio: number };

export function ImportarExcel() {
  const [filas, setFilas] = useState<FilaProducto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const leerArchivo = async (e: ChangeEvent<HTMLInputElement>) => {
    setError(null);
    setMensaje(null);
    setFilas([]);

    const archivo = e.target.files?.[0];
    if (!archivo) return;

    const datos = await archivo.arrayBuffer();
    const libro = XLSX.read(datos, { type: "array" });
    const hoja = libro.Sheets[libro.SheetNames[0]];
    const filasCrudas = XLSX.utils.sheet_to_json<Record<string, unknown>>(hoja);

    const filasValidas: FilaProducto[] = [];
    for (const fila of filasCrudas) {
      const nombre = String(fila.nombre ?? fila.Nombre ?? "").trim();
      const precio = Number(fila.precio ?? fila.Precio);
      if (nombre && Number.isFinite(precio) && precio > 0) {
        filasValidas.push({ nombre, precio });
      }
    }

    if (filasValidas.length === 0) {
      setError(
        "No se encontraron filas válidas. El Excel necesita columnas llamadas \"nombre\" y \"precio\".",
      );
      return;
    }

    setFilas(filasValidas);
  };

  const confirmarImportacion = async () => {
    setIsLoading(true);
    setError(null);

    const supabase = createClient();
    // company_id se rellena solo (default get_my_company_id()).
    const { error: insertError } = await supabase
      .from("productos")
      .insert(filas.map((f) => ({ nombre: f.nombre, precio: f.precio })));

    setIsLoading(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    setMensaje(`${filas.length} productos importados`);
    setFilas([]);
    router.refresh();
  };

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-white p-4">
      <h2 className="text-sm font-medium text-gray-700">
        Importar catálogo desde Excel
      </h2>
      <p className="text-xs text-gray-400">
        El archivo necesita columnas llamadas &quot;nombre&quot; y &quot;precio&quot;.
      </p>
      <input
        type="file"
        accept=".xlsx,.xls"
        onChange={leerArchivo}
        className="text-sm text-gray-700"
      />

      {filas.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-xs text-gray-500">
            Se encontraron {filas.length} productos. Revisa antes de confirmar:
          </p>
          <ul className="max-h-40 overflow-y-auto text-xs text-gray-600">
            {filas.slice(0, 10).map((f, i) => (
              <li key={i}>
                {f.nombre} — ${f.precio.toFixed(2)}
              </li>
            ))}
            {filas.length > 10 && <li>... y {filas.length - 10} más</li>}
          </ul>
          <button
            type="button"
            onClick={confirmarImportacion}
            disabled={isLoading}
            className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:opacity-50"
          >
            {isLoading
              ? "Importando..."
              : `Confirmar importación (${filas.length})`}
          </button>
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
      {mensaje && <p className="text-sm text-emerald-600">{mensaje}</p>}
    </div>
  );
}
