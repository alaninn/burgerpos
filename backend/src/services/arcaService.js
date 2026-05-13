// =============================================
// SERVICIO: Facturación Electrónica ARCA
// Maneja autenticación, generación de certificados y emisión de comprobantes
// =============================================

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const forge = require('node-forge');
const axios = require('axios');
const xml2js = require('xml2js');
const https = require('https');

// AFIP usa claves DH antiguas, hay que permitirlas
const httpsAgent = new https.Agent({
    secureOptions: crypto.constants.SSL_OP_LEGACY_SERVER_CONNECT,
    ciphers: 'DEFAULT:@SECLEVEL=0'
});
const { ARCACredential, ComprobanteElectronico, Negocio, Pedido, sequelize } = require('../models');
const { Op } = require('sequelize');
const encryptionService = require('./encryptionService');
const wsaaService = require('./wsaaService');

// Crear directorio para certificados si no existe
const CERT_DIR = path.join(__dirname, '../../uploads/certificados');
if (!fs.existsSync(CERT_DIR)) {
    fs.mkdirSync(CERT_DIR, { recursive: true });
}

/**
 * Genera un par de claves RSA y un CSR (Certificate Signing Request)
 * @param {string} cuit - CUIT del negocio
 * @param {string} razonSocial - Razón social del negocio
 * @returns {Object} - { keyPem, csrPem, keyPath, csrPath }
 */
function generarCertificados(cuit, razonSocial) {
    try {
        // Generar clave privada RSA 2048 bits
        const keys = forge.pki.rsa.generateKeyPair(2048);
        
        // Crear CSR
        const csr = forge.pki.createCertificationRequest();
        csr.publicKey = keys.publicKey;
        
        // Agregar atributos al CSR
        csr.setSubject([{
            name: 'commonName',
            value: razonSocial || 'Usuario ARCA'
        }, {
            name: 'serialNumber',
            value: `CUIT ${cuit}`
        }]);
        
        // Firmar CSR con la clave privada
        csr.sign(keys.privateKey);
        
        // Convertir a PEM
        const keyPem = forge.pki.privateKeyToPem(keys.privateKey);
        const csrPem = forge.pki.certificationRequestToPem(csr);
        
        // Generar nombres únicos de archivos
        const timestamp = Date.now();
        const keyFileName = `key_${cuit}_${timestamp}.key`;
        const csrFileName = `csr_${cuit}_${timestamp}.csr`;
        
        const keyPath = path.join(CERT_DIR, keyFileName);
        const csrPath = path.join(CERT_DIR, csrFileName);
        
        // Guardar archivos
        fs.writeFileSync(keyPath, keyPem);
        fs.writeFileSync(csrPath, csrPem);
        
        console.log(`✅ Certificados generados para CUIT: ${cuit}`);
        
        return {
            keyPem,
            csrPem,
            keyPath: `certificados/${keyFileName}`,
            csrPath: `certificados/${csrFileName}`
        };
    } catch (error) {
        console.error('❌ Error generando certificados:', error);
        throw new Error('Error al generar certificados: ' + error.message);
    }
}

/**
 * Guarda un certificado (.crt) recibido de ARCA
 * @param {Buffer} certBuffer - Contenido del certificado
 * @param {string} cuit - CUIT del negocio
 * @returns {string} - Ruta del certificado guardado
 */
function guardarCertificado(certBuffer, cuit) {
    try {
        const timestamp = Date.now();
        const certFileName = `cert_${cuit}_${timestamp}.crt`;
        const certPath = path.join(CERT_DIR, certFileName);
        
        fs.writeFileSync(certPath, certBuffer);
        
        console.log(`✅ Certificado guardado: ${certFileName}`);
        
        return `certificados/${certFileName}`;
    } catch (error) {
        console.error('❌ Error guardando certificado:', error);
        throw new Error('Error al guardar certificado: ' + error.message);
    }
}

/**
 * Verifica si un certificado es válido y no está vencido
 * @param {string} certPath - Ruta del certificado
 * @returns {Object} - { valido, fechaVencimiento, diasRestantes }
 */
