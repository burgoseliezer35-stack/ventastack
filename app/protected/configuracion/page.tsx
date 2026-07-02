import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { guardarConfiguracion } from "./actions";
import { whatsappDisponible } from "@/lib/whatsapp";
import { ConfiguracionTabs } from "@/components/configuracion-tabs";

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
        <p className="text-sm text-ink/70">Solo el admin puede ver esta página.</p>
        <Link href="/protected" className="text-sm text-primario hover:underline">Regresar</Link>
      </div>
    );
  }

  // Campos base — siempre existen
  const { data: empresaBase } = await supabase
    .from("companies")
    .select("id, name, whatsapp_admin, umbral_stock_bajo, slug")
    .eq("id", miPerfil.company_id)
    .single();

  if (!empresaBase) return null;

  // Campos extendidos — pueden no existir si los SQLs no se han corrido
  let empresaExtendida: Record<string, unknown> = {};
  try {
    const { data: ext } = await supabase
      .from("companies")
      .select("logo_url, rfc, razon_social, calle, colonia, ciudad, estado_empresa, codigo_postal, telefono, precios_con_iva_incluido, cfdi_habilitado, regimen_fiscal, cp_fiscal, pac_nombre, pac_usuario, pac_password, pac_modo, csd_cer, csd_key, csd_password, pie_ticket")
      .eq("id", miPerfil.company_id)
      .single();
    empresaExtendida = (ext as Record<string, unknown>) ?? {};
  } catch { /* columnas no existen todavía */ }

  const empresa = { ...empresaBase, ...empresaExtendida };

  return (
    <div className="flex max-w-xl flex-col gap-4">
      <div>
        <h1 className="text-xl font-bold text-ink">Configuración</h1>
        <p className="text-sm text-ink/60">Datos de tu negocio, impuestos, facturación y alertas.</p>
      </div>

      {!whatsappDisponible() && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800">
          WhatsApp no está activado (falta configurar UltraMsg). Puedes guardar de todos modos.
        </div>
      )}

      <ConfiguracionTabs
        empresa={empresa}
        guardado={!!guardado}
        errorParam={errorParam ?? null}
        guardarConfiguracion={guardarConfiguracion}
      />
    </div>
  );
}
