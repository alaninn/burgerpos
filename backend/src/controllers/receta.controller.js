const { Receta, RecetaIngrediente, Producto, Categoria, ProductoVariante } = require('../models');
const { sequelize } = require('../models');
const { Op } = require('sequelize');
const { costoPorUnidadBase, persistirCostoReceta, unidadesCompatibles } = require('../utils/costoReceta');

exports.listar = async (req, res) => {
  try {
    const { negocioId } = req.params;

    const recetas = await Receta.findAll({
      where: { negocioId: negocioId },
      include: [
        {
          model: RecetaIngrediente,
          as: 'ingredientes',
          include: [
            {
              model: Producto,
              as: 'ingrediente',
              include: [{ model: Categoria, as: 'categoria' }]
            }
          ]
        },
        {
          model: Producto,
          as: 'productoMenu',
          include: [{ model: Categoria, as: 'categoria' }]
        },
        {
          model: ProductoVariante,
          as: 'variante'
        }
      ],
      order: [['nombre', 'ASC']]
    });

    res.json(recetas);
  } catch (error) {
    console.error('Error al listar recetas:', error);
    res.status(500).json({ error: 'Error al listar recetas' });
  }
};

exports.obtener = async (req, res) => {
  try {
    const { negocioId, recetaId } = req.params;

    const receta = await Receta.findOne({
      where: { id: recetaId, negocioId: negocioId },
      include: [
        {
          model: RecetaIngrediente,
          as: 'ingredientes',
          include: [
            {
              model: Producto,
              as: 'ingrediente',
              include: [{ model: Categoria, as: 'categoria' }]
            }
          ]
        },
        {
          model: Producto,
          as: 'productoMenu',
          include: [{ model: Categoria, as: 'categoria' }]
        },
        {
          model: ProductoVariante,
          as: 'variante'
        }
      ]
    });

    if (!receta) {
      return res.status(404).json({ error: 'Receta no encontrada' });
    }

    res.json(receta);
  } catch (error) {
    console.error('Error al obtener receta:', error);
    res.status(500).json({ error: 'Error al obtener receta' });
  }
};

exports.crear = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { negocioId } = req.params;
    const { nombre, productoMenuId, varianteId, ingredientes, notas, extraCosto } = req.body;

    // Validar que tenga al menos un ingrediente
    if (!ingredientes || ingredientes.length === 0) {
      await transaction.rollback();
      return res.status(400).json({ error: 'Debe agregar al menos un ingrediente' });
    }

    // Validar variante si se proporciona
    if (varianteId) {
      const variante = await ProductoVariante.findOne({
        where: { id: varianteId, productoId: productoMenuId },
        transaction
      });

      if (!variante) {
        await transaction.rollback();
        return res.status(400).json({ error: 'La variante no pertenece al producto seleccionado' });
      }

      // Verificar duplicado
      const existe = await Receta.findOne({
        where: { productoMenuId, varianteId, negocioId },
        transaction
      });

      if (existe) {
        await transaction.rollback();
        return res.status(400).json({ error: `Ya existe una receta para la variante ${variante.nombre}` });
      }
    }

    // Validar que los ingredientes sean productos de stock
    for (const ing of ingredientes) {
      const producto = await Producto.findOne({
        where: { id: ing.ingredienteId, negocioId },
        include: [{ model: Categoria, as: 'categoria' }],
        transaction
      });

      if (!producto) {
        await transaction.rollback();
        return res.status(400).json({ error: `Ingrediente ${ing.ingredienteId} no encontrado` });
      }

      // Cualquier producto de stock sirve de ingrediente (ingredientes, bebidas,
      // papeleria, cajas...); solo se excluyen los elaborados del menu.
      if (producto.categoria?.tipo === 'elaborado') {
        await transaction.rollback();
        return res.status(400).json({
          error: `"${producto.nombre}" es un producto elaborado del menú y no puede usarse como ingrediente`
        });
      }

      // La unidad puede ser cualquiera compatible con la base del ingrediente
      // (ej: 0.2 kg para un ingrediente con base gramo); se convierte al usarla.
      if (!unidadesCompatibles(producto.unidadBase).includes(ing.unidad)) {
        await transaction.rollback();
        return res.status(400).json({
          error: `La unidad "${ing.unidad}" no es compatible con la unidad base "${producto.unidadBase}" del ingrediente "${producto.nombre}"`
        });
      }

      // Validar cantidad > 0
      if (parseFloat(ing.cantidad) <= 0) {
        await transaction.rollback();
        return res.status(400).json({ error: 'La cantidad debe ser mayor a 0' });
      }
    }

    // Crear receta
    const receta = await Receta.create({
      negocioId: negocioId,
      nombre,
      productoMenuId: productoMenuId || null,
      varianteId: varianteId || null,
      extraCosto: parseFloat(extraCosto) || 0,
      notas
    }, { transaction });

    // Crear ingredientes de la receta
    for (const ing of ingredientes) {
      await RecetaIngrediente.create({
        recetaId: receta.id,
        ingredienteId: ing.ingredienteId,
        cantidad: ing.cantidad,
        unidad: ing.unidad
      }, { transaction });
    }

    // Guardar el costo calculado en el producto del menu / variante
    await persistirCostoReceta(receta, { transaction });

    await transaction.commit();

    // Obtener receta completa con includes
    const recetaCompleta = await Receta.findByPk(receta.id, {
      include: [
        {
          model: RecetaIngrediente,
          as: 'ingredientes',
          include: [
            {
              model: Producto,
              as: 'ingrediente',
              include: [{ model: Categoria, as: 'categoria' }]
            }
          ]
        },
        {
          model: Producto,
          as: 'productoMenu',
          include: [{ model: Categoria, as: 'categoria' }]
        },
        {
          model: ProductoVariante,
          as: 'variante'
        }
      ]
    });

    res.status(201).json(recetaCompleta);
  } catch (error) {
    await transaction.rollback();
    console.error('Error al crear receta:', error);
    res.status(500).json({ error: 'Error al crear receta' });
  }
};

