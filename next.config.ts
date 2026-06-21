import type { NextConfig } from "next";

// Lista exacta de lo que el NAVEGADOR llama directamente (no lo que
// llama el servidor — Mapbox y Gemini corren del lado del servidor,
// así que no necesitan permiso aquí):
// - Supabase: para iniciar sesión y leer/escribir datos.
// - OpenStreetMap: las imágenes del mapa en vivo de "Ver rutas".
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https://*.tile.openstreetmap.org https://images.openfoodfacts.org https://static.openfoodfacts.org",
  "connect-src 'self' https://*.supabase.co",
  "font-src 'self' data:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // Aplica a TODO el sitio, no solo a una ruta.
        source: "/(.*)",
        headers: [
          {
            // Obliga a usar HTTPS siempre, incluso si alguien escribe
            // http:// a mano — 2 años, incluyendo subdominios.
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            // Nadie puede meter Ventastack dentro de un iframe en
            // otro sitio (protege contra clickjacking).
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            // El navegador no debe "adivinar" el tipo de un archivo
            // distinto al que el servidor dice que es.
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            // No manda la URL completa de origen a otros sitios
            // cuando se sale de Ventastack por un enlace.
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            // Apaga cámara/pago/usb (no se usan), pero deja
            // encendidos ubicación y micrófono SOLO para este mismo
            // sitio — los necesitan "Ver rutas" y "Hablar pedido".
            key: "Permissions-Policy",
            value: "geolocation=(self), microphone=(self), camera=(), payment=(), usb=()",
          },
          {
            key: "Content-Security-Policy",
            value: csp,
          },
        ],
      },
    ];
  },
};

export default nextConfig;
