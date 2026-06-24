/**
 * Convierte una URL de imagen externa a través del proxy interno.
 * Evita problemas de CORS y CSP en Safari/iOS.
 * Si la URL ya es local (data:, /, blob:) la devuelve sin cambios.
 */
export function imgUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  // Ya es local — no necesita proxy
  if (url.startsWith("data:") || url.startsWith("/") || url.startsWith("blob:")) {
    return url;
  }
  // URL externa — pasar por proxy
  return `/api/img?url=${encodeURIComponent(url)}`;
}