function verificarCertificado(certPath) {
    try {
        const fullPath = path.join(__dirname, '../uploads', certPath);
        
        if (!fs.existsSync(fullPath)) {
            return { valido: false, error: 'Certificado no encontrado' };
        }
        
        const certPem = fs.readFileSync(fullPath, 'utf8');
        const cert = forge.pki.certificateFromPem(certPem);
        
        const ahora = new Date();
        const vencimiento = cert.validity.notAfter;
        const diasRestantes = Math.floor((vencimiento - ahora) / (1000 * 60 * 60 * 24));
        
        return {
            valido: vencimiento > ahora,
            fechaVencimiento: vencimiento,
            diasRestantes: diasRestantes,
            subject: cert.subject.attributes.map(a => `${a.name}=${a.value}`).join(', ')
        };
    } catch (error) {
        console.error('❌ Error verificando certificado:', error);
        return { valido: false, error: error.message };
    }
}

/**
 * Obtiene los tipos de comprobante según el régimen fiscal
 * @param {string} regimenFiscal - 'responsable_inscripto' o 'monotributista'
 * @returns {Array} - Lista de tipos de comprobante
 */
function obtenerTiposComprobante(regimenFiscal) {
    const tipos = {
        responsable_inscripto: [
            { codigo: 1, nombre: 'Factura A', descripcion: 'Para Responsables Inscriptos', emoji: '📄' },
            { codigo: 6, nombre: 'Factura B', descripcion: 'Para consumidores finales', emoji: '📄' },
            { codigo: 3, nombre: 'Nota de Crédito A', descripcion: 'Devolución Factura A', emoji: '📝' },
            { codigo: 8, nombre: 'Nota de Crédito B', descripcion: 'Devolución Factura B', emoji: '📝' },
            { codigo: 2, nombre: 'Nota de Débito A', descripcion: 'Ajuste Factura A', emoji: '📋' },
            { codigo: 7, nombre: 'Nota de Débito B', descripcion: 'Ajuste Factura B', emoji: '📋' },
        ],
        monotributista: [
            { codigo: 11, nombre: 'Factura C', descripcion: 'Para Monotributistas', emoji: '📄' },
            { codigo: 13, nombre: 'Nota de Crédito C', descripcion: 'Devolución Factura C', emoji: '📝' },
            { codigo: 12, nombre: 'Nota de Débito C', descripcion: 'Ajuste Factura C', emoji: '📋' },
        ]
    };
    
    return tipos[regimenFiscal] || tipos.responsable_inscripto;
}

/**
 * Obtiene los tipos de documento para facturación
 * @returns {Array} - Lista de tipos de documento
 */
function obtenerTiposDocumento() {
    return [
        { codigo: 80, nombre: 'CUIT', descripcion: 'Código Único de Identificación Tributaria' },
        { codigo: 96, nombre: 'DNI', descripcion: 'Documento Nacional de Identidad' },
        { codigo: 99, nombre: 'Sin Identificar', descripcion: 'Consumidor Final' },
    ];
}

/**
 * Emite un comprobante electrónico real usando WSFEv1
 * @param {Object} datos - Datos del comprobante
 * @returns {Object} - Resultado de la emisión
 */
