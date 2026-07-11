const { Compra, CompraItem, Proveedor, Producto, Gasto, StockMovimiento } = require('../models');
const { Op } = require('sequelize');
const sequelize = require('../config/sequelize');
const { recalcularPorIngrediente, cantidadBaseDeUnaUnidadCompra } = require('../utils/costoReceta');

// Cada item de compra puede elegir su propia unidad "en el momento" (ej: el
// producto normalmente se compra por caja, pero esta vez se compro suelto
// por kg): si el item no la especifica, se usa la config del producto como
// default. cantidadEnUnidadBaseDelItem() es la que suma/resta del stock;
// precioCostoEquivalente() reexpresa el precio pagado en la unidad de compra
// POR DEFECTO del producto, para que el costo guardado en el producto siga
// siendo comparable sin importar en que unidad se compro esta vez.
function cantidadEnUnidadBaseDelItem(item, producto) {
  const cantidad = Number(item.cantidadCompra) || 0;
  const unidadCompra = item.unidadCompra || producto.unidadCompra;
  const cantidadPorUnidad = item.cantidadPorUnidadCompra != null ? item.cantidadPorUnidadCompra : producto.cantidadPorUnidadCompra;
  const unidadContenido = item.unidadContenido || producto.unidadContenidoCaja;
  return cantidad * cantidadBaseDeUnaUnidadCompra(unidadCompra, cantidadPorUnidad, unidadContenido, producto.unidadBase);
}

function precioCostoEquivalente(item, producto) {
  const unidadCompra = item.unidadCompra || producto.unidadCompra;
  const cantidadPorUnidad = item.cantidadPorUnidadCompra != null ? item.cantidadPorUnidadCompra : producto.cantidadPorUnidadCompra;
  const unidadContenido = item.unidadContenido || producto.unidadContenidoCaja;
  const baseDeEstaCompra = cantidadBaseDeUnaUnidadCompra(unidadCompra, cantidadPorUnidad, unidadContenido, producto.unidadBase);
  if (baseDeEstaCompra <= 0) return Number(item.precioUnitario) || 0;
  const precioPorUnidadBase = (Number(item.precioUnitario) || 0) / baseDeEstaCompra;

  const baseDelDefault = cantidadBaseDeUnaUnidadCompra(producto.unidadCompra, producto.cantidadPorUnidadCompra, producto.unidadContenidoCaja, producto.unidadBase);
  return precioPorUnidadBase * baseDelDefault;
}

// Listar compras
exports.listar = async (req, res) => {
  try {
    const { negocioId } = req.params;
    const { fechaDesde, fechaHasta, proveedorId, estado } = req.query;

    const where = { negocioId };

    // Filtro por fecha
    if (fechaDesde) {
      where.fecha = {
        [Op.between]: [fechaDesde, fechaHasta || fechaDesde]
      };
    }

    // Filtro por proveedor
    if (proveedorId) {
      where.proveedorId = proveedorId;
    }

    // Filtro por estado
    if (estado) {
      where.estado = estado;
    }

    const compras = await Compra.findAll({
      where,
      include: [
        {
          model: Proveedor,
          as: 'proveedor',
          attributes: ['id', 'nombre', 'telefono']
        },
        {
          model: CompraItem,
          as: 'items',
          include: [
            {
              model: Producto,
              as: 'producto',
              attributes: ['id', 'nombre', 'imagen']
            }
          ]
        }
      ],
      order: [['fecha', 'DESC'], ['createdAt', 'DESC']]
    });

    res.json({ success: true, compras });
  } catch (error) {
    console.error('Error al listar compras:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener compras',
      error: error.message
    });
  }
};

