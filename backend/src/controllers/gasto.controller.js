const { Gasto, Proveedor, Compra } = require('../models');
const { Op } = require('sequelize');
const sequelize = require('../config/sequelize');

// Listar gastos
exports.listar = async (req, res) => {
  try {
    const { negocioId } = req.params;
    const { fechaDesde, fechaHasta, categoria } = req.query;

    const where = { negocioId };

    // Filtro por fecha
    if (fechaDesde) {
      where.fecha = {
        [Op.between]: [fechaDesde, fechaHasta || fechaDesde]
      };
    }

    // Filtro por categoría
    if (categoria) {
      where.categoria = categoria;
    }

    const gastos = await Gasto.findAll({
      where,
      include: [
        {
          model: Proveedor,
          as: 'proveedor',
          attributes: ['id', 'nombre']
        },
        {
          model: Compra,
          as: 'compra',
          attributes: ['id', 'numeroFactura', 'fecha']
        }
      ],
      order: [['fecha', 'DESC'], ['createdAt', 'DESC']]
    });

    res.json({ success: true, gastos });
  } catch (error) {
    console.error('Error al listar gastos:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener gastos',
      error: error.message
    });
  }
};

// Crear gasto
exports.crear = async (req, res) => {
  try {
    const { negocioId } = req.params;
    const {
      fecha,
      descripcion,
      monto,
      categoria,
      metodoPago,
      proveedorId,
      compraId,
      notas
    } = req.body;

    if (!descripcion || !monto) {
      return res.status(400).json({
        success: false,
        message: 'Descripción y monto son requeridos'
      });
    }

    const gasto = await Gasto.create({
      negocioId,
      fecha: fecha || new Date(),
      descripcion,
      monto,
      categoria: categoria || 'otro',
      metodoPago: metodoPago || 'efectivo',
      proveedorId,
      compraId,
      notas
    });

    // Cargar relaciones para la respuesta
    const gastoCompleto = await Gasto.findByPk(gasto.id, {
      include: [
        {
          model: Proveedor,
          as: 'proveedor',
          attributes: ['id', 'nombre']
        }
      ]
    });

    res.status(201).json({ success: true, gasto: gastoCompleto });
  } catch (error) {
    console.error('Error al crear gasto:', error);
    res.status(500).json({
      success: false,
      message: 'Error al crear gasto',
      error: error.message
    });
  }
};

// Actualizar gasto
exports.actualizar = async (req, res) => {
  try {
    const { negocioId, id } = req.params;
    const {
      fecha,
      descripcion,
      monto,
      categoria,
      metodoPago,
      proveedorId,
      notas
    } = req.body;

    const gasto = await Gasto.findOne({
      where: { id, negocioId }
    });

    if (!gasto) {
      return res.status(404).json({
        success: false,
        message: 'Gasto no encontrado'
      });
    }

    await gasto.update({
      fecha,
      descripcion,
      monto,
      categoria,
      metodoPago,
      proveedorId,
      notas
    });

    // Cargar relaciones para la respuesta
    const gastoCompleto = await Gasto.findByPk(gasto.id, {
      include: [
        {
          model: Proveedor,
          as: 'proveedor',
          attributes: ['id', 'nombre']
        }
      ]
    });

    res.json({ success: true, gasto: gastoCompleto });
  } catch (error) {
    console.error('Error al actualizar gasto:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar gasto',
      error: error.message
    });
  }
};

// Eliminar gasto
exports.eliminar = async (req, res) => {
  try {
    const { negocioId, id } = req.params;

    const gasto = await Gasto.findOne({
      where: { id, negocioId }
    });

    if (!gasto) {
      return res.status(404).json({
        success: false,
        message: 'Gasto no encontrado'
      });
    }

    // No permitir eliminar gastos vinculados a compras
    if (gasto.compraId) {
      return res.status(400).json({
        success: false,
        message: 'No se puede eliminar. Este gasto está vinculado a una compra.'
      });
    }

    await gasto.destroy();

    res.json({
      success: true,
      message: 'Gasto eliminado correctamente'
    });
  } catch (error) {
    console.error('Error al eliminar gasto:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar gasto',
      error: error.message
    });
  }
};

// Resumen de gastos
exports.resumen = async (req, res) => {
  try {
    const { negocioId } = req.params;
    const { fechaDesde, fechaHasta } = req.query;

    const where = { negocioId };

    if (fechaDesde) {
      where.fecha = {
        [Op.between]: [fechaDesde, fechaHasta || fechaDesde]
      };
    }

    // Resumen por categoría
    const resumenCategoria = await Gasto.findAll({
      where,
      attributes: [
        'categoria',
        [sequelize.fn('SUM', sequelize.col('monto')), 'total'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'cantidad']
      ],
      group: ['categoria'],
      raw: true
    });

    // Resumen por método de pago
    const resumenMetodoPago = await Gasto.findAll({
      where,
      attributes: [
        'metodoPago',
        [sequelize.fn('SUM', sequelize.col('monto')), 'total'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'cantidad']
      ],
      group: ['metodoPago'],
      raw: true
    });

    // Total general
    const totalGeneral = await Gasto.sum('monto', { where });

    res.json({
      success: true,
      resumen: {
        totalGeneral: totalGeneral || 0,
        porCategoria: resumenCategoria,
        porMetodoPago: resumenMetodoPago
      }
    });
  } catch (error) {
    console.error('Error al obtener resumen de gastos:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener resumen',
      error: error.message
    });
  }
};
