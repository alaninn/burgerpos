// Motor de costo por receta. Unica fuente de verdad para calcular cuanto cuesta
// fabricar un producto del menu a partir de sus ingredientes de stock, y para
// persistir ese costo en el producto/variante (que es lo que usa el Centro de
// Control para la ganancia). Misma formula que el frontend (Recetas.jsx).

const { Receta, RecetaIngrediente, Producto, ProductoVariante } = require('../models');

// Conversion entre unidades de masa/volumen, bidireccional.
// kg <-> gramo y litro <-> ml; misma unidad = 1.
function factorConversion(origen, destino) {
  const conversiones = {
    kg_gramo: 1000, gramo_kg: 0.001,
    litro_ml: 1000, ml_litro: 0.001,
    kg_kg: 1, gramo_gramo: 1, litro_litro: 1, ml_ml: 1, unidad_unidad: 1
  };
  return conversiones[`${origen}_${destino}`] || 1;
}

// Convierte una cantidad de una unidad a otra compatible (0.2 kg -> 200 gramo).
function convertir(cantidad, de, a) {
  return (parseFloat(cantidad) || 0) * factorConversion(de, a);
}

// Unidades en las que se puede expresar una receta segun la unidad base del
// ingrediente (el usuario elige, ej. 0.2 kg en vez de 200 gramo).
function unidadesCompatibles(unidadBase) {
  if (unidadBase === 'gramo' || unidadBase === 'kg') return ['gramo', 'kg'];
  if (unidadBase === 'litro' || unidadBase === 'ml') return ['litro', 'ml'];
  return ['unidad'];
}

// Precio de una unidad base del ingrediente (ej: $/gramo) a partir de su
// precioCosto (precio de la unidad de compra) y su fraccionamiento.
function costoPorUnidadBase(ing) {
  const precioCosto = parseFloat(ing.precioCosto) || 0;
  const cantidadPorUnidad = parseFloat(ing.cantidadPorUnidadCompra) || 1;
  let cantidadTotalEnUnidadBase = cantidadPorUnidad;
  if (ing.unidadCompra === 'caja' && ing.unidadContenidoCaja) {
    cantidadTotalEnUnidadBase = cantidadPorUnidad * factorConversion(ing.unidadContenidoCaja, ing.unidadBase);
  }
  if (cantidadTotalEnUnidadBase <= 0) return 0;
  return precioCosto / cantidadTotalEnUnidadBase;
}

// Costo total de fabricar el producto de la receta (suma de sus ingredientes).
// La receta debe venir con `ingredientes` incluidos y cada uno con `ingrediente`.
// La cantidad de cada ingrediente puede estar en una unidad compatible distinta
// de la base (ej. 0.2 kg con base gramo): se convierte antes de costear.
function costoDeReceta(receta) {
  if (!receta?.ingredientes?.length) return 0;
  let total = 0;
  for (const item of receta.ingredientes) {
    const ing = item.ingrediente;
    if (!ing) continue;
    const cantidadEnBase = convertir(item.cantidad, item.unidad || ing.unidadBase, ing.unidadBase);
    total += costoPorUnidadBase(ing) * cantidadEnBase;
  }
  return Number(total.toFixed(2));
}

// Carga los ingredientes de una receta si no los trae (con su Producto ingrediente).
async function cargarIngredientes(receta, transaction) {
  if (receta.ingredientes) return receta;
  const ingredientes = await RecetaIngrediente.findAll({
    where: { recetaId: receta.id },
    include: [{ model: Producto, as: 'ingrediente' }],
    transaction
  });
  receta.ingredientes = ingredientes;
  return receta;
}

// Recalcula el costo de la receta y lo escribe en el precioCosto del destino:
// la variante si la receta es de una variante, si no el producto del menu.
async function persistirCostoReceta(receta, { transaction } = {}) {
  await cargarIngredientes(receta, transaction);
  const costo = costoDeReceta(receta);

  if (receta.varianteId) {
    await ProductoVariante.update({ precioCosto: costo }, { where: { id: receta.varianteId }, transaction });
  } else if (receta.productoMenuId) {
    await Producto.update({ precioCosto: costo }, { where: { id: receta.productoMenuId }, transaction });
  }
  return costo;
}

// Cuando cambia el costo de un ingrediente (ej: por una compra), recalcula el
// costo de todos los productos del menu cuyas recetas usan ese ingrediente.
async function recalcularPorIngrediente(ingredienteId, negocioId, { transaction } = {}) {
  const usos = await RecetaIngrediente.findAll({
    where: { ingredienteId },
    include: [{ model: Receta, as: 'receta', where: { negocioId }, required: true, attributes: ['id', 'productoMenuId', 'varianteId'] }],
    transaction
  });
  const recetaIds = [...new Set(usos.map(u => u.receta.id))];
  for (const recetaId of recetaIds) {
    const receta = await Receta.findByPk(recetaId, {
      include: [{ model: RecetaIngrediente, as: 'ingredientes', include: [{ model: Producto, as: 'ingrediente' }] }],
      transaction
    });
    if (receta) await persistirCostoReceta(receta, { transaction });
  }
  return recetaIds.length;
}

module.exports = { factorConversion, convertir, unidadesCompatibles, costoPorUnidadBase, costoDeReceta, persistirCostoReceta, recalcularPorIngrediente };
