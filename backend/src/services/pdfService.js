const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');

/**
 * Genera PDF de comprobante electrónico
 * Formato compatible con impresora térmica 80mm (~ 226 pixels de ancho)
 */
async function generarPDFComprobante(comprobante, negocio) {
  return new Promise(async (resolve, reject) => {
    try {
      // Crear documento PDF (80mm ≈ 226 puntos, altura automática)
      const doc = new PDFDocument({
        size: [226, 800], // Ancho 80mm, altura flexible
        margins: {
          top: 10,
          bottom: 10,
          left: 10,
          right: 10
        }
      });

      const chunks = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Header - Datos del emisor
      doc.fontSize(10).font('Helvetica-Bold');
      doc.text(negocio.nombre || 'Negocio', { align: 'center' });

      doc.fontSize(8).font('Helvetica');
      if (negocio.direccion) doc.text(negocio.direccion, { align: 'center' });
      if (negocio.telefono) doc.text(`Tel: ${negocio.telefono}`, { align: 'center' });

      // CUIT del emisor
      doc.fontSize(9).font('Helvetica-Bold');
      doc.text(`CUIT: ${comprobante.ARCACredential?.cuit || 'N/A'}`, { align: 'center' });

      // Línea separadora
      doc.moveDown(0.5);
      doc.moveTo(10, doc.y).lineTo(216, doc.y).stroke();
      doc.moveDown(0.5);

      // Tipo de comprobante
      const tipoComprobante = obtenerNombreTipoComprobante(comprobante.tipoComprobante);
      doc.fontSize(11).font('Helvetica-Bold');
      doc.text(tipoComprobante, { align: 'center' });
      doc.fontSize(10);
      doc.text(`LETRA ${comprobante.letraComprobante}`, { align: 'center' });

      // Número de comprobante
      const numeroCompleto = `${String(comprobante.puntoVenta).padStart(4, '0')}-${String(comprobante.numeroComprobante).padStart(8, '0')}`;
      doc.fontSize(9);
      doc.text(`Nº ${numeroCompleto}`, { align: 'center' });

      doc.moveDown(0.5);
      doc.moveTo(10, doc.y).lineTo(216, doc.y).stroke();
      doc.moveDown(0.5);

      // Fecha de emisión
      const fechaEmision = new Date(comprobante.fechaEmision);
      doc.fontSize(8).font('Helvetica');
      doc.text(`Fecha: ${fechaEmision.toLocaleDateString('es-AR')}`, { align: 'left' });
      doc.text(`Hora: ${fechaEmision.toLocaleTimeString('es-AR')}`, { align: 'left' });

      doc.moveDown(0.5);

      // Datos del cliente
      doc.font('Helvetica-Bold');
      doc.text('CLIENTE:', { continued: false });
      doc.font('Helvetica');
      doc.text(comprobante.denominacionComprador || 'Consumidor Final');

      if (comprobante.numeroDocumento && comprobante.numeroDocumento !== '0') {
        const tipoDoc = obtenerTipoDocumento(comprobante.tipoDocumento);
        doc.text(`${tipoDoc}: ${comprobante.numeroDocumento}`);
      }

      doc.moveDown(0.5);
      doc.moveTo(10, doc.y).lineTo(216, doc.y).stroke();
      doc.moveDown(0.5);

      // Detalle de importes
      doc.font('Helvetica-Bold');
      doc.text('DETALLE:', { align: 'left' });
      doc.font('Helvetica');

      if (comprobante.letraComprobante === 'A') {
        // Factura A - discrimina IVA
        doc.text(`Subtotal: $ ${parseFloat(comprobante.importeNeto).toFixed(2)}`, { align: 'right' });
        doc.text(`IVA 21%: $ ${parseFloat(comprobante.importeIVA).toFixed(2)}`, { align: 'right' });
      }

      doc.moveDown(0.3);
      doc.fontSize(10).font('Helvetica-Bold');
      doc.text(`TOTAL: $ ${parseFloat(comprobante.importeTotal).toFixed(2)}`, { align: 'right' });

      doc.moveDown(0.5);
      doc.moveTo(10, doc.y).lineTo(216, doc.y).stroke();
      doc.moveDown(0.5);

      // CAE
      doc.fontSize(9).font('Helvetica-Bold');
      doc.text('CAE:', { continued: true });
      doc.font('Helvetica');
      doc.text(` ${comprobante.cae}`);

      // Vencimiento CAE
      const vtoCAE = new Date(comprobante.caeVencimiento);
      doc.font('Helvetica-Bold');
      doc.text('Vto. CAE:', { continued: true });
      doc.font('Helvetica');
      doc.text(` ${vtoCAE.toLocaleDateString('es-AR')}`);

      doc.moveDown(0.5);

      // Generar QR Code
      const qrData = generarDatosQR(comprobante, negocio);
      const qrImage = await QRCode.toDataURL(qrData);

      // Convertir base64 a buffer
      const qrBuffer = Buffer.from(qrImage.split(',')[1], 'base64');

      // Insertar QR centrado
      const qrSize = 120;
      const qrX = (226 - qrSize) / 2;
      doc.image(qrBuffer, qrX, doc.y, { width: qrSize });

      doc.moveDown(8); // Espacio después del QR

      // Footer
      doc.fontSize(7).font('Helvetica');
      doc.text('Comprobante electrónico AFIP', { align: 'center' });
      doc.text('Verifique en www.afip.gob.ar', { align: 'center' });

      doc.end();

    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Genera los datos para el QR de AFIP
 */
function generarDatosQR(comprobante, negocio) {
  const ver = 1;
  const fecha = new Date(comprobante.fechaEmision).toISOString().split('T')[0].replace(/-/g, '');
  const cuit = (negocio.ARCACredential?.cuit || '0').replace(/[-\s]/g, '');
  const ptoVta = comprobante.puntoVenta;
  const tipoCmp = comprobante.tipoComprobante;
  const nroCmp = comprobante.numeroComprobante;
  const importe = parseFloat(comprobante.importeTotal).toFixed(2);
  const moneda = 'PES'; // Pesos argentinos
  const ctz = '1'; // Cotización
  const tipoDocRec = comprobante.tipoDocumento || 99;
  const nroDocRec = comprobante.numeroDocumento || '0';
  const tipoCodAut = 'E'; // CAE
  const codAut = comprobante.cae;

  // Formato oficial AFIP
  const qrString = JSON.stringify({
    ver,
    fecha,
    cuit,
    ptoVta,
    tipoCmp,
    nroCmp,
    importe,
    moneda,
    ctz,
    tipoDocRec,
    nroDocRec,
    tipoCodAut,
    codAut
  });

  // URL oficial de AFIP
  const base64Data = Buffer.from(qrString).toString('base64');
  return `https://www.afip.gob.ar/fe/qr/?p=${base64Data}`;
}

/**
 * Obtiene el nombre del tipo de comprobante
 */
function obtenerNombreTipoComprobante(tipo) {
  const tipos = {
    1: 'FACTURA',
    6: 'FACTURA',
    11: 'FACTURA',
    3: 'NOTA DE CRÉDITO',
    8: 'NOTA DE CRÉDITO',
    13: 'NOTA DE CRÉDITO',
    2: 'NOTA DE DÉBITO',
    7: 'NOTA DE DÉBITO',
    12: 'NOTA DE DÉBITO'
  };
  return tipos[tipo] || 'COMPROBANTE';
}

/**
 * Obtiene el nombre del tipo de documento
 */
function obtenerTipoDocumento(tipo) {
  const tipos = {
    80: 'CUIT',
    86: 'CUIL',
    96: 'DNI',
    99: 'Doc.'
  };
  return tipos[tipo] || 'Doc.';
}

module.exports = {
  generarPDFComprobante
};
