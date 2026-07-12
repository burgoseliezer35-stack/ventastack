"use client";

import { useState, useEffect, useRef } from "react";
import { MapPin, Loader2 } from "lucide-react";

export type DireccionData = {
  cp: string;
  dir_calle_principal: string;
  dir_entre1: string;
  dir_entre2: string;
  dir_numero: string;
  dir_colonia: string;
  dir_municipio: string;
  dir_estado: string;
  dir_pais: string;
  // Texto construido para mostrar y geocodificar
  direccion: string;
  ciudad: string;
};

type Props = {
  formato: "general" | "merida" | "libre";
  inicial?: Partial<DireccionData>;
  onChange: (data: DireccionData) => void;
  disabled?: boolean;
};

const inputCls =
  "w-full rounded-xl border border-linea px-3 py-2.5 text-sm text-ink focus:border-primario focus:outline-none focus:ring-2 focus:ring-primario/20 disabled:bg-ink/[0.03] disabled:text-ink/40";

const labelCls =
  "block text-xs font-semibold uppercase tracking-wide text-ink/50 mb-1.5";

// Construye el string de dirección para mostrar y geocodificar
function construirDireccion(d: DireccionData, formato: string): string {
  if (formato === "merida") {
    let dir = `Calle ${d.dir_calle_principal}`;
    if (d.dir_entre1) {
      dir += ` × ${d.dir_entre1}`;
      if (d.dir_entre2) dir += ` y ${d.dir_entre2}`;
    }
    if (d.dir_numero) dir += ` #${d.dir_numero}`;
    if (d.dir_colonia) dir += `, ${d.dir_colonia}`;
    if (d.cp) dir += `, ${d.cp}`;
    if (d.dir_municipio) dir += ` ${d.dir_municipio}`;
    if (d.dir_estado) dir += `, ${d.dir_estado}`;
    return dir;
  }
  // General
  let dir = d.dir_calle_principal;
  if (d.dir_numero) dir += ` ${d.dir_numero}`;
  if (d.dir_colonia) dir += `, ${d.dir_colonia}`;
  if (d.cp) dir += `, ${d.cp}`;
  if (d.dir_municipio) dir += ` ${d.dir_municipio}`;
  if (d.dir_estado) dir += `, ${d.dir_estado}`;
  return dir;
}

