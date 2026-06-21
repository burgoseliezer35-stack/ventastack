/**
 * Formatea un número con comas para miles y punto para decimales.
 * Ejemplo: 1234567.89 → "1,234,567.89"
 */
export function formatearDinero(valor: number, decimales = 2): string {
  return valor.toLocaleString("en-US", {
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  });
}

/**
 * Formatea un número entero con comas para miles.
 * Ejemplo: 1234 → "1,234"
 */
export function formatearNumero(valor: number): string {
  return valor.toLocaleString("en-US");
}

/**
 * Convierte un string con formato (comas/puntos) a number.
 * Ejemplo: "1,234.50" → 1234.50
 */
export function parsearNumero(texto: string): number {
  const limpio = texto.replace(/,/g, "");
  const num = parseFloat(limpio);
  return isNaN(num) ? 0 : num;
}
