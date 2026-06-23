/**
 * lib/impresora.ts
 * Maneja impresoras térmicas ESC/POS vía Web Bluetooth (Android/Chrome)
 * y vía IP/WiFi (funciona en todos los navegadores incluyendo Safari/iOS).
 *
 * Comandos ESC/POS básicos:
 * https://reference.epson-biz.com/modules/ref_escpos
 */

// ── Constantes ESC/POS ──────────────────────────────────────────────────────
const ESC = 0x1b;
const GS  = 0x1d;

export const CMD = {
  INIT:           [ESC, 0x40],              // Inicializar impresora
  ALIGN_LEFT:     [ESC, 0x61, 0x00],       // Alinear izquierda
  ALIGN_CENTER:   [ESC, 0x61, 0x01],       // Alinear centro
  ALIGN_RIGHT:    [ESC, 0x61, 0x02],       // Alinear derecha
  BOLD_ON:        [ESC, 0x45, 0x01],       // Negrita on
  BOLD_OFF:       [ESC, 0x45, 0x00],       // Negrita off
  DOUBLE_ON:      [GS,  0x21, 0x11],       // Doble tamaño
  DOUBLE_OFF:     [GS,  0x21, 0x00],       // Tamaño normal
  CUT:            [GS,  0x56, 0x41, 0x10], // Cortar papel (parcial)
  FEED:           [ESC, 0x64, 0x04],       // Avanzar 4 líneas
  OPEN_DRAWER:    [ESC, 0x70, 0x00, 0x19, 0xfa], // Abrir cajón de dinero
};

// ── Tipos ────────────────────────────────────────────────────────────────────
export type ConfigImpresora = {
  tipo: "bluetooth" | "wifi" | "ninguna";
  nombre?: string;         // nombre del dispositivo BT
  deviceId?: string;       // ID del dispositivo BT guardado
  ip?: string;             // IP para WiFi (ej: 192.168.1.100)
  puerto?: number;         // Puerto WiFi (default 9100)
  anchoPapel: 58 | 72 | 80;
};

export type LineaTicket = {
  tipo: "titulo" | "subtitulo" | "linea" | "separador" | "total" | "normal";
  texto?: string;
  izq?: string;
  der?: string;
};

// ── Encoder ─────────────────────────────────────────────────────────────────
function encoderTexto(texto: string): Uint8Array {
  // Reemplaza caracteres especiales del español por equivalentes ASCII
  const limpio = texto
    .replace(/á/g, "a").replace(/é/g, "e").replace(/í/g, "i")
    .replace(/ó/g, "o").replace(/ú/g, "u").replace(/Á/g, "A")
    .replace(/É/g, "E").replace(/Í/g, "I").replace(/Ó/g, "O")
    .replace(/Ú/g, "U").replace(/ñ/g, "n").replace(/Ñ/g, "N")
    .replace(/ü/g, "u").replace(/Ü/g, "U");
  return new TextEncoder().encode(limpio + "\n");
}

function separador(ancho: number): string {
  return "-".repeat(ancho);
}

function lineaDosColumnas(izq: string, der: string, ancho: number): string {
  const espacios = Math.max(1, ancho - izq.length - der.length);
  return izq + " ".repeat(espacios) + der;
}

// ── Generador de bytes del ticket ────────────────────────────────────────────
export function generarBytesTicket(
  lineas: LineaTicket[],
  anchoPapel: 58 | 72 | 80,
  abrirCajon = false
): Uint8Array {
  const ANCHO = anchoPapel === 58 ? 32 : anchoPapel === 72 ? 40 : 48;
  const partes: Uint8Array[] = [];

  const cmd = (bytes: number[]) => partes.push(new Uint8Array(bytes));
  const txt = (texto: string) => partes.push(encoderTexto(texto));

  cmd(CMD.INIT);
  cmd(CMD.ALIGN_LEFT);

  for (const linea of lineas) {
    switch (linea.tipo) {
      case "titulo":
        cmd(CMD.ALIGN_CENTER);
        cmd(CMD.BOLD_ON);
        cmd(CMD.DOUBLE_ON);
        txt(linea.texto ?? "");
        cmd(CMD.DOUBLE_OFF);
        cmd(CMD.BOLD_OFF);
        cmd(CMD.ALIGN_LEFT);
        break;
      case "subtitulo":
        cmd(CMD.ALIGN_CENTER);
        txt(linea.texto ?? "");
        cmd(CMD.ALIGN_LEFT);
        break;
      case "separador":
        txt(separador(ANCHO));
        break;
      case "total":
        cmd(CMD.BOLD_ON);
        txt(lineaDosColumnas(linea.izq ?? "TOTAL", linea.der ?? "", ANCHO));
        cmd(CMD.BOLD_OFF);
        break;
      case "linea":
        txt(lineaDosColumnas(linea.izq ?? "", linea.der ?? "", ANCHO));
        break;
      case "normal":
        txt(linea.texto ?? "");
        break;
    }
  }

  cmd(CMD.FEED);
  cmd(CMD.CUT);

  if (abrirCajon) {
    cmd(CMD.OPEN_DRAWER);
  }

  // Concatenar todos los bytes
  const total = partes.reduce((s, p) => s + p.length, 0);
  const resultado = new Uint8Array(total);
  let offset = 0;
  for (const parte of partes) {
    resultado.set(parte, offset);
    offset += parte.length;
  }

  return resultado;
}

