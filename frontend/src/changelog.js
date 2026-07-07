// =============================================
// Changelog visible en la app. Reglas:
// - Cada feature/fix sube VERSION_ACTUAL y agrega su entrada ARRIBA.
// - Los textos se redactan para el usuario (que le sirve, que cambio),
//   nunca notas tecnicas de desarrollo.
// - `super: true` en un cambio = solo lo ve el superadmin.
// =============================================

export const VERSION_ACTUAL = '1.13.0'

export const CHANGELOG = [
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
