// Proxy de imágenes externas — evita problemas de CORS y CSP en iOS/Safari
// Uso: /api/img?url=https://images.openfoodfacts.org/...
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get("url");

  if (!url) {
    return new NextResponse("Falta url", { status: 400 });
  }

  // Solo permitimos dominios conocidos de las APIs que usamos
  const dominiosPermitidos = [
    "openfoodfacts.org",
    "openfoodfacts.net",
    "openbeautyfacts.org",
    "openproductsfacts.org",
    "openpetfoodfacts.org",
    "upcitemdb.com",
    "go-upc.com",
    "barcodespider.com",
    "buycott.com",
    "instacart.com",
  ];

  let urlObj: URL;
  try {
    urlObj = new URL(url);
  } catch {
    return new NextResponse("URL inválida", { status: 400 });
  }

  const dominioOk = dominiosPermitidos.some((d) => urlObj.hostname.endsWith(d));
  if (!dominioOk) {
    return new NextResponse("Dominio no permitido", { status: 403 });
  }

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Ventastack/1.0" },
      next: { revalidate: 86400 }, // cache 24h en el servidor
    });

    if (!res.ok) {
      return new NextResponse("No encontrada", { status: 404 });
    }

    const contentType = res.headers.get("content-type") ?? "image/jpeg";
    const buffer = await res.arrayBuffer();

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      },
    });
  } catch {
    return new NextResponse("Error al cargar imagen", { status: 502 });
  }
}
