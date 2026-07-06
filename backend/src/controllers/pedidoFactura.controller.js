const arcaService = require('../services/arcaService');
const { Pedido, ComprobanteElectronico } = require('../models');

/**
 * Emite factura electrónica desde un pedido
 * POST /api/negocios/:negocioId/pedidos/:pedidoId/emitir-factura
 */
exports.emitirFacturaDesdePedido = async (req, res) => {
  try {
    const { negocioId, pedidoId } = req.params;
    const { tipoComprobante, tipoDocumento, numeroDocumento, denominacion, condicionIvaReceptor } = req.body;

    // Validar que el pedido pertenece al negocio
    const pedido = await Pedido.findOne({ where: { id: pedidoId, negocioId } });

    if (!pedido) {
      return res.status(404).json({ error: 'Pedido no encontrado' });
    }

    // Verificar que el pedido no tenga ya un comprobante
    if (pedido.comprobanteElectronicoId) {
      return res.status(400).json({ error: 'Este pedido ya tiene un comprobante emitido' });
    }

    // Calcular importes
    const importeTotal = parseFloat(pedido.total);
    const tipoCmp = parseInt(tipoComprobante);

    // IVA según tipo: los comprobantes A y B (emisor Responsable Inscripto)
    // llevan el IVA discriminado en el pedido a AFIP (en la B no se muestra al
    // cliente pero AFIP lo exige igual). Los C (monotributo) van sin IVA.
    let importeNeto, importeIVA;
    if ([1, 2, 3, 6, 7, 8].includes(tipoCmp)) {
      importeNeto = importeTotal / 1.21;
      importeIVA = importeTotal - importeNeto;
    } else {
      // Factura C y notas C - sin IVA
      importeNeto = importeTotal;
      importeIVA = 0;
    }

    // Emitir comprobante
    const resultado = await arcaService.emitirComprobante({
      negocioId,
      pedidoId,
      tipoComprobante: tipoCmp,
      tipoDocumento: parseInt(tipoDocumento) || 99,
      numeroDocumento: numeroDocumento || '0',
      denominacion: denominacion || pedido.clienteNombre || 'Consumidor Final',
      importeTotal: parseFloat(importeTotal.toFixed(2)),
      importeNeto: parseFloat(importeNeto.toFixed(2)),
      importeIVA: parseFloat(importeIVA.toFixed(2)),
      condicionIvaReceptor
    });

    if (!resultado.exito) {
      return res.status(500).json({ error: resultado.error || 'Error al emitir comprobante' });
    }

    // Actualizar pedido con el comprobante
    await pedido.update({
      comprobanteElectronicoId: resultado.comprobante.id
    });

    // Obtener pedido actualizado con comprobante
    const pedidoActualizado = await Pedido.findByPk(pedidoId, {
      include: [
        { model: ComprobanteElectronico, as: 'comprobante' }
      ]
    });

    res.json({
      exito: true,
      mensaje: `Comprobante emitido - CAE: ${resultado.comprobante?.cae || ''}`,
      comprobante: resultado.comprobante,
      pedido: pedidoActualizado
    });

  } catch (error) {
    console.error('Error emitiendo factura desde pedido:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Obtiene el comprobante electrónico de un pedido
 * GET /api/negocios/:negocioId/pedidos/:pedidoId/comprobante
 */
exports.obtenerComprobanteDelPedido = async (req, res) => {
  try {
    const { negocioId, pedidoId } = req.params;

    const pedido = await Pedido.findOne({
      where: { id: pedidoId, negocioId },
      include: [
        { model: ComprobanteElectronico, as: 'comprobante' }
      ]
    });

    if (!pedido) {
      return res.status(404).json({ error: 'Pedido no encontrado' });
    }

    if (!pedido.comprobante) {
      return res.status(404).json({ error: 'Este pedido no tiene comprobante emitido' });
    }

    res.json(pedido.comprobante);

  } catch (error) {
    console.error('Error obteniendo comprobante del pedido:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Anula un comprobante emitiendo una Nota de Crédito
 * POST /api/negocios/:negocioId/pedidos/:pedidoId/anular-comprobante
 */
exports.anularComprobante = async (req, res) => {
  try {
    const { negocioId, pedidoId } = req.params;
    const { motivo } = req.body;

    const pedido = await Pedido.findOne({
      where: { id: pedidoId, negocioId },
      include: [
        { model: ComprobanteElectronico, as: 'comprobante' }
      ]
    });

    if (!pedido) {
      return res.status(404).json({ error: 'Pedido no encontrado' });
    }

    if (!pedido.comprobante) {
      return res.status(404).json({ error: 'Este pedido no tiene comprobante para anular' });
    }

    if (pedido.comprobante.estado === 'anulado') {
      return res.status(400).json({ error: 'Este comprobante ya fue anulado' });
    }

    // Emitir la Nota de Crédito referenciando el comprobante original
    // (CbtesAsoc, obligatorio para AFIP) — logica portada de gestionQ24.
    const resultado = await arcaService.emitirNotaCredito({ negocioId, pedidoId });

    if (!resultado.exito) {
      return res.status(400).json({ error: resultado.error || 'Error al emitir Nota de Crédito' });
    }

    // Marcar el comprobante original como anulado
    await pedido.comprobante.update({ estado: 'anulado' });

    res.json({
      exito: true,
      mensaje: `Nota de Crédito emitida - CAE: ${resultado.cae}`,
      notaCredito: resultado.comprobante,
      comprobanteOriginal: pedido.comprobante
    });

  } catch (error) {
    console.error('Error anulando comprobante:', error);
    res.status(500).json({ error: error.message });
  }
};
