import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { escribirResumenDiario } from "@/lib/gemini";
import { whatsappDisponible, enviarWhatsApp } from "@/lib/whatsapp";

// Evita que Vercel cachee la respuesta — esto debe correr de
// verdad cada vez que el cron lo llama, nunca servir algo viejo.
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  // Solo Vercel Cron debe poder llamar esto — verifica el secreto
  // que Vercel manda solo, automáticamente, en cada invocación.
  const authHeader = request.headers.get("authorization");
  if (
    !process.env.CRON_SECRET ||
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  if (!whatsappDisponible()) {
    return NextResponse.json({ omitido: "WhatsApp no está configurado" });
  }

  const admin = createAdminClient();

  // "Ayer" en el sentido del calendario, no en horas exactas — es
  // suficientemente bueno para un resumen, sin complicarse con
  // zonas horarias de cada empresa.
  const ahora = new Date();
  const inicioAyer = new Date(ahora);
  inicioAyer.setUTCDate(inicioAyer.getUTCDate() - 1);
  inicioAyer.setUTCHours(0, 0, 0, 0);
  const inicioHoy = new Date(inicioAyer);
  inicioHoy.setUTCDate(inicioHoy.getUTCDate() + 1);

  const fechaTexto = inicioAyer.toLocaleDateString("es-MX", {
    day: "numeric",
    month: "long",
  });

  const { data: empresas } = await admin
    .from("companies")
    .select("id, whatsapp_admin, umbral_stock_bajo")
    .not("whatsapp_admin", "is", null);

  const resultados: { company_id: string; enviado: boolean }[] = [];

  for (const empresa of empresas ?? []) {
    const { data: pedidos } = await admin
      .from("pedidos")
      .select("total")
      .eq("company_id", empresa.id)
      .eq("estado", "confirmado")
      .gte("created_at", inicioAyer.toISOString())
      .lt("created_at", inicioHoy.toISOString());

    const totalVentas = (pedidos ?? []).reduce((s, p) => s + p.total, 0);
    const numeroVentas = (pedidos ?? []).length;

    const { data: clientesConSaldo } = await admin
      .from("clientes")
      .select("saldo_actual")
      .eq("company_id", empresa.id)
      .gt("saldo_actual", 0);

    const porCobrar = (clientesConSaldo ?? []).reduce(
      (s, c) => s + c.saldo_actual,
      0,
    );

    let productosPorAgotarse: { nombre: string; stock: number }[] = [];
    if (empresa.umbral_stock_bajo != null) {
      const { data: bajos } = await admin
        .from("productos")
        .select("nombre, stock")
        .eq("company_id", empresa.id)
        .eq("activo", true)
        .lt("stock", empresa.umbral_stock_bajo)
        .order("stock")
        .limit(8);
      productosPorAgotarse = bajos ?? [];
    }

    const datos = {
      fecha: fechaTexto,
      totalVentas,
      numeroVentas,
      porCobrar,
      productosPorAgotarse,
    };

    // Si Gemini no está disponible o falla, mandamos un mensaje
    // simple armado a mano — no perder el aviso solo por eso.
    const mensaje =
      (await escribirResumenDiario(datos)) ??
      `Resumen del ${fechaTexto}: $${totalVentas.toFixed(2)} en ${numeroVentas} ventas. Por cobrar: $${porCobrar.toFixed(2)}.${
        productosPorAgotarse.length
          ? ` Por agotarse: ${productosPorAgotarse.map((p) => p.nombre).join(", ")}.`
          : ""
      }`;

    const enviado = await enviarWhatsApp(empresa.whatsapp_admin!, mensaje);
    resultados.push({ company_id: empresa.id, enviado });
  }

  return NextResponse.json({ procesadas: resultados.length, resultados });
}
