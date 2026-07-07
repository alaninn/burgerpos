// Descuento automatico de stock al vender, compartido por el POS
// (pedido.controller) y la tienda online (menu.controller):
// 1) RECETAS: cada item con receta descuenta sus ingredientes (con conversion
//    de unidades, ej. 0.2 kg -> 200 g).
// 2) ADICIONALES: un adicional vinculado a un ingrediente (medallon extra =
//    100 g de carne, ketchup = 15 g) descuenta su stock aunque no este en la
//    receta.
// La venta NUNCA se bloquea por falta de stock: el ingrediente puede quedar
// negativo (faltante visible en Stock). Cada descuento deja un registro en
// stock_movimientos para el desglose del Centro de Control.

const { Producto, Receta, RecetaIngrediente, ProductoVariante, Adicional, StockMovimiento } = require('../models');
const { convertir } = require('./costoReceta');

// items: [{ productoId, nombre, varianteNombre, cantidad, adicionales: [{id|adicionalId, nombre, cantidad}] }]
async function descontarStockPedido({ negocioId, pedidoId, items, transaction }) {
  for (const item of items || []) {
    // ── 1) Receta del producto (o de su variante) ──────────
    if (item.productoId) {
      const whereClause = { productoMenuId: item.productoId };

      if (item.varianteNombre) {
        const variante = await ProductoVariante.findOne({
          where: { productoId: item.productoId, nombre: item.varianteNombre },
          transaction
        });
        whereClause.varianteId = variante ? variante.id : null;
      } else {
        whereClause.varianteId = null;
      }

      let receta = await Receta.findOne({
        where: whereClause,
        include: [{
          model: RecetaIngrediente,
          as: 'ingredientes',
          include: [{ model: Producto, as: 'ingrediente' }]
        }],
        transaction
      });

      // Sin receta especifica de la variante: fallback a la receta base
      if (!receta && item.varianteNombre) {
        receta = await Receta.findOne({
          where: { productoMenuId: item.productoId, varianteId: null },
          include: [{
            model: RecetaIngrediente,
            as: 'ingredientes',
            include: [{ model: Producto, as: 'ingrediente' }]
          }],
          transaction
        });
        if (receta) console.log(`⚠️ Usando receta base para ${item.nombre} (${item.varianteNombre})`);
      }

      if (receta?.ingredientes?.length > 0) {
        for (const recetaIng of receta.ingredientes) {
          const ingrediente = recetaIng.ingrediente;
          if (!ingrediente) continue;
          const cantidadEnBase = convertir(recetaIng.cantidad, recetaIng.unidad || ingrediente.unidadBase, ingrediente.unidadBase);
          const cantidadADescontar = cantidadEnBase * (item.cantidad || 1);
          const nuevoStock = (parseFloat(ingrediente.stock) || 0) - cantidadADescontar;

          await Producto.update({ stock: nuevoStock }, { where: { id: ingrediente.id }, transaction });
          await StockMovimiento.create({
            negocioId, productoId: ingrediente.id, tipo: 'venta',
            cantidad: cantidadADescontar, pedidoId
          }, { transaction });

          console.log(`✓ Stock descontado: ${ingrediente.nombre} -${cantidadADescontar} ${ingrediente.unidadBase} (Receta: ${receta.nombre}, Pedido: ${item.nombre} x${item.cantidad})`);
        }
      }
    }

    // ── 2) Adicionales vinculados a un ingrediente ─────────
    for (const adic of (item.adicionales || [])) {
      try {
        const adicionalId = adic.id || adic.adicionalId;
        let registro = null;
        if (adicionalId) {
          registro = await Adicional.findOne({
            where: { id: adicionalId, negocioId },
            include: [{ model: Producto, as: 'ingrediente' }],
            transaction
          });
        }
        // Fallback por nombre (carritos viejos sin id o items recreados al editar el grupo)
        if (!registro && adic.nombre) {
          registro = await Adicional.findOne({
            where: { negocioId, nombre: adic.nombre, activo: true },
            include: [{ model: Producto, as: 'ingrediente' }],
            transaction
          });
        }
        if (!registro?.ingredienteId || !registro.ingrediente) continue;

        const ing = registro.ingrediente;
        const cantPorUnidad = convertir(
          registro.cantidadIngrediente || 0,
          registro.unidadIngrediente || ing.unidadBase,
          ing.unidadBase
        );
        if (cantPorUnidad <= 0) continue;

        const unidadesPedidas = (parseFloat(adic.cantidad) || 1) * (item.cantidad || 1);
        const totalADescontar = cantPorUnidad * unidadesPedidas;
        const nuevoStock = (parseFloat(ing.stock) || 0) - totalADescontar;

        await Producto.update({ stock: nuevoStock }, { where: { id: ing.id }, transaction });
        await StockMovimiento.create({
          negocioId, productoId: ing.id, tipo: 'venta',
          cantidad: totalADescontar, pedidoId
        }, { transaction });

        console.log(`✓ Stock descontado por adicional: ${ing.nombre} -${totalADescontar} ${ing.unidadBase} (${registro.nombre} x${unidadesPedidas})`);
      } catch (adicError) {
        // Un adicional mal configurado no puede frenar la venta
        console.error('⚠️ Error descontando stock de adicional:', adicError.message);
      }
    }
  }
}

module.exports = { descontarStockPedido };
