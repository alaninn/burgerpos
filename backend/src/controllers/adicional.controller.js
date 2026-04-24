const { GrupoAdicional, Adicional, Producto, sequelize } = require('../models');

// ── Listar todos los grupos del negocio ───────────────────
exports.listarGrupos = async (req, res) => {
  try {
    const grupos = await GrupoAdicional.findAll({
      where: { negocioId: req.params.negocioId },
      include: [
        { model: Adicional, as: 'items', order: [['orden', 'ASC']], separate: true },
        { model: Producto, as: 'productos', attributes: ['id'], through: { attributes: [] } }
      ],
      order: [['orden', 'ASC'], ['titulo', 'ASC']]
    });
    res.json({ success: true, grupos });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Crear grupo ───────────────────────────────────────────
exports.crearGrupo = async (req, res) => {
  try {
    const { titulo, obligatorio, minSeleccion, maxSeleccion, items, productoIds } = req.body;
    const negocioId = req.params.negocioId;

    const grupo = await GrupoAdicional.create({
      negocioId, titulo, obligatorio, minSeleccion, maxSeleccion
    });

    // Crear los items del grupo
    if (items && items.length > 0) {
      await Adicional.bulkCreate(items.map((item, i) => ({
        ...item,
        grupoAdicionalId: grupo.id,
        negocioId,
        orden: i
      })));
    }

    // Asignar a productos si se enviaron
    if (productoIds && productoIds.length > 0) {
      const productos = await Producto.findAll({ where: { id: productoIds, negocioId } });
      await grupo.setProductos(productos);
    }

    const grupoCompleto = await GrupoAdicional.findByPk(grupo.id, {
      include: [{ model: Adicional, as: 'items' }]
    });
    res.status(201).json({ success: true, grupo: grupoCompleto });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Actualizar grupo ──────────────────────────────────────
exports.actualizarGrupo = async (req, res) => {
  try {
    const { titulo, obligatorio, minSeleccion, maxSeleccion, items, productoIds, activo } = req.body;
    const negocioId = req.params.negocioId;
    const grupo = await GrupoAdicional.findOne({ where: { id: req.params.grupoId, negocioId } });
    if (!grupo) return res.status(404).json({ success: false, message: 'Grupo no encontrado' });

    await grupo.update({ titulo, obligatorio, minSeleccion, maxSeleccion, activo });

    // Reemplazar items si se enviaron
    if (items !== undefined) {
      await Adicional.destroy({ where: { grupoAdicionalId: grupo.id } });
      if (items.length > 0) {
        await Adicional.bulkCreate(items.map((item, i) => ({
          ...item,
          grupoAdicionalId: grupo.id,
          negocioId,
          orden: i
        })));
      }
    }

    // Actualizar productos asignados
    if (productoIds !== undefined) {
      const productos = await Producto.findAll({ where: { id: productoIds, negocioId } });
      await grupo.setProductos(productos);
    }

    const grupoCompleto = await GrupoAdicional.findByPk(grupo.id, {
      include: [{ model: Adicional, as: 'items' }]
    });
    res.json({ success: true, grupo: grupoCompleto });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Eliminar grupo ────────────────────────────────────────
exports.eliminarGrupo = async (req, res) => {
  try {
    const negocioId = req.params.negocioId;
    const grupo = await GrupoAdicional.findOne({ where: { id: req.params.grupoId, negocioId } });
    if (!grupo) return res.status(404).json({ success: false, message: 'Grupo no encontrado' });
    await grupo.destroy();
    res.json({ success: true, message: 'Grupo eliminado' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Obtener grupos asignados a un producto ────────────────
exports.gruposPorProducto = async (req, res) => {
  try {
    const producto = await Producto.findOne({
      where: { id: req.params.productoId, negocioId: req.params.negocioId },
      include: [{
        model: GrupoAdicional,
        as: 'gruposAdicionales',
        include: [{ model: Adicional, as: 'items', order: [['orden', 'ASC']] }]
      }]
    });
    if (!producto) return res.status(404).json({ success: false, message: 'Producto no encontrado' });
    res.json({ success: true, grupos: producto.gruposAdicionales || [] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Asignar/desasignar grupos a un producto ───────────────
exports.asignarGrupos = async (req, res) => {
  try {
    const { grupoIds } = req.body;
    const negocioId = req.params.negocioId;
    const producto = await Producto.findOne({ where: { id: req.params.productoId, negocioId } });
    if (!producto) return res.status(404).json({ success: false, message: 'Producto no encontrado' });

    if (grupoIds !== undefined) {
      const grupos = grupoIds.length > 0
        ? await GrupoAdicional.findAll({ where: { id: grupoIds, negocioId } })
        : [];
      await producto.setGruposAdicionales(grupos);
    }

    res.json({ success: true, message: 'Grupos actualizados' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
