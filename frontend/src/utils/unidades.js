// Conversion de unidades de stock, unica fuente para todo el frontend
// (misma tabla que backend/src/utils/costoReceta.js).

// Factor entre unidades compatibles, bidireccional (kg<->gramo, litro<->ml).
export function factorConversion(origen, destino) {
  const conversiones = {
    kg_gramo: 1000, gramo_kg: 0.001,
    litro_ml: 1000, ml_litro: 0.001,
    kg_kg: 1, gramo_gramo: 1, litro_litro: 1, ml_ml: 1, unidad_unidad: 1
  }
  return conversiones[`${origen}_${destino}`] || 1
}

// Convierte una cantidad entre unidades compatibles (0.2 kg -> 200 gramo).
export function convertir(cantidad, de, a) {
  return (parseFloat(cantidad) || 0) * factorConversion(de, a)
}

// Unidades en las que se puede expresar una receta segun la base del ingrediente.
export function unidadesCompatibles(unidadBase) {
  if (unidadBase === 'gramo' || unidadBase === 'kg') return ['gramo', 'kg']
  if (unidadBase === 'litro' || unidadBase === 'ml') return ['litro', 'ml']
  return ['unidad']
}

// Precio de una unidad base del ingrediente ($/gramo) segun su fraccionamiento.
export function costoPorUnidadBase(ing) {
  const precioCosto = parseFloat(ing?.precioCosto) || 0
  const cantidadPorUnidad = parseFloat(ing?.cantidadPorUnidadCompra) || 1
  let cantidadTotalEnUnidadBase = cantidadPorUnidad
  if (ing?.unidadCompra === 'caja' && ing?.unidadContenidoCaja) {
    cantidadTotalEnUnidadBase = cantidadPorUnidad * factorConversion(ing.unidadContenidoCaja, ing.unidadBase)
  }
  if (cantidadTotalEnUnidadBase <= 0) return 0
  return precioCosto / cantidadTotalEnUnidadBase
}

// Costo de una lista de ingredientes de receta [{ ingrediente, cantidad, unidad }].
export function costoDeIngredientes(ingredientes) {
  let total = 0
  for (const item of ingredientes || []) {
    const ing = item.ingrediente
    if (!ing) continue
    const cantidadEnBase = convertir(item.cantidad, item.unidad || ing.unidadBase, ing.unidadBase)
    total += costoPorUnidadBase(ing) * cantidadEnBase
  }
  return total
}