// ── Web Bluetooth ─────────────────────────────────────────────────────────────
const BLUETOOTH_SERVICE  = "000018f0-0000-1000-8000-00805f9b34fb";
const BLUETOOTH_CHAR     = "00002af1-0000-1000-8000-00805f9b34fb";
// Algunos modelos usan el servicio serial estándar:
const BT_SERIAL_SERVICE  = "00001101-0000-1000-8000-00805f9b34fb";

export async function conectarBluetooth(): Promise<{
  ok: boolean;
  nombre?: string;
  deviceId?: string;
  error?: string;
}> {
  if (!navigator.bluetooth) {
    return { ok: false, error: "Este navegador no soporta Bluetooth. Usa Chrome en Android." };
  }

  try {
    const device = await navigator.bluetooth.requestDevice({
      filters: [
        { services: [BLUETOOTH_SERVICE] },
        { services: [BT_SERIAL_SERVICE] },
        { namePrefix: "Printer" },
        { namePrefix: "POS" },
        { namePrefix: "RPP" },
        { namePrefix: "MTP" },
        { namePrefix: "Xprinter" },
      ],
      optionalServices: [BLUETOOTH_SERVICE, BT_SERIAL_SERVICE],
    });

    return {
      ok: true,
      nombre: device.name ?? "Impresora",
      deviceId: device.id,
    };
  } catch (e) {
    const msg = String(e);
    if (msg.includes("cancelled")) return { ok: false, error: "Cancelado" };
    return { ok: false, error: msg };
  }
}

export async function imprimirBluetooth(
  bytes: Uint8Array,
  deviceId?: string
): Promise<{ ok: boolean; error?: string }> {
  if (!navigator.bluetooth) {
    return { ok: false, error: "Bluetooth no disponible" };
  }

  try {
    // Solicitar el dispositivo de nuevo (Web Bluetooth requiere re-conexión)
    const device = await navigator.bluetooth.requestDevice({
      filters: [
        { services: [BLUETOOTH_SERVICE] },
        { services: [BT_SERIAL_SERVICE] },
        { namePrefix: "Printer" },
        { namePrefix: "POS" },
        { namePrefix: "Xprinter" },
      ],
      optionalServices: [BLUETOOTH_SERVICE, BT_SERIAL_SERVICE],
    });

    const server = await device.gatt?.connect();
    if (!server) return { ok: false, error: "No se pudo conectar al GATT" };

    let characteristic: BluetoothRemoteGATTCharacteristic | null = null;

    // Intentar con el servicio de impresora primero
    try {
      const service = await server.getPrimaryService(BLUETOOTH_SERVICE);
      characteristic = await service.getCharacteristic(BLUETOOTH_CHAR);
    } catch {
      // Intentar con serial
      try {
        const service = await server.getPrimaryService(BT_SERIAL_SERVICE);
        const chars = await service.getCharacteristics();
        characteristic = chars.find((c: BluetoothRemoteGATTCharacteristic) => c.properties.write || c.properties.writeWithoutResponse) ?? null;
      } catch { /* sin éxito */ }
    }

    if (!characteristic) {
      await device.gatt?.disconnect();
      return { ok: false, error: "No se encontró la característica de escritura" };
    }

    // Enviar en chunks de 512 bytes (límite BT)
    const CHUNK = 512;
    for (let i = 0; i < bytes.length; i += CHUNK) {
      const chunk = bytes.slice(i, i + CHUNK);
      if (characteristic.properties.writeWithoutResponse) {
        await characteristic.writeValueWithoutResponse(chunk);
      } else {
        await characteristic.writeValue(chunk);
      }
      // Pequeña pausa entre chunks
      await new Promise(r => setTimeout(r, 50));
    }

    await device.gatt?.disconnect();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

// ── WiFi / IP (funciona en iOS también) ──────────────────────────────────────
export async function imprimirWifi(
  bytes: Uint8Array,
  ip: string,
  puerto = 9100
): Promise<{ ok: boolean; error?: string }> {
  try {
    // Convertimos los bytes a base64 y los mandamos a nuestra API proxy
    const base64 = btoa(String.fromCharCode(...bytes));
    const res = await fetch("/api/imprimir-wifi", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ip, puerto, datos: base64 }),
    });

    if (!res.ok) {
      const { error } = await res.json().catch(() => ({ error: "Error desconocido" }));
      return { ok: false, error };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

// ── Abrir cajón sin imprimir ──────────────────────────────────────────────────
export async function abrirCajonDinero(config: ConfigImpresora): Promise<void> {
  const bytes = new Uint8Array([...CMD.OPEN_DRAWER]);
  if (config.tipo === "bluetooth") {
    await imprimirBluetooth(bytes, config.deviceId);
  } else if (config.tipo === "wifi" && config.ip) {
    await imprimirWifi(bytes, config.ip, config.puerto);
  }
}
