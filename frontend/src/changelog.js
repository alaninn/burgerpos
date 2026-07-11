// =============================================
// Changelog visible en la app. Reglas:
// - Cada feature/fix sube VERSION_ACTUAL y agrega su entrada ARRIBA.
// - Los textos se redactan para el usuario (que le sirve, que cambio),
//   nunca notas tecnicas de desarrollo.
// - `super: true` en un cambio = solo lo ve el superadmin.
// =============================================

export const VERSION_ACTUAL = '1.19.1'

export const CHANGELOG = [
  {
    version: '1.19.1',
    fecha: '2026-07-10',
    titulo: 'Fix: la fecha de una compra avanzada podía quedar un día adelantada',
    cambios: [
      { t: 'Si cargabas una compra avanzada de noche, la fecha por defecto podía quedar registrada como el día siguiente (por eso el filtro "Hoy" en Gastos no la mostraba, aunque en pantalla figurara como de hoy). Ya está corregido.' },
    ],
  },
  {
    version: '1.19.0',
    fecha: '2026-07-10',
    titulo: 'Compra avanzada corregida: unidades flexibles y compras editables',
    destacados: [
      { titulo: 'Cambiá la unidad de compra en el momento', detalle: 'En cada ítem de una compra avanzada ahora podés elegir con qué unidad comprás esta vez (caja, kg, gramo, litro o unidad/bulto), aunque no sea la habitual del producto. La conversión al stock se calcula sola.' },
      { titulo: 'Las unidades ya no se pisan entre sí', detalle: 'Si comprás un producto directo en kg, litro o gramo (sin caja) y tu stock se cuenta en otra unidad, ahora la conversión se aplica siempre. Antes, en esos casos, el stock quedaba mal cargado.' },
      { titulo: 'Poné el precio final de la boleta', detalle: 'En cada ítem de una compra avanzada ahora podés cargar directamente el precio final (el que figura en la factura) y el precio unitario se calcula solo, o al revés.' },
      { titulo: 'Editá o eliminá una compra ya cargada', detalle: 'Si una compra quedó mal (cantidad, precio o proveedor), ahora se puede editar o eliminar desde Gastos → Compras: el stock se corrige automáticamente.' },
      { titulo: 'Vé el stock en la unidad que quieras', detalle: 'En Stock, hacé click sobre la cantidad de un producto para alternar entre cajas, kg, gramos, litros o unidades (según cómo lo compres).' },
    ],
    cambios: [
      { t: 'Al crear o editar un producto de stock, la unidad en la que se cuenta el stock ahora se ajusta sola para ser compatible con la unidad de compra elegida (evita combinaciones inválidas como caja de kg con stock en unidades).' },
    ],
  },
  {
    version: '1.18.0',
    fecha: '2026-07-08',
    titulo: 'Extra de costo en recetas y vistas en lista',
    destacados: [
      { titulo: 'Sumá un extra a cada receta', detalle: 'En cada receta podés agregar un monto fijo extra (por merma, salsas caseras, condimentos y desperdicio que no se descuentan del stock). Se suma al costo de los ingredientes.' },
    ],
    cambios: [
      { t: 'Recetas y Proveedores ahora se pueden ver en grilla o en lista, con un botón para cambiar la vista (se recuerda tu elección).' },
      { t: 'Las cantidades de los ingredientes se muestran limpias (1 en vez de 1.000).' },
    ],
  },
  {
    version: '1.17.0',
    fecha: '2026-07-08',
    titulo: 'Carga rápida de stock, vender sin stock y comprobantes manipulables',
    destacados: [
      { titulo: 'Cargá el stock de varios productos de una', detalle: 'En Stock hay un botón nuevo "Cargar stock": ponés cuántas unidades hay de cada producto en una sola pantalla y guardás todo junto. Ideal para hacer el inventario o reponer.' },
      { titulo: 'Reimprimí facturas y hacé notas de crédito', detalle: 'En Facturación ARCA → Comprobantes, cada factura tiene botones para imprimir su PDF y para emitir una nota de crédito que la anula ante ARCA, con CAE real.' },
    ],
    cambios: [
      { t: 'Nuevo interruptor en Configuraciones → Pedidos: "Vender sin stock", para que la venta nunca se frene aunque un producto no tenga stock (queda en negativo).' },
      { t: 'Al crear una categoría de stock, las opciones son más claras: "Insumo de stock" (no se vende) o "Producto de venta"; el nombre lo elegís libremente.' },
    ],
  },
  {
    version: '1.16.2',
    fecha: '2026-07-08',
    titulo: 'Panel de facturación muestra tus datos y comprobantes',
    super: true,
    cambios: [
      { t: 'El menú Facturación ARCA ahora carga tus datos fiscales y la lista de comprobantes emitidos (antes quedaban vacíos si el régimen no estaba en la configuración del negocio).' },
      { t: 'Se quitó la sección vieja de ARCA de Configuraciones → Integraciones.' },
    ],
  },
  {
    version: '1.16.1',
    fecha: '2026-07-08',
    titulo: 'Facturación ARCA por conexión delegada',
    super: true,
    cambios: [
      { t: 'Se quitó la vinculación automática (no era confiable). La facturación ARCA se configura por conexión delegada o subiendo el certificado.' },
    ],
  },
  {
    version: '1.16.0',
    fecha: '2026-07-08',
    titulo: 'WhatsApp más estable y mensajes más lindos',
    destacados: [
      { titulo: 'El código QR vuelve a generarse siempre', detalle: 'Si la sesión de WhatsApp se cerraba, el QR dejaba de aparecer para revincular. Ahora el sistema limpia la sesión vieja automáticamente y el QR se genera cada vez que lo necesites.' },
      { titulo: 'Aguanta muchos pedidos juntos', detalle: 'Si confirmás varios pedidos seguidos, los mensajes de WhatsApp salen en orden, de a uno, sin trabarse. La confirmación del pedido es instantánea: el mensaje se envía por detrás sin hacerte esperar.' },
    ],
    cambios: [
      { t: 'Los mensajes automáticos de WhatsApp ahora son más cálidos y claros: saludan por el nombre, muestran el número de pedido en negrita y usan emojis. Podés seguir editándolos en Configuraciones → Integraciones.' },
    ],
  },
  {
    version: '1.15.2',
    fecha: '2026-07-08',
    titulo: 'La tienda ya no muestra el stock',
    cambios: [
      { t: 'La tienda online mostraba también las categorías de ingredientes del stock (carne, aderezos, insumos...). Ahora solo se ven las categorías del menú de venta.' },
    ],
  },
  {
    version: '1.15.1',
    fecha: '2026-07-08',
    titulo: 'Mapa ajustable arrastrando el borde',
    cambios: [
      { t: 'En el POS (escritorio) podés arrastrar el borde izquierdo del mapa para agrandarlo o achicarlo a gusto; el tamaño elegido se recuerda para la próxima vez.' },
    ],
  },
  {
    version: '1.15.0',
    fecha: '2026-07-07',
    titulo: 'Mapa de pedidos en pantalla completa y para otro monitor',
    destacados: [
      { titulo: 'Mapa para los repartidores en otro monitor', detalle: 'Nuevo botón sobre el mapa del POS que lo abre solo, en otra ventana, a pantalla completa: la arrastrás a un segundo monitor y los repartidores ven los deliveries en vivo (se actualiza solo con cada pedido) sin interrumpir la venta.' },
    ],
    cambios: [
      { t: 'Botones sobre el mapa del POS para ponerlo a pantalla completa, volverlo al tamaño normal u ocultarlo.' },
      { t: 'Modo oscuro revisado a fondo: se corrigieron textos y paneles que quedaban del mismo color que el fondo en el editor de productos del Menú (variantes), Adicionales, Facturación ARCA, detalle de pedido y comprobantes.' },
    ],
  },
  {
    version: '1.14.2',
    fecha: '2026-07-07',
    titulo: 'Mejoras en la tienda online',
    cambios: [
      { t: 'La foto del producto ahora se ve entera en el detalle (antes se recortaba); el recuadro es más grande y la imagen se adapta sin cortes.' },
      { t: 'En el detalle del producto, los adicionales obligatorios aparecen primero y abiertos; los opcionales quedan plegados y se abren con un toque.' },
      { t: 'La propina arranca seleccionada en 10% (el cliente puede tocar "Sin propina" para no abonarla), se recalcula sola si cambia el carrito y el botón "Sin propina" ahora se marca con color al elegirlo.' },
    ],
  },
  {
    version: '1.14.1',
    fecha: '2026-07-07',
    titulo: 'Recetas con cualquier producto del stock',
    destacados: [
      { titulo: 'Cualquier categoría de stock sirve de ingrediente', detalle: 'Las recetas ahora aceptan productos de todas las categorías del stock: papelería, bebidas, cajas, envases... Antes solo permitían la categoría "Ingredientes", pero una receta real puede llevar el papel, la caja o la bebida del combo. Solo los productos elaborados del menú quedan excluidos.' },
    ],
    cambios: [
      { t: 'El selector de ingredientes agrupa los productos por categoría para encontrarlos más rápido.' },
      { t: 'Las variantes que se muestran al crear una receta son siempre las del producto del menú elegido, con sus nombres actuales (la lista se refresca al abrir el modal).' },
      { t: 'Los productos sin unidad definida (ej. bebidas) se cargan en recetas como "unidad" sin dar error.' },
    ],
  },
  {
    version: '1.14.0',
    fecha: '2026-07-07',
    titulo: 'Editor de pedidos mejorado',
    destacados: [
      { titulo: 'El catálogo de venta muestra solo el menú', detalle: 'Al crear un pedido ya no aparecen los ingredientes ni las categorías del stock (carne, aderezos, insumos...): solo se pueden vender los productos creados en el panel Menú, como corresponde.' },
      { titulo: 'Precios a la vista y mejor modo oscuro', detalle: 'Cada producto del catálogo muestra su precio (o "desde $..." si tiene variantes), las tarjetas resaltan al pasar el mouse y todos los botones del editor (modalidad, método de pago, variantes) se ven bien en modo oscuro.' },
    ],
    cambios: [
      { t: 'Los pedidos de delivery ahora piden la dirección de entrega antes de guardarse, para que ningún envío quede sin destino.' },
      { t: 'Si un método de pago se deshabilita en la configuración, el editor pasa automáticamente al primero disponible.' },
      { t: 'Botón "Crear pedido" en violeta, más visible en las dos apariencias.' },
    ],
  },
  {
    version: '1.13.0',
    fecha: '2026-07-07',
    titulo: 'Menú reorganizado y caja directa desde el Punto de Venta',
    destacados: [
      { titulo: 'Abrí y cerrá la caja sin salir del Punto de Venta', detalle: 'La barra del POS ahora tiene el botón "Abrir caja" cuando no hay turno y "Cerrar caja" cuando estás operando, con el mismo arqueo completo de siempre (contar billetes, declarados por método e impresión del cierre).' },
      { titulo: 'Menú lateral reorganizado por áreas', detalle: 'El panel administrativo agrupa todo por área de trabajo: Ventas (pedidos, cajas, cocina, repartidores, clientes, descuentos), Inventario (menú, stock, recetas, proveedores), Finanzas (gastos, reportes, facturación) y General. El Punto de Venta quedó como botón destacado arriba de todo.' },
    ],
    cambios: [
      { t: 'Se quitó el botón "Personalizar" del panel de pedidos: la personalización del mapa vive en Configuraciones → Mapa de pedidos.' },
      { t: 'Modo oscuro más pulido: campos de texto, selectores y calendarios ahora se ven oscuros y coherentes en todas las pantallas.' },
      { t: 'El botón "Soporte" de la barra superior ahora abre la sección de soporte.' },
    ],
  },
  {
    version: '1.12.0',
    fecha: '2026-07-06',
    titulo: 'Punto de Venta separado y nuevo modo oscuro',
    destacados: [
      { titulo: 'Punto de Venta a pantalla completa', detalle: 'La toma de pedidos ahora es una pantalla propia, separada del panel administrativo: barra superior con estado de caja en vivo, reloj y accesos rápidos (cocina, historial), sin menú lateral. Al iniciar sesión entrás directo al Punto de Venta, y desde ahí el admin salta al panel administrativo con un botón.' },
      { titulo: 'Modo oscuro renovado', detalle: 'Todo el panel oscuro tiene una nueva paleta cálida con tinte violeta: fondos profundos, bordes suaves, brillos en los botones y menú lateral con resplandor. El modo claro queda exactamente igual.' },
    ],
    cambios: [
      { t: 'El menú lateral ahora dice "Punto de Venta" y abre la pantalla de venta completa.' },
      { t: 'Se cargó el set básico de hamburguesería en tu stock: aderezos, cheddar en fetas, bacon, huevo, palta y más, con los adicionales ya vinculados (editá cantidades y costos a gusto).' },
    ],
  },
  {
    version: '1.11.0',
    fecha: '2026-07-06',
    titulo: 'Los adicionales descuentan stock y suman al costo real',
    destacados: [
      { titulo: 'Adicionales conectados al stock', detalle: 'Cada adicional (medallón extra, ketchup, aderezos...) se puede vincular a un ingrediente del stock con una cantidad fija: "medallón extra = 100 gramos de carne". Al venderse, descuenta ese stock aunque no esté en la receta, y su costo real entra en la ganancia del Centro de Control.' },
    ],
    cambios: [
      { t: 'En Menú → Adicionales, cada opción tiene un selector "Descuenta del stock": elegís el ingrediente, la cantidad y la unidad (gramos, kg, ml...).' },
      { t: 'Los pedidos de la tienda online ahora también descuentan el stock de recetas y adicionales (antes solo lo hacía el POS).' },
      { t: 'El desglose de ingredientes consumidos del Centro de Control incluye lo usado por los adicionales.' },
    ],
  },
  {
    version: '1.10.1',
    fecha: '2026-07-06',
    titulo: 'Recetas por variante, ahora opcionales',
    cambios: [
      { t: 'Al crear la receta de un producto con variantes (simple/doble/triple), ya no es obligatorio cargar todas: se crean solo las variantes que completes y las demás quedan para después.' },
      { t: 'Nuevo botón "Copiar de..." para duplicar los ingredientes de una variante a otra y solo ajustar las cantidades.' },
      { t: 'Si una variante falla al guardar, las demás se crean igual y se avisa cuál quedó pendiente (antes un error frenaba todo).' },
      { t: 'Las tarjetas de recetas muestran el rango de costo real entre variantes (antes un promedio confuso), y se eliminó la doble confirmación al borrar.' },
    ],
  },
  {
    version: '1.10.0',
    fecha: '2026-07-06',
    titulo: 'Facturación electrónica lista para todas las categorías',
    destacados: [
      { titulo: 'Conexión rápida sin certificados', detalle: 'Ahora podés facturar delegando el web service de ARCA al proveedor: entrás a ARCA, delegás "Facturación Electrónica" al CUIT indicado, cargás tu CUIT y punto de venta, y listo. Sin generar ni subir certificados. Sirve para Monotributo (Factura C) y Responsable Inscripto (Factura A y B).' },
    ],
    cambios: [
      { t: 'Anular una factura ahora emite la Nota de Crédito correcta ante ARCA (referenciando la factura original, como exige AFIP).' },
      { t: 'Las facturas salen con la fecha correcta de Argentina (antes, de noche podían salir con fecha del día siguiente).' },
      { t: 'Se agregó la condición frente al IVA del receptor (obligatoria por la RG 5616): consumidor final, monotributista o responsable inscripto.' },
      { t: 'La Factura B ahora informa el IVA a ARCA como corresponde.' },
      { t: 'Si ARCA rechaza una factura, el motivo exacto se muestra completo para poder resolverlo.' },
      { t: 'Se corrigió la verificación de certificados que fallaba siempre por una ruta incorrecta.' },
    ],
  },
  {
    version: '1.9.0',
    fecha: '2026-07-06',
    titulo: 'Recetas en kg o gramos y desglose de ventas e ingredientes',
    destacados: [
      { titulo: 'Cargá las recetas en la unidad que te quede cómoda', detalle: 'Si un ingrediente se mide en gramos, ahora podés cargar la receta en gramos O en kilos (0.2 kg = 200 g, el sistema convierte solo). Lo mismo con litros y ml. Y al comprar por caja, la equivalencia se muestra en el momento: "2 cajas = 30 kg = 30000 gramos".' },
      { titulo: 'El Centro de Control desglosa todo', detalle: 'Ahora ves cada producto vendido con su cantidad, facturado, costo y ganancia, y cuánto se consumió de cada ingrediente en el período (con su costo y el stock que queda).' },
    ],
    cambios: [
      { t: 'En la receta, el margen aparece al lado del costo: precio de venta, ganancia y porcentaje.' },
      { t: 'Cada venta y cada compra dejan un registro de movimiento de stock: el consumo del período es exacto aunque después cambies las recetas.' },
      { t: 'Podés definir un stock mínimo por ingrediente para la alerta de stock bajo (antes era un valor fijo).' },
      { t: 'El stock negativo (faltante por ventas sin stock) ahora se ve en rojo con su propia alerta.' },
      { t: 'Se corrigió la eliminación de compras: ahora revierte el stock exacto que había sumado.' },
      { t: 'El stock ya no se redondea al comprar: se respetan los decimales (ej. 0.5 kg).' },
    ],
  },
  {
    version: '1.8.0',
    fecha: '2026-07-05',
    titulo: 'Costo real por receta y stock que no frena la venta',
    destacados: [
      { titulo: 'El costo de cada producto sale de su receta', detalle: 'El precio de costo de un producto del menú ahora se calcula solo, sumando lo que cuesta cada ingrediente de su receta. Se actualiza al guardar la receta y cada vez que una compra cambia el precio de un ingrediente. Así la ganancia del Centro de Control es real.' },
    ],
    cambios: [
      { t: 'Al vender, el stock de los ingredientes se descuenta según la receta; ahora la venta nunca se frena por falta de stock (el ingrediente puede quedar en negativo para que veas el faltante).' },
      { t: 'En el producto, el precio de costo se muestra como automático cuando tiene receta.' },
      { t: 'Comprar un ingrediente recalcula el costo de todos los productos que lo usan.' },
    ],
  },
  {
    version: '1.7.1',
    fecha: '2026-07-05',
    titulo: 'Productos por proveedor desde la ficha',
    cambios: [
      { t: 'Desde la ficha de un proveedor podés asignar (y quitar) los productos que le comprás. Al registrar una compra a ese proveedor, esos productos aparecen listos para cargar su stock.' },
    ],
  },
  {
    version: '1.7.0',
    fecha: '2026-07-05',
    titulo: 'Nuevo cierre de caja completo',
    destacados: [
      { titulo: 'Cierre de caja como en el POS grande', detalle: 'El cierre ahora tiene resumen del turno con gráfico de pagos, arqueo de efectivo con "contar billetes", declaración de tarjetas / Mercado Pago / transferencias y una pantalla final que compara lo declarado contra lo del sistema, con opción de imprimir.' },
    ],
    cambios: [
      { t: 'Al cerrar declarás el efectivo (a retirar y para el próximo turno) y los totales por tarjeta, Mercado Pago y transferencia; el sistema muestra las diferencias método por método.' },
      { t: 'Botón "Contar billetes" para sumar el efectivo por denominación.' },
      { t: 'Se puede imprimir el ticket de cierre.' },
    ],
  },
  {
    version: '1.6.0',
    fecha: '2026-07-05',
    titulo: 'Cierre de caja con arqueo detallado',
    cambios: [
      { t: 'Al cerrar una caja declarás cuánto efectivo retirás y cuánto queda para el próximo turno; el sistema calcula la diferencia contra lo esperado.' },
      { t: 'El arqueo del historial muestra el efectivo retirado y el que quedó para el siguiente turno.' },
      { t: 'Se corrigieron los reportes de productos más vendidos, clientes y repartidores que no cargaban.', super: true },
    ],
  },
  {
    version: '1.5.0',
    fecha: '2026-07-05',
    titulo: 'Cajas por turno: cajas fijas y varios operadores',
    destacados: [
      { titulo: 'Varias cajas abiertas a la vez', detalle: 'Podés tener más de una caja abierta al mismo tiempo (por ejemplo Mañana y Tarde). Cada venta queda registrada en la caja del operador que la cargó.' },
      { titulo: 'Cajas fijas y turnos compartidos', detalle: 'El administrador define cajas fijas con nombre. Cualquier operador la abre por su nombre, y otros pueden unirse o salir del mismo turno sin cerrarlo.' },
    ],
    cambios: [
      { t: 'Nueva pantalla de Cajas: abrí una caja (libre o fija), unite a una abierta o salí sin cerrarla, y cerrá con arqueo.' },
      { t: 'Los gastos con origen "caja del turno" ahora se descuentan del efectivo esperado al cerrar la caja.' },
      { t: 'El historial de cajas muestra el nombre de cada turno y su arqueo completo.' },
    ],
  },
  {
    version: '1.4.0',
    fecha: '2026-07-05',
    titulo: 'Gastos unificado con proveedores y cuenta corriente',
    destacados: [
      { titulo: 'Todo se registra desde Gastos', detalle: 'Gastos, compras y pagos a proveedores ahora viven en una sola pantalla. Cargá un gasto común o un pago a proveedor con el mismo botón, y una compra completa con "Compra avanzada".' },
      { titulo: 'Cuenta corriente de proveedores', detalle: 'Cada proveedor lleva su saldo: lo que le debemos y lo que nos debe. Registrá pagos y cobros, y mirá la ficha con el historial de movimientos.' },
    ],
    cambios: [
      { t: 'Nuevo panel de Gastos: filtros por hoy, día, mes o rango, y totales por tipo (gasto / compra / pago a proveedor) y por origen del dinero (caja / local / MP).' },
      { t: 'Al cargar un gasto podés elegir de dónde sale la plata y, si querés, marcarlo como Factura A para sumar el IVA crédito.' },
      { t: 'Alta rápida de proveedor sin salir del modal de gasto.' },
      { t: 'La "Compra avanzada" sigue actualizando el stock de tus ingredientes y, si no la pagás, queda como deuda con el proveedor.' },
      { t: 'La sección Compras se integró dentro de Gastos: una sola pantalla para todo.' },
    ],
  },
  {
    version: '1.3.0',
    fecha: '2026-07-03',
    titulo: 'Direcciones exactas para delivery',
    cambios: [
      { t: 'Al cargar un pedido de delivery, buscá la dirección y el puntero cae en la ubicación exacta en un mapa, con ajuste fino arrastrándolo.' },
      { t: 'Las sugerencias de dirección muestran su precisión (✓ exacta / ≈ aproximada) y se acotan a la zona de tu local.' },
      { t: 'Si tenés zonas de entrega configuradas, el sistema detecta la zona del cliente y sugiere el costo de envío automáticamente.' },
      { t: 'En la tienda online, la dirección ahora autocompleta y el mapa abre centrado en la dirección escrita.' },
      { t: 'Los pedidos cargados desde el panel guardan la ubicación y aparecen bien en el mapa de pedidos.' },
    ],
  },
  {
    version: '1.2.0',
    fecha: '2026-07-03',
    titulo: 'Centro de Control',
    cambios: [
      { t: 'Nuevo Centro de Control: la ganancia real de tu negocio (venta de productos menos costos y gastos), por día, mes o rango de fechas.' },
      { t: 'Desglose por método de pago y modalidad, con gráficos de composición de la ganancia.' },
      { t: 'Tocá una tarjeta de método de pago en el Centro de Control para ver las ventas de ese método.' },
      { t: 'El Dashboard muestra la ganancia real del mes con acceso directo al Centro de Control.' },
      { t: 'La comparativa del gráfico de ventas ahora usa los datos reales del período anterior.' },
      { t: 'Superadmin: ranking de negocios por facturación de los últimos 30 días en el Dashboard.', super: true },
    ],
  },
  {
    version: '1.1.0',
    fecha: '2026-07-03',
    titulo: 'Novedades de la plataforma',
    cambios: [
      { t: 'Nueva sección de Soporte: envianos tus consultas desde el panel y recibí la respuesta ahí mismo.' },
      { t: 'Novedades de cada versión visibles desde el botón de versión en el menú.' },
      { t: 'Superadmin: planes editables desde el panel (precio, límites, funciones y módulos por plan).', super: true },
      { t: 'Superadmin: panel de Finanzas con registro de pagos y renovaciones por negocio.', super: true },
      { t: 'Superadmin: alertas automáticas de vencimientos e inactividad en el Dashboard.', super: true },
      { t: 'Superadmin: backups automáticos diarios de la base con descarga desde Configuración.', super: true },
      { t: 'Superadmin: salud de cada negocio (actividad, errores, usuarios) en el detalle.', super: true },
    ],
  },
  {
    version: '1.0.0',
    fecha: '2026-07-02',
    titulo: 'Módulo de gestión y panel de errores',
    cambios: [
      { t: 'Nuevo módulo de Gestión: stock por ingredientes, recetas con variantes, compras, gastos y proveedores.' },
      { t: 'El stock se descuenta automáticamente al vender según la receta de cada producto y variante.' },
      { t: 'El costo de los productos se calcula automáticamente desde sus recetas.' },
      { t: 'Superadmin: panel de errores con logs del servidor en vivo y reporte automático de fallas.', super: true },
    ],
  },
]
