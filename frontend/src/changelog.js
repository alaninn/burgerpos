// =============================================
// Changelog visible en la app. Reglas:
// - Cada feature/fix sube VERSION_ACTUAL y agrega su entrada ARRIBA.
// - Los textos se redactan para el usuario (que le sirve, que cambio),
//   nunca notas tecnicas de desarrollo.
// - `super: true` en un cambio = solo lo ve el superadmin.
// =============================================

export const VERSION_ACTUAL = '1.4.0'

export const CHANGELOG = [
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
