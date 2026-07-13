const { Receta, RecetaIngrediente, Producto, Categoria, ProductoVariante, StockMovimiento } = require('../models');
const { sequelize } = require('../models');
const { Op } = require('sequelize');
const { costoPorUnidadBase, persistirCostoReceta, unidadesCompatibles, convertir } = require('../utils/costoReceta');

// Nombre fijo de la categoria de stock donde viven los productos creados por
// una "receta especial" (salsas, preparaciones combinadas). Se crea sola la
// primera vez que el negocio usa esta funcion.
const CATEGORIA_ESPECIALES = 'Preparaciones';

async function categoriaEspeciales(negocioId, transaction) {
  const [categoria] = await Categoria.findOrCreate({
    where: { negocioId, nombre: CATEGORIA_ESPECIALES },
    defaults: { negocioId, nombre: CATEGORIA_ESPECIALES, tipo: 'ingrediente' },
    transaction
  });
  return categoria;
}

// Valida los ingredientes de una receta (especial o de menu): que existan,
// que no sean un producto elaborado del menu, que la unidad sea compatible
// y que la cantidad sea mayor a 0. excluirId evita que un producto se use
// como ingrediente de si mismo (ciclo directo).
async function validarIngredientes(ingredientes, negocioId, transaction, excluirId) {
  for (const ing of ingredientes) {
    if (excluirId && ing.ingredienteId === excluirId) {
      throw new Error('Una receta no puede usarse a si misma como ingrediente');
    }
    const producto = await Producto.findOne({
      where: { id: ing.ingredienteId, negocioId },
      include: [{ model: Categoria, as: 'categoria' }],
      transaction
    });
    if (!producto) throw new Error(`Ingrediente ${ing.ingredienteId} no encontrado`);
    if (producto.categoria?.tipo === 'elaborado') {
      throw new Error(`"${producto.nombre}" es un producto elaborado del menú y no puede usarse como ingrediente`);
    }
    if (!unidadesCompatibles(producto.unidadBase).includes(ing.unidad)) {
      throw new Error(`La unidad "${ing.unidad}" no es compatible con la unidad base "${producto.unidadBase}" del ingrediente "${producto.nombre}"`);
    }
    if (parseFloat(ing.cantidad) <= 0) throw new Error('La cantidad debe ser mayor a 0');
  }
}

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

const includeRecetaCompleta = [
  {
    model: RecetaIngrediente,
    as: 'ingredientes',
    include: [{ model: Producto, as: 'ingrediente', include: [{ model: Categoria, as: 'categoria' }] }]
  },
  { model: Producto, as: 'productoMenu', include: [{ model: Categoria, as: 'categoria' }] },
  { model: ProductoVariante, as: 'variante' }
];

// Receta especial: combina productos de stock para crear un nuevo producto
// intermedio (ej: una salsa) que rinde una cantidad declarada (cantidadProducida
// en la unidad base del producto resultante) y que despues puede usarse como
// ingrediente de otras recetas. Crea el Producto y la Receta en un solo paso.
exports.crearEspecial = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { negocioId } = req.params;
    const { nombre, unidadProducida, cantidadProducida, ingredientes, extraCosto, notas } = req.body;

    if (!nombre?.trim()) { await transaction.rollback(); return res.status(400).json({ error: 'Ingresá el nombre del producto a preparar' }); }
    if (!['kg', 'gramo', 'litro', 'ml', 'unidad'].includes(unidadProducida)) {
      await transaction.rollback();
      return res.status(400).json({ error: 'Unidad de producción inválida' });
    }
    const rinde = parseFloat(cantidadProducida);
    if (!rinde || rinde <= 0) { await transaction.rollback(); return res.status(400).json({ error: 'Indicá cuánto rinde la receta (debe ser mayor a 0)' }); }
    if (!ingredientes || ingredientes.length === 0) { await transaction.rollback(); return res.status(400).json({ error: 'Agregá al menos un ingrediente' }); }

    try {
      await validarIngredientes(ingredientes, negocioId, transaction);
    } catch (e) {
      await transaction.rollback();
      return res.status(400).json({ error: e.message });
    }

    const categoria = await categoriaEspeciales(negocioId, transaction);

    // El producto resultante no se "compra": se prepara. unidadCompra queda
    // igual a la base y cantidadPorUnidadCompra en 1 para que el motor de
    // costos lo trate como "precio directo por unidad base" sin conversion.
    const producto = await Producto.create({
      negocioId,
      categoriaId: categoria.id,
      nombre: nombre.trim(),
      unidadBase: unidadProducida,
      unidadCompra: unidadProducida,
      unidadContenidoCaja: null,
      cantidadPorUnidadCompra: 1,
      precioVenta: 0,
      precioCosto: 0,
      stock: 0,
      activo: true
    }, { transaction });

    const receta = await Receta.create({
      negocioId,
      nombre: nombre.trim(),
      productoMenuId: producto.id,
      varianteId: null,
      cantidadProducida: rinde,
      extraCosto: parseFloat(extraCosto) || 0,
      notas: notas || null
    }, { transaction });

    for (const ing of ingredientes) {
      await RecetaIngrediente.create({
        recetaId: receta.id,
        ingredienteId: ing.ingredienteId,
        cantidad: ing.cantidad,
        unidad: ing.unidad
      }, { transaction });
    }

    await persistirCostoReceta(receta, { transaction });
    await transaction.commit();

    const recetaCompleta = await Receta.findByPk(receta.id, { include: includeRecetaCompleta });
    res.status(201).json(recetaCompleta);
  } catch (error) {
    await transaction.rollback();
    console.error('Error al crear receta especial:', error);
    res.status(500).json({ error: 'Error al crear receta especial' });
  }
};

