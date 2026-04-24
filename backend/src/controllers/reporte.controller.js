const { Pedido, ItemPedido, Cliente, Repartidor } = require('../models');
const { Op } = require('sequelize');
const xlsx = require('xlsx');

exports.resumen = async (req, res) => {
  try {
    const { negocioId } = req.params;
    const { fechaDesde, fechaHasta, modalidad, metodoPago } = req.query;

    const iniStr = fechaDesde || new Date().toISOString().split('T')[0];
    const finStr = fechaHasta || new Date().toISOString().split('T')[0];
    const ini = new Date(iniStr + 'T03:00:00.000Z');
    const fin = new Date(finStr + 'T26:59:59.999Z');

    const where = {
      negocioId,
      createdAt: { [Op.between]: [ini, fin] },
      estado: { [Op.ne]: 'cancelado' }
    };
    if (modalidad) where.modalidad = modalidad;
    if (metodoPago) where.metodoPago = metodoPago;

    const pedidos = await Pedido.findAll({ where, include: [{ model: ItemPedido, as: 'items' }] });

    // Resumen global
    const resumen = {
      efectivo: 0, transferencia: 0, tarjeta: 0, efectivo_sin_descuento: 0, sinCobrar: 0,
      delivery: 0, takeaway: 0, salon: 0,
      totalPedidos: pedidos.length,
      totalFacturado: 0,
      ticketPromedio: 0,
      propinas: 0,
      descuentos: 0
    };

    pedidos.forEach(p => {
      const total = parseFloat(p.total) || 0;
      resumen.totalFacturado += total;
      resumen.propinas += parseFloat(p.propina) || 0;
      resumen.descuentos += parseFloat(p.descuento) || 0;
      const mp = p.metodoPago || 'efectivo';
      if (resumen[mp] !== undefined) resumen[mp] += total;
      // Sin cobrar = efectivo/efectivo_sin_descuento Y cobrado !== true
      if (!p.cobrado && ['efectivo','efectivo_sin_descuento'].includes(mp)) resumen.sinCobrar++;
      if (p.modalidad === 'delivery') resumen.delivery++;
      else if (p.modalidad === 'takeaway') resumen.takeaway++;
      else if (p.modalidad === 'salon') resumen.salon++;
    });

    resumen.ticketPromedio = resumen.totalPedidos > 0
      ? resumen.totalFacturado / resumen.totalPedidos : 0;

    // Desglose por modalidad y método de pago
    const modalidades = ['delivery', 'takeaway', 'salon'];
    const desglose = [];

    for (const mod of modalidades) {
      const pedidosMod = pedidos.filter(p => p.modalidad === mod);
      if (pedidosMod.length === 0) continue;

      const metodos = ['efectivo', 'tarjeta', 'transferencia', 'efectivo_sin_descuento'];
      const filas = [];
      let totalMod = 0, totalProductosMod = 0, totalDeliveryMod = 0, totalPropinasMod = 0;

      for (const metodo of metodos) {
        const pedidosMetodo = pedidosMod.filter(p => (p.metodoPago || 'efectivo') === metodo);
        if (pedidosMetodo.length === 0) continue;

        const facturado = pedidosMetodo.reduce((s, p) => s + (parseFloat(p.total) || 0), 0);
        const productos = pedidosMetodo.reduce((s, p) => s + (parseFloat(p.subtotal) || 0), 0);
        const delivery = pedidosMetodo.reduce((s, p) => s + (parseFloat(p.costoEnvio) || 0), 0);
        const propinas = pedidosMetodo.reduce((s, p) => s + (parseFloat(p.propina) || 0), 0);
        const ticketPromedio = facturado / pedidosMetodo.length;

        totalMod += facturado;
        totalProductosMod += productos;
        totalDeliveryMod += delivery;
        totalPropinasMod += propinas;

        const sinCobrarMetodo = ['efectivo','efectivo_sin_descuento'].includes(metodo)
          ? pedidosMetodo.filter(p => !p.cobrado).length : 0;
        filas.push({
          metodo: metodo === 'efectivo' ? 'Efectivo' :
                  metodo === 'tarjeta' ? 'Tarjeta' :
                  metodo === 'transferencia' ? 'Transferencia' : 'Efec. sin desc.',
          cantidad: pedidosMetodo.length,
          ticketPromedio,
          productos,
          delivery,
          propinas,
          facturado,
          sinCobrar: sinCobrarMetodo
        });
      }

      filas.push({
        metodo: 'Total',
        cantidad: pedidosMod.length,
        ticketPromedio: totalMod / pedidosMod.length,
        productos: totalProductosMod,
        delivery: totalDeliveryMod,
        propinas: totalPropinasMod,
        facturado: totalMod,
        esTotal: true
      });

      desglose.push({
        modalidad: mod === 'delivery' ? 'Delivery' : mod === 'takeaway' ? 'Take Away' : 'Salón',
        filas
      });
    }

    res.json({ success: true, resumen, desglose });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.exportar = async (req, res) => {
  try {
    const { negocioId } = req.params;
    const { fechaDesde, fechaHasta } = req.query;

    const iniStr = fechaDesde || new Date().toISOString().split('T')[0];
    const finStr = fechaHasta || new Date().toISOString().split('T')[0];
    const ini = new Date(iniStr + 'T03:00:00.000Z');
    const fin = new Date(finStr + 'T26:59:59.999Z');

    const pedidos = await Pedido.findAll({
      where: { negocioId, createdAt: { [Op.between]: [ini, fin] } },
      include: [
        { model: ItemPedido, as: 'items' },
        { model: Cliente, as: 'cliente', attributes: ['nombre', 'telefono'] },
        { model: Repartidor, as: 'repartidor', attributes: ['nombre'] }
      ],
      order: [['numero', 'ASC']]
    });

    // Hoja 1: pedidos
    const rowsPedidos = pedidos.map(p => ({
      'N°': p.numero,
      'Fecha': new Date(p.createdAt).toLocaleString('es-AR'),
      'Estado': p.estado,
      'Modalidad': p.modalidad,
      'Cliente': p.clienteNombre || p.cliente?.nombre || '',
      'Teléfono': p.clienteTelefono || p.cliente?.telefono || '',
      'Dirección': p.clienteDireccion || '',
      'Repartidor': p.repartidor?.nombre || '',
      'Método pago': p.metodoPago,
      'Cobrado': p.cobrado ? 'Sí' : (['efectivo','efectivo_sin_descuento'].includes(p.metodoPago) ? 'No' : 'Sí'),
      'Subtotal': Number(p.subtotal),
      'Envío': Number(p.costoEnvio),
      'Descuento': Number(p.descuento),
      'Propina': Number(p.propina),
      'Total': Number(p.total),
      'Notas': p.notas || ''
    }));

    // Hoja 2: items
    const rowsItems = pedidos.flatMap(p =>
      (p.items || []).map(item => ({
        'N° Pedido': p.numero,
        'Producto': item.nombre,
        'Cantidad': item.cantidad,
        'Precio unitario': Number(item.precioUnitario),
        'Subtotal': Number(item.subtotal),
        'Notas': item.notas || ''
      }))
    );

    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, xlsx.utils.json_to_sheet(rowsPedidos), 'Pedidos');
    xlsx.utils.book_append_sheet(wb, xlsx.utils.json_to_sheet(rowsItems), 'Detalle items');

    const buf = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const filename = `reporte_${iniStr}_${finStr}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buf);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
