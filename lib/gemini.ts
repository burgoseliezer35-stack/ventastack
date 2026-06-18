type ItemReconocido = { producto_id: string; cantidad: number };
type SugerenciaUpsell = { producto_id: string; razon: string };

// ¿Están prendidas las funciones de Gemini? Solo depende de si hay
// llave — si no hay, ninguna de las cuatro funciones (Voice-to-
// Order, normalizar direcciones, upselling, auditoría de caja)
// aparece o se ejecuta. El resto de la app sigue funcionando
// exactamente igual.
export function geminiDisponible(): boolean {
  return !!process.env.GEMINI_API_KEY;
}

function nombreModelo(): string {
  // Configurable por si Google renombra o retira el modelo más
  // adelante — así no hace falta tocar código, solo la variable de
  // entorno.
  return process.env.GEMINI_MODEL || "gemini-3.5-flash";
}

// Helper compartido para las llamadas que solo mandan texto (sin
// audio). Regresa el texto de la respuesta, o null si algo falló —
// nunca lanza una excepción hacia quien lo llama.
async function preguntarleATexto(prompt: string): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${nombreModelo()}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      },
    );

    if (!res.ok) return null;

    const data = await res.json();
    const texto = data.candidates?.[0]?.content?.parts?.[0]?.text;
    return typeof texto === "string" ? texto : null;
  } catch {
    return null;
  }
}

// Le mandamos a Gemini el audio + la lista de productos
// disponibles de la empresa, y le pedimos que regrese ÚNICAMENTE un
// JSON con lo que entendió. Si no hay llave, o algo falla (mala
// conexión, audio que no se entendió, respuesta rara), regresamos
// null — nunca rompe el Punto de Venta, solo significa "esta vez no
// se pudo, intenta otra vez o agrégalo a mano".
export async function interpretarPedidoDeVoz(
  audioBase64: string,
  mimeType: string,
  productos: { id: string; nombre: string }[],
): Promise<ItemReconocido[] | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || !audioBase64 || productos.length === 0) return null;

  const modelo = nombreModelo();

  const listaProductos = productos.map((p) => `${p.id} = ${p.nombre}`).join("\n");

  const prompt = `Eres un asistente de un punto de venta en México. Vas a escuchar a alguien pidiendo productos en voz alta, en español. Identifica QUÉ productos pidió y CUÁNTO de cada uno, usando ÚNICAMENTE esta lista de productos disponibles (id = nombre):

${listaProductos}

Responde ÚNICAMENTE con un arreglo JSON, sin texto adicional, sin explicación, sin backticks de markdown. Formato exacto:
[{"producto_id": "...", "cantidad": numero}]

Si menciona algo que no está en la lista, ignóralo. Si no entiendes nada, responde con un arreglo vacío: []`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt },
                { inlineData: { mimeType, data: audioBase64 } },
              ],
            },
          ],
        }),
      },
    );

    if (!res.ok) return null;

    const data = await res.json();
    const texto = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!texto || typeof texto !== "string") return null;

    // A veces los modelos envuelven el JSON en ```json ... ```
    // aunque se les pida que no — lo limpiamos por si acaso.
    const limpio = texto.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(limpio);

    if (!Array.isArray(parsed)) return null;

    const idsValidos = new Set(productos.map((p) => p.id));

    return parsed.filter(
      (item): item is ItemReconocido =>
        item &&
        typeof item.producto_id === "string" &&
        idsValidos.has(item.producto_id) &&
        typeof item.cantidad === "number" &&
        item.cantidad > 0,
    );
  } catch {
    return null;
  }
}

// Convierte los números fríos del día en un mensaje corto y
// natural en español, listo para mandar por WhatsApp. Si no hay
// llave, o algo falla, regresa null — quien llama puede mandar un
// mensaje simple armado a mano en su lugar, en vez de no mandar
// nada.
export async function escribirResumenDiario(datos: {
  fecha: string;
  totalVentas: number;
  numeroVentas: number;
  porCobrar: number;
  productosPorAgotarse: { nombre: string; stock: number }[];
}): Promise<string | null> {
  const listaProductos = datos.productosPorAgotarse.length
    ? datos.productosPorAgotarse.map((p) => `${p.nombre} (quedan ${p.stock})`).join(", ")
    : "ninguno";

  const prompt = `Escribe un resumen breve en español de México, en tono cercano y directo, para mandarlo por WhatsApp al dueño de un negocio. Información del día ${datos.fecha}:

- Ventas totales: $${datos.totalVentas.toFixed(2)}
- Número de ventas: ${datos.numeroVentas}
- Por cobrar (clientes a crédito): $${datos.porCobrar.toFixed(2)}
- Productos por agotarse: ${listaProductos}

Máximo 5 líneas, sin encabezados ni markdown, puede usar 1 o 2 emojis si encajan bien. No inventes ningún dato que no esté arriba.`;

  return await preguntarleATexto(prompt);
}
// dirección, ANTES de mandarla a geocodificar — para que Mapbox
// tenga más probabilidad de encontrarla. Nunca inventa información
// nueva, solo corrige el texto que ya existe. Si no hay llave, o
// algo falla, regresa null y quien llama debe usar la dirección
// original tal cual — nunca se pierde ni se rompe nada.
export async function normalizarDireccion(
  direccionCruda: string,
): Promise<string | null> {
  if (!direccionCruda.trim()) return null;

  const prompt = `Vas a recibir una dirección en México, posiblemente con errores de tecleo, abreviaturas, o formato irregular. Devuelve ÚNICAMENTE la misma dirección normalizada: corrige errores obvios de tecleo y expande abreviaturas comunes (ej. "col." -> "colonia", "av." -> "avenida", "edo." -> "estado"). NO agregues información que no esté en el texto original, NO inventes nada (ni colonias, ni números, ni ciudades). Si ya está bien, devuélvela igual. Responde ÚNICAMENTE con el texto de la dirección, sin explicación, sin comillas.

Dirección: ${direccionCruda}`;

  const texto = await preguntarleATexto(prompt);
  const limpio = texto?.trim();
  return limpio && limpio.length > 0 ? limpio : null;
}

