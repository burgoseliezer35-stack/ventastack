import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { guardarConfiguracion } from "./actions";
import { whatsappDisponible } from "@/lib/whatsapp";
import { LogoUpload } from "@/components/logo-upload";

export default async function ConfiguracionPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; guardado?: string }>;
}) {
  const { error: errorParam, guardado } = await searchParams;
  const supabase = await createClient();

  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) redirect("/auth/login");

  const userId = data.claims.sub as string;
  const { data: miPerfil } = await supabase
    .from("profiles")
    .select("role, company_id")
    .eq("id", userId)
    .single();

  if (miPerfil?.role !== "admin") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-paper px-4 text-center">
        <p className="text-sm text-ink/70">Solo el admin de la empresa puede ver esta página.</p>
        <Link href="/protected" className="text-sm text-primario hover:underline">Regresar</Link>
      </div>
    );
  }

  const { data: empresa } = await supabase
    .from("companies")
    .select("id, name, logo_url, rfc, razon_social, calle, colonia, ciudad, estado_empresa, codigo_postal, telefono, whatsapp_admin, umbral_stock_bajo, slug, iva_porcentaje, iva_incluido, ieps_habilitado, ieps_porcentaje, regimen_fiscal, cp_fiscal, pac_nombre, pac_usuario, pac_password, pac_modo, cfdi_habilitado, csd_cer, csd_key, csd_password")
    .eq("id", miPerfil.company_id)
    .single();

  if (!empresa) return null;

  return (
    <div className="flex max-w-xl flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-ink">Configuración</h1>
        <p className="text-sm text-ink/60">Datos de tu negocio, ticket de venta y alertas.</p>
      </div>

      {!whatsappDisponible() && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">
          WhatsApp no está activado (falta configurar UltraMsg). Puedes guardar de todos modos.
        </div>
      )}

      <form action={guardarConfiguracion.bind(null, empresa.id)} className="flex flex-col gap-6">

        <div className="rounded-xl border border-linea bg-white p-5">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-ink/50">Logo</h2>
          <LogoUpload logoActual={empresa.logo_url ?? null} />
        </div>

        {/* ── Datos fiscales ── */}
        <div className="rounded-xl border border-linea bg-white p-5">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-ink/50">Datos del negocio</h2>
          <div className="flex flex-col gap-3">
            <div>
              <label className="block text-xs font-medium text-ink/60 mb-1">Nombre comercial</label>
              <input name="name" type="text" defaultValue={empresa.name ?? ""} placeholder="Mi Tienda"
                className="w-full rounded-md border border-linea px-3 py-2 text-sm text-ink focus:border-primario focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-ink/60 mb-1">Razón social (opcional)</label>
              <input name="razon_social" type="text" defaultValue={empresa.razon_social ?? ""} placeholder="MI TIENDA S.A. DE C.V."
                className="w-full rounded-md border border-linea px-3 py-2 text-sm text-ink focus:border-primario focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-ink/60 mb-1">RFC (opcional)</label>
              <input name="rfc" type="text" defaultValue={empresa.rfc ?? ""} placeholder="XAXX010101000"
                className="w-full rounded-md border border-linea px-3 py-2 text-sm text-ink focus:border-primario focus:outline-none" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-ink/60 mb-1">Calle y número</label>
                <input name="calle" type="text" defaultValue={empresa.calle ?? ""} placeholder="Av. Principal 123"
                  className="w-full rounded-md border border-linea px-3 py-2 text-sm text-ink focus:border-primario focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-ink/60 mb-1">Colonia</label>
                <input name="colonia" type="text" defaultValue={empresa.colonia ?? ""} placeholder="Centro"
                  className="w-full rounded-md border border-linea px-3 py-2 text-sm text-ink focus:border-primario focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-ink/60 mb-1">Ciudad</label>
                <input name="ciudad" type="text" defaultValue={empresa.ciudad ?? ""} placeholder="Mérida"
                  className="w-full rounded-md border border-linea px-3 py-2 text-sm text-ink focus:border-primario focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-ink/60 mb-1">Estado</label>
                <input name="estado_empresa" type="text" defaultValue={empresa.estado_empresa ?? ""} placeholder="Yucatán"
                  className="w-full rounded-md border border-linea px-3 py-2 text-sm text-ink focus:border-primario focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-ink/60 mb-1">Código postal</label>
                <input name="codigo_postal" type="text" defaultValue={empresa.codigo_postal ?? ""} placeholder="97000"
                  className="w-full rounded-md border border-linea px-3 py-2 text-sm text-ink focus:border-primario focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-ink/60 mb-1">Teléfono</label>
                <input name="telefono" type="text" defaultValue={empresa.telefono ?? ""} placeholder="9991234567"
                  className="w-full rounded-md border border-linea px-3 py-2 text-sm text-ink focus:border-primario focus:outline-none" />
              </div>
            </div>
          </div>
        </div>

        {/* ── IVA e IEPS ── */}
        <div className="rounded-xl border border-linea bg-white p-5">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-ink/50">Impuestos</h2>
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-ink/60 mb-1">IVA %</label>
                <input name="iva_porcentaje" type="number" min="0" max="100" step="0.01"
                  defaultValue={empresa.iva_porcentaje ?? 0}
                  className="w-full rounded-md border border-linea px-3 py-2 text-sm text-ink focus:border-primario focus:outline-none" />
                <p className="mt-0.5 text-xs text-ink/40">0 = sin IVA · 16 = estándar</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-ink/60 mb-1">¿Cómo están tus precios?</label>
                <select name="iva_incluido" defaultValue={empresa.iva_incluido ? "true" : "false"}
                  className="w-full rounded-md border border-linea px-3 py-2 text-sm text-ink focus:border-primario focus:outline-none">
                  <option value="true">Ya incluyen IVA</option>
                  <option value="false">Sin IVA (se agrega al cobrar)</option>
                </select>
              </div>
            </div>

            <div className="rounded-lg border border-linea p-3 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-ink">IEPS</p>
                  <p className="text-xs text-ink/50">Bebidas azucaradas, alcohol, tabacos, etc.</p>
                </div>
                <label className="relative inline-flex cursor-pointer items-center">
                  <input type="checkbox" name="ieps_habilitado" value="true"
                    defaultChecked={empresa.ieps_habilitado ?? false} className="sr-only peer" />
                  <div className="h-6 w-11 rounded-full bg-linea peer-checked:bg-primario transition-colors after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:after:translate-x-5" />
                </label>
              </div>
              <div>
                <label className="block text-xs font-medium text-ink/60 mb-1">Tasa de IEPS %</label>
                <input name="ieps_porcentaje" type="number" min="0" max="100" step="0.01"
                  defaultValue={empresa.ieps_porcentaje ?? 0}
                  placeholder="8 = bebidas azucaradas · 26.5 = tabacos"
                  className="w-full rounded-md border border-linea px-3 py-2 text-sm text-ink focus:border-primario focus:outline-none" />
              </div>
            </div>
          </div>
        </div>

        {/* ── Acceso vendedores ── */}
        <div className="rounded-xl border border-linea bg-white p-5">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-ink/50">Acceso de vendedores</h2>
          <label className="block text-xs font-medium text-ink/60 mb-1">URL corta</label>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-ink/40">ventastack.vercel.app/auth/vendedor?empresa=</span>
            <input name="slug" type="text" defaultValue={empresa.slug ?? ""} placeholder="mitienda"
              pattern="[a-z0-9-]+"
              className="w-32 rounded-md border border-linea px-3 py-2 text-sm text-ink focus:border-primario focus:outline-none" />
          </div>
          <p className="mt-1 text-xs text-ink/40">Solo minúsculas, números y guiones.</p>
        </div>

        {/* ── WhatsApp ── */}
        <div className="rounded-xl border border-linea bg-white p-5">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-ink/50">Alertas por WhatsApp</h2>
          <div className="flex flex-col gap-3">
            <div>
              <label className="block text-xs font-medium text-ink/60 mb-1">Tu número de WhatsApp</label>
              <input name="whatsapp_admin" type="text" defaultValue={empresa.whatsapp_admin ?? ""} placeholder="5219991234567"
                className="w-full rounded-md border border-linea px-3 py-2 text-sm text-ink focus:border-primario focus:outline-none" />
              <p className="mt-1 text-xs text-ink/40">Con código de país, sin + ni espacios.</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-ink/60 mb-1">Avisar cuando stock sea menor de</label>
              <input name="umbral_stock_bajo" type="number" min="0" step="1"
                defaultValue={empresa.umbral_stock_bajo ?? ""} placeholder="5"
                className="w-full rounded-md border border-linea px-3 py-2 text-sm text-ink focus:border-primario focus:outline-none" />
            </div>
          </div>
        </div>

        {/* ── CFDI / Facturación electrónica ── */}
        <div className="rounded-xl border border-linea bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-ink/50">Facturación electrónica (CFDI 4.0)</h2>
              <p className="text-xs text-ink/40 mt-0.5">Requiere RFC, CSD vigente y cuenta en un PAC autorizado por el SAT.</p>
            </div>
            <label className="relative inline-flex cursor-pointer items-center">
              <input type="checkbox" name="cfdi_habilitado" value="true"
                defaultChecked={empresa.cfdi_habilitado ?? false} className="sr-only peer" />
              <div className="h-6 w-11 rounded-full bg-linea peer-checked:bg-primario transition-colors after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:after:translate-x-5" />
            </label>
          </div>

          <div className="flex flex-col gap-3">
            {/* Datos fiscales del emisor */}
            <p className="text-xs font-semibold text-ink/50 uppercase tracking-wide">Datos del emisor (SAT)</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-ink/60 mb-1">
                  Régimen fiscal
                </label>
                <select name="regimen_fiscal" defaultValue={empresa.regimen_fiscal ?? ""}
                  className="w-full rounded-md border border-linea px-3 py-2 text-sm text-ink focus:border-primario focus:outline-none">
                  <option value="">Seleccionar...</option>
                  <option value="601">601 - General de Ley Personas Morales</option>
                  <option value="603">603 - Personas Morales con Fines no Lucrativos</option>
                  <option value="606">606 - Arrendamiento</option>
                  <option value="612">612 - Personas Físicas con Act. Empresariales</option>
                  <option value="616">616 - Sin obligaciones fiscales</option>
                  <option value="621">621 - Incorporación Fiscal</option>
                  <option value="625">625 - Régimen de las Actividades Empresariales con ingresos a través de Plataformas Tecnológicas</option>
                  <option value="626">626 - Régimen Simplificado de Confianza (RESICO)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-ink/60 mb-1">
                  CP domicilio fiscal (SAT)
                </label>
                <input name="cp_fiscal" type="text" defaultValue={empresa.cp_fiscal ?? ""}
                  placeholder="El que registraste en el SAT"
                  className="w-full rounded-md border border-linea px-3 py-2 text-sm text-ink focus:border-primario focus:outline-none" />
              </div>
            </div>

            {/* PAC */}
            <p className="text-xs font-semibold text-ink/50 uppercase tracking-wide mt-2">PAC (Proveedor Autorizado de Certificación)</p>
            <div className="rounded-lg bg-primario-suave border border-primario/20 p-3 text-xs text-ink/70">
              Recomendamos <strong>Facturama</strong> — crea tu cuenta gratis en <span className="text-primario">facturama.io</span> (sandbox para pruebas, producción cuando estés listo). Con SW Sapien y Finkok también funciona.
            </div>
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
                  <option value="sandbox">🧪 Sandbox (pruebas, sin costo)</option>
                  <option value="produccion">🔴 Producción (timbrado real)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-ink/60 mb-1">Usuario / API Key del PAC</label>
                <input name="pac_usuario" type="text" defaultValue={empresa.pac_usuario ?? ""}
                  placeholder="Tu usuario en Facturama"
                  className="w-full rounded-md border border-linea px-3 py-2 text-sm text-ink focus:border-primario focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-ink/60 mb-1">Contraseña del PAC</label>
                <input name="pac_password" type="password" defaultValue={empresa.pac_password ?? ""}
                  placeholder="••••••••"
                  className="w-full rounded-md border border-linea px-3 py-2 text-ink focus:border-primario focus:outline-none" />
              </div>
            </div>

            {/* CSD */}
            <p className="text-xs font-semibold text-ink/50 uppercase tracking-wide mt-2">CSD (Certificado de Sello Digital)</p>
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">
              Descarga tu CSD del portal del SAT (certisat.sat.gob.mx). Son dos archivos: <strong>.cer</strong> y <strong>.key</strong>. Pega aquí el contenido en base64 o sube los archivos.
            </div>
            <div className="flex flex-col gap-3">
              <div>
                <label className="block text-xs font-medium text-ink/60 mb-1">Archivo .cer (base64)</label>
                <textarea name="csd_cer" rows={2} defaultValue={empresa.csd_cer ?? ""}
                  placeholder="Contenido del archivo .cer en base64..."
                  className="w-full rounded-md border border-linea px-3 py-2 text-xs font-mono text-ink focus:border-primario focus:outline-none resize-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-ink/60 mb-1">Archivo .key (base64)</label>
                <textarea name="csd_key" rows={2} defaultValue={empresa.csd_key ?? ""}
                  placeholder="Contenido del archivo .key en base64..."
                  className="w-full rounded-md border border-linea px-3 py-2 text-xs font-mono text-ink focus:border-primario focus:outline-none resize-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-ink/60 mb-1">Contraseña del .key</label>
                <input name="csd_password" type="password" defaultValue={empresa.csd_password ?? ""}
                  placeholder="Contraseña con la que generaste el CSD"
                  className="w-full rounded-md border border-linea px-3 py-2 text-ink focus:border-primario focus:outline-none" />
              </div>
            </div>
          </div>
        </div>

        {errorParam && <p className="text-sm text-red-600">{errorParam}</p>}
        {guardado && (
          <div className="rounded-xl border border-verde/30 bg-verde-suave p-4">
            <p className="text-sm font-semibold text-verde mb-2">✓ Guardado correctamente</p>
            <div className="text-xs text-ink/70 space-y-0.5">
              <p><strong>Negocio:</strong> {empresa.name}</p>
              {empresa.rfc && <p><strong>RFC:</strong> {empresa.rfc}</p>}
              {empresa.calle && (
                <p><strong>Dirección:</strong> {[empresa.calle, empresa.colonia, empresa.ciudad, empresa.estado_empresa, empresa.codigo_postal].filter(Boolean).join(", ")}</p>
              )}
              <p><strong>IVA:</strong> {empresa.iva_porcentaje ?? 0}% {empresa.iva_incluido ? "(incluido en precio)" : "(se agrega al cobrar)"}</p>
              <p><strong>IEPS:</strong> {empresa.ieps_habilitado ? `${empresa.ieps_porcentaje ?? 0}% — habilitado` : "deshabilitado"}</p>
            </div>
          </div>
        )}

        <button type="submit"
          className="w-full rounded-xl bg-primario px-4 py-3 font-semibold text-white transition hover:opacity-90">
          Guardar cambios
        </button>
      </form>
    </div>
  );
}
