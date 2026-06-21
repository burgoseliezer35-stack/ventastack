"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState, type KeyboardEvent } from "react";
import { ScanLine, Plus, Trash2, Check } from "lucide-react";

type Proveedor = { id: string; nombre: string };
type LineaRecepcion = {
  producto_id: string;
  nombre: string;
  codigo_barras: string | null;
  cantidad: number;
  costo_unitario: number;
};

export function RecepcionExpressForm({
  proveedores,
}: {
  proveedores: Proveedor[];
}) {
  const [lineas, setLineas] = useState<LineaRecepcion[]>([]);
  const [codigoBarras, setCodigoBarras] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [resultados, setResultados] = useState<
    { id: string; nombre: string; codigo_barras: string | null; costo: number }[]
  >([]);
  const [proveedorId, setProveedorId] = useState("");
  const [nota, setNota] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [guardado, setGuardado] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  // Busca producto por código de barras al presionar Enter
  const buscarPorCodigo = async (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    const codigo = codigoBarras.trim();
    if (!codigo) return;
    setError(null);

    const { data } = await supabase
      .from("productos")
      .select("id, nombre, codigo_barras, costo")
      .eq("codigo_barras", codigo)
      .single();

    if (!data) {
      setError(`No encontramos ningún producto con el código "${codigo}"`);
      return;
    }

    agregarProducto(data);
    setCodigoBarras("");
  };

  // Busca por nombre mientras escribe
  const buscarPorNombre = async (texto: string) => {
    setBusqueda(texto);
    if (texto.length < 2) { setResultados([]); return; }

    const { data } = await supabase
      .from("productos")
      .select("id, nombre, codigo_barras, costo")
      .ilike("nombre", `%${texto}%`)
      .limit(8);

    setResultados(data ?? []);
  };

  const agregarProducto = (p: { id: string; nombre: string; codigo_barras: string | null; costo: number }) => {
    setResultados([]);
    setBusqueda("");
    // Si ya está en la lista, enfocamos su cantidad para que sume más
    const existente = lineas.find((l) => l.producto_id === p.id);
    if (existente) {
      document.getElementById(`cant-${p.id}`)?.focus();
      return;
    }
    setLineas((prev) => [
      ...prev,
      { producto_id: p.id, nombre: p.nombre, codigo_barras: p.codigo_barras, cantidad: 1, costo_unitario: p.costo },
    ]);
    // Pequeño delay para que el input ya esté en el DOM
    setTimeout(() => document.getElementById(`cant-${p.id}`)?.focus(), 50);
  };

  const actualizarLinea = (id: string, campo: "cantidad" | "costo_unitario", valor: number) => {
    setLineas((prev) =>
      prev.map((l) => (l.producto_id === id ? { ...l, [campo]: valor } : l)),
    );
  };

  const quitarLinea = (id: string) => {
    setLineas((prev) => prev.filter((l) => l.producto_id !== id));
  };

  const guardar = async () => {
    setError(null);
    if (lineas.length === 0) { setError("Agrega al menos un producto"); return; }

    setGuardando(true);

    const { error: rpcError } = await supabase.rpc("registrar_compra", {
      p_proveedor_id: proveedorId || null,
      p_nota: nota.trim() || null,
      p_items: lineas.map((l) => ({
        producto_id: l.producto_id,
        cantidad: l.cantidad,
        costo_unitario: l.costo_unitario,
      })),
    });

    setGuardando(false);

    if (rpcError) { setError(rpcError.message); return; }

    setGuardado(true);
    setTimeout(() => router.push("/protected/compras"), 1500);
  };

  const totalCosto = lineas.reduce((s, l) => s + l.cantidad * l.costo_unitario, 0);

  return (
    <div className="flex flex-col gap-4">
      {/* Buscadores */}
      <div className="flex flex-col gap-3 rounded-xl border border-linea bg-white p-4 shadow-sm sm:flex-row">
        {/* Por código de barras */}
        <div className="flex-1">
          <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-ink/50">
            Código de barras
          </label>
          <div className="flex items-center gap-2 rounded-md border border-linea px-3 focus-within:border-primario">
            <ScanLine size={16} className="shrink-0 text-ink/40" />
            <input
              type="text"
              value={codigoBarras}
              onChange={(e) => setCodigoBarras(e.target.value)}
              onKeyDown={buscarPorCodigo}
              placeholder="Escanea o escribe y presiona Enter"
              className="w-full py-2 text-sm text-ink outline-none"
            />
          </div>
        </div>

        {/* Por nombre */}
        <div className="flex-1 relative">
          <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-ink/50">
            Buscar por nombre
          </label>
          <input
            type="text"
            value={busqueda}
            onChange={(e) => buscarPorNombre(e.target.value)}
            placeholder="Escribe el nombre del producto..."
            className="w-full rounded-md border border-linea px-3 py-2 text-sm text-ink focus:border-primario focus:outline-none"
          />
          {resultados.length > 0 && (
            <ul className="absolute left-0 right-0 top-full z-10 mt-1 rounded-md border border-linea bg-white shadow-lg">
              {resultados.map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => agregarProducto(r)}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-primario-suave"
                  >
                    {r.nombre}
                    {r.codigo_barras && <span className="ml-2 text-xs text-ink/40">#{r.codigo_barras}</span>}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Lista de lo que se está recibiendo */}
      {lineas.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-linea bg-white shadow-sm">
          <div className="border-b border-linea bg-primario-suave px-4 py-3">
            <h2 className="font-semibold text-ink">
              Mercancía a recibir — {lineas.length} producto{lineas.length !== 1 ? "s" : ""}
            </h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-primario text-left text-xs font-semibold uppercase tracking-wide text-white">
                <th className="px-4 py-2.5">Producto</th>
                <th className="px-4 py-2.5 text-right">Cant. recibida</th>
                <th className="px-4 py-2.5 text-right">Costo unitario</th>
                <th className="px-4 py-2.5 text-right">Subtotal</th>
                <th className="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-linea">
              {lineas.map((l, idx) => (
                <tr key={l.producto_id} className={idx % 2 === 1 ? "bg-paper/60" : ""}>
                  <td className="px-4 py-2.5">
                    <span className="text-ink">{l.nombre}</span>
                    {l.codigo_barras && (
                      <span className="ml-2 text-xs text-ink/40">#{l.codigo_barras}</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <input
                      id={`cant-${l.producto_id}`}
                      type="text"
                      inputMode="numeric"
                      defaultValue={l.cantidad === 0 ? "" : String(l.cantidad)}
                      placeholder="0"
                      onFocus={(e) => e.target.select()}
                      onBlur={(e) => {
                        const val = parseInt(e.target.value.replace(/,/g, ""), 10) || 0;
                        actualizarLinea(l.producto_id, "cantidad", val);
                      }}
                      className="w-20 rounded-md border border-linea px-2 py-2 text-right focus:border-primario focus:outline-none"
                    />
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <input
                      type="text"
                      inputMode="decimal"
                      defaultValue={l.costo_unitario === 0 ? "" : l.costo_unitario.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}
                      placeholder="0.00"
                      onFocus={(e) => e.target.select()}
                      onBlur={(e) => {
                        const val = parseFloat(e.target.value.replace(/,/g, "")) || 0;
                        actualizarLinea(l.producto_id, "costo_unitario", val);
                      }}
                      className="w-24 rounded-md border border-linea px-2 py-2 text-right focus:border-primario focus:outline-none"
                    />
                  </td>
                  <td className="cifra px-4 py-2.5 text-right font-medium text-ink">
                    ${(l.cantidad * l.costo_unitario).toLocaleString("en-US", {minimumFractionDigits:2,maximumFractionDigits:2})}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <button
                      type="button"
                      onClick={() => quitarLinea(l.producto_id)}
                      className="text-ink/30 hover:text-red-600"
                    >
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex justify-end border-t border-linea px-4 py-3">
            <span className="text-sm font-semibold text-ink">
              Total: <span className="cifra text-primario">${totalCosto.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}</span>
            </span>
          </div>
        </div>
      )}

      {/* Opcionales: proveedor y nota */}
      <div className="flex flex-col gap-3 rounded-xl border border-linea bg-white p-4 shadow-sm sm:flex-row">
        <div className="flex-1">
          <label className="block text-sm font-medium text-ink">
            Proveedor <span className="text-ink/40">(opcional)</span>
          </label>
          <select
            value={proveedorId}
            onChange={(e) => setProveedorId(e.target.value)}
            className="mt-1 w-full rounded-md border border-linea px-3 py-2 text-sm text-ink focus:border-primario focus:outline-none"
          >
            <option value="">Sin proveedor específico</option>
            {proveedores.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
          </select>
        </div>
        <div className="flex-1">
          <label className="block text-sm font-medium text-ink">
            Nota <span className="text-ink/40">(opcional)</span>
          </label>
          <input
            type="text"
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            placeholder="Ej: pedido semanal, factura #123..."
            className="mt-1 w-full rounded-md border border-linea px-3 py-2 text-sm text-ink focus:border-primario focus:outline-none"
          />
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {guardado ? (
        <div className="flex items-center gap-2 rounded-lg bg-verde-suave px-4 py-3 text-verde">
          <Check size={18} />
          <span className="font-medium">¡Mercancía recibida! Stock actualizado.</span>
        </div>
      ) : (
        <button
          type="button"
          onClick={guardar}
          disabled={guardando || lineas.length === 0}
          className="flex items-center justify-center gap-2 rounded-md bg-primario px-6 py-3 font-medium text-white transition hover:opacity-90 disabled:opacity-50"
        >
          <Plus size={18} />
          {guardando ? "Guardando..." : `Confirmar recepción (${lineas.length} producto${lineas.length !== 1 ? "s" : ""})`}
        </button>
      )}
    </div>
  );
}
