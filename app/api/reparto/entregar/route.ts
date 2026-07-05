import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { enviarWhatsApp } from "@/lib/whatsapp";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();

    // Verificar sesión
    const { data: claims } = await supabase.auth.getClaims();
    if (!claims?.claims) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const formData = await req.formData();
    const pedidoId = formData.get("pedido_id") as string;
    const foto = formData.get("foto") as File | null;

    if (!pedidoId) {
      return NextResponse.json({ error: "pedido_id requerido" }, { status: 400 });
    }

    // Verificar que el pedido existe y pertenece a este repartidor (o admin)
    const { data: pedido } = await supabase
      .from("pedidos")
      .select(`
        id, company_id, repartidor_id, estado_reparto,
        clientes ( nombre, whatsapp )
      `)
      .eq("id", pedidoId)
      .single();

    if (!pedido) {
      return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });
    }

    const userId = claims.claims.sub as string;
    const { data: perfil } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .limit(1)
      .maybeSingle();

    const esAdmin = perfil?.role === "admin";
    const esElRepartidor = pedido.repartidor_id === userId;

    if (!esAdmin && !esElRepartidor) {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
    }

    let fotoUrl: string | null = null;

    // ── 1. Subir foto a Storage si viene ─────────────────────
    if (foto && foto.size > 0) {
      const ext = foto.type.includes("png") ? "png" : "jpg";
      const ruta = `${pedido.company_id}/${pedidoId}.${ext}`;

      const buffer = Buffer.from(await foto.arrayBuffer());

      const { error: uploadError } = await supabase.storage
        .from("entregas")
        .upload(ruta, buffer, {
          contentType: foto.type,
          upsert: true,
        });

      if (!uploadError) {
        const { data: urlData } = supabase.storage
          .from("entregas")
          .getPublicUrl(ruta);
        fotoUrl = urlData.publicUrl;
      }
    }

    // ── 2. Actualizar estado del pedido ───────────────────────
    const updates: Record<string, unknown> = {
      estado_reparto: "entregado",
      estado: "entregado",
    };
    if (fotoUrl) updates.foto_entrega_url = fotoUrl;

    await supabase
      .from("pedidos")
      .update(updates)
      .eq("id", pedidoId);

    // ── 3. WhatsApp al cliente ────────────────────────────────
    const cliente = Array.isArray(pedido.clientes)
      ? pedido.clientes[0]
      : pedido.clientes;

    const clienteWhatsapp = (cliente as { whatsapp?: string | null } | null)?.whatsapp;
    const clienteNombre = (cliente as { nombre?: string } | null)?.nombre ?? "Cliente";

    if (clienteWhatsapp) {
      const folio = pedidoId.replace(/-/g, "").slice(0, 8).toUpperCase();
      let mensaje = `Hola ${clienteNombre} 👋\n\nTu pedido (folio *${folio}*) fue entregado exitosamente.`;

      if (fotoUrl) {
        mensaje += `\n\nComprobante de entrega:\n${fotoUrl}`;
      }

      mensaje += `\n\n¡Gracias por tu compra!`;

      await enviarWhatsApp(clienteWhatsapp, mensaje);
    }

    return NextResponse.json({
      ok: true,
      foto_url: fotoUrl,
      whatsapp_enviado: !!clienteWhatsapp,
    });
  } catch (err) {
    console.error("Error en /api/reparto/entregar:", err);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
