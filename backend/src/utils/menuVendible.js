// Distingue los productos que se venden en la tienda de los insumos de stock.
//
// El sistema usa las categorías tipo 'ingrediente' para insumos de recetas,
// pero además hay productos de stock (packaging, toppings, papelería) cargados
// en categorías vendibles con precio $0. Esos NO deben aparecer en el menú
// público ni conocerlos el bot: no se venden sueltos.
//
// Criterio: un producto es vendible si tiene un precio de venta efectivo > 0,
// ya sea su precio base o alguna variante visible con precio. Así se excluyen
// los insumos a $0 sin afectar productos reales con variantes.
function esProductoVendible(producto) {
  const p = producto?.toJSON ? producto.toJSON() : producto;
  if (!p) return false;
  if (Number(p.precioVenta) > 0) return true;
  return (p.variantes || []).some(
    (v) => v.activo !== false && v.visible !== false && Number(v.precioVenta) > 0
  );
}

// Filtra una lista de categorías (con productos anidados): quita los productos
// no vendibles y descarta las categorías que quedan vacías.
function filtrarCategoriasVendibles(categorias) {
  return (categorias || [])
    .map((cat) => {
      const c = cat?.toJSON ? cat.toJSON() : cat;
      c.productos = (c.productos || []).filter(esProductoVendible);
      return c;
    })
    .filter((c) => (c.productos || []).length > 0);
}

module.exports = { esProductoVendible, filtrarCategoriasVendibles };
