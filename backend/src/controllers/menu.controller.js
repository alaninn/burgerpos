const { Negocio, Categoria, Producto, ProductoVariante, GrupoAdicional, Adicional, Pedido, ItemPedido, Descuento, Cliente, sequelize } = require('../models');
const { descontarStockPedido } = require('../utils/descuentoStock');
const { Op } = require('sequelize');

exports.obtenerMenuDefault = async (req, res) => {
  try {
    const negocio = await Negocio.findOne({
      where: { activo: true },
      attributes: ['id', 'nombre', 'logo', 'telefono', 'direccion', 'ciudad', 'configuracion', 'slug'],
      order: [['createdAt', 'ASC']]
    });
    if (!negocio) return res.status(404).json({ success: false, message: 'Negocio no encontrado' });

    const categorias = await Categoria.findAll({
      // Las categorias de ingredientes/insumos del stock no se venden en la tienda
      where: { negocioId: negocio.id, activo: true, tipo: { [Op.ne]: 'ingrediente' } },
      include: [{
        model: Producto,
        as: 'productos',
        where: { activo: true },
        required: false,
        include: [
          {
            model: ProductoVariante,
            as: 'variantes',
            where: { activo: true, visible: true },
            required: false,
            order: [['orden', 'ASC']]
          },
          {
            model: GrupoAdicional,
            as: 'gruposAdicionales',
            where: { activo: true },
            required: false,
            include: [{
              model: Adicional,
              as: 'items',
              where: { activo: true, visible: true },
              required: false,
              order: [['orden', 'ASC']]
            }]
          },
          {
            model: Descuento,
            as: 'descuento',
            required: false,
            attributes: ['id', 'codigo', 'tipo', 'valor', 'activo', 'descripcion']
          }
        ],
        order: [['orden', 'ASC'], ['nombre', 'ASC']],
        separate: true
      }],
      order: [['orden', 'ASC']]
    });

    res.json({ success: true, negocio, categorias });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.obtenerMenu = async (req, res) => {
  try {
    const negocio = await Negocio.findOne({
      where: { slug: req.params.slug, activo: true },
      attributes: ['id', 'nombre', 'logo', 'telefono', 'direccion', 'ciudad', 'configuracion', 'slug']
    });
    if (!negocio) return res.status(404).json({ success: false, message: 'Negocio no encontrado' });

    const categorias = await Categoria.findAll({
      // Las categorias de ingredientes/insumos del stock no se venden en la tienda
      where: { negocioId: negocio.id, activo: true, tipo: { [Op.ne]: 'ingrediente' } },
      include: [{
        model: Producto,
        as: 'productos',
        where: { activo: true },
        required: false,
        include: [
          {
            model: ProductoVariante,
            as: 'variantes',
            where: { activo: true, visible: true },
            required: false,
            order: [['orden', 'ASC']]
          },
          {
            model: GrupoAdicional,
            as: 'gruposAdicionales',
            where: { activo: true },
            required: false,
            include: [{
              model: Adicional,
              as: 'items',
              where: { activo: true, visible: true },
              required: false,
              order: [['orden', 'ASC']]
            }]
          },
          {
            model: Descuento,
            as: 'descuento',
            required: false,
            attributes: ['id', 'codigo', 'tipo', 'valor', 'activo', 'descripcion']
          }
        ],
        order: [['orden', 'ASC'], ['nombre', 'ASC']],
        separate: true
      }],
      order: [['orden', 'ASC']]
    });

    res.json({ success: true, negocio, categorias });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.crearPedido = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const negocio = await Negocio.findOne({ where: { slug: req.params.slug, activo: true }, transaction: t });
    if (!negocio) {
      await t.rollback();
      return res.status(404).json({ success: false, message: 'Negocio no encontrado' });
    }

    // Verificar que el negocio esté recibiendo pedidos
    if (negocio.configuracion?.recibirPedidos === false) {
      await t.rollback();
      return res.status(400).json({ success: false, message: 'El local no está recibiendo pedidos en este momento' });
    }

    const negocioId = negocio.id;
    const { modalidad, items, clienteNombre, clienteTelefono, clienteDireccion, clienteLat, clienteLng, metodoPago, notas, codigoCupon, zonaEntrega, costoEnvioCustom } = req.body;

    if (!items || items.length === 0) {
      await t.rollback();
      return res.status(400).json({ success: false, message: 'El pedido debe tener al menos un producto' });
    }

    // Verificar productos y calcular precios desde DB (no confiar en el cliente)
    const productoIds = items.map(i => i.productoId).filter(Boolean);
    const productos = await Producto.findAll({
      where: { id: productoIds, negocioId, activo: true },
      include: [{
        model: Descuento,
        as: 'descuento',
        required: false,
        attributes: ['id', 'tipo', 'valor', 'activo']
      }],
      transaction: t
    });
    const productosMap = {};
    productos.forEach(p => { productosMap[p.id] = p; });

    // La cantidad debe ser un entero positivo razonable: evita que un cliente
    // envie cantidades negativas o fraccionarias para bajar el total del pedido.
    const cantidadValida = (c) => Number.isInteger(c) && c >= 1 && c <= 999;

    let subtotal = 0;
    const itemsData = [];
    for (const item of items) {
      const prod = productosMap[item.productoId];
      if (!prod) throw new Error(`Producto no disponible`);

      if (!cantidadValida(item.cantidad)) {
        throw new Error(`Cantidad inválida para "${prod.nombre}"`);
      }

      // Validar stock si el producto lo tiene configurado
      if (prod.stock !== null && prod.stock !== undefined && prod.stock < item.cantidad) {
        throw new Error(`Stock insuficiente para "${prod.nombre}" (disponible: ${prod.stock})`);
      }

      // Precio base: desde variante seleccionada o precio base del producto
      let precioBase = parseFloat(prod.precioVenta);
      let varianteNombre = null;
      if (item.varianteId) {
        const variante = await ProductoVariante.findOne({ where: { id: item.varianteId, productoId: prod.id }, transaction: t });
        if (variante) {
          precioBase = parseFloat(variante.precioVenta);
          varianteNombre = variante.nombre;
        }
      }

      // Aplicar descuento del producto si existe (validado desde BD)
      if (prod.descuento && prod.descuento.activo) {
        const montoDescProducto = prod.descuento.tipo === 'porcentaje'
          ? Math.round((precioBase * parseFloat(prod.descuento.valor)) / 100)
          : parseFloat(prod.descuento.valor);
        precioBase = Math.max(0, precioBase - montoDescProducto);
      }

      // Precio de adicionales seleccionados
      let precioAdicionales = 0;
      const adicionalesData = [];
      if (item.adicionales && item.adicionales.length > 0) {
        for (const adic of item.adicionales) {
          const adicional = await Adicional.findOne({ where: { id: adic.adicionalId, negocioId }, transaction: t });
          if (adicional) {
            const precioAdic = parseFloat(adicional.precioVenta);
            // Cantidad de adicional acotada a entero positivo (no confiar en el cliente)
            const cantAdic = cantidadValida(adic.cantidad) ? adic.cantidad : 1;
            precioAdicionales += precioAdic * cantAdic;
            adicionalesData.push({
              id: adicional.id,
              grupoTitulo: adic.grupoTitulo || '',
              nombre: adicional.nombre,
              precio: precioAdic,
              cantidad: cantAdic
            });
          }
        }
      }

      const precioUnitario = precioBase + precioAdicionales;
      const sub = precioUnitario * item.cantidad;
      subtotal += sub;
      itemsData.push({
        productoId: prod.id,
        nombre: prod.nombre,
        varianteNombre,
        precioUnitario,
        cantidad: item.cantidad,
        subtotal: sub,
        adicionales: adicionalesData,
        notas: item.notas || ''
      });
    }

    // Decrementar stock de los productos que lo tienen configurado
    for (const item of items) {
      const prod = productosMap[item.productoId];
      if (prod.stock !== null && prod.stock !== undefined) {
        await prod.update({ stock: prod.stock - item.cantidad }, { transaction: t });
      }
    }

    let costoEnvio = 0;
    if (modalidad === 'delivery') {
      const zonas = negocio.configuracion?.zonasEntrega || [];
      if (zonaEntrega && costoEnvioCustom !== undefined) {
        // Validar que la zona exista en la config del negocio
        const zona = zonas.find(z => z.nombre === zonaEntrega);
        costoEnvio = zona ? parseFloat(zona.costo) || 0 : parseFloat(costoEnvioCustom) || 0;
      } else {
        costoEnvio = negocio.configuracion?.costoEnvio || 0;
      }
    }

    // Aplicar descuentos automáticos (global, modalidad, método de pago)
    let descuentoVal = 0;
    const descuentosDetalles = []; // Array para auditoría

    const descuentosAutomaticos = await Descuento.findAll({
      where: {
        negocioId,
        activo: true,
        aplicaAutomatico: true,
        [Op.or]: [
          { categoria: 'global' },
          { categoria: 'modalidad', modalidad: modalidad },
          { categoria: 'metodo_pago', metodoPagoDesc: metodoPago }
        ]
      },
      transaction: t
    });

    for (const desc of descuentosAutomaticos) {
      // Verificar compra mínima
      if (desc.minimoCompra && subtotal < parseFloat(desc.minimoCompra)) {
        continue;
      }

      // Calcular descuento con redondeo consistente
      const monto = desc.tipo === 'porcentaje'
        ? Math.round((subtotal * parseFloat(desc.valor)) / 100)
        : parseFloat(desc.valor);

      descuentoVal += monto;

      // Guardar para auditoría
      descuentosDetalles.push({
        tipo: desc.categoria,
        codigo: desc.codigo,
        descripcion: desc.descripcion || `Descuento ${desc.categoria}`,
        tipoValor: desc.tipo,
        valor: parseFloat(desc.valor),
        monto: monto
      });

      // Si no es acumulable, solo aplicar el primero
      if (!desc.acumulable) break;
    }

    // Aplicar cupón si viene (adicional a descuentos automáticos)
    if (codigoCupon && codigoCupon.trim().length > 0) {
      const cupon = await Descuento.findOne({
        where: { negocioId, codigo: codigoCupon.trim().toUpperCase(), activo: true },
        transaction: t
      });
      if (cupon && !(cupon.fechaVencimiento && new Date(cupon.fechaVencimiento) < new Date())
                && !(cupon.usosMax && cupon.usosActuales >= cupon.usosMax)) {
        const montoCupon = cupon.tipo === 'porcentaje'
          ? Math.round((subtotal * parseFloat(cupon.valor)) / 100)
          : parseFloat(cupon.valor);
        descuentoVal += montoCupon; // Acumular con descuentos automáticos

        // Guardar cupón en detalles
        descuentosDetalles.push({
          tipo: 'cupon',
          codigo: cupon.codigo,
          descripcion: cupon.descripcion || `Cupón ${cupon.codigo}`,
          tipoValor: cupon.tipo,
          valor: parseFloat(cupon.valor),
          monto: montoCupon
        });

        await cupon.increment('usosActuales', { by: 1, transaction: t });
      }
    }

    // Validar que el descuento no supere el subtotal
    descuentoVal = Math.min(descuentoVal, subtotal);

    // Cálculo del total del pedido
    // ORDEN DE OPERACIONES:
    // 1. Descuentos de producto: Ya aplicados en precioBase (línea 119-125)
    // 2. Descuentos automáticos + cupones: Se aplican sobre el subtotal (acumulados en descuentoVal)
    // 3. Costo de envío: Se suma después de los descuentos
    // Formula: Total = (Subtotal - Descuentos) + Envío + Propina
    // Nota: Matemáticamente equivalente a: Subtotal + Envío - Descuentos + Propina
    const total = Math.max(0, subtotal + costoEnvio - descuentoVal);

    const ultimo = await Pedido.findOne({ where: { negocioId }, order: [['numero', 'DESC']], transaction: t });
    const numero = (ultimo?.numero || 0) + 1;

    const notasFinales = [
      notas || '',
      zonaEntrega ? `Zona: ${zonaEntrega}` : ''
    ].filter(Boolean).join(' | ')

    const pedido = await Pedido.create({
      negocioId, numero, modalidad,
      clienteNombre: clienteNombre || 'Cliente',
      clienteTelefono: clienteTelefono || '',
      clienteDireccion: clienteDireccion || '',
      clienteLat: clienteLat || null,
      clienteLng: clienteLng || null,
      metodoPago: metodoPago || 'efectivo',
      notas: notasFinales,
      costoEnvio,
      descuento: descuentoVal,
      descuentosDetalles: descuentosDetalles.length > 0 ? descuentosDetalles : null,
      propina: 0,
      subtotal,
      total
    }, { transaction: t });

    await ItemPedido.bulkCreate(itemsData.map(i => ({ ...i, pedidoId: pedido.id })), { transaction: t });

    // Descuento automatico de stock por recetas y adicionales (igual que el POS)
    await descontarStockPedido({ negocioId, pedidoId: pedido.id, items: itemsData, transaction: t });

    await t.commit();

    const pedidoCompleto = await Pedido.findByPk(pedido.id, {
      include: [{ model: ItemPedido, as: 'items' }]
    });

    req.io.to(`negocio-${negocioId}`).emit('nuevo-pedido', pedidoCompleto);

    res.status(201).json({ success: true, pedido: { id: pedido.id, numero: pedido.numero, total: pedido.total } });
  } catch (err) {
    await t.rollback();
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.validarCupon = async (req, res) => {
  try {
    const negocio = await Negocio.findOne({ where: { slug: req.params.slug, activo: true } });
    if (!negocio) return res.status(404).json({ success: false, message: 'Negocio no encontrado' });

    const { codigo, total } = req.body;
    if (!codigo) return res.status(400).json({ success: false, message: 'Código requerido' });

    const cupon = await Descuento.findOne({
      where: { negocioId: negocio.id, codigo: codigo.toUpperCase(), activo: true }
    });

    if (!cupon) return res.status(404).json({ success: false, message: 'Cupón inválido o inactivo' });
    if (cupon.fechaVencimiento && new Date(cupon.fechaVencimiento) < new Date())
      return res.status(400).json({ success: false, message: 'Cupón vencido' });
    if (cupon.usosMax && cupon.usosActuales >= cupon.usosMax)
      return res.status(400).json({ success: false, message: 'Cupón agotado' });
    if (total && cupon.minimoCompra && parseFloat(total) < parseFloat(cupon.minimoCompra))
      return res.status(400).json({ success: false, message: `Mínimo de compra: $${cupon.minimoCompra}` });

    const montoDescuento = cupon.tipo === 'porcentaje'
      ? (parseFloat(total || 0) * parseFloat(cupon.valor)) / 100
      : parseFloat(cupon.valor);

    res.json({ success: true, montoDescuento });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.buscarCliente = async (req, res) => {
  try {
    const negocio = await Negocio.findOne({ where: { slug: req.params.slug, activo: true }, attributes: ['id'] });
    if (!negocio) return res.status(404).json({ success: false });
    const { telefono, nombre } = req.query;
    if (!telefono && !nombre) return res.json({ success: true, cliente: null });

    const where = { negocioId: negocio.id };
    if (telefono) where.telefono = telefono.trim();
    else if (nombre) where.nombre = { [Op.iLike]: `%${nombre.trim()}%` };

    const cliente = await Cliente.findOne({ where, attributes: ['nombre', 'telefono', 'direccion', 'descuentoFijo'] });
    res.json({ success: true, cliente: cliente || null });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.obtenerDescuentosAutomaticos = async (req, res) => {
  try {
    const negocio = await Negocio.findOne({ where: { slug: req.params.slug, activo: true } });
    if (!negocio) return res.status(404).json({ success: false, message: 'Negocio no encontrado' });

    const { modalidad, metodoPago, subtotal } = req.query;
    const descuentosAplicables = [];

    // 1. Descuentos globales
    const globales = await Descuento.findAll({
      where: {
        negocioId: negocio.id,
        categoria: 'global',
        activo: true,
        aplicaAutomatico: true
      },
      attributes: ['id', 'codigo', 'descripcion', 'tipo', 'valor', 'minimoCompra']
    });

    // 2. Descuentos por modalidad
    let porModalidad = [];
    if (modalidad) {
      porModalidad = await Descuento.findAll({
        where: {
          negocioId: negocio.id,
          categoria: 'modalidad',
          modalidad: modalidad,
          activo: true,
          aplicaAutomatico: true
        },
        attributes: ['id', 'codigo', 'descripcion', 'tipo', 'valor', 'minimoCompra']
      });
    }

    // 3. Descuentos por método de pago
    let porMetodoPago = [];
    if (metodoPago) {
      porMetodoPago = await Descuento.findAll({
        where: {
          negocioId: negocio.id,
          categoria: 'metodo_pago',
          metodoPagoDesc: metodoPago,
          activo: true,
          aplicaAutomatico: true
        },
        attributes: ['id', 'codigo', 'descripcion', 'tipo', 'valor', 'minimoCompra']
      });
    }

    // Combinar y calcular
    const todosDescuentos = [...globales, ...porModalidad, ...porMetodoPago];
    const subtotalNum = parseFloat(subtotal) || 0;

    for (const desc of todosDescuentos) {
      // Verificar compra mínima
      if (desc.minimoCompra && subtotalNum < parseFloat(desc.minimoCompra)) {
        continue;
      }

      // Calcular monto
      let monto = 0;
      if (subtotalNum > 0) {
        monto = desc.tipo === 'porcentaje'
          ? (subtotalNum * parseFloat(desc.valor)) / 100
          : parseFloat(desc.valor);
        monto = Math.min(monto, subtotalNum); // No puede ser mayor al subtotal
      }

      descuentosAplicables.push({
        id: desc.id,
        codigo: desc.codigo,
        descripcion: desc.descripcion || `Descuento ${desc.codigo}`,
        tipo: desc.tipo,
        valor: desc.valor,
        monto: monto
      });
    }

    res.json({ success: true, descuentos: descuentosAplicables });
  } catch (err) {
    console.error('Error obteniendo descuentos automáticos:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};
