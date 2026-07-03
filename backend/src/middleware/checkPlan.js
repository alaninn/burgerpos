const { Negocio, Producto, Categoria, Repartidor, Usuario, PlanConfig } = require('../models');
const { PLANES, PRECIOS } = require('../config/planes');

// =============================================
// Planes leidos de la DB (planes_config) con cache en memoria de 60s.
// Fallback a config/planes.js si la tabla esta vacia o falla la lectura.
// =============================================
let cachePlanes = null;
let cacheTimestamp = 0;
const CACHE_TTL = 60 * 1000;

/**
 * Devuelve { estandar: {nombre, precio, limites, accesos, modulos}, premium: {...} }
 */
async function obtenerPlanes() {
  if (cachePlanes && Date.now() - cacheTimestamp < CACHE_TTL) return cachePlanes;

  try {
    const filas = await PlanConfig.findAll();
    if (filas.length > 0) {
      const planes = {};
      for (const f of filas) {
        planes[f.plan] = {
          nombre: f.nombre,
          precio: parseFloat(f.precio) || 0,
          limites: f.limites || {},
          accesos: f.accesos || {},
          modulos: f.modulos || []
        };
      }
      cachePlanes = planes;
      cacheTimestamp = Date.now();
      return planes;
    }
  } catch (err) {
    console.error('No se pudieron leer los planes de la DB, usando defaults:', err.message);
  }

  // Fallback: defaults de config/planes.js
  const planes = {};
  for (const [key, p] of Object.entries(PLANES)) {
    planes[key] = { ...p, precio: PRECIOS[key] || 0, modulos: [] };
  }
  return planes;
}

/** Invalida el cache (llamar al editar un plan desde el panel) */
function invalidarCachePlanes() {
  cachePlanes = null;
  cacheTimestamp = 0;
}

/**
 * Middleware factory que verifica que el negocio no supere los límites de su plan
 * antes de crear un recurso.
 *
 * @param {'productos'|'categorias'|'operadores'|'repartidores'} recurso
 * @param {Function} [countFn] - función opcional async (negocioId) => number
 */
const checkLimit = (recurso, countFn) => async (req, res, next) => {
  // Superadmin no tiene restricciones
  if (req.usuario?.rol === 'superadmin') return next();

  const negocioId = req.params.negocioId || req.usuario?.negocioId;
  if (!negocioId) return next();

  try {
    const negocio = await Negocio.findByPk(negocioId, { attributes: ['id', 'plan'] });
    if (!negocio) return res.status(404).json({ success: false, message: 'Negocio no encontrado' });

    const planes = await obtenerPlanes();
    const planData = planes[negocio.plan] || planes.estandar;
    const limite = planData.limites[recurso];

    if (limite === -1 || limite === undefined) return next(); // ilimitado o sin límite definido

    // Contar actuales
    let actual;
    if (countFn) {
      actual = await countFn(negocioId);
    } else {
      actual = await contarPorRecurso(recurso, negocioId);
    }

    if (actual >= limite) {
      return res.status(403).json({
        success: false,
        planLimitReached: true,
        recurso,
        limite,
        actual,
        message: `Límite de ${recurso} alcanzado para el plan ${planData.nombre} (${actual}/${limite}). Actualizá tu plan para continuar.`,
      });
    }

    next();
  } catch (err) {
    next(err);
  }
};

async function contarPorRecurso(recurso, negocioId) {
  switch (recurso) {
    case 'productos':
      return Producto.count({ where: { negocioId } });
    case 'categorias':
      return Categoria.count({ where: { negocioId } });
    case 'repartidores':
      return Repartidor.count({ where: { negocioId } });
    case 'operadores':
      return Usuario.count({ where: { negocioId, rol: 'operador' } });
    default:
      return 0;
  }
}

/**
 * Middleware factory que verifica acceso a una feature por plan.
 * @param {'monitorCocina'|'fiscal'|'reportesAvanzados'|'descuentos'|'stock'} feature
 */
const checkAcceso = (feature) => async (req, res, next) => {
  if (req.usuario?.rol === 'superadmin') return next();

  const negocioId = req.params.negocioId || req.usuario?.negocioId;
  if (!negocioId) return next();

  try {
    const negocio = await Negocio.findByPk(negocioId, { attributes: ['id', 'plan'] });
    if (!negocio) return res.status(404).json({ success: false, message: 'Negocio no encontrado' });

    const planes = await obtenerPlanes();
    const planData = planes[negocio.plan] || planes.estandar;

    if (!planData.accesos[feature]) {
      return res.status(403).json({
        success: false,
        planAccesoDenegado: true,
        feature,
        message: `La función "${feature}" no está disponible en el plan ${planData.nombre}. Actualizá tu plan.`,
      });
    }

    next();
  } catch (err) {
    next(err);
  }
};

module.exports = { checkLimit, checkAcceso, obtenerPlanes, invalidarCachePlanes };