exports.actualizarEspecial = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { negocioId, recetaId } = req.params;
    const { nombre, unidadProducida, cantidadProducida, ingredientes, extraCosto, notas } = req.body;

    const receta = await Receta.findOne({ where: { id: recetaId, negocioId }, transaction });
    if (!receta || !receta.productoMenuId) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Receta especial no encontrada' });
    }
    const producto = await Producto.findOne({ where: { id: receta.productoMenuId, negocioId }, transaction });
    if (!producto) { await transaction.rollback(); return res.status(404).json({ error: 'Producto no encontrado' }); }

    if (unidadProducida && !['kg', 'gramo', 'litro', 'ml', 'unidad'].includes(unidadProducida)) {
      await transaction.rollback();
      return res.status(400).json({ error: 'Unidad de producción inválida' });
    }
    let rinde = receta.cantidadProducida;
    if (cantidadProducida !== undefined) {
      rinde = parseFloat(cantidadProducida);
      if (!rinde || rinde <= 0) { await transaction.rollback(); return res.status(400).json({ error: 'Indicá cuánto rinde la receta (debe ser mayor a 0)' }); }
    }

    if (ingredientes) {
      if (ingredientes.length === 0) { await transaction.rollback(); return res.status(400).json({ error: 'Agregá al menos un ingrediente' }); }
      try {
        await validarIngredientes(ingredientes, negocioId, transaction, producto.id);
      } catch (e) {
        await transaction.rollback();
        return res.status(400).json({ error: e.message });
      }
    }

    await producto.update({
      nombre: nombre?.trim() || producto.nombre,
      unidadBase: unidadProducida || producto.unidadBase,
      unidadCompra: unidadProducida || producto.unidadCompra
    }, { transaction });

    await receta.update({
      nombre: nombre?.trim() || receta.nombre,
      cantidadProducida: rinde,
      extraCosto: extraCosto !== undefined ? (parseFloat(extraCosto) || 0) : receta.extraCosto,
      notas: notas !== undefined ? notas : receta.notas
    }, { transaction });

    if (ingredientes) {
      await RecetaIngrediente.destroy({ where: { recetaId: receta.id }, transaction });
      for (const ing of ingredientes) {
        await RecetaIngrediente.create({
          recetaId: receta.id,
          ingredienteId: ing.ingredienteId,
          cantidad: ing.cantidad,
          unidad: ing.unidad
        }, { transaction });
      }
    }

    const recetaConIng = await Receta.findByPk(receta.id, {
      include: [{ model: RecetaIngrediente, as: 'ingredientes', include: [{ model: Producto, as: 'ingrediente' }] }],
      transaction
    });
    await persistirCostoReceta(recetaConIng, { transaction });

    await transaction.commit();
    const recetaCompleta = await Receta.findByPk(receta.id, { include: includeRecetaCompleta });
    res.json(recetaCompleta);
  } catch (error) {
    await transaction.rollback();
    console.error('Error al actualizar receta especial:', error);
    res.status(500).json({ error: 'Error al actualizar receta especial' });
  }
};

// Preparar un lote: consume el stock de los ingredientes (segun la receta,
// escalados a la cantidad pedida) y suma esa cantidad al stock del producto
// resultante. Ej: la receta rinde 500g, se piden 1000g -> multiplicador 2.
exports.prepararLote = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { negocioId, recetaId } = req.params;
    const cantidadPreparar = parseFloat(req.body.cantidad);
    if (!cantidadPreparar || cantidadPreparar <= 0) {
      await transaction.rollback();
      return res.status(400).json({ error: 'Indicá una cantidad válida a preparar' });
    }

    const receta = await Receta.findOne({
      where: { id: recetaId, negocioId },
      include: [
        { model: RecetaIngrediente, as: 'ingredientes', include: [{ model: Producto, as: 'ingrediente' }] },
        { model: Producto, as: 'productoMenu' }
      ],
      transaction
    });
    if (!receta || !receta.cantidadProducida || !receta.productoMenu) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Receta especial no encontrada' });
    }

    const multiplicador = cantidadPreparar / parseFloat(receta.cantidadProducida);

    for (const item of receta.ingredientes) {
      const ing = item.ingrediente;
      if (!ing) continue;
      const cantidadEnBase = convertir(item.cantidad, item.unidad, ing.unidadBase) * multiplicador;
      await ing.update({ stock: (Number(ing.stock) || 0) - cantidadEnBase }, { transaction });
      await StockMovimiento.create({
        negocioId, productoId: ing.id, tipo: 'consumo_preparacion', cantidad: cantidadEnBase
      }, { transaction });
    }

    const producto = receta.productoMenu;
    await producto.update({ stock: (Number(producto.stock) || 0) + cantidadPreparar }, { transaction });
    await StockMovimiento.create({
      negocioId, productoId: producto.id, tipo: 'preparacion', cantidad: cantidadPreparar
    }, { transaction });

    await transaction.commit();
    const productoActualizado = await Producto.findByPk(producto.id);
    res.json({ success: true, producto: productoActualizado, message: `Lote preparado: +${cantidadPreparar} ${producto.unidadBase} de ${producto.nombre}` });
  } catch (error) {
    await transaction.rollback();
    console.error('Error al preparar lote:', error);
    res.status(500).json({ error: 'Error al preparar el lote' });
  }
};
