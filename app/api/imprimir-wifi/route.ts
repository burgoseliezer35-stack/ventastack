import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import net from "net";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { ip, puerto = 9100, datos } = await request.json();

  if (!ip || !datos) {
    return NextResponse.json({ error: "Falta IP o datos" }, { status: 400 });
  }

  // Validar IP básica
  const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (!ipRegex.test(ip)) {
    return NextResponse.json({ error: "IP inválida" }, { status: 400 });
  }

  // Convertir base64 a Buffer
  const bytes = Buffer.from(datos, "base64");

  return new Promise<NextResponse>((resolve) => {
    const socket = new net.Socket();
    const TIMEOUT = 5000; // 5 segundos

    socket.setTimeout(TIMEOUT);

    socket.connect(Number(puerto), ip, () => {
      socket.write(bytes, () => {
        socket.destroy();
        resolve(NextResponse.json({ ok: true }));
      });
    });

    socket.on("timeout", () => {
      socket.destroy();
      resolve(NextResponse.json(
        { error: `No se pudo conectar a ${ip}:${puerto} — verifica que la impresora esté encendida y en la misma red` },
        { status: 504 }
      ));
    });

    socket.on("error", (err) => {
      socket.destroy();
      resolve(NextResponse.json(
        { error: `Error de conexión: ${err.message}` },
        { status: 500 }
      ));
    });
  });
}
