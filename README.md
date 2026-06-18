# Ventastack — Login, registro e invitaciones conectados a Supabase

## Qué es esto

Un proyecto de Next.js con el flujo completo de cuentas y ventas ya
conectado a Supabase:

- Alguien se registra en /auth/sign-up -> se crea su empresa nueva
  y queda como "admin" (trigger en supabase/migrations/004).
- El admin invita por correo a un cajero o vendedor desde
  /protected/equipo -> esa persona se une a la MISMA empresa, sin
  crear una nueva (trigger en supabase/migrations/005).
- El admin agrega productos y clientes (/protected/productos,
  /protected/clientes).
- Cualquiera de la empresa puede vender desde /protected/pos: el
  carrito, el cliente (opcional) y el método de pago, todo
  registrado en un solo paso atómico (supabase/migrations/006).
- El admin asigna cada cliente a un vendedor desde
  /protected/clientes; cada vendedor solo ve a LOS SUYOS en
  /protected/mis-clientes, con buscador (supabase/migrations/007 y 008).
- Las direcciones de los clientes se ubican solas en el mapa
  (Mapbox), y el vendedor puede hacer check-in desde su celular —
  el SERVIDOR calcula la distancia real y bloquea si está a más de
  50 metros (supabase/migrations/009).
- Cada venta del POS termina en un recibo imprimible con código QR,
  con el ancho de un ticket térmico (botón "Imprimir" -> diálogo de
  impresión normal del navegador).
- El admin puede editar productos y clientes ya existentes
  (/protected/productos/[id]/editar y /protected/clientes/[id]/editar),
  e importar el catálogo de golpe desde un Excel.
- /protected/pedidos muestra el historial de ventas, y
  /protected/reportes (solo admin) resume ventas de hoy, del mes,
  por método de pago, y los productos más vendidos.
- Todas las páginas dentro de /protected ahora comparten una barra
  de navegación fija arriba (logo, accesos con ícono según tu rol,
  botón de cerrar sesión) y un sistema de colores propio en vez del
  gris/verde genérico de Tailwind por defecto.

## Sobre el diseño (cambió otra vez, a propósito)

Le diste vuelta al diseño: ahora es un menú lateral (sidebar) en
vez de la barra de arriba, con tarjetas de conteo en el dashboard,
en una paleta gris/petróleo en vez del vino de la vuelta pasada.
En celular el menú se vuelve un cajón que se abre con el ícono de
hamburguesa (☰) arriba a la derecha; en pantalla ancha queda fijo
a la izquierda, como en tu foto de referencia.

Una aclaración honesta: tu foto de referencia tiene tarjetas para
cosas que TODAVÍA no construimos (Cajas, Proveedores, Categorías,
Devoluciones, Kardex...) — el dashboard de Ventastack solo muestra
tarjetas de lo que sí existe hoy (Catálogo, Clientes, Ventas,
Equipo), con sus conteos reales. No quise poner tarjetas de adorno
que no lleven a ningún lado.

## Categorías y menú con grupos (nuevo)

Ahora el catálogo se puede organizar por categoría (Bebidas,
Abarrotes, Limpieza...). Crear/editar un producto te deja elegir
una categoría opcional; "Administrar categorías" (desde Catálogo)
te deja crear y borrar categorías. Si borras una categoría, sus
productos NO se borran ni se bloquean, solo se quedan sin
categoría.

Como el menú lateral ya iba a crecer, lo cambié para soportar
grupos que se abren y cierran (con flechita que gira) — "Productos"
ahora es un grupo con "Catálogo" y "Categorías" adentro. Esto nos
deja espacio para que "Compras" o "Ventas" se conviertan en grupos
similares más adelante, sin que el menú se vuelva una sola columna
larguísima.

