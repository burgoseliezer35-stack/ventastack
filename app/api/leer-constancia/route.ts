import { NextRequest, NextResponse } from "next/server";

const REGIMENES = [
  { val: "601", keywords: ["General de Ley Personas Morales", "General de Ley P. Morales"] },
  { val: "603", keywords: ["Personas Morales con Fines no Lucrativos"] },
  { val: "606", keywords: ["Arrendamiento"] },
  { val: "608", keywords: ["Demás ingresos"] },
  { val: "612", keywords: ["Actividades Empresariales y Profesionales", "Actividades Empresariales"] },
  { val: "616", keywords: ["Sin obligaciones fiscales"] },
  { val: "621", keywords: ["Incorporación Fiscal"] },
  { val: "625", keywords: ["Plataformas Tecnológicas"] },
  { val: "626", keywords: ["Régimen Simplificado de Confianza", "RESICO"] },
  { val: "605", keywords: ["Sueldos y Salarios", "Salarios e Ingresos Asimilados"] },
];

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const archivo = formData.get("pdf") as File | null;
    if (!archivo) return NextResponse.json({ error: "No se recibió archivo" }, { status: 400 });

    const arrayBuffer = await archivo.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // pdf-parse funciona nativamente en Node.js sin workers
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require("pdf-parse");
    const result = await pdfParse(buffer);
    const texto: string = result.text ?? "";

    const datos: Record<string, string> = {};

    // RFC — patrón estándar SAT (4 letras + 6 dígitos + 3 alfanuméricos)
    const rfcMatch = texto.match(/\b([A-Z&Ñ]{3,4}[0-9]{6}[A-Z0-9]{3})\b/);
    if (rfcMatch) datos.rfc = rfcMatch[1].trim();

    // CP
    const cpMatch = texto.match(/[Cc]ódigo\s*[Pp]ostal[:\s]+(\d{5})/);
    if (cpMatch) datos.codigo_postal = cpMatch[1];

    // Email
    const emailMatch = texto.match(/([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})/);
    if (emailMatch) datos.email = emailMatch[1];

    // Nombre — reconstruir desde apellidos y nombre(s)
    const primerAp = texto.match(/Primer\s+Apellido[:\s]+([A-ZÁÉÍÓÚÑ\s]+?)(?=Segundo|RFC|CURP|\n)/i);
    const segundoAp = texto.match(/Segundo\s+Apellido[:\s]+([A-ZÁÉÍÓÚÑ\s]+?)(?=Nombre|RFC|CURP|\n)/i);
    const primerNombre = texto.match(/Nombre\s*\(s\)[:\s]+([A-ZÁÉÍÓÚÑ\s]+?)(?=Primer|Segundo|RFC|CURP|\n)/i);

    if (primerAp) {
      datos.nombre = [
        primerAp[1].trim(),
        segundoAp?.[1]?.trim() ?? "",
        primerNombre?.[1]?.trim() ?? "",
      ].filter(Boolean).join(" ");
    }

    // Teléfono
    const lada = texto.match(/Tel\.\s*Fijo\s*Lada[:\s]+(\d{2,3})/i);
    const numero = texto.match(/N[uú]mero[:\s]+(\d{7,10})/i);
    if (numero) {
      datos.whatsapp = lada ? lada[1].trim() + numero[1].trim() : numero[1].trim();
    }

    // Régimen
    for (const r of REGIMENES) {
      if (r.keywords.some((k) => texto.includes(k))) {
        datos.regimen_fiscal = r.val;
        break;
      }
    }

    return NextResponse.json(datos);
  } catch (e) {
    console.error("leer-constancia error:", e);
    return NextResponse.json({ error: "No se pudo leer el PDF" }, { status: 500 });
  }
}