async function emitirComprobante(datos) {
    const {
        negocioId,
        pedidoId,
        tipoComprobante,
        puntoVenta,
        tipoDocumento,
        numeroDocumento,
        denominacion,
        importeTotal,
        importeNeto,
        importeIVA
    } = datos;

    let xmlEnviado = null;
    let xmlRespuesta = null;
    let numeroComprobante = 0;

    try {
        // 1. Obtener certificado activo del negocio
        const certificado = await ARCACredential.findOne({
            where: { negocioId, activo: true }
        });

        if (!certificado) {
            throw new Error('No hay certificado activo configurado');
        }

        // 2. Desencriptar paths de certificados
        const certPath = encryptionService.decrypt(certificado.certPath);
        const keyPath = encryptionService.decrypt(certificado.keyPath);

        // 3. Verificar que el certificado no esté vencido
        const verificacion = verificarCertificado(certPath);
        if (!verificacion.valido) {
            throw new Error('El certificado está vencido o no es válido');
        }

        // 4. Obtener ticket de acceso del WSAA
        console.log('🔐 Obteniendo ticket de acceso WSAA...');
        const ticket = await wsaaService.obtenerTicketAcceso(negocioId, 'wsfe');

        // 5. Obtener configuración del negocio
        const cuitEmisor = certificado.cuit.replace(/[-\s]/g, '');
        const entorno = certificado.entornoProduccion ? 'produccion' : 'homologacion';
        const punto_venta = puntoVenta || certificado.puntoVenta;
        const tipo_comprobante = tipoComprobante;

        // 6. Obtener último número de comprobante directamente desde AFIP
        const wsfeUrl2 = entorno === 'produccion'
            ? 'https://servicios1.afip.gov.ar/wsfev1/service.asmx'
            : 'https://wswhomo.afip.gov.ar/wsfev1/service.asmx';

        const xmlUltimo = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ar="http://ar.gov.afip.dif.FEV1/">
    <soapenv:Header/>
    <soapenv:Body>
        <ar:FECompUltimoAutorizado>
            <ar:Auth>
                <ar:Token>${ticket.token}</ar:Token>
                <ar:Sign>${ticket.sign}</ar:Sign>
                <ar:Cuit>${cuitEmisor}</ar:Cuit>
            </ar:Auth>
            <ar:PtoVta>${parseInt(punto_venta)}</ar:PtoVta>
            <ar:CbteTipo>${parseInt(tipo_comprobante)}</ar:CbteTipo>
        </ar:FECompUltimoAutorizado>
    </soapenv:Body>
</soapenv:Envelope>`;

const respUltimo = await axios.post(wsfeUrl2, xmlUltimo, {
    headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        'SOAPAction': 'http://ar.gov.afip.dif.FEV1/FECompUltimoAutorizado'
    },
    timeout: 30000,
    httpsAgent: httpsAgent
});

const parserUltimo = new xml2js.Parser({ explicitArray: false, ignoreAttrs: true });
const resultadoUltimo = await parserUltimo.parseStringPromise(respUltimo.data);
const envelopeU = resultadoUltimo['soap:Envelope'] || resultadoUltimo['soapenv:Envelope'];
const bodyU = envelopeU['soap:Body'] || envelopeU['soapenv:Body'];
const ultResp = bodyU['FECompUltimoAutorizadoResponse']?.FECompUltimoAutorizadoResult
    || bodyU['ns1:FECompUltimoAutorizadoResponse']?.FECompUltimoAutorizadoResult;

        const ultimoNro = parseInt(ultResp?.CbteNro || '0');
        numeroComprobante = ultimoNro + 1;
        console.log(`📋 Último comprobante AFIP: ${ultimoNro}, próximo: ${numeroComprobante}`);

        // 7. Calcular importes
        const importeNetoCalculado = parseFloat(importeNeto) || parseFloat(importeTotal);
        const importeIvaCalculado = parseFloat(importeIVA) || 0;
        
        // 8. Crear XML para WSFEv1 (CAESolicitar)
        const fechaEmision = new Date().toISOString().split('T')[0].replace(/-/g, '');

        xmlEnviado = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ar="http://ar.gov.afip.dif.FEV1/">
    <soapenv:Header/>
    <soapenv:Body>
        <ar:FECAESolicitar>
            <ar:Auth>
                <ar:Token>${ticket.token}</ar:Token>
                <ar:Sign>${ticket.sign}</ar:Sign>
                <ar:Cuit>${cuitEmisor}</ar:Cuit>
            </ar:Auth>
            <ar:FeCAEReq>
                <ar:FeCabReq>
                    <ar:CantReg>1</ar:CantReg>
                    <ar:PtoVta>${parseInt(punto_venta)}</ar:PtoVta>
                    <ar:CbteTipo>${parseInt(tipo_comprobante)}</ar:CbteTipo>
                </ar:FeCabReq>
                <ar:FeDetReq>
                    <ar:FECAEDetRequest>
                        <ar:Concepto>1</ar:Concepto>
                        <ar:DocTipo>${tipoDocumento || 99}</ar:DocTipo>
                        <ar:DocNro>${tipoDocumento === 99 ? 0 : (numeroDocumento || 0)}</ar:DocNro>
                        <ar:CbteDesde>${numeroComprobante}</ar:CbteDesde>
                        <ar:CbteHasta>${numeroComprobante}</ar:CbteHasta>
                        <ar:CbteFch>${fechaEmision}</ar:CbteFch>
                        <ar:ImpTotal>${parseFloat(importeTotal).toFixed(2)}</ar:ImpTotal>
                        <ar:ImpTotConc>0.00</ar:ImpTotConc>
                        <ar:ImpNeto>${importeNetoCalculado.toFixed(2)}</ar:ImpNeto>
                        <ar:ImpOpEx>0.00</ar:ImpOpEx>
                        <ar:ImpIVA>${importeIvaCalculado.toFixed(2)}</ar:ImpIVA>
                        <ar:ImpTrib>0.00</ar:ImpTrib>
                        <ar:FchServDesde></ar:FchServDesde>
                        <ar:FchServHasta></ar:FchServHasta>
                        <ar:FchVtoPago></ar:FchVtoPago>
                        <ar:MonId>PES</ar:MonId>
                        <ar:MonCotiz>1.000</ar:MonCotiz>
                        ${importeIvaCalculado > 0 ? `
                        <ar:Iva>
                            <ar:AlicIva>
                                <ar:Id>5</ar:Id>
                                <ar:BaseImp>${importeNetoCalculado.toFixed(2)}</ar:BaseImp>
                                <ar:Importe>${importeIvaCalculado.toFixed(2)}</ar:Importe>
                            </ar:AlicIva>
                        </ar:Iva>` : ''}
                    </ar:FECAEDetRequest>
                </ar:FeDetReq>
            </ar:FeCAEReq>
        </ar:FECAESolicitar>
    </soapenv:Body>
</soapenv:Envelope>`;
        
        // 8. Determinar URL del WSFEv1 según entorno
        const wsfeUrl = entorno === 'produccion'
            ? 'https://servicios1.afip.gov.ar/wsfev1/service.asmx'
            : 'https://wswhomo.afip.gov.ar/wsfev1/service.asmx';
        
        console.log(`📄 Enviando comprobante a WSFEv1 (${entorno})...`);
        
        // 9. Enviar solicitud al WSFEv1
        let response;
        try {
            response = await axios.post(wsfeUrl, xmlEnviado, {
    headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        'SOAPAction': 'http://ar.gov.afip.dif.FEV1/FECAESolicitar'
    },
    timeout: 60000,
    httpsAgent: httpsAgent
});
            xmlRespuesta = response.data;
        } catch (axiosError) {
            throw new Error(`Error de conexión con WSFEv1: ${axiosError.message}`);
        }
        
        // 10. Parsear respuesta XML
        const parser = new xml2js.Parser({ explicitArray: false, ignoreAttrs: true });
        const resultado = await parser.parseStringPromise(response.data);
        
        // Extraer resultado de la operación
        const soapBody = resultado['soap:Envelope'] || resultado['soapenv:Envelope'];
        const body = soapBody['soap:Body'] || soapBody['soapenv:Body'];
        const feCAESolicitarResult = body['FECAESolicitarResponse']?.FECAESolicitarResult 
            || body['ns1:FECAESolicitarResponse']?.FECAESolicitarResult;
        
        if (!feCAESolicitarResult) {
            throw new Error('Respuesta inválida del WSFEv1');
        }
        
        const feDetResp = feCAESolicitarResult.FeDetResp?.FECAEDetResponse;
        const cabecera = feCAESolicitarResult.FeCabResp;
        
        // 11. Verificar resultado
        if (!feDetResp) {
            const errores = feCAESolicitarResult.Errors?.Err;
            const mensajeError = Array.isArray(errores) 
                ? errores.map(e => `${e.Code}: ${e.Msg}`).join(', ')
                : (errores ? `${errores.Code}: ${errores.Msg}` : 'Error desconocido');
            throw new Error(`Error WSFEv1: ${mensajeError}`);
        }
        
        const cae = feDetResp.CAE;
        const caeVencimiento = feDetResp.CAEFchVto;
        const resultadoOperacion = feDetResp.Resultado;
        
        // Verificar si el CAE fue aprobado
       // Verificar si el CAE fue aprobado
if (resultadoOperacion !== 'A') {
   
    const observaciones = feDetResp.Observaciones?.Obs;
    const mensajeObs = Array.isArray(observaciones)
        ? observaciones.map(o => `${o.Code}: ${o.Msg}`).join(', ')
        : (observaciones ? `${observaciones.Code}: ${observaciones.Msg}` : '');
    throw new Error(`CAE no aprobado: ${mensajeObs}`);
}
        
        // 12. Guardar comprobante en BD con CAE real
        const caeVencimientoDate = new Date(
            caeVencimiento.substring(0, 4),
            parseInt(caeVencimiento.substring(4, 6)) - 1,
            caeVencimiento.substring(6, 8)
        );

        // Función helper para obtener letra del comprobante
        const obtenerLetraComprobante = (tipo) => {
            const letras = {
                1: 'A', 6: 'B', 11: 'C',  // Facturas
                3: 'A', 8: 'B', 13: 'C',  // Notas Crédito
                2: 'A', 7: 'B', 12: 'C'   // Notas Débito
            };
            return letras[tipo] || '';
        };

        const comprobante = await ComprobanteElectronico.create({
            negocioId,
            pedidoId: pedidoId || null,
            cae,
            caeVencimiento: caeVencimientoDate,
            numeroComprobante,
            puntoVenta: punto_venta,
            tipoComprobante: tipo_comprobante,
            letraComprobante: obtenerLetraComprobante(tipo_comprobante),
            tipoDocumento: tipoDocumento || 99,
            numeroDocumento: numeroDocumento || null,
            denominacionComprador: denominacion || 'Consumidor Final',
            importeTotal: importeTotal,
            importeNeto: importeNetoCalculado,
            importeIVA: importeIvaCalculado,
            xmlEnviado,
            xmlRespuesta,
            estado: 'emitido'
        });

        // 13. Actualizar pedido con el comprobante electrónico
        if (pedidoId) {
            await Pedido.update(
                { comprobanteElectronicoId: comprobante.id },
                { where: { id: pedidoId } }
            );
        }

        console.log(`✅ Comprobante emitido con CAE real: ${cae} - Número ${numeroComprobante}`);

        return {
            exito: true,
            comprobante: comprobante.toJSON(),
            mensaje: 'Comprobante emitido correctamente'
        };
    } catch (error) {
        console.error('❌ Error emitiendo comprobante:', error);

        // Guardar comprobante con error si es posible
        try {
            await ComprobanteElectronico.create({
                negocioId,
                pedidoId: pedidoId || null,
                cae: null,
                caeVencimiento: new Date(),
                numeroComprobante: numeroComprobante || 0,
                puntoVenta: punto_venta || 1,
                tipoComprobante: tipo_comprobante,
                letraComprobante: '',
                tipoDocumento: tipoDocumento || 99,
                numeroDocumento: numeroDocumento || null,
                denominacionComprador: denominacion || 'Consumidor Final',
                importeTotal: importeTotal,
                importeNeto: importeNeto || importeTotal,
                importeIVA: importeIVA || 0,
                xmlEnviado,
                xmlRespuesta,
                estado: 'error'
            });
        } catch (dbError) {
            console.error('Error guardando comprobante con error:', dbError);
        }

        return {
            exito: false,
            error: error.message
        };
    }
}