**Sobre tu repo de referencia:** revisé el CSS real de
github.com/Carlos007007/VENTAS (proyecto educativo de código
abierto, licencia MIT — por eso podemos tomar ideas de su CSS sin
problema). Encontré algo que vale la pena que sepas: su tema de
colores real es azul índigo (#3F51B5), no el petróleo/teal de tu
foto — el teal probablemente venía de los íconos ilustrados
(imágenes), no del CSS. Dejé el teal que ya tenías (coincide con tu
foto, y ya lo aprobaste), pero sí tomé de ese repo el patrón
estructural del menú con submenús desplegables, que es lo que
implementé arriba.

## Cuatro puertas de entrada (actualizado)

Antes había un solo login para todo el mundo, con un enlace para
"crear tu negocio" abierto a cualquiera. Eso ya se quitó — ahora
crear un negocio nuevo solo lo puede hacer el administrador
general, desde el panel de reseller (/reseller/nueva-empresa).

Ahora hay cuatro entradas separadas, cada una con su propia URL:

- `/auth/login` — para tu negocio (admin, cajero). Sin enlace de
  "crear cuenta".
- `/auth/gpanel` — acceso de administrador, te lleva a tu panel
  completo (Catálogo, Categorías, Clientes, Equipo, Reportes, POS,
  Historial — todo lo que ya construimos).
- `/auth/vendedor` — para el equipo en ruta.
- `/auth/gpanelsuperadmin` (nueva) — tu entrada personal como dueño
  de la plataforma, directo al panel de reseller. A diferencia de
  las otras tres, esta SÍ es estricta: si la cuenta no tiene la
  bandera de superadmin prendida, no la deja pasar (cierra la
  sesión y muestra un error), aunque la contraseña sea correcta —
  es la única de las cuatro pensada como una barrera real, no solo
  un enlace cómodo.

Las otras tres usan el mismo formulario por dentro (es el mismo
sistema de login de Supabase), y después de entrar, cada quien
llega a donde le toca según quién ES de verdad — no según cuál
puerta usó, porque /protected y /reseller ya revisan el permiso
real por su cuenta.

**Sobre configurar qué ve cada rol en el dashboard, desde el
gpanel:** sí se puede construir, pero es una pieza con su propio
tamaño — hay que decidir primero qué tan configurable (¿qué
tarjetas se ven? ¿en qué orden? ¿por empresa o por rol?) antes de
construirla. La dejo pendiente para que la diseñemos juntos en otra
vuelta, en vez de adivinar el alcance ahora.

## Importante: borra el archivo "middleware" viejo de tu repo (nuevo)

Si te salió este error al subir esta versión a Vercel:

> Both middleware file "./middleware.js" and proxy file "./proxy.ts"
> are detected. Please use "./proxy.ts" only.

Eso significa que tu repositorio en GitHub todavía tiene un archivo
`middleware.js` (o `middleware.ts`) de hace varias vueltas, de
antes de que renombráramos eso a `proxy.ts`. Yo nunca puedo borrar
algo de tu repo — cada vuelta solo te entrego un zip con los
archivos correctos, pero si solo copias y pegas encima sin borrar
lo viejo, los archivos que ya no usamos se quedan ahí para siempre.

Cómo arreglarlo (elige una):

- **Desde GitHub.com:** entra a tu repositorio, busca un archivo
  llamado `middleware.js` o `middleware.ts` en la raíz del
  proyecto (al mismo nivel que `proxy.ts`), ábrelo, y usa el bote
  de basura para borrarlo. Confirma el commit.
- **Desde tu computadora:** en la carpeta de tu proyecto, corre
  `dir middleware*` (Windows) para ver si existe, y si aparece,
  bórralo con `del middleware.js` (o el nombre exacto que
  encuentres), luego `git add -A`, `git commit -m "quitar
  middleware viejo"`, `git push`.

Después de eso, vuelve a desplegar en Vercel y el build debería
pasar.

## Panel de reseller (nuevo)

Esto es nuevo: una puerta SEPARADA, `/reseller`, solo para ti como
dueño de la plataforma — nunca se mezcla con `/protected` (el panel
de cada negocio cliente). Ahí puedes:

- Dar de alta un negocio nuevo (crea la empresa e invita a su
  admin de un jalón — esa persona nunca se entera de que tú
  existes como reseller, para ella es solo su negocio).
- Ver cuánto le cobras a cada uno al mes, y cambiarlo cuando
  quieras.
- Registrar los pagos que te hacen, y ver tus ingresos del mes y
  totales.
- Desactivar a quien no pague (les bloquea el acceso a TODA la
  app, sin borrar nada de su información), y reactivar — pagar
  reactiva automático, igual que el crédito de los clientes.

**Para que tú puedas entrar ahí**, después de correr el SQL nuevo
(010, ver abajo), necesitas un paso extra a mano: abre el SQL
Editor de Supabase y corre

```sql
select id, email from auth.users;
```

busca tu correo, copia su `id`, y corre:

```sql
update profiles set es_superadmin = true where id = 'pega-aqui-tu-uuid';
```

Después de eso, te va a aparecer un link de "Panel de reseller →"
en tu dashboard normal de `/protected`.

## Sobre el error "Invalid API key" que te salió en "Invitar a tu equipo"

Eso no es un bug del código — es casi seguro que `SUPABASE_SECRET_KEY`
no está bien puesta en Vercel. Revisa:

1. En tu proyecto de Vercel: Settings -> Environment Variables.
2. ¿Existe `SUPABASE_SECRET_KEY` ahí? Si no, ese es el problema —
   agrégala (Supabase Dashboard -> Settings -> API Keys -> pestaña
   "Secret keys", copia el valor que empieza con `sb_secret_`).
3. Si ya existe, ábrela y compárala letra por letra contra la de
   Supabase — es muy fácil que al copiar desde el celular se cuele
   un espacio extra al principio o al final.
4. IMPORTANTE: cambiar una variable de entorno en Vercel no
   actualiza sola la versión que ya está publicada. Después de
   guardarla, ve a la pestaña "Deployments", abre los tres puntitos
   del último deploy, y dale "Redeploy".



## Inventario y kardex (nuevo)

Ahora cada producto tiene una cantidad real en existencia
(`stock`), y CADA cambio de esa cantidad queda anotado en una
bitácora que nunca se borra — el kardex.

- Un producto nuevo arranca SIEMPRE en 0. La cantidad inicial real
  se entra con "Ajustar" (en Catálogo), nunca al crearlo — así el
  kardex jamás tiene un hueco: el stock es, sin excepción, la suma
  de su propio historial.
- Vender en el Punto de Venta resta el stock solo, y lo anota en el
  kardex como "salida, venta". Si pides más de lo que hay, la base
  de datos rechaza TODA la venta (no se queda "vendida a medias").
- "Ajustar" (mercancía que llega, una merma, un conteo que no
  cuadraba) suma o resta a mano, con una nota, y también queda en
  el kardex.
- "Kardex" en cada producto te deja ver su historial completo de
  movimientos.

**Probé esto de verdad, no solo lo escribí:** instalé un Postgres
en mi propia computadora, corrí las 11 migraciones completas de
punta a punta, y simulé ventas y ajustes reales — incluyendo
intentar vender más de lo que hay (lo rechaza, como debe) y
intentar ajustar a negativo (lo rechaza también). Los números
cuadraron en cada paso.

**Algo que encontré de paso, y ya corregí:** tu carpeta
`supabase/migrations` no tenía los archivos 001, 002 y 003 — nunca
se habían guardado ahí (aunque tú sí los corriste a mano en
Supabase hace tiempo, así que tu base de datos real está bien).
Los reconstruí y ya están en el zip — si alguna vez necesitas
armar un proyecto de Supabase desde cero, ahora sí tienes los 11
completos.



(Nota: si ya tenías este proyecto corriendo, esto no cambió desde
la vuelta anterior, ya tienes hechos estos pasos — salvo el paso 1,
que sí tiene una migración nueva: la 010.)

## Corrección: el panel mostraba "Usuario" en vez de tu nombre real (nuevo)

Si entraste y viste el dashboard con tu nombre como "Usuario", tu
rol como "—", y solo 3 opciones en el menú (en vez de todo lo que
ya tienes como admin) — eso era un error real, no algo de las
nuevas puertas de entrada. La consulta que carga tu perfil pedía
tu empresa "incrustada" en el mismo paso (una técnica de Supabase
llamada *embed*), y si ese paso combinado fallaba por cualquier
motivo, el código ignoraba el error y se caía en silencio a esos
valores de repuesto, sin avisar.

Ya separé esa consulta en dos pasos simples, y si algo de verdad
falla ahora, vas a ver un mensaje de error claro en pantalla (con
tu ID de usuario) en vez de un dashboard vacío. Si después de subir
esta versión sigues viendo algo raro, copia exactamente ese mensaje
de error y mándamelo.

Para revisar directamente en Supabase que tu cuenta esté bien
armada, puedes correr esto en el SQL Editor (cambia el correo por
el tuyo):

```sql
select p.id, p.full_name, p.role, p.company_id, p.es_superadmin, c.name as empresa
from profiles p
left join companies c on c.id = p.company_id
where p.id = (select id from auth.users where email = 'TU-CORREO-AQUI');
```

Si esa fila muestra `role = 'admin'`, vas a ver el dashboard
completo (Catálogo, Categorías, Clientes, Equipo, Reportes, POS,
Historial) — eso es exactamente "todos los menús" que ya
construimos, sin necesitar nada del panel de reseller aparte.

## Proveedores y compras (nuevo)

Hasta ahora la única forma de subir el stock era "Ajustar" a mano.
Ahora hay una segunda puerta, formal: registrar una compra real a
un proveedor.

- "Proveedores" (dentro del grupo Compras): agregar/borrar
  proveedores. Si un proveedor ya tiene compras registradas, no se
  puede borrar — se queda el historial intacto a propósito.
- "Compras > Historial": cada compra registrada, con su proveedor,
  fecha y total. Tócala para ver el detalle (qué se compró, cuánto,
  a qué costo).
- "Registrar compra": eliges proveedor, vas agregando productos con
  su cantidad y costo, y al confirmar sube el stock de cada uno y
  lo anota en el kardex — todo en una sola operación, igual que las
  ventas: o se registra completa, o no se registra nada.

El costo de cada compra ya se queda guardado (`costo_unitario` en
`detalle_compras`) aunque todavía no lo usemos para nada — es la
pieza que necesitaremos después para "reportes de ganancia real"
(venta menos costo), cuando lleguemos a esa parte de tu lista.

## Caja (nuevo)

Control de efectivo, con la pieza automática que platicamos: una
venta en efectivo ya no hay que volver a anotarla a mano, se anota
sola.

- "Abrir caja": pones el fondo inicial (lo que arrancas con en el
  cajón). Solo puede haber una caja abierta a la vez por empresa.
- Mientras está abierta: ves cuánto debería haber EN ESTE MOMENTO
  (fondo + entradas - salidas, calculado solo), la lista de
  movimientos del día, y puedes registrar retiros o depósitos
  manuales (para cambio, gastos chicos, etc.).
- Las ventas en efectivo del Punto de Venta aparecen ahí solas,
  sin que nadie las escriba dos veces.
- "Cerrar caja": cuentas el efectivo físico, lo anotas, y el
  sistema calcula la diferencia solo (sobrante o faltante) —
  nadie suma a mano.
- "Historial": todas las cajas pasadas, con su diferencia a la
  vista; tócala para ver el detalle completo de movimientos.

Visible para admin y cajero — el vendedor en ruta no la ve, porque
no maneja una caja física.

Probé esto contra Postgres real antes de entregarlo: abrí caja con
$500, vendí $92.50 en efectivo (se anotó sola, sin que yo la
insertara), retiré $200 a mano, y cerré contando $390 — el sistema
calculó la diferencia exacta (-$2.50) solo. También confirmé que
no se puede abrir una segunda caja mientras hay una abierta.

Pendiente, lo platicamos antes de construir esto: todavía no existe
una pantalla para registrar un "cobro" (cliente pagando su deuda a
crédito) — por eso un cobro en efectivo no se anota en caja
todavía. Es la siguiente pieza natural si quieres que la caja
refleje TODO el efectivo real, no solo las ventas.

## Devoluciones (nuevo)

Esta es la pieza que conecta tres cosas que ya existían, en un
solo paso — justo la automatización que platicamos antes de
construirla.

- Desde "Historial de ventas", cada venta tiene un enlace
  "Devolver" (solo admin y cajero lo ven).
- Eliges cuánto se devuelve de cada producto de esa venta — puede
  ser parcial, y no te deja devolver más de lo que de verdad
  queda disponible (cuenta devoluciones anteriores de ese mismo
  pedido, para no devolver lo mismo dos veces).
- Al confirmar, TODO se mueve junto, sin que tengas que ir a otro
  lado: el stock del producto sube (igual que con una compra), si
  la venta original era a crédito la deuda del cliente baja sola,
  y si era en efectivo y hay una caja abierta, la salida de caja
  se anota sola.
- "Devoluciones" en el menú te deja ver el historial completo, y
  cada una muestra exactamente qué se ajustó solo.

Probé las tres conexiones contra Postgres real antes de
entregarlo: una venta a crédito de $370, devolví 8 de 20 unidades
($148) y el saldo del cliente bajó exacto a $222, con el stock
subiendo igual de exacto. Por separado, una venta en efectivo de
$55.50 devuelta con una caja abierta anotó la salida exacta sola.
También confirmé que devolver más de lo que queda disponible se
rechaza limpio, sin tocar nada.

## Ganancia real y cotizaciones (nuevo)

Dos cosas en esta vuelta, una conectada a lo que ya teníamos y
otra completamente nueva e independiente.

**Ganancia real**: en Reportes ahora hay una tarjeta de "Ganancia
del mes" (venta menos costo), calculada sola — ya resta también lo
que se devolvió ese mes, para no contar como ganancia algo que el
cliente regresó. Cómo funciona por dentro: cada vez que registras
una compra, el costo de ese producto se actualiza solo al precio
de esa compra (columna `costo` en productos). Aviso honesto sobre
la limitación: se usa el costo MÁS RECIENTE, no el costo exacto
que tenía el producto el día que se vendió — si compraste algo a
$10 en enero y a $12 en marzo, una venta de enero se reporta con
los $12. Para un negocio chico es una aproximación razonable; si
algún producto nunca se compró por "Compras" (solo por "Ajustar"),
su costo es $0 y la ganancia para ese producto se ve inflada — el
reporte te avisa cuando esto pasa.

**Cotizaciones**: un documento de precios para un cliente antes de
que decida comprar — no mueve stock, ni caja, ni nada, solo es una
propuesta. A diferencia del Punto de Venta, el precio de cada
producto se puede ajustar a mano (una cotización puede llevar un
precio distinto al de catálogo), y se le puede poner una fecha de
vigencia. Visible para todos los roles, no solo admin — cualquiera
que atienda a un cliente puede necesitar dar un precio.

Probé ambas cosas contra Postgres real: una compra a $14.75 subió
el costo del producto solo (antes estaba en $0), y una cotización
de 5 unidades a $20 se registró con su total correcto sin tocar el
stock para nada.

## Código de barras, mayoreo, y verificador de precios (nuevo)

Con esto, todo tu módulo original queda construido — solo falta
facturas reales (CFDI), que dejamos como su propio proyecto
aparte (ver más abajo por qué).

**Código de barras**: cada producto puede tener uno (en "Agregar
producto" o "Editar"). En el Punto de Venta hay un campo nuevo
arriba de todo — escanéalo con un lector físico o escríbelo a mano
y presiona Enter, y el producto se agrega solo al carrito. Nota
técnica: un lector USB/Bluetooth no necesita nada especial de
nuestra parte — esos lectores simplemente "escriben" los números
como si fueran un teclado y mandan Enter al final, por eso un
campo de texto normal ya funciona con cualquier lector sin
programar nada del hardware. Si el código ya lo tiene otro
producto de tu catálogo, te avisa en vez de guardarlo silenciosamente.

**Mayoreo**: en cada producto del Catálogo hay un enlace
"Mayoreo" para definir niveles ("desde 12 unidades, $16 cada
una"). En el Punto de Venta, el precio se ajusta SOLO según la
cantidad que vayas metiendo al carrito — nadie tiene que acordarse
de cambiar el precio a mano, ni siquiera el cajero. Probé la
lógica de elegir el nivel correcto de forma aislada, en los bordes
exactos (11 unidades a precio normal, 12 ya al precio de mayoreo,
24 al siguiente nivel) y salió exacta en todos los casos.

**Verificador de precios**: una pantalla nueva en el menú, para
todos los roles, donde escaneas o buscas un producto por nombre
solo para ver su precio (y sus niveles de mayoreo si tiene) — sin
estar haciendo una venta de verdad.

## Voice-to-Order con Gemini (nuevo)

En el Punto de Venta hay un botón nuevo, "🎤 Hablar pedido" —
pero solo aparece si configuraste `GEMINI_API_KEY` en Vercel. Sin
esa llave, el botón simplemente no existe en la pantalla y todo lo
demás sigue exactamente igual; el día que la agregues, aparece
solo, sin que yo tenga que tocar código de nuevo.

Cómo funciona: tocas el botón, hablas el pedido en voz alta ("dame
dos refrescos y una agua"), tocas otra vez para terminar, y el
sistema agrega los productos reconocidos al carrito solo —
mostrando un mensaje de qué entendió, para que sea fácil detectar
si se equivocó. Como el carrito ya tenía cantidad editable y botón
de "Quitar", corregir un error de reconocimiento es tan fácil como
corregir algo que agregaste a mano.

Para activarlo: sácate una llave gratis en
https://aistudio.google.com ("Get API key"), ponla en Vercel como
`GEMINI_API_KEY`.

Algo que quiero que sepas de una vez, porque no lo pude probar de
verdad sin una llave real: los celulares normalmente grababan en
formato webm, y la documentación oficial de Gemini lista WAV, MP3,
AIFF, AAC, OGG y FLAC como formatos soportados — webm no aparece
en esa lista. Es muy probable que funcione igual (muchos modelos
aceptan más formatos de los que documentan oficialmente), pero si
al probarlo con tu llave real el audio no se entiende nunca, ese
es el primer lugar donde hay que mirar — la solución sería
convertir el audio a un formato de la lista antes de mandarlo.

## Las otras tres ideas de Gemini, completas (nuevo)

Con esto ya quedaron las cuatro ideas originales de IA integradas
— todas con la misma regla: si no hay `GEMINI_API_KEY`, no
aparecen ni se ejecutan, y el resto de la app sigue exactamente
igual.

**Normalizar direcciones**: cuando guardas o editas un cliente con
dirección, antes de buscarla en el mapa, Gemini limpia errores de
tecleo y expande abreviaturas comunes ("col." → "colonia"). Esto
es invisible — NUNCA cambia lo que guardaste, solo ayuda a que
Mapbox encuentre mejor las coordenadas. Si Gemini no está
disponible, se usa la dirección tal cual la escribiste, como
siempre.

**Upselling inteligente**: en el Punto de Venta, en cuanto el
carrito tiene algo, aparece un botón "💡 Sugerir algo más" — lo
tocas cuando quieras (no se dispara solo, para no gastar llamadas
de más ni distraer al cajero), y te propone hasta 3 productos de
tu catálogo que combinen con lo que ya se está vendiendo, cada uno
con un botón de "Agregar" directo.

**Auditoría de caja**: en el detalle de una caja ya cerrada
(Caja → Historial → entrar a una), hay un botón "🔍 Revisar este
cierre" que le manda a Gemini el resumen del día (fondo,
movimientos, diferencia) y regresa una evaluación breve de si algo
se ve fuera de lo normal — no es una auditoría contable formal,
es una segunda mirada rápida para detectar algo que valga la pena
confirmar a mano.

## Ver rutas: mapa en vivo de la flotilla (nuevo)

Nueva pantalla solo para admin, en el menú. Muestra un mapa con la
ubicación actual de cada vendedor que está usando la app en este
momento — se actualiza solo cada 20 segundos, sin que tengas que
recargar la página. Usa Leaflet con mapas de OpenStreetMap, así
que no necesita ninguna llave nueva ni cuesta nada.

Cómo llega la ubicación: mientras un vendedor tiene la app abierta
en su celular, manda su posición real cada 30 segundos como
mucho — se le muestra un aviso pequeño abajo a la derecha
("📍 Compartiendo tu ubicación con tu equipo") para que sepa que
está pasando, nunca es algo escondido. Si no da permiso de
ubicación al navegador, simplemente no se comparte nada — no
truena ni le pide de nuevo de forma molesta.

Dos cosas que vale la pena que sepas de cómo quedó diseñado:

- El mapa siempre arranca centrado en Mérida, Yucatán (porque ahí
  opera tu flotilla), pero NO bloquea ni descarta ubicaciones fuera
  de esa zona — si un vendedor sale de la ciudad, igual aparece en
  el mapa, solo que tendrías que alejar el zoom para verlo.
- Si un vendedor no ha mandado su ubicación en los últimos 10
  minutos, deja de aparecer en el mapa (en vez de mostrar un punto
  viejo como si fuera de ahora, lo cual sería engañoso).

Limitación real, no un bug: como la app del vendedor sigue siendo
web (no la app nativa, que está pendiente), su celular solo manda
ubicación mientras tenga la página abierta y la pantalla prendida.
Si la apaga o cambia de app, deja de actualizar hasta que regrese.
Eso se resuelve de raíz con la app nativa.

## Resumen diario y alertas de stock bajo por WhatsApp (nuevo)

Dos avisos automáticos por WhatsApp, usando UltraMsg (una API
sencilla para mandar mensajes — no es IA conversacional, solo
manda el texto exacto que le pidamos). Ambos son opcionales: sin
`ULTRAMSG_TOKEN` y `ULTRAMSG_INSTANCE_ID` configurados, ninguno de
los dos manda nada, y el resto de la app sigue exactamente igual.

Antes de que lleguen, cada empresa tiene que configurar su número
en **Configuración** (nuevo en el menú, solo admin): su WhatsApp y
a partir de cuántas unidades avisar que un producto se está
acabando. Si dejas el umbral vacío, las alertas de stock bajo
quedan apagadas para esa empresa, aunque el resumen diario sí siga
llegando.

**Resumen diario**: todos los días a las 7am hora de México, un
cron de Vercel revisa cada empresa y manda un mensaje con cómo
cerró el día anterior — ventas, lo que falta cobrar, y productos
por agotarse — escrito en español natural por Gemini. Si Gemini no
está disponible esa vez, manda un mensaje más simple armado a
mano, en vez de no avisar nada.

**Alertas de stock bajo**: en cuanto un producto cae debajo del
umbral configurado (después de una venta o un ajuste manual), se
manda el aviso una sola vez — no se repite cada vez que se vende
una unidad más, mientras siga bajo. Si el producto se repone por
arriba del umbral y vuelve a bajar después, sí avisa otra vez.
Probé esta lógica de bordes (justo en el umbral, ya avisado vs.
recién bajó, repuesto vs. sigue bajo) de forma aislada — los cinco
casos salieron correctos.

Para que el cron del resumen diario funcione, hay que agregar
`vercel.json` en tu proyecto (ya viene en este zip) y configurar
`CRON_SECRET` en Vercel — es lo que evita que cualquiera en
internet pueda llamar a esa ruta y disparar el resumen él mismo.

## Pasos para correrlo (en tu computadora)

(Nota: si ya tenías este proyecto corriendo, esto no cambió desde
la vuelta anterior, salvo el paso 1: hay migración nueva, la 011.)

1. **Corre los SQL, en orden:**
   Supabase Dashboard -> SQL Editor:
   - supabase/migrations/004_trigger_alta_empresa.sql
   - supabase/migrations/005_invitar_a_equipo.sql
   - supabase/migrations/006_catalogo_y_punto_de_venta.sql
   - supabase/migrations/007_clientes_por_vendedor.sql
   - supabase/migrations/008_cerrar_permiso_clientes.sql
   - supabase/migrations/009_geocercas_y_visitas.sql
   - supabase/migrations/010_reseller_superadmin.sql
   - supabase/migrations/011_inventario_kardex.sql
   - supabase/migrations/012_categorias.sql
   - supabase/migrations/013_proveedores_compras.sql
   - supabase/migrations/014_cajas.sql
   - supabase/migrations/015_devoluciones.sql
   - supabase/migrations/016_costo_y_cotizaciones.sql
   - supabase/migrations/017_codigo_barras.sql
   - supabase/migrations/018_mayoreo.sql
   - supabase/migrations/019_ubicacion_flotilla.sql
   - supabase/migrations/020_whatsapp_y_alertas.sql (nueva)
   (Necesitas tener corridos antes los scripts 001, 002 y 003 — si
   ya tienes esta app funcionando, ya los corriste hace tiempo.)

2. **Instala las dependencias:**
   ```
   npm install
   ```

3. **Configura .env.local** (ya viene creado) con tus 3 valores,
   de Supabase Dashboard -> Settings -> API Keys:
   ```
   NEXT_PUBLIC_SUPABASE_URL=tu-project-url-aqui
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=tu-publishable-o-anon-key-aqui
   SUPABASE_SECRET_KEY=tu-secret-key-aqui
   MAPBOX_TOKEN=tu-mapbox-token-aqui
   ```
   La MAPBOX_TOKEN es opcional al principio: sin ella, los clientes
   se guardan igual pero sin coordenadas, y el check-in no
   funcionará hasta que la agregues. Sácala gratis en
   https://account.mapbox.com -> Tokens.
   La SUPABASE_SECRET_KEY es la que tiene permiso total — la
   necesita app/api/invitar para poder invitar gente. Está en la
   pestaña "Secret keys" de esa misma página (o "service_role" en
   la pestaña de llaves antiguas). NUNCA la pongas con prefijo
   NEXT_PUBLIC_, ni la subas a un repositorio público.

4. **Levanta el servidor:**
   ```
   npm run dev
   ```
   Abre http://localhost:3000.

5. **Pruébalo de punta a punta:**
   - Crea una cuenta nueva en "Crear cuenta" (esto funda tu negocio).
   - Confirma tu correo, entra a /protected.
   - Ve a "Catálogo" y agrega un par de productos.
   - Ve a "Clientes" y agrega uno (ponle un límite de crédito bajo
     para poder probar el bloqueo automático, como ya hicimos en
     Supabase con Don Lupe).
   - Ve a "Punto de venta", agrega productos al carrito, elige
     método de pago, y dale "Cobrar". Revisa en Supabase que se
     haya creado el pedido y sus renglones.
   - Desde "Invitar a mi equipo", invita a otro correo. Esa persona
     confirma su correo, crea su contraseña, y entra viendo la
     MISMA empresa — no una nueva.

## Mapa de archivos

- lib/supabase/client.ts — cliente para componentes del navegador.
- lib/supabase/server.ts — cliente para código del servidor.
- lib/supabase/admin.ts — cliente con la llave secreta, SOLO para
  el servidor (lo usa app/api/invitar). Nunca lo importes desde un
  archivo "use client".
- lib/supabase/proxy.ts + proxy.ts (raíz) — refresca la sesión y
  protege /protected.
- components/sign-up-form.tsx — registro (funda un negocio nuevo).
- components/login-form.tsx — login.
- components/invite-form.tsx — formulario para invitar al equipo.
- components/pos-form.tsx — el carrito interactivo del punto de
  venta; llama a la función crear_pedido_con_detalle en Supabase.
- app/api/invitar/route.ts — envía la invitación; solo deja
  hacerlo si quien la pide es admin.
- app/auth/confirm/route.ts — valida el enlace del correo (de
  registro o de invitación).
- app/auth/establecer-password/page.tsx — donde el invitado crea
  su contraseña (no la tenía, porque el admin no la puso por él).
- app/protected/page.tsx — panel principal del usuario.
- app/protected/equipo/page.tsx — panel del admin: invitar y ver
  a su equipo.
- app/protected/productos/page.tsx — catálogo: agregar y "quitar"
  productos (no se borran de verdad, se desactivan).
- app/protected/clientes/page.tsx — agregar clientes y ver su
  saldo/límite de crédito.
- app/protected/pos/page.tsx — el punto de venta.
- app/protected/mis-clientes/page.tsx — panel del vendedor: solo
  ve y busca entre sus clientes asignados, con botón de check-in.
- app/protected/pos/recibo/[id]/page.tsx — recibo imprimible de
  cada venta, con código QR.
- components/buscador-clientes.tsx — buscador en vivo (filtra
  mientras escribes, sin recargar la página).
- components/checkin-button.tsx — pide la ubicación real del
  celular y llama a registrar_checkin (el servidor decide si se
  acepta, no el navegador).
- components/recibo.tsx — el ticket imprimible con su QR.
- components/importar-excel.tsx — sube un .xlsx con columnas
  "nombre" y "precio" y los agrega todos de golpe al catálogo.
- lib/mapbox.ts — convierte una dirección en coordenadas.
- app/protected/productos/[id]/editar — editar o reactivar un
  producto.
- app/protected/clientes/[id]/editar — editar un cliente (si
  cambias la dirección, se vuelve a ubicar en el mapa).
- app/protected/pedidos — historial de ventas con liga al recibo.
- app/protected/reportes — ventas de hoy/del mes, por método de
  pago, y los productos más vendidos (solo admin).
- app/protected/productos/[id]/ajustar — sumar o restar stock a
  mano, con nota (mercancía que llega, mermas, conteo inicial).
- app/protected/productos/[id]/kardex — historial de movimientos
  de un producto.
- app/protected/productos/categorias — crear/borrar categorías,
  con conteo de productos por categoría.
- app/protected/proveedores — crear/borrar proveedores.
- app/protected/compras — historial de compras (page.tsx), ver el
  detalle de una ([id]/), y registrar una nueva (nueva/, usa el
  componente components/compra-form.tsx).
- app/protected/caja — la caja del día abierta (page.tsx, abrir/
  movimientos/cerrar), y su historial (historial/, con detalle por
  caja en historial/[id]/).
- app/protected/devoluciones — historial (page.tsx), detalle de
  una ([id]/), y registrar una nueva a partir de un pedido
  (nueva/?pedido_id=..., usa components/devolucion-form.tsx). El
  enlace "Devolver" vive en Historial de ventas.
- app/protected/cotizaciones — historial (page.tsx), detalle de
  una ([id]/), y crear una nueva (nueva/, usa
  components/cotizacion-form.tsx).
- app/protected/productos/[id]/mayoreo — niveles de precio por
  cantidad para un producto.
- app/protected/verificador — búsqueda rápida de precio por
  código de barras o nombre (usa components/verificador-precios.tsx).
- lib/gemini.ts — las cuatro funciones de Gemini: revisa si hay
  llave configurada, Voice-to-Order, normalizar direcciones,
  upselling, y auditoría de caja.
- app/api/voz-a-pedido/ — recibe el audio grabado desde el Punto
  de Venta y regresa los productos que entendió.
- app/api/sugerir-upsell/ — regresa hasta 3 sugerencias para lo
  que hay en el carrito.
- app/api/auditar-caja/ — regresa la evaluación de un cierre de
  caja ya hecho.
- components/auditoria-caja.tsx — el botón y resultado de la
  auditoría, en el detalle de una caja cerrada.
- app/protected/rutas — el mapa en vivo de la flotilla, solo
  admin (usa components/mapa-flotilla.tsx, con Leaflet).
- components/compartir-ubicacion.tsx — montado solo para
  vendedor, manda su ubicación cada 30 segundos como mucho.
- lib/whatsapp.ts — manda mensajes vía UltraMsg, revisa si está
  configurado.
- lib/alertas-stock.ts — revisa el umbral por producto y manda el
  aviso una sola vez por bajada (usado por el ajuste manual y por
  el Punto de Venta).
- app/protected/configuracion — número de WhatsApp y umbral de
  stock bajo por empresa, solo admin.
- app/api/cron/resumen-diario/ — lo llama Vercel Cron una vez al
  día, protegido con `CRON_SECRET`.
- app/api/verificar-stock-bajo/ — lo llama el Punto de Venta justo
  después de una venta.
- app/reseller/ — el panel de reseller: lista de negocios e
  ingresos (page.tsx), dar de alta uno nuevo (nueva-empresa/),
  y administrar uno en particular: precio, activar/desactivar,
  pagos (empresas/[id]/).

## Nota de seguridad sobre la importación de Excel

La librería xlsx (SheetJS) que se usa para leer el archivo tiene
advisories conocidos de npm (prototype pollution / ReDoS) en la
versión que se descarga del registro público de npm — son fallas
que se disparan al leer un archivo MALICIOSO, no al usarlo
normalmente. Como aquí solo el admin sube SU PROPIO catálogo, el
riesgo real es bajo, pero si algún día abres archivos de fuentes
externas, instala la versión parchada directo del sitio oficial de
SheetJS (cdn.sheetjs.com) en vez de la del registro de npm.

## Security headers (nuevo)

Agregado en `next.config.ts`: HSTS (fuerza HTTPS siempre),
X-Frame-Options (nadie puede meter Ventastack en un iframe ajeno),
X-Content-Type-Options, Referrer-Policy, Permissions-Policy
(apaga cámara/pago/usb, pero deja prendidos ubicación y micrófono
SOLO para este sitio — los necesitan "Ver rutas" y "Hablar
pedido"), y un Content-Security-Policy acotado exactamente a lo
que el navegador llama de verdad: Supabase y los mapas de
OpenStreetMap. Lo probé corriendo el servidor real y revisando la
respuesta con curl — en páginas normales, en la redirección de
sesión, y en una ruta de API — los seis headers aparecen en los
tres casos, y nada se rompió.

## Pendiente para otra sesión

Con esta vuelta, todo el módulo original de funciones quedó
construido. Lo único que falta de tu lista es facturas reales
(CFDI), que dejamos aparte a propósito — para empezarlo necesitas
primero, de tu lado: elegir un PAC (Facturama, SW Sapien, Finkok
son opciones razonables), y tener tu CSD (los archivos `.cer` y
`.key` que se descargan del portal del SAT con tu e.firma, más su
contraseña). Cuando los tengas, construimos la integración real.

Otras cosas que no son parte de tu lista de funciones, pero
quedan abiertas:

- La app móvil del vendedor (repo separado, "ventastack-vendedor",
  React Native/Expo) — ya tiene login y navegación protegida
  funcionando de verdad. Falta: Mis clientes, botón "Cómo llegar"
  a Maps/Waze, check-in, ubicación en vivo (primero en primer
  plano, después en segundo plano con un development build), y
  cerrar ventas.
- Llamadas automáticas por IA (cobranza a clientes con saldo
  vencido, reactivar clientes inactivos) — platicado, candidato
  natural es Dapta (ya tienes cuenta ahí), pero no se ha empezado.
- Logo y plantillas personalizadas por empresa (marca blanca de
  verdad en recibos/cotizaciones) — platicado, tiene sentido para
  el negocio, no se ha empezado.
- Reabastecimiento automático sugerido (con Gemini, a partir del
  historial de compras) y programa de lealtad para clientes
  frecuentes — ideas mencionadas, no trabajadas todavía.
- Impresión ESC/POS "pura" por USB/Bluetooth, cuando armemos el
  daemon de Node.js o la versión con Tauri.
- Tienda en línea propia (no conectada al sitio externo de un
  cliente, sino construida nativa dentro de Ventastack), con
  guías de entrega. El mapa en vivo de la flotilla para admin YA
  quedó construido ("Ver rutas") — lo que falta es la tienda
  misma, y una vista para que el CLIENTE vea su propio pedido en
  camino (eso se monta sobre la misma base que ya existe). También
  falta conectar con DHL/FedEx/Estafeta para envíos fuera de
  Mérida — necesitas cuenta de negocio con API de la paquetería
  que elijas antes de que se pueda construir eso.
- Webhooks de pagos.
- Que el admin pueda configurar qué ve cada rol en el menú (hoy
  está fijo en el código). Cuando se construya, va a ser por rol,
  no por persona — ya quedó decidido, solo falta construirlo.
- Que tú, desde `/reseller`, puedas ver cuánto vendió cada negocio
  (hoy solo ves su membresía y pagos, no su actividad real).
- Subir esto a producción (Vercel u otro hosting).
