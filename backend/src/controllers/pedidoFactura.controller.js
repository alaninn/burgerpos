const arcaService = require('../services/arcaService');
const { Pedido, ComprobanteElectronico, ProductoPedido, Producto } = require('../models');

/**
 * Emite factura electrónica desde un pedido
 * POST /api/negocios/:negocioId/pedidos/:pedidoId/emitir-factura
 */
exports.emitirFacturaDesdePedido = async (req, res) => {
  try {
    const { negocioId, pedidoId } = req.params;
    const { tipoComprobante, tipoDocumento, numeroDocumento, denominacion } = req.body;

    // Validar que el pedido pertenece al negocio
    const pedido = await Pedido.findOne({
      where: { id: pedidoId, negocioId },
      include: [
        {
          model: ProductoPedido,
          as: 'productos',
          include: [{ model: Producto, as: 'producto' }]
        }
      ]
    });

    if (!pedido) {
      return res.status(404).json({ error: 'Pedido no encontrado' });
    }

    // Verificar que el pedido no tenga ya un comprobante
    if (pedido.comprobanteElectronicoId) {
      return res.status(400).json({ error: 'Este pedido ya tiene un comprobante emitido' });
    }

    // Calcular importes
    const importeTotal = parseFloat(pedido.total);

    // Calcular IVA según tipo de comprobante
    let importeNeto, importeIVA;

    if (tipoComprobante === 1 || tipoComprobante === 3) {
      // Factura A / Nota de Crédito A - discrimina IVA
      importeNeto = importeTotal / 1.21;
      importeIVA = importeTotal - importeNeto;
    } else {
      // Factura B/C - no discrimina IVA
      importeNeto = importeTotal;
      importeIVA = 0;
    }

    // Emitir comprobante
    const resultado = await arcaService.emitirComprobante({
      negocioId,
      pedidoId,
      tipoComprobante: parseInt(tipoComprobante),
      tipoDocumento: parseInt(tipoDocumento),
      numeroDocumento: numeroDocumento || '0',
      denominacion: denominacion || pedido.nombreCliente || 'Consumidor Final',
      importeTotal: parseFloat(importeTotal.toFixed(2)),
      importeNeto: parseFloat(importeNeto.toFixed(2)),
      importeIVA: parseFloat(importeIVA.toFixed(2))
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
      mensaje: `Comprobante emitido - CAE: ${resultado.cae}`,
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

    // Determinar tipo de Nota de Crédito según tipo original
    let tipoNotaCredito;
    switch (pedido.comprobante.tipoComprobante) {
      case 1: tipoNotaCredito = 3; break;  // Factura A → Nota Crédito A
      case 6: tipoNotaCredito = 8; break;  // Factura B → Nota Crédito B
      case 11: tipoNotaCredito = 13; break; // Factura C → Nota Crédito C
      default:
        return res.status(400).json({ error: 'Tipo de comprobante no soportado para anulación' });
    }

    // Emitir Nota de Crédito
    const resultado = await arcaService.emitirComprobante({
      negocioId,
      pedidoId: null, // La NC no se asocia al pedido
      tipoComprobante: tipoNotaCredito,
      tipoDocumento: pedido.comprobante.tipoDocumento,
      numeroDocumento: pedido.comprobante.numeroDocumento,
      denominacion: pedido.comprobante.denominacionComprador,
      importeTotal: pedido.comprobante.importeTotal,
      importeNeto: pedido.comprobante.importeNeto,
      importeIVA: pedido.comprobante.importeIVA,
      comprobanteAsociado: {
        tipo: pedido.comprobante.tipoComprobante,
        puntoVenta: pedido.comprobante.puntoVenta,
        numero: pedido.comprobante.numeroComprobante
      }
    });

    if (!resultado.exito) {
      return res.status(500).json({ error: resultado.error || 'Error al emitir Nota de Crédito' });
    }

    // Marcar el comprobante original como anulado
    await pedido.comprobante.update({
      estado: 'anulado'
    });

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
