"use client";

import { useState, useRef } from "react";
import { LogoUpload } from "@/components/logo-upload";
import { Building2, CreditCard, Percent, Wifi, Link2, Pencil, Check, X } from "lucide-react";

type Empresa = {
  id: string;
  name: string;
  logo_url?: string | null;
  razon_social?: string | null;
  rfc?: string | null;
  calle?: string | null;
  colonia?: string | null;
  ciudad?: string | null;
  estado_empresa?: string | null;
  codigo_postal?: string | null;
  telefono?: string | null;
  whatsapp_admin?: string | null;
  umbral_stock_bajo?: number | null;
  slug?: string | null;
  iva_porcentaje?: number | null;
  iva_incluido?: boolean | null;
  ieps_habilitado?: boolean | null;
  ieps_porcentaje?: number | null;
  cfdi_habilitado?: boolean | null;
  regimen_fiscal?: string | null;
  cp_fiscal?: string | null;
  pac_nombre?: string | null;
  pac_usuario?: string | null;
  pac_password?: string | null;
  pac_modo?: string | null;
  csd_cer?: string | null;
  csd_key?: string | null;
  csd_password?: string | null;
};

const TABS = [
  { id: "negocio", label: "Negocio", Icono: Building2 },
  { id: "impuestos", label: "Impuestos", Icono: Percent },
  { id: "cfdi", label: "CFDI", Icono: CreditCard },
  { id: "acceso", label: "Acceso", Icono: Link2 },
  { id: "whatsapp", label: "WhatsApp", Icono: Wifi },
] as const;

type Tab = (typeof TABS)[number]["id"];

function Campo({ label, valor }: { label: string; valor?: string | null }) {
  if (!valor) return null;
  return (
    <div>
      <p className="text-xs text-ink/40 mb-0.5">{label}</p>
      <p className="text-sm text-ink/70 bg-paper border border-linea rounded-md px-3 py-2">{valor}</p>
    </div>
  );
}

function BotonesEdicion({ editando, guardando, onEditar, onCancelar }: {
  editando: boolean; guardando: boolean;
  onEditar: () => void; onCancelar: () => void;
}) {
  if (!editando) {
    return (
      <button type="button" onClick={onEditar}
        className="flex items-center gap-1.5 rounded-md border border-linea px-3 py-1.5 text-xs font-medium text-ink hover:border-primario transition">
        <Pencil size={12} /> Editar
      </button>
    );
  }
  return (
    <div className="flex gap-2">
      <button type="button" onClick={onCancelar}
        className="flex items-center gap-1 rounded-md border border-linea px-3 py-1.5 text-xs font-medium text-ink/60 hover:border-red-300 hover:text-red-600 transition">
        <X size={12} /> Cancelar
      </button>
      <button type="submit" disabled={guardando}
        className="flex items-center gap-1.5 rounded-md bg-primario px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50 transition">
        <Check size={12} /> {guardando ? "Guardando..." : "Guardar"}
      </button>
    </div>
  );
}