// Sugiere hasta 3 productos del catálogo que combinen con lo que ya
// hay en el carrito, con una razón breve cada uno. Si no hay llave,
// la respuesta no es JSON válido, o cualquier otra cosa falla,
// regresa null — el Punto de Venta simplemente no muestra
// sugerencias esa vez, nunca se bloquea ni truena por esto.
export async function sugerirUpsell(
  nombresEnCarrito: string[],
  catalogo: { id: string; nombre: string }[],
): Promise<SugerenciaUpsell[] | null> {
  if (nombresEnCarrito.length === 0 || catalogo.length === 0) return null;

  const listaCatalogo = catalogo.map((p) => `${p.id} = ${p.nombre}`).join("\n");

  const prompt = `Eres un asistente de ventas en un punto de venta en México. Un cliente está comprando estos productos:

${nombresEnCarrito.join(", ")}

Del siguiente catálogo disponible (id = nombre), sugiere HASTA 3 productos adicionales que tengan sentido comprar junto con lo anterior (complementarios, no sustitutos del mismo producto). Si nada combina bien, regresa un arreglo vacío — no inventes sugerencias forzadas.

${listaCatalogo}

Responde ÚNICAMENTE con un arreglo JSON, sin texto adicional, sin backticks de markdown. Formato exacto:
[{"producto_id": "...", "razon": "razón breve en español, máximo 8 palabras"}]`;

  const texto = await preguntarleATexto(prompt);
  if (!texto) return null;

  try {
    const limpio = texto.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(limpio);
    if (!Array.isArray(parsed)) return null;

    const idsValidos = new Set(catalogo.map((p) => p.id));

    return parsed
      .filter(
        (item): item is SugerenciaUpsell =>
          item &&
          typeof item.producto_id === "string" &&
          idsValidos.has(item.producto_id) &&
          typeof item.razon === "string" &&
          item.razon.trim().length > 0,
      )
      .slice(0, 3);
  } catch {
    return null;
  }
}

// Revisa el cierre de una caja (fondo, movimientos, diferencia) y
// regresa una evaluación breve en español de si algo se ve fuera de
// lo normal. No es una auditoría contable formal — es una segunda
// mirada rápida para detectar algo que valga la pena confirmar a
// mano. Si no hay llave, o algo falla, regresa null — la pantalla
// de caja sigue funcionando igual, solo sin esa segunda mirada.
export async function auditarCaja(resumen: {
  fondoInicial: number;
  totalEntradas: number;
  totalSalidas: number;
  esperado: number;
  contado: number;
  diferencia: number;
  movimientos: { tipo: string; motivo: string; monto: number; nota: string | null }[];
}): Promise<string | null> {
  const listaMovimientos = resumen.movimientos
    .map(
      (m) =>
        `${m.tipo === "entrada" ? "+" : "-"}$${m.monto.toFixed(2)} (${m.motivo}${
          m.nota ? ` — ${m.nota}` : ""
        })`,
    )
    .join("\n");

  const prompt = `Eres un asistente que revisa el cierre de caja de un punto de venta en México. Aquí está el resumen del día:

Fondo inicial: $${resumen.fondoInicial.toFixed(2)}
Total de entradas: $${resumen.totalEntradas.toFixed(2)}
Total de salidas: $${resumen.totalSalidas.toFixed(2)}
Debería haber (calculado): $${resumen.esperado.toFixed(2)}
Se contó de verdad: $${resumen.contado.toFixed(2)}
Diferencia: $${resumen.diferencia.toFixed(2)}

Movimientos del día:
${listaMovimientos || "(sin movimientos)"}

Da una evaluación breve en español (máximo 3 oraciones, sin encabezados ni listas) de si algo se ve fuera de lo normal (una diferencia grande, un retiro inusual, muchos movimientos del mismo tipo, etc.) y qué valdría la pena confirmar a mano. Si todo se ve razonable, dilo así de simple, sin inventar problemas.`;

  const texto = await preguntarleATexto(prompt);
  const limpio = texto?.trim();
  return limpio && limpio.length > 0 ? limpio : null;
}
