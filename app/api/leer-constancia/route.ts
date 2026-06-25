// API route del servidor — aquí pdfjs-dist funciona sin problemas con Turbopack
import { NextRequest, NextResponse } from "next/server";

const REGIMENES = [
  { val: "601", label: "General de Ley Personas Morales" },
  { val: "603", label: "Personas Morales con Fines no Lucrativos" },
  { val: "606", label: "Arrendamiento" },
  { val: "608", label: "Demás ingresos" },
  { val: "612", label: "Personas Físicas con Actividades Empresariales" },
  { val: "616", label: "Sin obligaciones fiscales" },
  { val: "621", label: "Incorporación Fiscal" },
  { val: "625", label: "Plataformas Tecnológicas" },
  { val: "626", label: "RESICO" },
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

    // Régimen
    for (const r of REGIMENES) {
      if (texto.includes(r.label)) {
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
