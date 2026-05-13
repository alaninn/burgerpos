// =============================================
// SERVICIO: WSAA - Web Service de Autenticación y Autorización
// Maneja la autenticación real con ARCA/AFIP
// =============================================

const forge = require('node-forge');
const xml2js = require('xml2js');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { ARCACredential, TicketAccesoWSAA } = require('../models');
const { Op } = require('sequelize');
const encryptionService = require('./encryptionService');

// URLs de WSAA
const WSAA_URLS = {
    homologacion: 'https://wsaahomo.afip.gov.ar/ws/services/LoginCms',
    produccion: 'https://wsaa.afip.gov.ar/ws/services/LoginCms'
};

// URLs alternativas (a veces las anteriores no responden)
const WSAA_URLS_ALT = {
    homologacion: 'https://wsaahomo.afip.gov.ar/ws/services/LoginCms?wsdl',
    produccion: 'https://wsaa.afip.gov.ar/ws/services/LoginCms?wsdl'
};

/**
 * Crea el TRA (Ticket Request Access) en formato XML
 * @param {string} servicio - Servicio al que se quiere acceder (ej: 'wsfe')
 * @returns {string} XML del TRA
 */
function crearTRA(servicio = 'wsfe') {
    const ahora = new Date();
    const expiracion = new Date(ahora.getTime() + 10 * 60 * 1000); // 10 minutos
    
    const formatFecha = (date) => {
    // AFIP requiere formato ISO con timezone (ej: 2025-01-15T10:00:00-03:00)
    return date.toISOString().substring(0, 19) + '+00:00';
};
    
    return `<?xml version="1.0" encoding="UTF-8"?>
<loginTicketRequest version="1.0">
    <header>
        <uniqueId>${Math.floor(Date.now() / 1000)}</uniqueId>
        <generationTime>${formatFecha(ahora)}</generationTime>
        <expirationTime>${formatFecha(expiracion)}</expirationTime>
    </header>
    <service>${servicio}</service>
</loginTicketRequest>`;
}

/**
 * Firma el TRA con la clave privada y certificado
 * @param {string} tra - TRA en formato XML
 * @param {string} certPath - Ruta al certificado .crt
 * @param {string} keyPath - Ruta a la clave privada .key
 * @returns {string} CMS firmado en formato PEM
 */
function firmarTRA(tra, certPath, keyPath) {
    try {
        // Leer certificado y clave privada
        const certPem = fs.readFileSync(certPath, 'utf8');
        const keyPem = fs.readFileSync(keyPath, 'utf8');
        
        // Parsear certificado y clave
        const cert = forge.pki.certificateFromPem(certPem);
        const privateKey = forge.pki.privateKeyFromPem(keyPem);
        
        // Crear el mensaje a firmar
        const md = forge.md.sha256.create();
        md.update(tra, 'utf8');
        
        // Firmar
        const firma = privateKey.sign(md);
        
        // Crear el CMS (PKCS#7)
        const p7 = forge.pkcs7.createSignedData();
        p7.content = forge.util.createBuffer(tra, 'utf8');
        p7.addCertificate(cert);
        p7.addSigner({
            key: privateKey,
            certificate: cert,
            digestAlgorithm: forge.pki.oids.sha256,
            authenticatedAttributes: [
                {
                    type: forge.pki.oids.contentType,
                    value: forge.pki.oids.data
                },
                {
                    type: forge.pki.oids.messageDigest
                },
                {
                    type: forge.pki.oids.signingTime,
                    value: new Date()
                }
            ]
        });
        
        p7.sign();
        
        // Convertir a DER y luego a Base64
        const der = forge.asn1.toDer(p7.toAsn1()).getBytes();
        const cmsB64 = forge.util.encode64(der);
        
        return cmsB64;
    } catch (error) {
        console.error('❌ Error firmando TRA:', error.message);
        throw new Error(`Error al firmar TRA: ${error.message}`);
    }
}

/**
 * Solicita un ticket de acceso al WSAA
 * @param {number} negocio_id - ID del negocio
 * @param {string} servicio - Servicio solicitado (default: 'wsfe')
 * @returns {Object} { token, sign, expirationTime }
 */