/**
 * Obtiene el historial de comprobantes de un negocio
 * @param {string} negocioId - ID del negocio
 * @param {Object} filtros - Filtros opcionales (desde, hasta, tipoComprobante)
 * @returns {Array} - Lista de comprobantes
 */
async function obtenerComprobantes(negocioId, filtros = {}) {
    try {
        const where = { negocioId };

        if (filtros.desde) {
            where.fechaEmision = { [Op.gte]: new Date(filtros.desde) };
        }

        if (filtros.hasta) {
            const hastaDate = new Date(filtros.hasta);
            hastaDate.setHours(23, 59, 59, 999);
            where.fechaEmision = where.fechaEmision
                ? { ...where.fechaEmision, [Op.lte]: hastaDate }
                : { [Op.lte]: hastaDate };
        }

        if (filtros.tipoComprobante) {
            where.tipoComprobante = filtros.tipoComprobante;
        }

        const comprobantes = await ComprobanteElectronico.findAll({
            where,
            include: [
                {
                    model: Pedido,
                    as: 'pedido',
                    required: false
                }
            ],
            order: [['fechaEmision', 'DESC']],
            limit: filtros.limit || 100
        });

        return comprobantes.map(c => c.toJSON());
    } catch (error) {
        console.error('❌ Error obteniendo comprobantes:', error);
        throw error;
    }
}

