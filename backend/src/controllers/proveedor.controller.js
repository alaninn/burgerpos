const { Proveedor, Producto } = require('../models');

// Listar todos los proveedores
exports.listar = async (req, res) => {
  try {
    const { negocioId } = req.params;
    const { activo } = req.query;

    const where = { negocioId };
    if (activo !== undefined) {
      where.activo = activo === 'true';
    }

    const proveedores = await Proveedor.findAll({
      where,
      order: [['nombre', 'ASC']]
    });

    res.json({ success: true, proveedores });
  } catch (error) {
    console.error('Error al listar proveedores:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener proveedores',
      error: error.message
    });
  }
};

// Crear proveedor
exports.crear = async (req, res) => {
  try {
    const { negocioId } = req.params;
    const { nombre, contacto, telefono, email, direccion, notas, activo } = req.body;

    if (!nombre) {
      return res.status(400).json({
        success: false,
        message: 'El nombre del proveedor es requerido'
      });
    }

    const proveedor = await Proveedor.create({
      negocioId,
      nombre,
      contacto,
      telefono,
      email,
      direccion,
      notas,
      activo: activo !== undefined ? activo : true
    });

    res.status(201).json({ success: true, proveedor });
  } catch (error) {
    console.error('Error al crear proveedor:', error);
    res.status(500).json({
      success: false,
      message: 'Error al crear proveedor',
      error: error.message
    });
  }
};

// Actualizar proveedor
exports.actualizar = async (req, res) => {
  try {
    const { negocioId, id } = req.params;
    const { nombre, contacto, telefono, email, direccion, notas, activo } = req.body;

    const proveedor = await Proveedor.findOne({
      where: { id, negocioId }
    });

    if (!proveedor) {
      return res.status(404).json({
        success: false,
        message: 'Proveedor no encontrado'
      });
    }

    await proveedor.update({
      nombre,
      contacto,
      telefono,
      email,
      direccion,
      notas,
      activo
    });

    res.json({ success: true, proveedor });
  } catch (error) {
    console.error('Error al actualizar proveedor:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar proveedor',
      error: error.message
    });
  }
};

// Eliminar proveedor
exports.eliminar = async (req, res) => {
  try {
    const { negocioId, id } = req.params;

    const proveedor = await Proveedor.findOne({
      where: { id, negocioId }
    });

    if (!proveedor) {
      return res.status(404).json({
        success: false,
        message: 'Proveedor no encontrado'
      });
    }

    // Verificar si tiene productos asociados
    const productosCount = await Producto.count({
      where: { proveedorId: id }
    });

    if (productosCount > 0) {
      return res.status(400).json({
        success: false,
        message: `No se puede eliminar. Hay ${productosCount} producto(s) asociado(s) a este proveedor.`
      });
    }

    await proveedor.destroy();

    res.json({
      success: true,
      message: 'Proveedor eliminado correctamente'
    });
  } catch (error) {
    console.error('Error al eliminar proveedor:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar proveedor',
      error: error.message
    });
  }
};
