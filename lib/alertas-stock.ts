import type { SupabaseClient } from "@supabase/supabase-js";
import { whatsappDisponible, enviarWhatsApp } from "@/lib/whatsapp";

// Revisa cada producto en la lista: si su stock ya está debajo del
// umbral de SU empresa y todavía no se había avisado, manda el
// WhatsApp y marca la bandera (para no repetir el mismo aviso cada
// vez que se vende una unidad más). Si el stock vuelve a subir por
// encima del umbral (una compra, una devolución), apaga la
// bandera, para que SÍ pueda volver a avisar la próxima vez que
// baje. Nunca lanza error — si WhatsApp no está configurado, o algo
// falla, simplemente no manda nada esta vez.
export async function verificarYNotificarStockBajo(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, any, any>,
  productoIds: string[],
) {
  if (productoIds.length === 0 || !whatsappDisponible()) return;

  const { data: productos } = await supabase
    .from("productos")
    .select("id, nombre, stock, alerta_stock_enviada, company_id")
    .in("id", productoIds);

  if (!productos || productos.length === 0) return;

  const companyIds = [...new Set(productos.map((p) => p.company_id))];
  const { data: empresas } = await supabase
    .from("companies")
    .select("id, whatsapp_admin, umbral_stock_bajo")
    .in("id", companyIds);

  for (const producto of productos) {
    const empresa = empresas?.find((e) => e.id === producto.company_id);
    if (!empresa?.whatsapp_admin || empresa.umbral_stock_bajo == null) continue;

    const stockBajo = producto.stock < empresa.umbral_stock_bajo;

    if (stockBajo && !producto.alerta_stock_enviada) {
      const enviado = await enviarWhatsApp(
        empresa.whatsapp_admin,
        `📉 Se está acabando "${producto.nombre}" — quedan ${producto.stock} en existencia.`,
      );
      if (enviado) {
        await supabase
          .from("productos")
          .update({ alerta_stock_enviada: true })
          .eq("id", producto.id);
      }
    } else if (!stockBajo && producto.alerta_stock_enviada) {
      // Ya se repuso — apagamos la bandera para que pueda avisar
      // otra vez si vuelve a bajar más adelante.
      await supabase
        .from("productos")
        .update({ alerta_stock_enviada: false })
        .eq("id", producto.id);
    }
  }
}
