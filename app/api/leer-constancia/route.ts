// API route del servidor — aquí pdfjs-dist funciona sin problemas con Turbopack
import { NextRequest, NextResponse } from "next/server";

// Palabras clave que aparecen en la constancia del SAT — múltiples variantes
const REGIMENES = [
  { val: "601", keywords: ["General de Ley Personas Morales", "General de Ley P. Morales"] },
  { val: "603", keywords: ["Personas Morales con Fines no Lucrativos"] },
  { val: "606", keywords: ["Arrendamiento"] },
  { val: "608", keywords: ["Demás ingresos"] },
  { val: "612", keywords: ["Actividades Empresariales y Profesionales", "Actividades Empresariales", "Act. Empresariales"] },
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

    // Importar pdfjs en el servidor — funciona sin Turbopack issues
    const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.js" as string);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pdfjs = (pdfjsLib as any).default ?? pdfjsLib;
    pdfjs.GlobalWorkerOptions.workerSrc = "";

    const pdf = await pdfjs.getDocument({ data: new Uint8Array(arrayBuffer), useWorkerFetch: false, isEvalSupported: false }).promise;

    let texto = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      texto += content.items.map((item: any) => item.str ?? "").join(" ") + "\n";
    }

    const datos: Record<string, string> = {};

    // RFC
    const rfcMatch = texto.match(/([A-Z&Ñ]{3,4}[0-9]{6}[A-Z0-9]{3})/);
    if (rfcMatch) datos.rfc = rfcMatch[1].trim();

    // CP
    const cpMatch = texto.match(/[Cc]ódigo\s*[Pp]ostal[:\s]+(\d{5})/);
    if (cpMatch) datos.codigo_postal = cpMatch[1];

    // Email
    const emailMatch = texto.match(/([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})/);
    if (emailMatch) datos.email = emailMatch[1];

    // Nombre completo — buscar apellidos + nombre
    const primerAp = texto.match(/Primer\s+Apellido[:\s]+([A-ZÁÉÍÓÚÑ]+)/i);
    const segundoAp = texto.match(/Segundo\s+Apellido[:\s]+([A-ZÁÉÍÓÚÑ]+)/i);
    const primerNombre = texto.match(/Nombre\s*\(s\)[:\s]+([A-ZÁÉÍÓÚÑ\s]+?)(?:\s{2,}|Primer|RFC|$)/i);
    if (primerAp) {
      datos.nombre = [
        primerAp[1].trim(),
        segundoAp?.[1]?.trim() ?? "",
        primerNombre?.[1]?.trim() ?? "",
      ].filter(Boolean).join(" ");
    }

    // Régimen — buscar por palabras clave, múltiples variantes
    for (const r of REGIMENES) {
      if (r.keywords.some((k) => texto.includes(k))) {
        datos.regimen_fiscal = r.val;
        break;
      }
    }

    // Email — puede estar en cualquier página
    const emailMatch2 = texto.match(/Correo\s+Electr[oó]nico[:\s]+([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})/i);
    if (emailMatch2 && !datos.email) datos.email = emailMatch2[1];

    // Teléfono — buscar "Número:" seguido de dígitos (página 2)
    const telMatch = texto.match(/N[uú]mero[:\s]+(\d{7,10})/i);
    if (telMatch) {
      const lada = texto.match(/Tel\.\s*Fijo\s*Lada[:\s]+(\d{2,3})/i);
      datos.whatsapp = lada ? lada[1] + telMatch[1] : telMatch[1];
    }

    return NextResponse.json(datos);
  } catch (e) {
    console.error("leer-constancia error:", e);
    return NextResponse.json({ error: "No se pudo leer el PDF" }, { status: 500 });
  }
}
