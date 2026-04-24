const { Pedido, ItemPedido, Producto, Cliente, Repartidor, sequelize } = require('../models');
const { Op } = require('sequelize');
const whatsappService = require('../services/whatsappService');

exports.listar = async (req, res) => {
  try {
    const { negocioId } = req.params;
    const { estado, modalidad, fechaDesde, fechaHasta, metodoPago, repartidorId } = req.query;
    const where = { negocioId };

    if (estado) {
      const estados = estado.split(',').map(s => s.trim()).filter(Boolean);
      where.estado = estados.length === 1 ? estados[0] : { [Op.in]: estados };
    }
    if (modalidad) where.modalidad = modalidad;
    if (metodoPago) where.metodoPago = metodoPago;
    if (repartidorId) where.repartidorId = repartidorId;
    if (fechaDesde) {
      const finStr = fechaHasta || fechaDesde;
     where.createdAt = {
        [Op.between]: [
          new Date(fechaDesde + 'T03:00:00.000Z'),
          new Date(finStr + 'T23:59:59.999-03:00')
        ]
      };
    }

    const pedidos = await Pedido.findAll({
      where,
      include: [
        { model: ItemPedido, as: 'items' },
        { model: Cliente, as: 'cliente', attributes: ['id', 'nombre', 'telefono'] },
        { model: Repartidor, as: 'repartidor', attributes: ['id', 'nombre'] }
      ],
      order: [['createdAt', 'DESC']]
    });
    res.json({ success: true, pedidos });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.crear = async (req, res) => {
  const t = await sequelize.transaction();
  let pedidoId = null;
  try {
    const { negocioId } = req.params;
    const { modalidad, items, clienteNombre, clienteTelefono, clienteDireccion, clienteId, metodoPago, notas, costoEnvio, descuento, propina, cobrado, requiereFactura, cuitFacturacion } = req.body;

    const ultimo = await Pedido.findOne({ where: { negocioId }, order: [['numero', 'DESC']], transaction: t });
    const numero = (ultimo?.numero || 0) + 1;

    // Obtener precios desde DB (no confiar en el cliente)
    const productoIds = items.map(i => i.productoId).filter(Boolean);
    const productosMap = {};
    if (productoIds.length) {
      const prods = await Producto.findAll({ where: { id: productoIds, negocioId }, transaction: t });
      prods.forEach(p => { productosMap[p.id] = p; });
    }

    let subtotal = 0;
    const itemsData = items.map(item => {
      const producto = productosMap[item.productoId];
      // Para pedidos admin: si viene precioUnitario explícito (con variante/adicionales), usarlo
      // Si no, usar precio base de DB o precio enviado
      const precio = item.precioUnitario != null
        ? parseFloat(item.precioUnitario)
        : producto
          ? parseFloat(producto.precioVenta)
          : parseFloat(item.precio ?? 0);
      const sub = precio * item.cantidad;
      subtotal += sub;
      return {
        productoId: item.productoId || null,
        nombre: producto?.nombre || item.nombre || 'Producto',
        varianteNombre: item.varianteNombre || null,
        cantidad: item.cantidad,
        precioUnitario: precio,
        subtotal: sub,
        adicionales: item.adicionales || [],
        notas: item.notas || ''
      };
    });

    const total = subtotal + (parseFloat(costoEnvio) || 0) - (parseFloat(descuento) || 0) + (parseFloat(propina) || 0);

    const pedido = await Pedido.create({
      negocioId, numero, modalidad, clienteNombre, clienteTelefono,
      clienteDireccion, clienteId, metodoPago, notas,
      costoEnvio: costoEnvio || 0,
      descuento: descuento || 0,
      propina: propina || 0,
      subtotal, total,
      cobrado: cobrado || false,
      requiereFactura: requiereFactura || false,
      cuitFacturacion: cuitFacturacion || null,
    }, { transaction: t });

    await ItemPedido.bulkCreate(itemsData.map(i => ({ ...i, pedidoId: pedido.id })), { transaction: t });

    pedidoId = pedido.id;
    await t.commit();
  } catch (err) {
    if (!t.finished) await t.rollback().catch(() => {});
    return res.status(500).json({ success: false, message: err.message });
  }

  // Post-commit: fetch completo + socket (fuera del try para no causar rollback en transacción ya commiteada)
  try {
    const pedidoCompleto = await Pedido.findByPk(pedidoId, {
      include: [{ model: ItemPedido, as: 'items' }, { model: Cliente, as: 'cliente' }]
    });
    req.io.to(`negocio-${req.params.negocioId}`).emit('nuevo-pedido', pedidoCompleto);
    res.status(201).json({ success: true, pedido: pedidoCompleto });
  } catch (err) {
    res.status(201).json({ success: true, pedido: { id: pedidoId } });
  }
};

exports.actualizar = async (req, res) => {
  try {
    const { id } = req.params;
    const pedido = await Pedido.findByPk(id);
    if (!pedido) return res.status(404).json({ success: false, message: 'Pedido no encontrado' });
    const estadoAnterior = pedido.estado;
    await pedido.update(req.body);
    const pedidoCompleto = await Pedido.findByPk(id, {
      include: [
        { model: ItemPedido, as: 'items' },
        { model: Cliente, as: 'cliente', attributes: ['id', 'nombre', 'telefono'] },
        { model: Repartidor, as: 'repartidor', attributes: ['id', 'nombre'] }
      ]
    });

    // ✅ ENVIO WHATSAPP si cambió el estado (mismo logic que actualizarEstado)
    if (req.body.estado && req.body.estado !== estadoAnterior) {
      try {
        const estado = req.body.estado;
        console.log(`\n🚀 CAMBIO DE ESTADO (PUT): ${estadoAnterior} → ${estado}`);
        console.log('👉 Telefono:', pedidoCompleto.clienteTelefono, '| Modalidad:', pedidoCompleto.modalidad);

        if (pedidoCompleto.clienteTelefono) {
          const modalidad = pedidoCompleto.modalidad;
          let templateKey = null;

          if (estadoAnterior === 'nuevo' && estado === 'en_preparacion') templateKey = 'nuevo_a_preparacion';
          else if (estadoAnterior === 'en_preparacion' && estado === 'listo') templateKey = 'preparacion_a_listo';
          else if (estadoAnterior === 'listo' && estado === 'en_camino') templateKey = 'listo_a_en_camino';
          else if (estado === 'cancelado') templateKey = 'cualquier_a_cancelado';

          console.log('👉 Template key:', templateKey);

          if (templateKey && whatsappService.templates[modalidad] && whatsappService.templates[modalidad][templateKey]) {
            let mensaje = whatsappService.templates[modalidad][templateKey];

            // Renderizar variables en el template
            const variables = {
              numero_pedido: pedidoCompleto.numero,
              nombre_cliente: pedidoCompleto.clienteNombre || 'Cliente',
              telefono: pedidoCompleto.clienteTelefono || '',
              total: pedidoCompleto.total || 0,
              tiempo_estimado: pedidoCompleto.tiempoEstimado || 30,
            };

            // Reemplazar variables
            for (const [key, value] of Object.entries(variables)) {
              mensaje = mensaje.replace(new RegExp(`{{${key}}}`, 'g'), value);
            }

            if (mensaje && mensaje.trim().length > 0) {
              console.log('✅ Enviando mensaje WhatsApp...');
              console.log('📝 Mensaje:', mensaje);
              const resultado = await whatsappService.sendMessage(pedidoCompleto.clienteTelefono, mensaje);
              console.log('✅ Resultado envio:', resultado);
            } else {
              console.log('⚠️ Mensaje vacío, no se envía');
            }
          } else {
            console.log('⚠️ No se encontró template para esta combinación');
          }
        }
      } catch (whatsappError) {
        console.log('Error enviando WhatsApp:', whatsappError.message);
      }
    }

    req.io.to(`negocio-${pedido.negocioId}`).emit('pedido-actualizado', pedidoCompleto);
    res.json({ success: true, pedido: pedidoCompleto });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Edición completa: actualiza campos + reemplaza items
exports.actualizarCompleto = async (req, res) => {
  const t = await sequelize.transaction();
  let pedidoNegocioId = null;
  const { id } = req.params;
  try {
    const { items, subtotal, total, costoEnvio, descuento, ...campos } = req.body;
    const pedido = await Pedido.findByPk(id, { transaction: t });
    if (!pedido) { await t.rollback().catch(() => {}); return res.status(404).json({ success: false, message: 'No encontrado' }); }

    pedidoNegocioId = pedido.negocioId;
    await pedido.update({ ...campos, subtotal, total, costoEnvio, descuento }, { transaction: t });

    if (items) {
      await ItemPedido.destroy({ where: { pedidoId: id }, transaction: t });
      await ItemPedido.bulkCreate(items.map(item => ({
        pedidoId: id,
        productoId: item.productoId || null,
        nombre: item.nombre || 'Producto',
        varianteNombre: item.varianteNombre || null,
        cantidad: item.cantidad,
        precioUnitario: parseFloat(item.precioUnitario),
        subtotal: parseFloat(item.precioUnitario) * item.cantidad,
        adicionales: item.adicionales || [],
        notas: item.notas || ''
      })), { transaction: t });
    }

    await t.commit();
  } catch (err) {
    if (!t.finished) await t.rollback().catch(() => {});
    return res.status(500).json({ success: false, message: err.message });
  }

  // Post-commit fuera del try para no crashear al intentar rollback en transacción ya commiteada
  try {
    const pedidoCompleto = await Pedido.findByPk(id, {
      include: [
        { model: ItemPedido, as: 'items' },
        { model: Cliente, as: 'cliente', attributes: ['id', 'nombre', 'telefono'] },
        { model: Repartidor, as: 'repartidor', attributes: ['id', 'nombre'] }
      ]
    });
    req.io.to(`negocio-${pedidoNegocioId}`).emit('pedido-actualizado', pedidoCompleto);
    res.json({ success: true, pedido: pedidoCompleto });
  } catch (err) {
    res.json({ success: true, pedido: { id } });
  }
};

exports.actualizarEstado = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado, repartidorId } = req.body;
    const pedido = await Pedido.findByPk(id);
    if (!pedido) return res.status(404).json({ success: false, message: 'Pedido no encontrado' });
    const estadoAnterior = pedido.estado;
    await pedido.update({ estado, ...(repartidorId && { repartidorId }) });
    const pedidoCompleto = await Pedido.findByPk(id, {
      include: [
        { model: ItemPedido, as: 'items' },
        { model: Cliente, as: 'cliente', attributes: ['id', 'nombre', 'telefono'] },
        { model: Repartidor, as: 'repartidor', attributes: ['id', 'nombre'] }
      ]
    });

    // ✅ ENVIO AUTOMATICO DE MENSAJE WHATSAPP AL CAMBIAR ESTADO
    try {
      console.log('\n🚀 🚀 🚀 CAMBIO DE ESTADO PEDIDO:', pedidoCompleto.id);
      console.log('👉 Estado anterior:', estadoAnterior, 'Nuevo estado:', estado);
      console.log('👉 Telefono cliente:', pedidoCompleto.clienteTelefono);
      console.log('👉 Modalidad:', pedidoCompleto.modalidad);
      
      if (pedidoCompleto.clienteTelefono) {
        const modalidad = pedidoCompleto.modalidad;
        let templateKey = null;

        if (estadoAnterior === 'nuevo' && estado === 'en_preparacion') templateKey = 'nuevo_a_preparacion';
        else if (estadoAnterior === 'en_preparacion' && estado === 'listo') templateKey = 'preparacion_a_listo';
        else if (estadoAnterior === 'listo' && estado === 'en_camino') templateKey = 'listo_a_en_camino';
        else if (estado === 'cancelado') templateKey = 'cualquier_a_cancelado';

        console.log('👉 Template key:', templateKey);

        if (templateKey && whatsappService.templates[modalidad] && whatsappService.templates[modalidad][templateKey]) {
          let mensaje = whatsappService.templates[modalidad][templateKey];

          // Renderizar variables en el template
          const variables = {
            numero_pedido: pedidoCompleto.numero,
            nombre_cliente: pedidoCompleto.clienteNombre || 'Cliente',
            telefono: pedidoCompleto.clienteTelefono || '',
            total: pedidoCompleto.total || 0,
            tiempo_estimado: pedidoCompleto.tiempoEstimado || 30,
          };

          // Reemplazar variables
          for (const [key, value] of Object.entries(variables)) {
            mensaje = mensaje.replace(new RegExp(`{{${key}}}`, 'g'), value);
          }

          console.log('👉 Mensaje a enviar:', mensaje);

          if (mensaje && mensaje.trim().length > 0) {
            console.log('✅ Enviando mensaje...');
            const resultado = await whatsappService.sendMessage(pedidoCompleto.clienteTelefono, mensaje);
            console.log('✅ Resultado envio:', resultado);
          } else {
            console.log('⚠️ Mensaje vacio, no se envia');
          }
        } else {
          console.log('⚠️ No se encontro template para esta combinacion');
        }
      }
    } catch (whatsappError) {
      // No romper la respuesta por error de WhatsApp
      console.log('Error enviando mensaje WhatsApp:', whatsappError.message);
    }

    req.io.to(`negocio-${pedido.negocioId}`).emit('pedido-actualizado', pedidoCompleto);
    res.json({ success: true, pedido: pedidoCompleto });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.obtener = async (req, res) => {
  try {
    const pedido = await Pedido.findByPk(req.params.id, {
      include: [
        { model: ItemPedido, as: 'items' },
        { model: Cliente, as: 'cliente' },
        { model: Repartidor, as: 'repartidor' }
      ]
    });
    if (!pedido) return res.status(404).json({ success: false, message: 'No encontrado' });
    res.json({ success: true, pedido });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};