// =============================================
// Changelog visible en la app. Reglas:
// - Cada feature/fix sube VERSION_ACTUAL y agrega su entrada ARRIBA.
// - Los textos se redactan para el usuario (que le sirve, que cambio),
//   nunca notas tecnicas de desarrollo.
// - `super: true` en un cambio = solo lo ve el superadmin.
// =============================================

export const VERSION_ACTUAL = '1.7.0'

export const CHANGELOG = [
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