// Obtener una compra
exports.obtener = async (req, res) => {
  try {
    const { negocioId, id } = req.params;

    const compra = await Compra.findOne({
      where: { id, negocioId },
      include: [
        {
          model: Proveedor,
          as: 'proveedor'
        },
        {
          model: CompraItem,
          as: 'items',
          include: [
            {
              model: Producto,
              as: 'producto'
            }
          ]
        }
      ]
    });

    if (!compra) {
      return res.status(404).json({
        success: false,
        message: 'Compra no encontrada'
      });
    }

    res.json({ success: true, compra });
  } catch (error) {
    console.error('Error al obtener compra:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener compra',
      error: error.message
    });
  }
};

// Crear compra con actualización automática de stock
exports.crear = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const { negocioId } = req.params;
    const {
      proveedorId,
      numeroFactura,
      tipoFactura,
      fecha,
      items,
      estado,
      pagado,
      fechaPago,
      metodoPago,
      notas,
      gastoId
    } = req.body;

    // Validaciones
    if (!proveedorId) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: 'El proveedor es requerido'
      });
    }

    if (!items || items.length === 0) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: 'Debe incluir al menos un item en la compra'
      });
    }

    // Verificar que el proveedor pertenece al negocio
    const proveedor = await Proveedor.findOne({
      where: { id: proveedorId, negocioId }
    });

    if (!proveedor) {
      await t.rollback();
      return res.status(404).json({
        success: false,
        message: 'Proveedor no encontrado'
      });
    }

    // Calcular total
    let total = 0;
    const itemsValidados = items.map(item => {
      const subtotal = Number(item.cantidadCompra) * Number(item.precioUnitario);
      total += subtotal;
      return {
        ...item,
        subtotal,
        actualizaStock: item.actualizaStock !== false
      };
    });

    // Crear compra
    const compra = await Compra.create({
      negocioId,
      proveedorId,
      numeroFactura,
      tipoFactura,
      fecha: fecha || new Date(),
      total,
      estado: estado || 'confirmada',
      pagado: pagado || false,
      fechaPago,
      metodoPago,
      notas
    }, { transaction: t });

    // Crear items
    const itemsCreados = await CompraItem.bulkCreate(
      itemsValidados.map(item => ({
        compraId: compra.id,
        productoId: item.productoId || null,
        descripcion: item.descripcion,
        cantidadCompra: item.cantidadCompra,
        unidadCompra: item.unidadCompra,
        cantidadPorUnidadCompra: item.cantidadPorUnidadCompra ?? null,
        unidadContenido: item.unidadContenido || null,
        precioUnitario: item.precioUnitario,
        subtotal: item.subtotal,
        actualizaStock: item.actualizaStock
      })),
      { transaction: t }
    );

    // *** ACTUALIZACIÓN AUTOMÁTICA DE STOCK ***
    const ingredientesActualizados = new Set();
    for (const item of itemsCreados) {
      if (item.actualizaStock && item.productoId) {
        const producto = await Producto.findByPk(item.productoId, { transaction: t });

        if (producto) {
          ingredientesActualizados.add(producto.id);
          // Cantidad en unidad base segun la unidad elegida en este item (o
          // la del producto si no se especifico otra distinta).
          const cantidadEnUnidadBase = cantidadEnUnidadBaseDelItem(item, producto);
          const nuevoStock = (Number(producto.stock) || 0) + cantidadEnUnidadBase;

          // No redondear: el stock es decimal (kg, litros). La unidad de compra
          // configurada en el producto NO se pisa con la del item: la config de
          // fraccionamiento del producto sigue siendo el default sugerido.
          await producto.update({
            stock: nuevoStock,
            precioCosto: precioCostoEquivalente(item, producto),
            ultimaCompraFecha: compra.fecha,
            ultimoCompraPrecio: item.precioUnitario,
            proveedorId: compra.proveedorId
          }, { transaction: t });

          // Registro historico del movimiento (entrada por compra)
          await StockMovimiento.create({
            negocioId,
            productoId: producto.id,
            tipo: 'compra',
            cantidad: cantidadEnUnidadBase,
            compraId: compra.id
          }, { transaction: t });

          console.log(`✓ Stock actualizado para ${producto.nombre}: +${cantidadEnUnidadBase} ${producto.unidadBase}`);
        }
      }
    }

    // Comprar un ingrediente cambia su costo: recalcular el costo de los
    // productos del menu cuyas recetas lo usan (para que la ganancia sea real).
    for (const ingredienteId of ingredientesActualizados) {
      await recalcularPorIngrediente(ingredienteId, negocioId, { transaction: t });
    }

    // Si está marcada como pagada, crear o actualizar gasto
    if (pagado && metodoPago) {
      if (gastoId) {
        // Actualizar gasto existente con el compraId
        const gasto = await Gasto.findOne({
          where: { id: gastoId, negocioId }
        }, { transaction: t });

        if (gasto) {
          await gasto.update({
            compraId: compra.id,
            proveedorId,
            monto: total,
            fecha: fechaPago || fecha || new Date(),
            metodoPago
          }, { transaction: t });
          console.log(`✓ Gasto ${gastoId} vinculado a compra ${compra.id}`);
        }
      } else {
        // Crear gasto nuevo automáticamente
        await Gasto.create({
          negocioId,
          proveedorId,
          compraId: compra.id,
          fecha: fechaPago || fecha || new Date(),
          descripcion: `Pago compra ${numeroFactura || compra.id.substring(0, 8)} - ${proveedor.nombre}`,
          monto: total,
          categoria: 'proveedores',
          metodoPago,
          tipo: 'compra',
          notas: `Gasto generado automáticamente por compra #${compra.id}`
        }, { transaction: t });
      }
    }

    // Cuenta corriente: una compra no pagada genera deuda nuestra (le debemos)
    if (!pagado) {
      await proveedor.update({
        saldoAFavor: Number(proveedor.saldoAFavor || 0) + total
      }, { transaction: t });
    }

    await t.commit();

    // Cargar compra completa para respuesta
    const compraCompleta = await Compra.findByPk(compra.id, {
      include: [
        {
          model: Proveedor,
          as: 'proveedor'
        },
        {
          model: CompraItem,
          as: 'items',
          include: [
            {
              model: Producto,
              as: 'producto',
              attributes: ['id', 'nombre', 'imagen', 'stock']
            }
          ]
        }
      ]
    });

    res.status(201).json({
      success: true,
      compra: compraCompleta,
      message: 'Compra creada y stock actualizado correctamente'
    });
  } catch (error) {
    await t.rollback();
    console.error('Error al crear compra:', error);
    res.status(500).json({
      success: false,
      message: 'Error al crear compra',
      error: error.message
    });
  }
};