/**
 * Obtiene el último número de comprobante emitido
 * @param {string} negocioId - ID del negocio
 * @param {number} puntoVenta - Punto de venta
 * @param {number} tipoComprobante - Tipo de comprobante
 * @returns {number} - Último número emitido
 */
async function obtenerUltimoNumero(negocioId, puntoVenta, tipoComprobante) {
    try {
        const resultado = await ComprobanteElectronico.findOne({
            where: { negocioId, puntoVenta, tipoComprobante },
            attributes: [[sequelize.fn('MAX', sequelize.col('numeroComprobante')), 'ultimo']],
            raw: true
        });
        return resultado?.ultimo || 0;
    } catch (error) {
        console.error('❌ Error obteniendo último número:', error);
        return 0;
    }
}

/**
 * Guarda un certificado completo (.crt) y lo asocia a un negocio
 * @param {string} negocioId - ID del negocio
 * @param {string} certPath - Ruta del certificado .crt
 * @param {string} keyPath - Ruta de la clave privada .key
 * @param {string} csrPath - Ruta del CSR (opcional)
 * @param {string} cuit - CUIT del negocio
 * @param {string} regimenFiscal - Régimen fiscal
 * @returns {Object} - Certificado guardado
 */
async function guardarCertificadoNegocio(negocioId, certPath, keyPath, csrPath, cuit, regimenFiscal) {
    try {
        // Encriptar paths
        const certPathEncrypted = encryptionService.encrypt(certPath);
        const keyPathEncrypted = encryptionService.encrypt(keyPath);
        const csrPathEncrypted = csrPath ? encryptionService.encrypt(csrPath) : null;

        // Buscar registro existente o crear uno nuevo
        const [credential, created] = await ARCACredential.findOrCreate({
            where: { negocioId },
            defaults: {
                certPath: certPathEncrypted,
                keyPath: keyPathEncrypted,
                csrPath: csrPathEncrypted,
                cuit,
                regimenFiscal,
                puntoVenta: 1,
                activo: true
            }
        });

        if (!created) {
            // Actualizar registro existente
            await credential.update({
                certPath: certPathEncrypted,
                keyPath: keyPathEncrypted,
                csrPath: csrPathEncrypted,
                cuit,
                regimenFiscal,
                activo: true
            });
            console.log(`✅ Certificado actualizado para negocio ${negocioId}`);
        } else {
            console.log(`✅ Certificado creado para negocio ${negocioId}`);
        }

        return credential.toJSON();
    } catch (error) {
        console.error('❌ Error guardando certificado del negocio:', error);
        throw error;
    }
}

module.exports = {
    generarCertificados,
    guardarCertificado,
    verificarCertificado,
    obtenerTiposComprobante,
    obtenerTiposDocumento,
    emitirComprobante,
    obtenerComprobantes,
    obtenerUltimoNumero,
    guardarCertificadoNegocio,
    CERT_DIR
};