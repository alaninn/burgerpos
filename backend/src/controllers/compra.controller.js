const { Compra, CompraItem, Proveedor, Producto, Gasto } = require('../models');
const { Op } = require('sequelize');
const sequelize = require('../config/sequelize');
const { recalcularPorIngrediente } = require('../utils/costoReceta');

// Función auxiliar para calcular factor de conversión entre unidades
function calcularFactorConversion(unidadOrigen, unidadDestino) {
  const conversiones = {
    'kg_gramo': 1000,
    'litro_litro': 1,
    'kg_kg': 1,
    'gramo_gramo': 1,
    'unidad_unidad': 1
  };
  const key = `${unidadOrigen}_${unidadDestino}`;
  return conversiones[key] || 1;
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
          // Calcular cantidad en unidad base
          let cantidadEnUnidadBase;
          const cantidadCompra = Number(item.cantidadCompra);
          const cantidadPorUnidad = Number(producto.cantidadPorUnidadCompra) || 1;

          // Si es caja y tiene unidadContenidoCaja, hacer conversión
          if (producto.unidadCompra === 'caja' && producto.unidadContenidoCaja) {
            const factorConversion = calcularFactorConversion(producto.unidadContenidoCaja, producto.unidadBase);
            cantidadEnUnidadBase = cantidadCompra * cantidadPorUnidad * factorConversion;
          } else {
            cantidadEnUnidadBase = cantidadCompra * cantidadPorUnidad;
          }

          const nuevoStock = (Number(producto.stock) || 0) + cantidadEnUnidadBase;

          // Actualizar producto
          await producto.update({
            stock: Math.round(nuevoStock),
            precioCosto: item.precioUnitario,
            ultimaCompraFecha: compra.fecha,
            ultimoCompraPrecio: item.precioUnitario,
            unidadCompra: item.unidadCompra,
            proveedorId: compra.proveedorId
          }, { transaction: t });

          console.log(`✓ Stock actualizado para ${producto.nombre}: +${cantidadEnUnidadBase} ${producto.unidadBase} (${item.cantidadCompra} × ${cantidadPorUnidad})`);
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

// Actualizar compra (solo metadata, NO items)
exports.actualizar = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const { negocioId, id } = req.params;
    const {
      numeroFactura,
      fecha,
      estado,
      pagado,
      fechaPago,
      metodoPago,
      notas
    } = req.body;

    const compra = await Compra.findOne({
      where: { id, negocioId },
      include: [
        {
          model: Proveedor,
          as: 'proveedor'
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

    // Si se marca como pagada por primera vez, crear gasto
    const eraPagada = compra.pagado;
    const seMarcaPagada = pagado && !eraPagada;

    await compra.update({
      numeroFactura,
      fecha,
      estado,
      pagado,
      fechaPago,
      metodoPago,
      notas
    }, { transaction: t });

    // Crear gasto si se marca como pagada
    if (seMarcaPagada && metodoPago) {
      await Gasto.create({
        negocioId,
        proveedorId: compra.proveedorId,
        compraId: compra.id,
        fecha: fechaPago || fecha || new Date(),
        descripcion: `Pago compra ${numeroFactura || compra.id.substring(0, 8)} - ${compra.proveedor.nombre}`,
        monto: compra.total,
        categoria: 'proveedores',
        metodoPago,
        tipo: 'compra',
        notas: `Gasto generado automáticamente al marcar compra como pagada`
      }, { transaction: t });

      // Se cancela la deuda que la compra habia generado
      const prov = await Proveedor.findOne({ where: { id: compra.proveedorId, negocioId }, transaction: t });
      if (prov) {
        await prov.update({ saldoAFavor: Math.max(0, Number(prov.saldoAFavor || 0) - Number(compra.total)) }, { transaction: t });
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
    for (const item of compra.items) {
      if (item.actualizaStock && item.productoId && item.producto) {
        const producto = item.producto;
        const factorConversion = Number(producto.factorConversion) || 1;
        const cantidadEnUnidadVenta = Number(item.cantidadCompra) * factorConversion;
        const nuevoStock = Math.max(0, (Number(producto.stock) || 0) - cantidadEnUnidadVenta);

        await producto.update({
          stock: Math.round(nuevoStock)
        }, { transaction: t });

        console.log(`✓ Stock revertido para ${producto.nombre}: -${cantidadEnUnidadVenta}`);
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
