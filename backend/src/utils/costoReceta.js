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

// Cuanto equivale 1 unidad de compra en la unidad base, dado su
// fraccionamiento. Si la unidad de compra ya es del mismo grupo que la base
// (ej: comprar directo en kg con base gramo) se convierte directo sin
// necesitar "contenido" (caja/bulto). Si no (caja, bulto/paquete), usa el
// contenido declarado (cantidadPorUnidadCompra + unidadContenido).
function cantidadBaseDeUnaUnidadCompra(unidadCompra, cantidadPorUnidadCompra, unidadContenido, unidadBase) {
  if (unidadesCompatibles(unidadBase).includes(unidadCompra)) {
    return factorConversion(unidadCompra, unidadBase);
  }
  const contenido = unidadContenido || unidadBase;
  const cantidad = parseFloat(cantidadPorUnidadCompra) || 1;
  return cantidad * factorConversion(contenido, unidadBase);
}

// Precio de una unidad base del ingrediente (ej: $/gramo) a partir de su
// precioCosto (precio de la unidad de compra) y su fraccionamiento.
function costoPorUnidadBase(ing) {
  const precioCosto = parseFloat(ing.precioCosto) || 0;
  const cantidadTotalEnUnidadBase = cantidadBaseDeUnaUnidadCompra(
    ing.unidadCompra, ing.cantidadPorUnidadCompra, ing.unidadContenidoCaja, ing.unidadBase
  );
  if (cantidadTotalEnUnidadBase <= 0) return 0;
  return precioCosto / cantidadTotalEnUnidadBase;
}

// Costo total de fabricar el producto de la receta (suma de sus ingredientes).
// La receta debe venir con `ingredientes` incluidos y cada uno con `ingrediente`.
// La cantidad de cada ingrediente puede estar en una unidad compatible distinta
// de la base (ej. 0.2 kg con base gramo): se convierte antes de costear.
function costoDeReceta(receta) {
  const extra = parseFloat(receta?.extraCosto) || 0;
  if (!receta?.ingredientes?.length) return Number(extra.toFixed(2));
  let total = 0;
  for (const item of receta.ingredientes) {
    const ing = item.ingrediente;
    if (!ing) continue;
    const cantidadEnBase = convertir(item.cantidad, item.unidad || ing.unidadBase, ing.unidadBase);
    total += costoPorUnidadBase(ing) * cantidadEnBase;
  }
  // Extra fijo por merma/preparaciones que no se descuentan del stock
  total += extra;
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
// Si la receta es "especial" (cantidadProducida > 0, ej. una salsa que rinde
// 500 gramos), el costo se guarda POR UNIDAD BASE (costo total / cantidad
// producida) para que el producto resultante sea usable como ingrediente de
// otras recetas con el mismo motor de costos (costoPorUnidadBase).
async function persistirCostoReceta(receta, { transaction, visitados } = {}) {
  await cargarIngredientes(receta, transaction);
  const costoTotal = costoDeReceta(receta);
  const cantidadProducida = parseFloat(receta.cantidadProducida) || 0;
  const costo = cantidadProducida > 0 ? Number((costoTotal / cantidadProducida).toFixed(2)) : costoTotal;

  let productoAfectadoId = null;
  if (receta.varianteId) {
    await ProductoVariante.update({ precioCosto: costo }, { where: { id: receta.varianteId }, transaction });
  } else if (receta.productoMenuId) {
    await Producto.update({ precioCosto: costo }, { where: { id: receta.productoMenuId }, transaction });
    productoAfectadoId = receta.productoMenuId;
  }

  // Cascada: si este producto es una receta especial (ej. una salsa) y se
  // usa como ingrediente en OTRAS recetas, su costo cambio y hay que
  // recalcular esas tambien. `visitados` evita loops infinitos si alguna
  // vez se forma un ciclo entre recetas especiales.
  if (productoAfectadoId && receta.negocioId) {
    const vistos = visitados || new Set();
    if (!vistos.has(receta.id)) {
      vistos.add(receta.id);
      await recalcularPorIngrediente(productoAfectadoId, receta.negocioId, { transaction, visitados: vistos });
    }
  }
  return costo;
}

// Cuando cambia el costo de un ingrediente (ej: por una compra, o por una
// receta especial que se recalculo), recalcula el costo de todas las
// recetas (del menu o especiales) que lo usan.
async function recalcularPorIngrediente(ingredienteId, negocioId, { transaction, visitados } = {}) {
  const usos = await RecetaIngrediente.findAll({
    where: { ingredienteId },
    include: [{ model: Receta, as: 'receta', where: { negocioId }, required: true, attributes: ['id', 'productoMenuId', 'varianteId', 'negocioId', 'cantidadProducida', 'extraCosto'] }],
    transaction
  });
  const recetaIds = [...new Set(usos.map(u => u.receta.id))];
  for (const recetaId of recetaIds) {
    if (visitados && visitados.has(recetaId)) continue;
    const receta = await Receta.findByPk(recetaId, {
      include: [{ model: RecetaIngrediente, as: 'ingredientes', include: [{ model: Producto, as: 'ingrediente' }] }],
      transaction
    });
    if (receta) await persistirCostoReceta(receta, { transaction, visitados });
  }
  return recetaIds.length;
}

module.exports = { factorConversion, convertir, unidadesCompatibles, cantidadBaseDeUnaUnidadCompra, costoPorUnidadBase, costoDeReceta, persistirCostoReceta, recalcularPorIngrediente };
