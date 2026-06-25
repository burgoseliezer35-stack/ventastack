"use client";

import { useState } from "react";
import { EscanerCamara } from "@/components/escaner-camara";
import { imgUrl } from "@/lib/img-proxy";
import { ScanLine, Plus, Minus, RotateCcw, CheckCircle, AlertTriangle, Package } from "lucide-react";
import Link from "next/link";

type Producto = {
  id: string;
  nombre: string;
  codigo_barras: string | null;
  stock: number;
  imagen_url: string | null;
};

type ItemConteo = {
  producto: Producto;
  contado: number;
};

export function ConteoFisico({ productos }: { productos: Producto[] }) {
  const [escanerAbierto, setEscanerAbierto] = useState(false);
  const [conteo, setConteo] = useState<Map<string, ItemConteo>>(new Map());
  const [ultimoEscaneado, setUltimoEscaneado] = useState<string | null>(null);
  const [fase, setFase] = useState<"conteo" | "resultado">("conteo");

  const manejarEscaneo = (codigo: string) => {
    const producto = productos.find((p) => p.codigo_barras === codigo);
    if (!producto) {
      setUltimoEscaneado(`❌ Código no encontrado: ${codigo}`);
      return;
    }
    agregarConteo(producto);
    setUltimoEscaneado(`✓ ${producto.nombre}`);
    setTimeout(() => setUltimoEscaneado(null), 2000);
  };

  const agregarConteo = (producto: Producto, cantidad = 1) => {
    setConteo((prev) => {
      const nuevo = new Map(prev);
      const actual = nuevo.get(producto.id);
      nuevo.set(producto.id, {
        producto,
        contado: (actual?.contado ?? 0) + cantidad,
      });
      return nuevo;
    });
  };

  const ajustarCantidad = (productoId: string, delta: number) => {
    setConteo((prev) => {
      const nuevo = new Map(prev);
      const actual = nuevo.get(productoId);
      if (!actual) return prev;
      const nuevaCantidad = Math.max(0, actual.contado + delta);
      if (nuevaCantidad === 0) {
        nuevo.delete(productoId);
      } else {
        nuevo.set(productoId, { ...actual, contado: nuevaCantidad });
      }
      return nuevo;
    });
  };

  const items = Array.from(conteo.values());
  const totalProductos = items.length;
  const diferencias = items.filter((i) => i.contado !== i.producto.stock);

  // Productos no escaneados (en sistema pero no contados)
  const noContados = productos.filter((p) => !conteo.has(p.id));

  return (
    <div className="flex flex-col gap-4 pb-24">
      {escanerAbierto && (
        <EscanerCamara
          onEscaneo={manejarEscaneo}
          onCerrar={() => setEscanerAbierto(false)}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-ink">Conteo físico</h1>
          <p className="text-xs text-ink/50">
            Escanea cada producto para contar las existencias reales
          </p>
        </div>
        <Link href="/protected/productos" className="text-sm text-primario hover:underline">
          Salir
        </Link>
      </div>

      {/* Pestañas */}
      <div className="flex gap-1 rounded-xl border border-linea bg-white p-1">
        <button type="button" onClick={() => setFase("conteo")}
          className={`flex-1 rounded-lg py-2 text-xs font-semibold transition ${fase === "conteo" ? "bg-primario text-white" : "text-ink/50 hover:text-ink"}`}>
          📦 Escanear
        </button>
        <button type="button" onClick={() => setFase("resultado")}
          className={`flex-1 rounded-lg py-2 text-xs font-semibold transition ${fase === "resultado" ? "bg-primario text-white" : "text-ink/50 hover:text-ink"}`}>
          📊 Resultado {diferencias.length > 0 && <span className="ml-1 rounded-full bg-red-500 px-1.5 text-white text-[10px]">{diferencias.length}</span>}
        </button>
      </div>

      {/* FASE: ESCANEAR */}
      {fase === "conteo" && (
        <>
          {/* Botón escáner grande */}
          <button type="button" onClick={() => setEscanerAbierto(true)}
            className="flex items-center justify-center gap-3 rounded-2xl bg-primario px-6 py-5 text-white shadow-lg hover:opacity-90 transition active:scale-95">
            <ScanLine size={28} />
            <div className="text-left">
              <p className="font-bold text-base">Escanear producto</p>
              <p className="text-xs text-white/70">Apunta al código de barras</p>
            </div>
          </button>

          {/* Último escaneado */}
          {ultimoEscaneado && (
            <div className={`rounded-xl px-4 py-3 text-sm font-medium text-center ${
              ultimoEscaneado.startsWith("❌") ? "bg-red-50 text-red-700 border border-red-200" : "bg-verde-suave text-verde border border-verde/30"
            }`}>
              {ultimoEscaneado}
            </div>
          )}

          {/* Resumen rápido */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-linea bg-white p-4 text-center">
              <p className="text-2xl font-bold text-primario">{totalProductos}</p>
              <p className="text-xs text-ink/50">productos contados</p>
            </div>
            <div className="rounded-xl border border-linea bg-white p-4 text-center">
              <p className={`text-2xl font-bold ${diferencias.length > 0 ? "text-red-500" : "text-verde"}`}>
                {diferencias.length}
              </p>
              <p className="text-xs text-ink/50">con diferencia</p>
            </div>
          </div>

          {/* Lista de lo contado */}
          {items.length > 0 && (
            <div className="rounded-xl border border-linea bg-white overflow-hidden">
              <div className="px-4 py-3 border-b border-linea">
                <p className="text-sm font-semibold text-ink">Productos contados</p>
              </div>
              <ul className="divide-y divide-linea">
                {items.map(({ producto, contado }) => {
                  const diferencia = contado - producto.stock;
                  return (
                    <li key={producto.id} className="flex items-center gap-3 px-4 py-3">
                      {/* Imagen */}
                      <div className="h-10 w-10 shrink-0 rounded-lg border border-linea bg-paper overflow-hidden">
                        {producto.imagen_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={imgUrl(producto.imagen_url) ?? ""} alt={producto.nombre}
                            className="h-full w-full object-contain" />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center text-lg">📦</div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-ink truncate">{producto.nombre}</p>
                        <p className={`text-xs ${diferencia === 0 ? "text-verde" : diferencia > 0 ? "text-amber-600" : "text-red-500"}`}>
                          Sistema: {producto.stock} →{" "}
                          {diferencia === 0 ? "✓ Correcto" : diferencia > 0 ? `+${diferencia} sobrante` : `${diferencia} faltante`}
                        </p>
                      </div>

                      {/* Controles cantidad */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button type="button" onClick={() => ajustarCantidad(producto.id, -1)}
                          className="h-7 w-7 rounded-full border border-linea flex items-center justify-center text-ink/60 hover:border-primario hover:text-primario transition">
                          <Minus size={12} />
                        </button>
                        <span className="w-8 text-center text-sm font-bold text-ink">{contado}</span>
                        <button type="button" onClick={() => ajustarCantidad(producto.id, 1)}
                          className="h-7 w-7 rounded-full border border-linea flex items-center justify-center text-ink/60 hover:border-primario hover:text-primario transition">
                          <Plus size={12} />
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {items.length === 0 && (
            <div className="rounded-xl border border-dashed border-linea p-8 text-center">
              <Package size={32} className="mx-auto mb-2 text-ink/20" />
              <p className="text-sm text-ink/40">Aún no has escaneado ningún producto</p>
              <p className="text-xs text-ink/30 mt-1">Toca el botón azul para empezar</p>
            </div>
          )}

          {/* Botón reiniciar */}
          {items.length > 0 && (
            <button type="button"
              onClick={() => { if (confirm("¿Reiniciar el conteo? Se perderán los datos actuales.")) setConteo(new Map()); }}
              className="flex items-center justify-center gap-2 text-xs text-ink/40 hover:text-red-500 transition">
              <RotateCcw size={12} /> Reiniciar conteo
            </button>
          )}
        </>
      )}

      {/* FASE: RESULTADO */}
      {fase === "resultado" && (
        <div className="flex flex-col gap-4">
          {diferencias.length === 0 && totalProductos === 0 && (
            <div className="rounded-xl border border-linea bg-white p-8 text-center">
              <p className="text-sm text-ink/50">Escanea productos primero para ver el resultado.</p>
            </div>
          )}

          {diferencias.length === 0 && totalProductos > 0 && (
            <div className="rounded-xl border border-verde/30 bg-verde-suave p-6 text-center">
              <CheckCircle size={32} className="mx-auto mb-2 text-verde" />
              <p className="font-bold text-verde">¡Todo cuadra!</p>
              <p className="text-xs text-ink/50 mt-1">
                {totalProductos} productos contados sin diferencias
              </p>
            </div>
          )}

          {diferencias.length > 0 && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle size={16} className="text-red-600" />
                <p className="text-sm font-semibold text-red-800">
                  {diferencias.length} producto{diferencias.length > 1 ? "s" : ""} con diferencia
                </p>
              </div>
              <p className="text-xs text-red-600">
                Revisa los faltantes y sobrantes antes de ajustar el inventario
              </p>
            </div>
          )}

          {/* Tabla de diferencias */}
          {diferencias.length > 0 && (
            <div className="rounded-xl border border-linea bg-white overflow-hidden">
              <div className="px-4 py-3 border-b border-linea bg-red-50">
                <p className="text-sm font-semibold text-red-800">Con diferencia</p>
              </div>
              <ul className="divide-y divide-linea">
                {diferencias.map(({ producto, contado }) => {
                  const diferencia = contado - producto.stock;
                  return (
                    <li key={producto.id} className="flex items-center gap-3 px-4 py-3">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-ink">{producto.nombre}</p>
                        <div className="flex gap-4 mt-0.5 text-xs">
                          <span className="text-ink/50">Sistema: <b>{producto.stock}</b></span>
                          <span className="text-ink/50">Contado: <b>{contado}</b></span>
                          <span className={`font-bold ${diferencia > 0 ? "text-amber-600" : "text-red-600"}`}>
                            {diferencia > 0 ? `+${diferencia} sobrante` : `${diferencia} faltante`}
                          </span>
                        </div>
                      </div>
                      <Link href={`/protected/productos/${producto.id}/ajustar`}
                        className="text-xs text-primario hover:underline shrink-0">
                        Ajustar
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {/* Productos contados correctamente */}
          {items.filter(i => i.contado === i.producto.stock).length > 0 && (
            <div className="rounded-xl border border-verde/30 bg-white overflow-hidden">
              <div className="px-4 py-3 border-b border-linea bg-verde-suave">
                <p className="text-sm font-semibold text-verde">✓ Correctos</p>
              </div>
              <ul className="divide-y divide-linea">
                {items.filter(i => i.contado === i.producto.stock).map(({ producto, contado }) => (
                  <li key={producto.id} className="flex items-center justify-between px-4 py-2">
                    <p className="text-sm text-ink">{producto.nombre}</p>
                    <p className="text-sm font-bold text-verde">{contado}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* No escaneados */}
          {noContados.length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-white overflow-hidden">
              <div className="px-4 py-3 border-b border-linea bg-amber-50">
                <p className="text-sm font-semibold text-amber-800">
                  ⚠️ {noContados.length} sin escanear
                </p>
              </div>
              <ul className="divide-y divide-linea">
                {noContados.slice(0, 5).map((p) => (
                  <li key={p.id} className="flex items-center justify-between px-4 py-2">
                    <p className="text-sm text-ink/70">{p.nombre}</p>
                    <p className="text-xs text-ink/40">Sistema: {p.stock}</p>
                  </li>
                ))}
                {noContados.length > 5 && (
                  <li className="px-4 py-2">
                    <p className="text-xs text-ink/40">...y {noContados.length - 5} más</p>
                  </li>
                )}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