// Actualizar compra: metadata siempre, e items opcionalmente (si vienen, se
// reemplazan por completo revirtiendo el stock viejo y aplicando el nuevo,
// para poder corregir una compra que quedo mal cargada).
exports.actualizar = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const { negocioId, id } = req.params;
    const {
      proveedorId,
      numeroFactura,
      tipoFactura,
      fecha,
      items,
      estado,
      pagado,
      fechaPago,
      metodoPago,
      notas
    } = req.body;

    const compra = await Compra.findOne({
      where: { id, negocioId },
      include: [
        { model: Proveedor, as: 'proveedor' },
        { model: CompraItem, as: 'items', include: [{ model: Producto, as: 'producto' }] }
      ],
      transaction: t
    });

    if (!compra) {
      await t.rollback();
      return res.status(404).json({
        success: false,
        message: 'Compra no encontrada'
      });
    }

    const eraPagada = compra.pagado;
    const totalViejo = Number(compra.total);
    const ingredientesTocados = new Set();
    let total = totalViejo;

    // Si vienen items, se reemplaza toda la carga: revertir el stock que la
    // version anterior habia sumado, borrar los items viejos y aplicar los
    // nuevos exactamente igual que al crear la compra.
    if (Array.isArray(items)) {
      for (const item of compra.items) {
        if (item.actualizaStock && item.productoId && item.producto) {
          const producto = item.producto;
          const cantidadEnUnidadBase = cantidadEnUnidadBaseDelItem(item, producto);
          await producto.update({ stock: (Number(producto.stock) || 0) - cantidadEnUnidadBase }, { transaction: t });
          await StockMovimiento.create({
            negocioId, productoId: producto.id, tipo: 'reversion_compra',
            cantidad: cantidadEnUnidadBase, compraId: compra.id
          }, { transaction: t });
          ingredientesTocados.add(producto.id);
        }
      }
      await CompraItem.destroy({ where: { compraId: compra.id }, transaction: t });

      total = 0;
      const itemsValidados = items.map(item => {
        const subtotal = Number(item.cantidadCompra) * Number(item.precioUnitario);
        total += subtotal;
        return { ...item, subtotal, actualizaStock: item.actualizaStock !== false };
      });
      const itemsCreados = await CompraItem.bulkCreate(
        itemsValidados.map(item => ({
          compraId: compra.id,
          productoId: item.productoId || null,
          descripcion: item.descripcion,
          cantidadCompra: item.cantidadCompra,
          unidadCompra: item.unidadCompra,
          cantidadPorUnidadCompra: item.cantidadPorUnidadCompra ?? null,
          unidadContenido: item.unidadContenido || null,
          precioUnitario: item.precioUnitario,
          subtotal: item.subtotal,
          actualizaStock: item.actualizaStock
        })),
        { transaction: t }
      );

      for (const item of itemsCreados) {
        if (item.actualizaStock && item.productoId) {
          const producto = await Producto.findByPk(item.productoId, { transaction: t });
          if (producto) {
            ingredientesTocados.add(producto.id);
            const cantidadEnUnidadBase = cantidadEnUnidadBaseDelItem(item, producto);
            await producto.update({
              stock: (Number(producto.stock) || 0) + cantidadEnUnidadBase,
              precioCosto: precioCostoEquivalente(item, producto),
              ultimaCompraFecha: fecha || compra.fecha,
              ultimoCompraPrecio: item.precioUnitario,
              proveedorId: proveedorId || compra.proveedorId
            }, { transaction: t });
            await StockMovimiento.create({
              negocioId, productoId: producto.id, tipo: 'compra',
              cantidad: cantidadEnUnidadBase, compraId: compra.id
            }, { transaction: t });
          }
        }
      }
    }

    await compra.update({
      proveedorId: proveedorId || compra.proveedorId,
      numeroFactura,
      tipoFactura,
      fecha,
      total,
      estado,
      pagado,
      fechaPago,
      metodoPago,
      notas
    }, { transaction: t });

    for (const ingredienteId of ingredientesTocados) {
      await recalcularPorIngrediente(ingredienteId, negocioId, { transaction: t });
    }

    // Deuda con el proveedor: recalcular segun el estado final de pago y el
    // total (puede haber cambiado si se editaron los items).
    const seMarcaPagada = pagado && !eraPagada;
    if (seMarcaPagada && metodoPago) {
      // Se paga por primera vez: crear el gasto y cancelar la deuda que tenia.
      await Gasto.create({
        negocioId,
        proveedorId: compra.proveedorId,
        compraId: compra.id,
        fecha: fechaPago || fecha || new Date(),
        descripcion: `Pago compra ${numeroFactura || compra.id.substring(0, 8)} - ${compra.proveedor.nombre}`,
        monto: total,
        categoria: 'proveedores',
        metodoPago,
        tipo: 'compra',
        notas: `Gasto generado automáticamente al marcar compra como pagada`
      }, { transaction: t });

      const prov = await Proveedor.findOne({ where: { id: compra.proveedorId, negocioId }, transaction: t });
      if (prov) {
        await prov.update({ saldoAFavor: Number(prov.saldoAFavor || 0) - totalViejo }, { transaction: t });
      }
    } else if (pagado && eraPagada && total !== totalViejo) {
      // Ya estaba pagada y se corrigio el monto: ajustar el gasto vinculado.
      const gasto = await Gasto.findOne({ where: { compraId: compra.id, negocioId }, transaction: t });
      if (gasto) await gasto.update({ monto: total }, { transaction: t });
    } else if (!pagado && eraPagada) {
      // Se desmarca como pagada (estaba paga y ahora vuelve a ser deuda):
      // borrar el gasto que se habia generado y reponer la deuda.
      await Gasto.destroy({ where: { compraId: compra.id, negocioId }, transaction: t });
      const prov = await Proveedor.findOne({ where: { id: compra.proveedorId, negocioId }, transaction: t });
      if (prov) {
        await prov.update({ saldoAFavor: Number(prov.saldoAFavor || 0) + total }, { transaction: t });
      }
    } else if (!pagado && total !== totalViejo) {
      // Sigue como deuda y cambio el total: ajustar la diferencia.
      const prov = await Proveedor.findOne({ where: { id: compra.proveedorId, negocioId }, transaction: t });
      if (prov) {
        await prov.update({ saldoAFavor: Number(prov.saldoAFavor || 0) + (total - totalViejo) }, { transaction: t });
      }
    }

    await t.commit();

    // Cargar compra actualizada
    const compraActualizada = await Compra.findByPk(compra.id, {
      include: [
        {
          model: Proveedor,
          as: 'proveedor'
        },
        {
          model: CompraItem,
          as: 'items',
          include: [
            {
              model: Producto,
              as: 'producto'
            }
          ]
        }
      ]
    });

    res.json({
      success: true,
      compra: compraActualizada,
      message: seMarcaPagada ? 'Compra actualizada y gasto registrado' : 'Compra actualizada correctamente'
    });
  } catch (error) {
    await t.rollback();
    console.error('Error al actualizar compra:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar compra',
      error: error.message
    });
  }
};