async function solicitarTicketAcceso(negocioId, servicio = 'wsfe') {
    try {
        // Obtener certificado activo del negocio
        const certificado = await ARCACredential.findOne({
            where: { negocioId, activo: true }
        });

        if (!certificado) {
            throw new Error('No hay certificado activo configurado');
        }

        // Desencriptar paths
        if (!certificado.certPath) {
            throw new Error('El certificado no tiene una ruta definida (certPath es null)');
        }

        if (!certificado.keyPath) {
            throw new Error('La clave privada no tiene una ruta definida (keyPath es null)');
        }

        const certPathRel = encryptionService.decrypt(certificado.certPath);
        const keyPathRel = encryptionService.decrypt(certificado.keyPath);

        const certDir = path.join(__dirname, '../../uploads');
        const certPath = path.join(certDir, certPathRel);
        const keyPath = path.join(certDir, keyPathRel);

        if (!fs.existsSync(certPath)) {
            throw new Error(`Certificado no encontrado en: ${certPath}`);
        }

        if (!fs.existsSync(keyPath)) {
            throw new Error(`Clave privada no encontrada en: ${keyPath}`);
        }

        // Obtener entorno configurado
        const entorno = certificado.entornoProduccion ? 'produccion' : 'homologacion';
        const wsaaUrl = WSAA_URLS[entorno];
        
        console.log(`🔐 Solicitando ticket de acceso WSAA (${entorno})...`);
        
        // 1. Crear TRA
        const tra = crearTRA(servicio);
        
        // 2. Firmar TRA
        const cms = firmarTRA(tra, certPath, keyPath);
        
        // 3. Crear envelope SOAP
        const soapEnvelope = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
                  xmlns:ser="http://wsaa.view.sua.dvadac.desein.afip.gov">
    <soapenv:Header/>
    <soapenv:Body>
        <ser:loginCms>
            <ser:in0>${cms}</ser:in0>
        </ser:loginCms>
    </soapenv:Body>
</soapenv:Envelope>`;
        
        // 4. Enviar solicitud al WSAA
        let response;
        try {
            response = await axios.post(wsaaUrl, soapEnvelope, {
                headers: {
                    'Content-Type': 'text/xml; charset=utf-8',
                    'SOAPAction': ''
                },
                timeout: 30000
            });
        } catch (axiosError) {
            // Intentar con URL alternativa
            console.log('⚠️ Primera URL falló, intentando alternativa...');
            response = await axios.post(WSAA_URLS_ALT[entorno], soapEnvelope, {
                headers: {
                    'Content-Type': 'text/xml; charset=utf-8',
                    'SOAPAction': ''
                },
                timeout: 30000
            });
        }
        
        // 5. Parsear respuesta XML

if (!response.data) {
    throw new Error('Respuesta vacía del WSAA');
}

const parser = new xml2js.Parser({ explicitArray: false, ignoreAttrs: true });
const resultado = await parser.parseStringPromise(response.data);

// Extraer loginTicketResponse
const envelope = resultado['soapenv:Envelope'] || resultado['Envelope'] || resultado['soap:Envelope'];
const soapBody = envelope['soapenv:Body'] || envelope['Body'] || envelope['soap:Body'];

// AFIP devuelve loginCmsResponse sin namespace
const loginCmsResponse = soapBody['ns1:loginCmsResponse'] 
    || soapBody['loginCmsResponse']
    || soapBody['ns2:loginCmsResponse'];

if (!loginCmsResponse) {
    throw new Error('Respuesta inválida del WSAA');
}

// El contenido interno viene como loginCmsReturn (no loginTicketReturn)
const loginTicketResponseStr = loginCmsResponse.loginCmsReturn 
    || loginCmsResponse.loginTicketReturn 
    || loginCmsResponse.return;

if (!loginTicketResponseStr) {
    throw new Error('No se encontró loginCmsReturn en la respuesta');
}

// Decodificar entidades HTML si es necesario
const decoded = loginTicketResponseStr
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&');

// Parsear el loginTicketResponse interno
const loginTicketResponse = await parser.parseStringPromise(decoded);

const credentials = loginTicketResponse.loginTicketResponse.credentials;
const header = loginTicketResponse.loginTicketResponse.header;
        
        if (!credentials || !credentials.token || !credentials.sign) {
            const errors = loginTicketResponse.loginTicketResponse.error;
            throw new Error(`Error WSAA: ${JSON.stringify(errors)}`);
        }
        
        console.log('✅ Ticket de acceso obtenido correctamente');
        
        return {
            token: credentials.token,
            sign: credentials.sign,
            expirationTime: header.expirationTime,
            generationTime: header.generationTime,
            uniqueId: header.uniqueId
        };
        
    } catch (error) {
        console.error('❌ Error obteniendo ticket de acceso:', error.message);
        throw error;
    }
}

/**
 * Verifica si hay un ticket de acceso válido almacenado
 * @param {number} negocio_id - ID del negocio
 * @param {string} servicio - Servicio
 * @returns {Object|null} Ticket válido o null
 */
async function obtenerTicketValido(negocioId, servicio = 'wsfe') {
    try {
        const ticket = await TicketAccesoWSAA.findOne({
            where: {
                negocioId,
                servicio,
                expiracion: { [Op.gt]: new Date() }
            },
            order: [['createdAt', 'DESC']]
        });

        if (ticket) {
            return {
                token: ticket.token,
                sign: ticket.sign
            };
        }

        return null;
    } catch (error) {
        console.error('Error verificando ticket:', error);
        return null;
    }
}

/**
 * Almacena un ticket de acceso en la base de datos
 * @param {string} negocioId - ID del negocio
 * @param {string} servicio - Servicio
 * @param {Object} ticket - { token, sign, expirationTime }
 */
async function almacenarTicket(negocioId, servicio, ticket) {
    try {
        await TicketAccesoWSAA.create({
            negocioId,
            servicio,
            token: ticket.token,
            sign: ticket.sign,
            expiracion: new Date(ticket.expirationTime)
        });
    } catch (error) {
        console.error('Error almacenando ticket:', error);
    }
}

/**
 * Obtiene un ticket de acceso (usa cache si está disponible)
 * @param {string} negocioId - ID del negocio
 * @param {string} servicio - Servicio
 * @returns {Object} { token, sign }
 */
async function obtenerTicketAcceso(negocioId, servicio = 'wsfe') {
    // Intentar obtener ticket válido del cache
    const ticketValido = await obtenerTicketValido(negocioId, servicio);

    if (ticketValido) {
        console.log('✅ Usando ticket de acceso cacheado');
        return ticketValido;
    }

    // Solicitar nuevo ticket
    const nuevoTicket = await solicitarTicketAcceso(negocioId, servicio);

    // Almacenar en cache
    await almacenarTicket(negocioId, servicio, nuevoTicket);
    
    return {
        token: nuevoTicket.token,
        sign: nuevoTicket.sign
    };
}

module.exports = {
    solicitarTicketAcceso,
    obtenerTicketAcceso,
    obtenerTicketValido,
    firmarTRA,
    crearTRA,
    WSAA_URLS
};