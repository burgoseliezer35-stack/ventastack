// Manda mensajes de WhatsApp a través de UltraMsg (un "gateway"
// simple para esto — no es IA conversacional, solo manda el texto
// que le pidas, a quien le pidas). Documentación: docs.ultramsg.com
//
// ¿Está prendida esta función? Solo depende de si hay llaves — si
// no hay, nadie recibe nada, pero tampoco truena nada más en la
// app. Se activa solo en cuanto se configuren las dos variables.
export function whatsappDisponible(): boolean {
  return !!process.env.ULTRAMSG_TOKEN && !!process.env.ULTRAMSG_INSTANCE_ID;
}

// Manda un mensaje de texto. Regresa true/false según si se pudo
// mandar — nunca lanza una excepción hacia quien lo llama, para que
// un fallo de WhatsApp jamás tumbe una venta, un ajuste de stock, o
// el cron diario.
export async function enviarWhatsApp(
  numero: string,
  mensaje: string,
): Promise<boolean> {
  const token = process.env.ULTRAMSG_TOKEN;
  const instanceId = process.env.ULTRAMSG_INSTANCE_ID;
  if (!token || !instanceId || !numero.trim()) return false;

  try {
    const res = await fetch(
      `https://api.ultramsg.com/${instanceId}/messages/chat`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          token,
          to: numero.trim(),
          body: mensaje,
        }),
      },
    );
    return res.ok;
  } catch {
    return false;
  }
}
