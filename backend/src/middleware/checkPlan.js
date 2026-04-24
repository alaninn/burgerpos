const { Negocio, Producto, Categoria, Repartidor, Usuario } = require('../models');
const { PLANES } = require('../config/planes');

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

    const planData = PLANES[negocio.plan] || PLANES.estandar;
    const limite = planData.limites[recurso];

    if (limite === -1) return next(); // ilimitado

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

    const planData = PLANES[negocio.plan] || PLANES.estandar;

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

module.exports = { checkLimit, checkAcceso };
