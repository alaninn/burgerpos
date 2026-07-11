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

// Cuanto equivale 1 unidad de compra en la unidad base, dado su
// fraccionamiento. Si la unidad de compra ya es del mismo grupo que la base
// se convierte directo (ej: comprar en kg con base gramo). Si no (caja,
// bulto/paquete), usa el contenido declarado.
export function cantidadBaseDeUnaUnidadCompra(unidadCompra, cantidadPorUnidadCompra, unidadContenido, unidadBase) {
  if (unidadesCompatibles(unidadBase).includes(unidadCompra)) {
    return factorConversion(unidadCompra, unidadBase)
  }
  const contenido = unidadContenido || unidadBase
  const cantidad = parseFloat(cantidadPorUnidadCompra) || 1
  return cantidad * factorConversion(contenido, unidadBase)
}

// Dado el grupo de unidad de compra (o del contenido de la caja), devuelve la
// unidad base compatible: si la base actual ya es del mismo grupo se respeta,
// si no se sugiere la primera del grupo. Evita quedar con una combinacion
// invalida (ej: contenido "kg" con base "unidad") que hace fallar la conversion.
export function unidadBaseCompatible(unidadGrupo, baseActual) {
  const grupo = unidadesCompatibles(unidadGrupo)
  return grupo.includes(baseActual) ? baseActual : grupo[0]
}

// Precio de una unidad base del ingrediente ($/gramo) segun su fraccionamiento.
export function costoPorUnidadBase(ing) {
  const precioCosto = parseFloat(ing?.precioCosto) || 0
  const cantidadTotalEnUnidadBase = cantidadBaseDeUnaUnidadCompra(
    ing?.unidadCompra, ing?.cantidadPorUnidadCompra, ing?.unidadContenidoCaja, ing?.unidadBase
  )
  if (cantidadTotalEnUnidadBase <= 0) return 0
  return precioCosto / cantidadTotalEnUnidadBase
}

// Costo de una lista de ingredientes de receta [{ ingrediente, cantidad, unidad }].
// extra: monto fijo ($) que se suma para cubrir merma/preparaciones no medidas.
export function costoDeIngredientes(ingredientes, extra = 0) {
  let total = 0
  for (const item of ingredientes || []) {
    const ing = item.ingrediente
    if (!ing) continue
    const cantidadEnBase = convertir(item.cantidad, item.unidad || ing.unidadBase, ing.unidadBase)
    total += costoPorUnidadBase(ing) * cantidadEnBase
  }
  return total + (parseFloat(extra) || 0)
}
