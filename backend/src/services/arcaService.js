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

// =============================================
// FECHAS PARA AFIP (CbteFch) — portado de gestionQ24
// AFIP valida el rango de fechas (Concepto 1: N±5 días) contra SU reloj, que
// está en horario de Argentina. Por eso la fecha del comprobante se calcula en
// hora AR y NO en UTC: de noche (21:00–23:59 AR) UTC ya es el día siguiente y
// la factura saldría con la fecha equivocada (un día adelantada).
// =============================================
function fechaArgYYYYMMDD(d = new Date()) {
    const p = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Argentina/Buenos_Aires',
        year: 'numeric', month: '2-digit', day: '2-digit',
    }).formatToParts(d).reduce((acc, x) => { acc[x.type] = x.value; return acc; }, {});
    return `${p.year}${p.month}${p.day}`;
}

// Consulta a AFIP la fecha (CbteFch, YYYYMMDD) de un comprobante YA autorizado.
// Sirve para no emitir una factura con fecha anterior a la del último
// autorizado: la regla de AFIP es CbteFch >= fecha del último comprobante de
// ese PtoVta/CbteTipo; si es menor, AFIP rechaza con el error 10016.
async function consultarFechaComprobante({ wsfeUrl, token, sign, cuit, puntoVenta, tipoComprobante, cbteNro }) {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ar="http://ar.gov.afip.dif.FEV1/">
    <soapenv:Header/>
    <soapenv:Body>
        <ar:FECompConsultar>
            <ar:Auth>
                <ar:Token>${token}</ar:Token>
                <ar:Sign>${sign}</ar:Sign>
                <ar:Cuit>${cuit}</ar:Cuit>
            </ar:Auth>
            <ar:FeCompConsReq>
                <ar:CbteTipo>${tipoComprobante}</ar:CbteTipo>
                <ar:CbteNro>${cbteNro}</ar:CbteNro>
                <ar:PtoVta>${puntoVenta}</ar:PtoVta>
            </ar:FeCompConsReq>
        </ar:FECompConsultar>
    </soapenv:Body>
</soapenv:Envelope>`;
    const resp = await axios.post(wsfeUrl, xml, {
        headers: { 'Content-Type': 'text/xml; charset=utf-8', 'SOAPAction': 'http://ar.gov.afip.dif.FEV1/FECompConsultar' },
        timeout: 30000,
        httpsAgent,
    });
    const parser = new xml2js.Parser({ explicitArray: false, ignoreAttrs: true });
    const r = await parser.parseStringPromise(resp.data);
    const env = r['soap:Envelope'] || r['soapenv:Envelope'];
    const body = env['soap:Body'] || env['soapenv:Body'];
    const result = body['FECompConsultarResponse']?.FECompConsultarResult
        || body['ns1:FECompConsultarResponse']?.FECompConsultarResult;
    return result?.ResultGet?.CbteFch || null;
}

// Helper: extrae "Code: Msg | Code: Msg" de Obs/Err/Evt (vengan como objeto o array)
const extraerMsgs = (x) => {
    if (!x) return '';
    const arr = Array.isArray(x) ? x : [x];
    return arr.map(o => `${o?.Code ?? '?'}: ${o?.Msg ?? ''}`).join(' | ');
};

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
        // Los certificados viven en backend/uploads (dos niveles arriba de src/services)
        const fullPath = path.isAbsolute(certPath) ? certPath : path.join(__dirname, '../../uploads', certPath);
        
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
        // Factura B primero: es la habitual (consumidor final). La A es solo
        // para ventas a otros Responsables Inscriptos y se elige a mano.
        responsable_inscripto: [
            { codigo: 6, nombre: 'Factura B', descripcion: 'Para consumidores finales', emoji: '📄' },
            { codigo: 1, nombre: 'Factura A', descripcion: 'Para Responsables Inscriptos', emoji: '📄' },
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
        importeIVA,
        condicionIvaReceptor
    } = datos;

    // Condición frente al IVA del receptor (RG 5616 — obligatorio en WSFEv1):
    // 1=Resp. Inscripto, 4=Exento, 5=Consumidor Final, 6=Resp. Monotributo,
    // 7=Sujeto No Categorizado, 13=Monotributista Social, 15=IVA No Alcanzado.
    // Si no la mandan, se infiere: comprobantes A → RI; con CUIT → Monotributista;
    // resto → Consumidor Final.
    const tipoCmp = parseInt(tipoComprobante);
    const docTipo = parseInt(tipoDocumento) || 99;
    let condIvaReceptor = parseInt(condicionIvaReceptor) || 0;
    if (!condIvaReceptor) {
        if ([1, 2, 3].includes(tipoCmp)) condIvaReceptor = 1;
        else if (docTipo === 80) condIvaReceptor = 6;
        else condIvaReceptor = 5;
    }

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

        // 2-3. Verificar el certificado segun el modo
        if (certificado.modo === 'delegado') {
            // Modo delegado: se verifica el certificado del proveedor (del servidor)
            const delegado = wsaaService.obtenerCertDelegado();
            if (!delegado.disponible) {
                throw new Error(delegado.error);
            }
            const verifDelegado = verificarCertificado(delegado.certPath);
            if (!verifDelegado.valido) {
                throw new Error('El certificado del proveedor está vencido o no es válido. Contactá a soporte.');
            }
        } else {
            const certPath = encryptionService.decrypt(certificado.certPath);
            const verificacion = verificarCertificado(certPath);
            if (!verificacion.valido) {
                throw new Error('El certificado está vencido o no es válido');
            }
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
        // Fecha del comprobante (CbteFch) en HORA DE ARGENTINA (no UTC).
        let fechaEmision = fechaArgYYYYMMDD();
        // Piso de seguridad: nunca emitir con fecha anterior a la del último
        // comprobante autorizado (regla AFIP; si no, error 10016 y se traba la
        // facturación de ese punto de venta).
        if (ultimoNro > 0) {
            try {
                const ultimaFch = await consultarFechaComprobante({
                    wsfeUrl: wsfeUrl2, token: ticket.token, sign: ticket.sign, cuit: cuitEmisor,
                    puntoVenta: parseInt(punto_venta), tipoComprobante: tipoCmp, cbteNro: ultimoNro,
                });
                if (ultimaFch && /^\d{8}$/.test(ultimaFch) && ultimaFch > fechaEmision) {
                    console.log(`📅 CbteFch ajustada de ${fechaEmision} a ${ultimaFch} (fecha del último autorizado)`);
                    fechaEmision = ultimaFch;
                }
            } catch (e) {
                console.warn('⚠️ No se pudo consultar la fecha del último comprobante; uso la fecha de hoy (AR):', e.message);
            }
        }

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
                        <ar:DocTipo>${docTipo}</ar:DocTipo>
                        <ar:DocNro>${docTipo === 99 ? 0 : (String(numeroDocumento || '').replace(/[-\s.]/g, '') || 0)}</ar:DocNro>
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
                        <ar:CondicionIVAReceptorId>${condIvaReceptor}</ar:CondicionIVAReceptorId>
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

        const erroresResult = extraerMsgs(feCAESolicitarResult.Errors?.Err);
        const eventosResult = extraerMsgs(feCAESolicitarResult.Events?.Evt);

        // 11. Verificar resultado
        if (!feDetResp) {
            const detalle = [erroresResult && `Errores: ${erroresResult}`, eventosResult && `Eventos: ${eventosResult}`]
                .filter(Boolean).join(' · ') || 'Error desconocido';
            throw new Error(`Error WSFEv1: ${detalle}`);
        }

        const cae = feDetResp.CAE;
        const caeVencimiento = feDetResp.CAEFchVto;
        const resultadoOperacion = feDetResp.Resultado;

        // Verificar si el CAE fue aprobado. Si no, capturar TODO el detalle de
        // AFIP (observaciones + errores + eventos) para diagnosticar el motivo.
        if (resultadoOperacion !== 'A') {
            const obs = extraerMsgs(feDetResp.Observaciones?.Obs);
            const detalle = [
                `Resultado=${resultadoOperacion || '?'}`,
                obs && `Obs: ${obs}`,
                erroresResult && `Errores: ${erroresResult}`,
                eventosResult && `Eventos: ${eventosResult}`,
            ].filter(Boolean).join(' · ');
            throw new Error(`CAE no aprobado — ${detalle}`);
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
            cbteFecha: fechaEmision,
            condicionIvaReceptor: condIvaReceptor,
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
                caeVencimiento: null,
                numeroComprobante: numeroComprobante || 0,
                puntoVenta: puntoVenta || 1,
                tipoComprobante: tipoCmp,
                letraComprobante: '',
                tipoDocumento: docTipo,
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

/**
 * Emite una NOTA DE CRÉDITO electrónica (WSFEv1) que anula/acredita una factura
 * ya emitida. Mapea el tipo (A→3, B→8, C→13), referencia el comprobante original
 * con CbtesAsoc (obligatorio para AFIP) y usa los mismos importes.
 * Portado de gestionQ24 (probado en producción).
 * @param {Object} datos - { negocioId, pedidoId }
 */
async function emitirNotaCredito({ negocioId, pedidoId, comprobanteId }) {
    // 1. Buscar la factura original: por comprobante (desde el listado) o por
    // pedido (al anular un pedido). Solo facturas, nunca una NC (3/8/13).
    let orig;
    if (comprobanteId) {
        orig = await ComprobanteElectronico.findOne({
            where: { id: comprobanteId, negocioId, estado: 'emitido', tipoComprobante: { [Op.in]: [1, 2, 6, 7, 11, 12] } }
        });
    } else if (pedidoId) {
        orig = await ComprobanteElectronico.findOne({
            where: { pedidoId, negocioId, estado: 'emitido', tipoComprobante: { [Op.in]: [1, 2, 6, 7, 11, 12] } },
            order: [['createdAt', 'DESC']]
        });
    }
    if (!orig) {
        return { exito: false, error: 'No se encontró una factura emitida para anular' };
    }
    // La NC hereda el pedido de la factura original (si tenía)
    pedidoId = orig.pedidoId || pedidoId || null;

    // Mapear factura → nota de crédito (A=3, B=8, C=13)
    const mapNC = { 1: 3, 2: 3, 6: 8, 7: 8, 11: 13, 12: 13 };
    const origTipo = parseInt(orig.tipoComprobante);
    const ncTipo = mapNC[origTipo];
    if (!ncTipo) return { exito: false, error: 'Tipo de comprobante no soportado para nota de crédito' };

    const punto_venta = parseInt(orig.puntoVenta);
    const docTipo = parseInt(orig.tipoDocumento) || 99;
    const condIvaReceptor = parseInt(orig.condicionIvaReceptor) || (origTipo === 1 ? 1 : (docTipo === 80 ? 6 : 5));
    const importeTotal = parseFloat(orig.importeTotal);
    const importeNeto = parseFloat(orig.importeNeto) || importeTotal;
    const importeIva = parseFloat(orig.importeIVA) || 0;
    const origNro = parseInt(orig.numeroComprobante);
    const origFch = (orig.cbteFecha && /^\d{8}$/.test(String(orig.cbteFecha)))
        ? String(orig.cbteFecha)
        : fechaArgYYYYMMDD(orig.fechaEmision ? new Date(orig.fechaEmision) : new Date());

    let xmlEnviado = null, xmlRespuesta = null, numeroComprobante = 0;
    try {
        // Certificado + ticket WSAA (mismo flujo que emitirComprobante)
        const certificado = await ARCACredential.findOne({ where: { negocioId, activo: true } });
        if (!certificado) throw new Error('No hay certificado activo configurado');
        if (certificado.modo === 'delegado') {
            const delegado = wsaaService.obtenerCertDelegado();
            if (!delegado.disponible) throw new Error(delegado.error);
            const verifDelegado = verificarCertificado(delegado.certPath);
            if (!verifDelegado.valido) throw new Error('El certificado del proveedor está vencido o no es válido. Contactá a soporte.');
        } else {
            const certPath = encryptionService.decrypt(certificado.certPath);
            const verificacion = verificarCertificado(certPath);
            if (!verificacion.valido) throw new Error('El certificado está vencido o no es válido');
        }

        console.log('🔐 Obteniendo ticket de acceso WSAA (nota de crédito)...');
        const ticket = await wsaaService.obtenerTicketAcceso(negocioId, 'wsfe');

        const cuitEmisor = certificado.cuit.replace(/[-\s]/g, '');
        const entorno = certificado.entornoProduccion ? 'produccion' : 'homologacion';
        const wsfeUrl = entorno === 'produccion'
            ? 'https://servicios1.afip.gov.ar/wsfev1/service.asmx'
            : 'https://wswhomo.afip.gov.ar/wsfev1/service.asmx';

        // Último número de NC autorizado para este PtoVta/Tipo
        const xmlUltimo = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ar="http://ar.gov.afip.dif.FEV1/">
    <soapenv:Header/><soapenv:Body>
        <ar:FECompUltimoAutorizado>
            <ar:Auth><ar:Token>${ticket.token}</ar:Token><ar:Sign>${ticket.sign}</ar:Sign><ar:Cuit>${cuitEmisor}</ar:Cuit></ar:Auth>
            <ar:PtoVta>${punto_venta}</ar:PtoVta><ar:CbteTipo>${ncTipo}</ar:CbteTipo>
        </ar:FECompUltimoAutorizado>
    </soapenv:Body></soapenv:Envelope>`;
        const respUltimo = await axios.post(wsfeUrl, xmlUltimo, {
            headers: { 'Content-Type': 'text/xml; charset=utf-8', 'SOAPAction': 'http://ar.gov.afip.dif.FEV1/FECompUltimoAutorizado' },
            timeout: 30000, httpsAgent
        });
        const parserU = new xml2js.Parser({ explicitArray: false, ignoreAttrs: true });
        const resU = await parserU.parseStringPromise(respUltimo.data);
        const envU = resU['soap:Envelope'] || resU['soapenv:Envelope'];
        const bodyU = envU['soap:Body'] || envU['soapenv:Body'];
        const ultResp = bodyU['FECompUltimoAutorizadoResponse']?.FECompUltimoAutorizadoResult || bodyU['ns1:FECompUltimoAutorizadoResponse']?.FECompUltimoAutorizadoResult;
        const ultimoNro = parseInt(ultResp?.CbteNro || '0');
        numeroComprobante = ultimoNro + 1;
        console.log(`📋 Última NC AFIP: ${ultimoNro}, próxima: ${numeroComprobante}`);

        // Fecha (AR) con piso de seguridad respecto del último autorizado
        let fechaEmision = fechaArgYYYYMMDD();
        if (ultimoNro > 0) {
            try {
                const ultimaFch = await consultarFechaComprobante({
                    wsfeUrl, token: ticket.token, sign: ticket.sign, cuit: cuitEmisor,
                    puntoVenta: punto_venta, tipoComprobante: ncTipo, cbteNro: ultimoNro,
                });
                if (ultimaFch && /^\d{8}$/.test(ultimaFch) && ultimaFch > fechaEmision) fechaEmision = ultimaFch;
            } catch (e) { console.warn('⚠️ No se pudo consultar la fecha de la última NC:', e.message); }
        }

        xmlEnviado = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ar="http://ar.gov.afip.dif.FEV1/">
    <soapenv:Header/><soapenv:Body>
        <ar:FECAESolicitar>
            <ar:Auth><ar:Token>${ticket.token}</ar:Token><ar:Sign>${ticket.sign}</ar:Sign><ar:Cuit>${cuitEmisor}</ar:Cuit></ar:Auth>
            <ar:FeCAEReq>
                <ar:FeCabReq><ar:CantReg>1</ar:CantReg><ar:PtoVta>${punto_venta}</ar:PtoVta><ar:CbteTipo>${ncTipo}</ar:CbteTipo></ar:FeCabReq>
                <ar:FeDetReq>
                    <ar:FECAEDetRequest>
                        <ar:Concepto>1</ar:Concepto>
                        <ar:DocTipo>${docTipo}</ar:DocTipo>
                        <ar:DocNro>${docTipo === 99 ? 0 : (String(orig.numeroDocumento || '').replace(/[-\s.]/g, '') || 0)}</ar:DocNro>
                        <ar:CbteDesde>${numeroComprobante}</ar:CbteDesde>
                        <ar:CbteHasta>${numeroComprobante}</ar:CbteHasta>
                        <ar:CbteFch>${fechaEmision}</ar:CbteFch>
                        <ar:ImpTotal>${importeTotal.toFixed(2)}</ar:ImpTotal>
                        <ar:ImpTotConc>0.00</ar:ImpTotConc>
                        <ar:ImpNeto>${importeNeto.toFixed(2)}</ar:ImpNeto>
                        <ar:ImpOpEx>0.00</ar:ImpOpEx>
                        <ar:ImpIVA>${importeIva.toFixed(2)}</ar:ImpIVA>
                        <ar:ImpTrib>0.00</ar:ImpTrib>
                        <ar:MonId>PES</ar:MonId>
                        <ar:MonCotiz>1.000</ar:MonCotiz>
                        <ar:CondicionIVAReceptorId>${condIvaReceptor}</ar:CondicionIVAReceptorId>
                        <ar:CbtesAsoc>
                            <ar:CbteAsoc>
                                <ar:Tipo>${origTipo}</ar:Tipo>
                                <ar:PtoVta>${punto_venta}</ar:PtoVta>
                                <ar:Nro>${origNro}</ar:Nro>
                                <ar:Cuit>${cuitEmisor}</ar:Cuit>
                                <ar:CbteFch>${origFch}</ar:CbteFch>
                            </ar:CbteAsoc>
                        </ar:CbtesAsoc>
                        ${importeIva > 0 ? `
                        <ar:Iva>
                            <ar:AlicIva><ar:Id>5</ar:Id><ar:BaseImp>${importeNeto.toFixed(2)}</ar:BaseImp><ar:Importe>${importeIva.toFixed(2)}</ar:Importe></ar:AlicIva>
                        </ar:Iva>` : ''}
                    </ar:FECAEDetRequest>
                </ar:FeDetReq>
            </ar:FeCAEReq>
        </ar:FECAESolicitar>
    </soapenv:Body></soapenv:Envelope>`;

        console.log(`🧾 Enviando nota de crédito a WSFEv1 (${entorno})...`);
        const response = await axios.post(wsfeUrl, xmlEnviado, {
            headers: { 'Content-Type': 'text/xml; charset=utf-8', 'SOAPAction': 'http://ar.gov.afip.dif.FEV1/FECAESolicitar' },
            timeout: 60000, httpsAgent
        });
        xmlRespuesta = response.data;

        const parser = new xml2js.Parser({ explicitArray: false, ignoreAttrs: true });
        const resultado = await parser.parseStringPromise(response.data);
        const soapBody = resultado['soap:Envelope'] || resultado['soapenv:Envelope'];
        const body = soapBody['soap:Body'] || soapBody['soapenv:Body'];
        const feResult = body['FECAESolicitarResponse']?.FECAESolicitarResult || body['ns1:FECAESolicitarResponse']?.FECAESolicitarResult;
        if (!feResult) throw new Error('Respuesta inválida del WSFEv1');
        const feDetResp = feResult.FeDetResp?.FECAEDetResponse;
        const erroresResult = extraerMsgs(feResult.Errors?.Err);
        if (!feDetResp) throw new Error(`Error WSFEv1: ${erroresResult || 'desconocido'}`);
        const cae = feDetResp.CAE;
        const caeVencimiento = feDetResp.CAEFchVto;
        if (feDetResp.Resultado !== 'A') {
            const obs = extraerMsgs(feDetResp.Observaciones?.Obs);
            throw new Error(`NC no aprobada — Resultado=${feDetResp.Resultado || '?'}${obs ? ' · Obs: ' + obs : ''}${erroresResult ? ' · Errores: ' + erroresResult : ''}`);
        }

        const caeVtoDate = new Date(caeVencimiento.substring(0, 4), parseInt(caeVencimiento.substring(4, 6)) - 1, caeVencimiento.substring(6, 8));
        const letras = { 3: 'A', 8: 'B', 13: 'C' };
        const notaCredito = await ComprobanteElectronico.create({
            negocioId,
            pedidoId,
            cae,
            caeVencimiento: caeVtoDate,
            numeroComprobante,
            puntoVenta: punto_venta,
            tipoComprobante: ncTipo,
            letraComprobante: letras[ncTipo] || '',
            tipoDocumento: docTipo,
            numeroDocumento: orig.numeroDocumento || null,
            denominacionComprador: orig.denominacionComprador || 'Consumidor Final',
            importeTotal,
            importeNeto,
            importeIVA: importeIva,
            cbteFecha: fechaEmision,
            condicionIvaReceptor: condIvaReceptor,
            xmlEnviado,
            xmlRespuesta,
            estado: 'emitido'
        });

        // Marcar la factura original como anulada (previene doble NC)
        await orig.update({ estado: 'anulado' });

        console.log(`✅ Nota de crédito emitida con CAE real: ${cae} - Número ${numeroComprobante}`);
        return { exito: true, cae, comprobante: notaCredito.toJSON(), comprobanteOriginal: orig, mensaje: 'Nota de crédito emitida correctamente' };
    } catch (error) {
        console.error('❌ Error emitiendo nota de crédito:', error.message);
        try {
            await ComprobanteElectronico.create({
                negocioId, pedidoId, cae: null, caeVencimiento: null,
                numeroComprobante: numeroComprobante || 0,
                puntoVenta: punto_venta, tipoComprobante: ncTipo,
                letraComprobante: '', tipoDocumento: docTipo,
                numeroDocumento: orig.numeroDocumento || null,
                denominacionComprador: orig.denominacionComprador || 'Consumidor Final',
                importeTotal, importeNeto, importeIVA: importeIva,
                xmlEnviado, xmlRespuesta, estado: 'error'
            });
        } catch (dbError) { console.error('Error guardando NC con error:', dbError.message); }
        return { exito: false, error: error.message };
    }
}

module.exports = {
    generarCertificados,
    guardarCertificado,
    verificarCertificado,
    obtenerTiposComprobante,
    obtenerTiposDocumento,
    emitirComprobante,
    emitirNotaCredito,
    obtenerComprobantes,
    obtenerUltimoNumero,
    guardarCertificadoNegocio,
    fechaArgYYYYMMDD,
    consultarFechaComprobante,
    CERT_DIR
};