exports.actualizar = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { negocioId, recetaId } = req.params;
    const { nombre, productoMenuId, varianteId, ingredientes, notas, activo, extraCosto } = req.body;

    const receta = await Receta.findOne({
      where: { id: recetaId, negocioId: negocioId },
      transaction
    });

    if (!receta) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Receta no encontrada' });
    }

    // Validar variante si se proporciona
    if (varianteId !== undefined && varianteId !== receta.varianteId) {
      if (varianteId) {
        const variante = await ProductoVariante.findOne({
          where: { id: varianteId, productoId: productoMenuId || receta.productoMenuId },
          transaction
        });

        if (!variante) {
          await transaction.rollback();
          return res.status(400).json({ error: 'La variante no pertenece al producto seleccionado' });
        }

        // Verificar duplicado
        const existe = await Receta.findOne({
          where: {
            productoMenuId: productoMenuId || receta.productoMenuId,
            varianteId,
            negocioId,
            id: { [Op.ne]: recetaId }
          },
          transaction
        });

        if (existe) {
          await transaction.rollback();
          return res.status(400).json({ error: `Ya existe una receta para la variante ${variante.nombre}` });
        }
      }
    }

    // Validar ingredientes si se proporcionan
    if (ingredientes) {
      if (ingredientes.length === 0) {
        await transaction.rollback();
        return res.status(400).json({ error: 'Debe agregar al menos un ingrediente' });
      }

      for (const ing of ingredientes) {
        const producto = await Producto.findOne({
          where: { id: ing.ingredienteId, negocioId },
          include: [{ model: Categoria, as: 'categoria' }],
          transaction
        });

        if (!producto) {
          await transaction.rollback();
          return res.status(400).json({ error: `Ingrediente ${ing.ingredienteId} no encontrado` });
        }

        // Cualquier producto de stock sirve de ingrediente; solo se excluyen
        // los elaborados del menu.
        if (producto.categoria?.tipo === 'elaborado') {
          await transaction.rollback();
          return res.status(400).json({
            error: `"${producto.nombre}" es un producto elaborado del menú y no puede usarse como ingrediente`
          });
        }

        if (!unidadesCompatibles(producto.unidadBase).includes(ing.unidad)) {
          await transaction.rollback();
          return res.status(400).json({
            error: `La unidad "${ing.unidad}" no es compatible con la unidad base "${producto.unidadBase}" del ingrediente "${producto.nombre}"`
          });
        }

        if (parseFloat(ing.cantidad) <= 0) {
          await transaction.rollback();
          return res.status(400).json({ error: 'La cantidad debe ser mayor a 0' });
        }
      }
    }

    // Actualizar receta
    await receta.update({
      nombre: nombre || receta.nombre,
      productoMenuId: productoMenuId !== undefined ? productoMenuId : receta.productoMenuId,
      varianteId: varianteId !== undefined ? varianteId : receta.varianteId,
      extraCosto: extraCosto !== undefined ? (parseFloat(extraCosto) || 0) : receta.extraCosto,
      notas: notas !== undefined ? notas : receta.notas,
      activo: activo !== undefined ? activo : receta.activo
    }, { transaction });

    // Si se proporcionaron ingredientes, actualizar
    if (ingredientes) {
      // Eliminar ingredientes anteriores
      await RecetaIngrediente.destroy({
        where: { recetaId: receta.id },
        transaction
      });

      // Crear nuevos ingredientes
      for (const ing of ingredientes) {
        await RecetaIngrediente.create({
          recetaId: receta.id,
          ingredienteId: ing.ingredienteId,
          cantidad: ing.cantidad,
          unidad: ing.unidad
        }, { transaction });
      }
    }

    // Recalcular y guardar el costo en el producto del menu / variante.
    // Se recarga la receta para tomar los ingredientes vigentes.
    const recetaConIng = await Receta.findByPk(receta.id, {
      include: [{ model: RecetaIngrediente, as: 'ingredientes', include: [{ model: Producto, as: 'ingrediente' }] }],
      transaction
    });
    await persistirCostoReceta(recetaConIng, { transaction });

    await transaction.commit();

    // Obtener receta actualizada
    const recetaActualizada = await Receta.findByPk(receta.id, {
      include: [
        {
          model: RecetaIngrediente,
          as: 'ingredientes',
          include: [
            {
              model: Producto,
              as: 'ingrediente',
              include: [{ model: Categoria, as: 'categoria' }]
            }
          ]
        },
        {
          model: Producto,
          as: 'productoMenu',
          include: [{ model: Categoria, as: 'categoria' }]
        },
        {
          model: ProductoVariante,
          as: 'variante'
        }
      ]
    });

    res.json(recetaActualizada);
  } catch (error) {
    await transaction.rollback();
    console.error('Error al actualizar receta:', error);
    res.status(500).json({ error: 'Error al actualizar receta' });
  }
};