export function ConfiguracionTabs({
  empresa: empresaInicial,
  guardarConfiguracion,
}: {
  empresa: Empresa;
  guardado: boolean;
  errorParam: string | null;
  guardarConfiguracion: (companyId: string, tab: string, formData: FormData) => Promise<{ ok: boolean; error?: string }>;
}) {
  const [tab, setTab] = useState<Tab>("negocio");
  const [editando, setEditando] = useState<Tab | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [empresa, setEmpresa] = useState<Empresa>(empresaInicial);
  const [exito, setExito] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const estaEditando = editando === tab;

  const handleGuardar = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setGuardando(true);
    setErrorMsg(null);
    const form = e.currentTarget;
    const formData = new FormData(form);

    const resultado = await guardarConfiguracion(empresa.id, tab, formData);
    if (resultado.ok) {
      // Actualizar estado local con los nuevos valores sin recargar
      const nuevos: Record<string, unknown> = {};
      formData.forEach((val, key) => {
        // FormData omite inputs hidden con valor vacío en algunos browsers — leerlos del DOM
        nuevos[key] = val || null;
      });
      // Leer explícitamente inputs hidden (como logo_url) que FormData puede omitir
      const hiddens = form.querySelectorAll<HTMLInputElement>("input[type=hidden]");
      hiddens.forEach((el) => {
        if (el.name) nuevos[el.name] = el.value || null;
      });
      setEmpresa((prev) => ({ ...prev, ...nuevos }));
      setEditando(null);
      setExito(tab);
      setTimeout(() => setExito(null), 3000);
    } else {
      setErrorMsg(resultado.error ?? "Error al guardar");
    }
    setGuardando(false);
  };

  const cambiarTab = (t: Tab) => {
    setTab(t);
    setEditando(null);
    setErrorMsg(null);
  };

  return (
    <div className="flex flex-col gap-4">

      {/* Pestañas */}
      <div className="flex overflow-x-auto gap-1 rounded-xl border border-linea bg-white p-1.5 shadow-sm">
        {TABS.map(({ id, label, Icono }) => (
          <button key={id} type="button" onClick={() => cambiarTab(id)}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition whitespace-nowrap ${
              tab === id ? "bg-primario text-white shadow-sm" : "text-ink/50 hover:text-ink hover:bg-paper"
            }`}>
            <Icono size={13} />{label}
          </button>
        ))}
      </div>

      {exito && (
        <div className="rounded-xl border border-verde/30 bg-verde-suave p-3 flex items-center gap-2">
          <Check size={16} className="text-verde shrink-0" />
          <p className="text-sm font-semibold text-verde">Guardado correctamente</p>
        </div>
      )}
      {errorMsg && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">{errorMsg}</p>}

      <form ref={formRef} onSubmit={handleGuardar}
        className="flex flex-col gap-4 rounded-xl border border-linea bg-white p-5 shadow-sm">

        {/* ── Negocio ── */}
        {tab === "negocio" && (
          <>
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-ink">Datos del negocio</p>
              <BotonesEdicion editando={estaEditando} guardando={guardando}
                onEditar={() => setEditando("negocio")} onCancelar={() => setEditando(null)} />
            </div>
            {estaEditando ? (
              <>
                <LogoUpload logoActual={empresa.logo_url ?? null} />
                <hr className="border-linea" />
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-ink/60 mb-1">Nombre comercial</label>
                    <input name="name" type="text" defaultValue={empresa.name ?? ""}
                      className="w-full rounded-md border border-linea px-3 py-2 text-sm text-ink focus:border-primario focus:outline-none" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-ink/60 mb-1">Razón social (opcional)</label>
                    <input name="razon_social" type="text" defaultValue={empresa.razon_social ?? ""} placeholder="MI TIENDA S.A. DE C.V."
                      className="w-full rounded-md border border-linea px-3 py-2 text-sm text-ink focus:border-primario focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-ink/60 mb-1">RFC</label>
                    <input name="rfc" type="text" defaultValue={empresa.rfc ?? ""} placeholder="XAXX010101000"
                      className="w-full rounded-md border border-linea px-3 py-2 text-sm text-ink focus:border-primario focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-ink/60 mb-1">Teléfono</label>
                    <input name="telefono" type="text" defaultValue={empresa.telefono ?? ""}
                      className="w-full rounded-md border border-linea px-3 py-2 text-sm text-ink focus:border-primario focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-ink/60 mb-1">Calle y número</label>
                    <input name="calle" type="text" defaultValue={empresa.calle ?? ""}
                      className="w-full rounded-md border border-linea px-3 py-2 text-sm text-ink focus:border-primario focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-ink/60 mb-1">Colonia</label>
                    <input name="colonia" type="text" defaultValue={empresa.colonia ?? ""}
                      className="w-full rounded-md border border-linea px-3 py-2 text-sm text-ink focus:border-primario focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-ink/60 mb-1">Ciudad</label>
                    <input name="ciudad" type="text" defaultValue={empresa.ciudad ?? ""}
                      className="w-full rounded-md border border-linea px-3 py-2 text-sm text-ink focus:border-primario focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-ink/60 mb-1">Estado</label>
                    <input name="estado_empresa" type="text" defaultValue={empresa.estado_empresa ?? ""}
                      className="w-full rounded-md border border-linea px-3 py-2 text-sm text-ink focus:border-primario focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-ink/60 mb-1">Código postal</label>
                    <input name="codigo_postal" type="text" defaultValue={empresa.codigo_postal ?? ""}
                      className="w-full rounded-md border border-linea px-3 py-2 text-sm text-ink focus:border-primario focus:outline-none" />
                  </div>
                </div>
              </>
            ) : (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {empresa.logo_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <div className="sm:col-span-2"><img src={empresa.logo_url} alt="logo" className="h-16 rounded-lg object-contain border border-linea bg-paper p-1" /></div>
                )}
                <div className="sm:col-span-2"><Campo label="Nombre comercial" valor={empresa.name} /></div>
                <Campo label="Razón social" valor={empresa.razon_social} />
                <Campo label="RFC" valor={empresa.rfc} />
                <Campo label="Teléfono" valor={empresa.telefono} />
                <div className="sm:col-span-2">
                  <Campo label="Dirección" valor={[empresa.calle, empresa.colonia, empresa.ciudad, empresa.estado_empresa, empresa.codigo_postal].filter(Boolean).join(", ")} />
                </div>
                {!empresa.name && !empresa.rfc && (
                  <p className="sm:col-span-2 text-sm text-ink/40 italic">Toca "Editar" para agregar tus datos.</p>
                )}
              </div>
            )}
          </>
        )}

        {/* ── Impuestos ── */}
        {tab === "impuestos" && (
          <>
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-ink">Impuestos</p>
              <BotonesEdicion editando={estaEditando} guardando={guardando}
                onEditar={() => setEditando("impuestos")} onCancelar={() => setEditando(null)} />
            </div>
            {estaEditando ? (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-ink/60 mb-1">IVA %</label>
                    <input name="iva_porcentaje" type="number" min="0" max="100" step="0.01"
                      defaultValue={empresa.iva_porcentaje ?? 0}
                      className="w-full rounded-md border border-linea px-3 py-2 text-sm text-ink focus:border-primario focus:outline-none" />
                    <p className="mt-0.5 text-xs text-ink/40">0 = sin IVA · 16 = estándar</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-ink/60 mb-1">Modo de precios</label>
                    <select name="iva_incluido" defaultValue={empresa.iva_incluido ? "true" : "false"}
                      className="w-full rounded-md border border-linea px-3 py-2 text-sm text-ink focus:border-primario focus:outline-none">
                      <option value="true">Ya incluyen IVA</option>
                      <option value="false">Sin IVA (se agrega al cobrar)</option>
                    </select>
                  </div>
                </div>
                <div className="rounded-lg border border-linea p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-sm font-medium text-ink">IEPS</p>
                      <p className="text-xs text-ink/50">Bebidas azucaradas, alcohol, tabacos</p>
                    </div>
                    <label className="relative inline-flex cursor-pointer items-center">
                      <input type="checkbox" name="ieps_habilitado" value="true"
                        defaultChecked={empresa.ieps_habilitado ?? false} className="sr-only peer" />
                      <div className="h-6 w-11 rounded-full bg-linea peer-checked:bg-primario transition-colors after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:after:translate-x-5" />
                    </label>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-ink/60 mb-1">Tasa IEPS %</label>
                    <input name="ieps_porcentaje" type="number" min="0" max="100" step="0.01"
                      defaultValue={empresa.ieps_porcentaje ?? 0} placeholder="8 = bebidas · 26.5 = tabacos"
                      className="w-full rounded-md border border-linea px-3 py-2 text-sm text-ink focus:border-primario focus:outline-none" />
                  </div>
                </div>
              </>
            ) : (
              <div className="flex flex-col gap-2">
                <Campo label="IVA" valor={`${empresa.iva_porcentaje ?? 0}% — ${empresa.iva_incluido ? "incluido en precio" : "se agrega al cobrar"}`} />
                <Campo label="IEPS" valor={empresa.ieps_habilitado ? `${empresa.ieps_porcentaje ?? 0}% habilitado` : "Deshabilitado"} />
              </div>
            )}
          </>
        )}

        {/* ── CFDI ── */}
        {tab === "cfdi" && (
          <>
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-ink">Facturación CFDI 4.0</p>
              <BotonesEdicion editando={estaEditando} guardando={guardando}
                onEditar={() => setEditando("cfdi")} onCancelar={() => setEditando(null)} />
            </div>
            {estaEditando ? (
              <>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-ink">Habilitar CFDI</p>
                    <p className="text-xs text-ink/50">Requiere CSD vigente y cuenta en un PAC.</p>
                  </div>
                  <label className="relative inline-flex cursor-pointer items-center">
                    <input type="checkbox" name="cfdi_habilitado" value="true"
                      defaultChecked={empresa.cfdi_habilitado ?? false} className="sr-only peer" />
                    <div className="h-6 w-11 rounded-full bg-linea peer-checked:bg-primario transition-colors after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:after:translate-x-5" />
                  </label>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-ink/60 mb-1">Régimen fiscal</label>
                    <select name="regimen_fiscal" defaultValue={empresa.regimen_fiscal ?? ""}
                      className="w-full rounded-md border border-linea px-3 py-2 text-sm text-ink focus:border-primario focus:outline-none">
                      <option value="">Seleccionar...</option>
                      <option value="601">601 - General Ley P. Morales</option>
                      <option value="612">612 - P. Físicas Act. Empresariales</option>
                      <option value="621">621 - Incorporación Fiscal</option>
                      <option value="626">626 - RESICO</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-ink/60 mb-1">CP fiscal</label>
                    <input name="cp_fiscal" type="text" defaultValue={empresa.cp_fiscal ?? ""}
                      className="w-full rounded-md border border-linea px-3 py-2 text-sm text-ink focus:border-primario focus:outline-none" />
                  </div>
                </div>
                <p className="text-xs font-semibold text-ink/40 uppercase tracking-wide">PAC</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-ink/60 mb-1">PAC</label>
                    <select name="pac_nombre" defaultValue={empresa.pac_nombre ?? "facturama"}
                      className="w-full rounded-md border border-linea px-3 py-2 text-sm text-ink focus:border-primario focus:outline-none">
                      <option value="facturama">Facturama</option>
                      <option value="sw_sapien">SW Sapien</option>
                      <option value="finkok">Finkok</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-ink/60 mb-1">Modo</label>
                    <select name="pac_modo" defaultValue={empresa.pac_modo ?? "sandbox"}
                      className="w-full rounded-md border border-linea px-3 py-2 text-sm text-ink focus:border-primario focus:outline-none">
                      <option value="sandbox">🧪 Sandbox</option>
                      <option value="produccion">🔴 Producción</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-ink/60 mb-1">Usuario PAC</label>
                    <input name="pac_usuario" type="text" defaultValue={empresa.pac_usuario ?? ""}
                      className="w-full rounded-md border border-linea px-3 py-2 text-sm text-ink focus:border-primario focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-ink/60 mb-1">Contraseña PAC</label>
                    <input name="pac_password" type="password" defaultValue={empresa.pac_password ?? ""}
                      className="w-full rounded-md border border-linea px-3 py-2 text-ink focus:border-primario focus:outline-none" />
                  </div>
                </div>
                <p className="text-xs font-semibold text-ink/40 uppercase tracking-wide">CSD</p>
                <textarea name="csd_cer" rows={2} defaultValue={empresa.csd_cer ?? ""} placeholder="Contenido del .cer en base64..."
                  className="w-full rounded-md border border-linea px-3 py-2 text-xs font-mono text-ink focus:border-primario focus:outline-none resize-none" />
                <textarea name="csd_key" rows={2} defaultValue={empresa.csd_key ?? ""} placeholder="Contenido del .key en base64..."
                  className="w-full rounded-md border border-linea px-3 py-2 text-xs font-mono text-ink focus:border-primario focus:outline-none resize-none" />
                <input name="csd_password" type="password" defaultValue={empresa.csd_password ?? ""} placeholder="Contraseña del .key"
                  className="w-full rounded-md border border-linea px-3 py-2 text-sm text-ink focus:border-primario focus:outline-none" />
              </>
            ) : (
              <div className="flex flex-col gap-2">
                <Campo label="Estado" valor={empresa.cfdi_habilitado ? "Habilitado" : "Deshabilitado"} />
                <Campo label="Régimen fiscal" valor={empresa.regimen_fiscal} />
                <Campo label="CP fiscal" valor={empresa.cp_fiscal} />
                <Campo label="PAC" valor={empresa.pac_nombre ? `${empresa.pac_nombre} (${empresa.pac_modo ?? "sandbox"})` : undefined} />
                <Campo label="Usuario PAC" valor={empresa.pac_usuario} />
                {!empresa.regimen_fiscal && <p className="text-sm text-ink/40 italic">Toca "Editar" para configurar CFDI.</p>}
              </div>
            )}
          </>
        )}

        {/* ── Acceso ── */}
        {tab === "acceso" && (
          <>
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-ink">URL de acceso para vendedores</p>
              <BotonesEdicion editando={estaEditando} guardando={guardando}
                onEditar={() => setEditando("acceso")} onCancelar={() => setEditando(null)} />
            </div>
            {estaEditando ? (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-ink/40">ventastack.vercel.app/auth/vendedor?empresa=</span>
                  <input name="slug" type="text" defaultValue={empresa.slug ?? ""} placeholder="mitienda"
                    className="w-36 rounded-md border border-linea px-3 py-2 text-sm text-ink focus:border-primario focus:outline-none" />
                </div>
                <p className="text-xs text-ink/40">Solo minúsculas, números y guiones.</p>
              </>
            ) : (
              <div>
                {empresa.slug ? (
                  <div className="rounded-lg bg-paper border border-linea p-3 text-xs space-y-1">
                    <p className="text-xs text-ink/40">Enlace de acceso actual</p>
                    <p className="font-mono text-primario break-all">ventastack.vercel.app/auth/vendedor?empresa={empresa.slug}</p>
                  </div>
                ) : (
                  <p className="text-sm text-ink/40 italic">Toca "Editar" para configurar el slug.</p>
                )}
              </div>
            )}
          </>
        )}

        {/* ── WhatsApp ── */}
        {tab === "whatsapp" && (
          <>
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-ink">WhatsApp y alertas de stock</p>
              <BotonesEdicion editando={estaEditando} guardando={guardando}
                onEditar={() => setEditando("whatsapp")} onCancelar={() => setEditando(null)} />
            </div>
            {estaEditando ? (
              <>
                <div>
                  <label className="block text-xs font-medium text-ink/60 mb-1">Tu número de WhatsApp</label>
                  <input name="whatsapp_admin" type="text" defaultValue={empresa.whatsapp_admin ?? ""} placeholder="5219991234567"
                    className="w-full rounded-md border border-linea px-3 py-2 text-sm text-ink focus:border-primario focus:outline-none" />
                  <p className="mt-1 text-xs text-ink/40">Con código de país, sin + ni espacios.</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-ink/60 mb-1">Avisar cuando stock sea menor de</label>
                  <input name="umbral_stock_bajo" type="number" min="0" defaultValue={empresa.umbral_stock_bajo ?? ""} placeholder="5"
                    className="w-full rounded-md border border-linea px-3 py-2 text-sm text-ink focus:border-primario focus:outline-none" />
                </div>
              </>
            ) : (
              <div className="flex flex-col gap-2">
                <Campo label="WhatsApp" valor={empresa.whatsapp_admin} />
                <Campo label="Alerta de stock" valor={empresa.umbral_stock_bajo ? `Cuando queden menos de ${empresa.umbral_stock_bajo} unidades` : undefined} />
                {!empresa.whatsapp_admin && <p className="text-sm text-ink/40 italic">Toca "Editar" para configurar WhatsApp.</p>}
              </div>
            )}
          </>
        )}

      </form>
    </div>
  );
}