// Eliminar compra con reversión de stock
exports.eliminar = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const { negocioId, id } = req.params;

    const compra = await Compra.findOne({
      where: { id, negocioId },
      include: [
        {
          model: CompraItem,
          as: 'items',
          include: [
            {
              model: Producto,
              as: 'producto'
            }
          ]
        }
      ],
      transaction: t
    });

    if (!compra) {
      await t.rollback();
      return res.status(404).json({
        success: false,
        message: 'Compra no encontrada'
      });
    }

    // *** REVERSIÓN DE STOCK ***
    // Resta exactamente lo que la compra habia sumado (misma conversion que al
    // crear). Sin redondeo y puede quedar negativo si ya se consumio.
    for (const item of compra.items) {
      if (item.actualizaStock && item.productoId && item.producto) {
        const producto = item.producto;
        const cantidadEnUnidadBase = cantidadEnUnidadBaseDelItem(item, producto);
        const nuevoStock = (Number(producto.stock) || 0) - cantidadEnUnidadBase;

        await producto.update({ stock: nuevoStock }, { transaction: t });

        await StockMovimiento.create({
          negocioId,
          productoId: producto.id,
          tipo: 'reversion_compra',
          cantidad: cantidadEnUnidadBase,
          compraId: compra.id
        }, { transaction: t });

        console.log(`✓ Stock revertido para ${producto.nombre}: -${cantidadEnUnidadBase} ${producto.unidadBase}`);
      }
    }

    // Revertir la deuda que una compra no pagada habia generado
    if (!compra.pagado) {
      const prov = await Proveedor.findOne({ where: { id: compra.proveedorId, negocioId }, transaction: t });
      if (prov) {
        await prov.update({ saldoAFavor: Math.max(0, Number(prov.saldoAFavor || 0) - Number(compra.total)) }, { transaction: t });
      }
    }

    // Eliminar gastos vinculados
    await Gasto.destroy({
      where: { compraId: id },
      transaction: t
    });

    // Eliminar compra (items se eliminan en cascada)
    await compra.destroy({ transaction: t });

    await t.commit();

    res.json({
      success: true,
      message: 'Compra eliminada y stock revertido correctamente'
    });
  } catch (error) {
    await t.rollback();
    console.error('Error al eliminar compra:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar compra',
      error: error.message
    });
  }
};