exports.eliminar = async (req, res) => {
  try {
    const { negocioId, recetaId } = req.params;

    const receta = await Receta.findOne({
      where: { id: recetaId, negocioId: negocioId }
    });

    if (!receta) {
      return res.status(404).json({ error: 'Receta no encontrada' });
    }

    await receta.destroy();

    res.json({ message: 'Receta eliminada correctamente' });
  } catch (error) {
    console.error('Error al eliminar receta:', error);
    res.status(500).json({ error: 'Error al eliminar receta' });
  }
};

exports.calcularCosto = async (req, res) => {
  try {
    const { negocioId, recetaId } = req.params;

    const receta = await Receta.findOne({
      where: { id: recetaId, negocioId: negocioId },
      include: [
        {
          model: RecetaIngrediente,
          as: 'ingredientes',
          include: [
            {
              model: Producto,
              as: 'ingrediente'
            }
          ]
        }
      ]
    });

    if (!receta) {
      return res.status(404).json({ error: 'Receta no encontrada' });
    }

    let costoTotal = 0;
    const detalles = [];

    for (const item of receta.ingredientes) {
      const ingrediente = item.ingrediente;

      // Precio por unidad base y costo del ingrediente en la receta (helper unico)
      const precioPorUnidadBase = costoPorUnidadBase(ingrediente);
      const cantidad = parseFloat(item.cantidad);
      const costoIngrediente = precioPorUnidadBase * cantidad;

      costoTotal += costoIngrediente;

      detalles.push({
        ingrediente: ingrediente.nombre,
        cantidad: cantidad,
        unidad: item.unidad,
        precioPorUnidad: precioPorUnidadBase,
        costoTotal: costoIngrediente
      });
    }

    res.json({
      receta: receta.nombre,
      costoTotal: parseFloat(costoTotal.toFixed(2)),
      detalles
    });
  } catch (error) {
    console.error('Error al calcular costo:', error);
    res.status(500).json({ error: 'Error al calcular costo' });
  }
};