export function DireccionForm({ formato, inicial, onChange, disabled }: Props) {
  const [datos, setDatos] = useState<DireccionData>({
    cp: inicial?.cp ?? "",
    dir_calle_principal: inicial?.dir_calle_principal ?? "",
    dir_entre1: inicial?.dir_entre1 ?? "",
    dir_entre2: inicial?.dir_entre2 ?? "",
    dir_numero: inicial?.dir_numero ?? "",
    dir_colonia: inicial?.dir_colonia ?? "",
    dir_municipio: inicial?.dir_municipio ?? "",
    dir_estado: inicial?.dir_estado ?? "",
    dir_pais: inicial?.dir_pais ?? "México",
    direccion: inicial?.direccion ?? "",
    ciudad: inicial?.ciudad ?? "",
  });

  const [colonias, setColonias] = useState<string[]>([]);
  const [cargandoCp, setCargandoCp] = useState(false);
  const [errorCp, setErrorCp] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Notificar cambios al padre
  useEffect(() => {
    const dir = construirDireccion(datos, formato);
    const actualizado = { ...datos, direccion: dir, ciudad: datos.dir_municipio };
    onChange(actualizado);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [datos, formato]);

  // Autocompletar al escribir CP
  const handleCpChange = (cp: string) => {
    setDatos(prev => ({ ...prev, cp }));
    setErrorCp(null);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (cp.length === 5) {
      debounceRef.current = setTimeout(async () => {
        setCargandoCp(true);
        try {
          const res = await fetch(`/api/codigo-postal/${cp}`);
          if (!res.ok) {
            setErrorCp("CP no encontrado");
            setColonias([]);
            return;
          }
          const data = await res.json();
          setColonias(data.colonias ?? []);
          setDatos(prev => ({
            ...prev,
            dir_municipio: data.municipio,
            dir_estado: data.estado,
            ciudad: data.ciudad,
            // Si solo hay una colonia, preseleccionarla
            dir_colonia: data.colonias?.length === 1 ? data.colonias[0] : prev.dir_colonia,
          }));
        } catch {
          setErrorCp("Error al consultar el CP");
        } finally {
          setCargandoCp(false);
        }
      }, 400);
    } else {
      setColonias([]);
      if (cp.length === 0) {
        setDatos(prev => ({ ...prev, dir_municipio: "", dir_estado: "", dir_colonia: "" }));
      }
    }
  };

  const set = (campo: keyof DireccionData, valor: string) =>
    setDatos(prev => ({ ...prev, [campo]: valor }));

  // Modo texto libre
  if (formato === "libre") {
    return (
      <div>
        <label className={labelCls}>Dirección</label>
        <div className="relative">
          <MapPin size={14} className="absolute left-3 top-3 text-ink/30" />
          <input
            value={datos.direccion}
            onChange={e => setDatos(prev => ({ ...prev, direccion: e.target.value, ciudad: "" }))}
            disabled={disabled}
            placeholder="Dirección completa"
            className={`${inputCls} pl-8`}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* CP — el que dispara todo */}
      <div>
        <label className={labelCls}>Código postal</label>
        <div className="relative">
          <input
            value={datos.cp}
            onChange={e => handleCpChange(e.target.value.replace(/\D/g, "").slice(0, 5))}
            disabled={disabled}
            placeholder="97000"
            maxLength={5}
            inputMode="numeric"
            className={inputCls}
          />
          {cargandoCp && (
            <Loader2 size={14} className="absolute right-3 top-3 animate-spin text-primario" />
          )}
        </div>
        {errorCp && <p className="text-xs text-red-500 mt-0.5">{errorCp}</p>}
      </div>

      {/* Estado y municipio — autocompletan solos */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Estado</label>
          <input
            value={datos.dir_estado}
            onChange={e => set("dir_estado", e.target.value)}
            disabled={disabled || !!datos.dir_estado}
            placeholder="Yucatán"
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>Municipio / Ciudad</label>
          <input
            value={datos.dir_municipio}
            onChange={e => set("dir_municipio", e.target.value)}
            disabled={disabled || !!datos.dir_municipio}
            placeholder="Mérida"
            className={inputCls}
          />
        </div>
      </div>

      {/* Colonia — dropdown si el CP trajo varias */}
      <div>
        <label className={labelCls}>Colonia</label>
        {colonias.length > 1 ? (
          <select
            value={datos.dir_colonia}
            onChange={e => set("dir_colonia", e.target.value)}
            disabled={disabled}
            className={inputCls}
          >
            <option value="">Selecciona colonia...</option>
            {colonias.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        ) : (
          <input
            value={datos.dir_colonia}
            onChange={e => set("dir_colonia", e.target.value)}
            disabled={disabled}
            placeholder="Centro"
            className={inputCls}
          />
        )}
      </div>

      {/* Calle — según el formato */}
      {formato === "merida" ? (
        <>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className={labelCls}>Calle</label>
              <input
                value={datos.dir_calle_principal}
                onChange={e => set("dir_calle_principal", e.target.value.replace(/\D/g, ""))}
                disabled={disabled}
                placeholder="60"
                inputMode="numeric"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Entre</label>
              <input
                value={datos.dir_entre1}
                onChange={e => set("dir_entre1", e.target.value.replace(/\D/g, ""))}
                disabled={disabled}
                placeholder="57"
                inputMode="numeric"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>y</label>
              <input
                value={datos.dir_entre2}
                onChange={e => set("dir_entre2", e.target.value.replace(/\D/g, ""))}
                disabled={disabled}
                placeholder="59"
                inputMode="numeric"
                className={inputCls}
              />
            </div>
          </div>
          <div>
            <label className={labelCls}>Número (opcional)</label>
            <input
              value={datos.dir_numero}
              onChange={e => set("dir_numero", e.target.value)}
              disabled={disabled}
              placeholder="123"
              className={inputCls}
            />
          </div>
        </>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          <div className="col-span-2">
            <label className={labelCls}>Calle / Avenida</label>
            <input
              value={datos.dir_calle_principal}
              onChange={e => set("dir_calle_principal", e.target.value)}
              disabled={disabled}
              placeholder="Av. Reforma"
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Número</label>
            <input
              value={datos.dir_numero}
              onChange={e => set("dir_numero", e.target.value)}
              disabled={disabled}
              placeholder="250"
              className={inputCls}
            />
          </div>
        </div>
      )}

      {/* Preview de la dirección construida */}
      {datos.dir_calle_principal && (
        <div className="rounded-xl border border-dashed border-primario/30 bg-primario/[0.03] px-3 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-primario/60 mb-0.5">
            Dirección resultante
          </p>
          <p className="text-xs text-ink">
            {construirDireccion(datos, formato) || "—"}
          </p>
        </div>
      )}
    </div>
  );
}
