/**
 * Definición de planes SaaS y sus límites.
 * -1 = ilimitado
 */
// Precios mensuales en ARS
const PRECIOS = {
  estandar: 15000,
  premium:  35000,
};

const PLANES = {
  estandar: {
    nombre: 'Estándar',
    limites: {
      productos:   30,
      categorias:  8,
      operadores:  2,
      repartidores: 3,
    },
    accesos: {
      monitorCocina:      false,
      fiscal:             false,
      reportesAvanzados:  false,
      descuentos:         false,
      stock:              false,
    },
  },
  premium: {
    nombre: 'Premium',
    limites: {
      productos:   -1,
      categorias:  -1,
      operadores:  -1,
      repartidores: -1,
    },
    accesos: {
      monitorCocina:      true,
      fiscal:             true,
      reportesAvanzados:  true,
      descuentos:         true,
      stock:              true,
    },
  },
};

module.exports = { PLANES, PRECIOS };
