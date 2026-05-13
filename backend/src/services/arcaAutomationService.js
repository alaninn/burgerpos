// =============================================
// SERVICIO: Automatización de Vinculación ARCA
// Usa Puppeteer para vincular automáticamente con ARCA
// =============================================

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const arcaService = require('./arcaService');
const wsaaService = require('./wsaaService');
const { ARCACredential } = require('../models');
const encryptionService = require('./encryptionService');

// Configurar stealth para evitar detección
puppeteer.use(StealthPlugin());

// URLs de ARCA
const URLS = {
  produccion: {
    login: 'https://auth.afip.gob.ar/contribuyente_/login.xhtml',
    adminRelaciones: 'https://serviciosweb.afip.gob.ar/genericos/adminRelaciones/index.aspx',
    certificados: 'https://serviciosweb.afip.gob.ar/genericos/certificados/arca'
  },
  homologacion: {
    login: 'https://auth.afip.gob.ar/contribuyente_/login.xhtml',
    adminRelaciones: 'https://fwshomo.afip.gob.ar/genericos/adminRelaciones/index.aspx',
    certificados: 'https://fwshomo.afip.gob.ar/genericos/certificados/arca'
  }
};

/**
 * Registra un paso en el proceso de vinculación
 */
function registrarPaso(pasos, emoji, mensaje) {
  const paso = `${emoji} ${mensaje}`;
  pasos.push(paso);
  console.log(paso);
  return paso;
}

/**
 * Vincula automáticamente con ARCA en modo PRODUCCIÓN
 * @param {Object} datos - { cuit, claveFiscal, puntoVenta, razonSocial, negocioId, regimenFiscal }
 * @returns {Object} - { exito, mensaje, pasos, certificadoPath }
 */
async function vincularAutomatico(datos) {
  return await vincularConEntorno(datos, false);
}

/**
 * Vincula automáticamente con ARCA en modo HOMOLOGACIÓN (pruebas)
 * @param {Object} datos - { cuit, claveFiscal, puntoVenta, razonSocial, negocioId, regimenFiscal }
 * @returns {Object} - { exito, mensaje, pasos, certificadoPath }
 */
async function vincularHomologacion(datos) {
  return await vincularConEntorno(datos, true);
}

/**
 * Realiza la vinculación con el entorno especificado
 */
async function vincularConEntorno(datos, esHomologacion = false) {
  const { cuit, claveFiscal, puntoVenta, razonSocial, negocioId, regimenFiscal } = datos;
  const pasos = [];
  let browser = null;

  try {
    const urls = esHomologacion ? URLS.homologacion : URLS.produccion;
    const entorno = esHomologacion ? 'Homologación' : 'Producción';

    registrarPaso(pasos, '🚀', `Iniciando vinculación automática - Entorno: ${entorno}`);

    // Paso 1: Generar certificados localmente
    registrarPaso(pasos, '🔐', 'Generando certificados RSA y CSR...');
    const certificados = arcaService.generarCertificados(cuit, razonSocial);

    // Paso 2: Guardar información inicial en BD
    const keyPathEncrypted = encryptionService.encrypt(certificados.keyPath);
    const csrPathEncrypted = encryptionService.encrypt(certificados.csrPath);

    const [credential, created] = await ARCACredential.findOrCreate({
      where: { negocioId },
      defaults: {
        keyPath: keyPathEncrypted,
        csrPath: csrPathEncrypted,
        cuit,
        razonSocial: razonSocial || 'Negocio',
        puntoVenta: puntoVenta || 1,
        regimenFiscal: regimenFiscal || 'responsable_inscripto',
        activo: false,
        entornoProduccion: !esHomologacion
      }
    });

    if (!created) {
      registrarPaso(pasos, '📝', 'Actualizando credenciales existentes...');
      await credential.update({
        keyPath: keyPathEncrypted,
        csrPath: csrPathEncrypted,
        cuit,
        razonSocial: razonSocial || 'Negocio',
        puntoVenta: puntoVenta || 1,
        regimenFiscal: regimenFiscal || 'responsable_inscripto',
        entornoProduccion: !esHomologacion
      });
    }

    registrarPaso(pasos, '✅', 'Certificados generados exitosamente');

    // Paso 3: Iniciar navegador
    registrarPaso(pasos, '🌐', 'Iniciando navegador automatizado...');
    browser = await puppeteer.launch({
      headless: false, // Visible para debugging
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-blink-features=AutomationControlled'
      ]
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    registrarPaso(pasos, '✅', 'Navegador iniciado');

    // Paso 4: Login en AFIP
    registrarPaso(pasos, '🔑', 'Accediendo a AFIP...');
    await page.goto(urls.login, { waitUntil: 'networkidle2', timeout: 60000 });

    // Esperar formulario de login
    await page.waitForSelector('input[name="F1:username"]', { timeout: 30000 });

    // Ingresar CUIT (sin guiones)
    const cuitLimpio = cuit.replace(/-/g, '');
    await page.type('input[name="F1:username"]', cuitLimpio, { delay: 100 });

    registrarPaso(pasos, '👤', `CUIT ingresado: ${cuit}`);

    // Click en continuar
    await page.click('input[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 60000 });

    // Ingresar clave fiscal
    await page.waitForSelector('input[name="F1:password"]', { timeout: 30000 });
    await page.type('input[name="F1:password"]', claveFiscal, { delay: 100 });

    registrarPaso(pasos, '🔐', 'Clave fiscal ingresada');

    // Click en ingresar
    await page.click('input[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 60000 });

    registrarPaso(pasos, '✅', 'Login exitoso en AFIP');

    // Paso 5: Navegar a administración de relaciones
    registrarPaso(pasos, '🔄', 'Navegando a Administrador de Relaciones Clave Fiscal...');
    await page.goto(urls.adminRelaciones, { waitUntil: 'networkidle2', timeout: 60000 });

    registrarPaso(pasos, '✅', 'Acceso a Admin Relaciones');

    // Paso 6: Acceder a gestión de certificados
    registrarPaso(pasos, '📜', 'Accediendo a gestión de certificados...');
    await page.goto(urls.certificados, { waitUntil: 'networkidle2', timeout: 60000 });

    // Buscar botón "Nuevo Certificado" o similar
    registrarPaso(pasos, '➕', 'Buscando opción para crear certificado...');

    // NOTA: Esta parte depende de la estructura exacta de la página de ARCA
    // Puede requerir ajustes según la interfaz actual

    // Esperar un poco para que cargue la página
    await page.waitForTimeout(3000);

    // Buscar y clickear en "Nuevo Certificado Digital"
    const nuevoBoton = await page.$x("//a[contains(text(), 'Nuevo Certificado')]");
    if (nuevoBoton.length > 0) {
      await nuevoBoton[0].click();
      await page.waitForTimeout(2000);
      registrarPaso(pasos, '✅', 'Opción "Nuevo Certificado" encontrada');
    } else {
      registrarPaso(pasos, '⚠️', 'No se encontró botón "Nuevo Certificado" - buscando alternativas...');
    }

    // Buscar input para subir CSR
    registrarPaso(pasos, '📤', 'Buscando campo para subir CSR...');

    const inputFile = await page.$('input[type="file"]');
    if (inputFile) {
      // Subir el archivo CSR
      const csrFullPath = require('path').join(__dirname, '../uploads', certificados.csrPath);
      await inputFile.uploadFile(csrFullPath);
      registrarPaso(pasos, '✅', 'CSR subido exitosamente');

      // Buscar y clickear botón de enviar/generar
      await page.waitForTimeout(2000);
      const btnGenerar = await page.$('input[type="submit"], button[type="submit"]');
      if (btnGenerar) {
        await btnGenerar.click();
        registrarPaso(pasos, '⏳', 'Generando certificado en ARCA...');
        await page.waitForTimeout(5000);
      }

      // Buscar link de descarga del certificado
      registrarPaso(pasos, '📥', 'Buscando certificado generado...');
      const linkDescarga = await page.$('a[href*=".crt"], a[href*="certificado"]');

      if (linkDescarga) {
        // Configurar descarga
        const downloadPath = require('path').join(__dirname, '../../uploads/certificados');
        await page._client.send('Page.setDownloadBehavior', {
          behavior: 'allow',
          downloadPath: downloadPath
        });

        await linkDescarga.click();
        await page.waitForTimeout(3000);

        registrarPaso(pasos, '✅', 'Certificado descargado');

        // Buscar el archivo descargado más reciente
        const fs = require('fs');
        const files = fs.readdirSync(downloadPath).filter(f => f.endsWith('.crt'));

        if (files.length > 0) {
          // Ordenar por fecha de modificación
          const filesWithStats = files.map(f => ({
            name: f,
            mtime: fs.statSync(require('path').join(downloadPath, f)).mtime
          }));
          filesWithStats.sort((a, b) => b.mtime - a.mtime);

          const certFileName = filesWithStats[0].name;
          const certPath = `certificados/${certFileName}`;

          // Actualizar BD con el certificado
          const certPathEncrypted = encryptionService.encrypt(certPath);
          await credential.update({
            certPath: certPathEncrypted,
            activo: true
          });

          registrarPaso(pasos, '💾', 'Certificado guardado en base de datos');

          // Paso 7: Test de conexión con WSAA
          registrarPaso(pasos, '🧪', 'Realizando test de conexión con WSAA...');

          try {
            const ticket = await wsaaService.obtenerTicketAcceso(negocioId, 'wsfe');
            registrarPaso(pasos, '✅', 'Test de conexión WSAA exitoso');
            registrarPaso(pasos, '🎉', '¡Vinculación completada exitosamente!');

            await browser.close();

            return {
              exito: true,
              mensaje: '¡Vinculación automática completada! El negocio está listo para emitir comprobantes electrónicos.',
              pasos,
              certificadoPath: certPath
            };
          } catch (errorWSAA) {
            registrarPaso(pasos, '⚠️', `Error en test WSAA: ${errorWSAA.message}`);
            registrarPaso(pasos, '✅', 'Certificado configurado pero test WSAA falló - revisar manualmente');

            await browser.close();

            return {
              exito: true,
              mensaje: 'Certificado configurado exitosamente. Test de conexión WSAA falló - puede requerir configuración adicional.',
              pasos,
              certificadoPath: certPath,
              advertencia: 'Test WSAA falló'
            };
          }
        } else {
          throw new Error('No se encontró el certificado descargado');
        }
      } else {
        throw new Error('No se encontró el link de descarga del certificado');
      }
    } else {
      throw new Error('No se encontró el campo para subir CSR - la interfaz de ARCA puede haber cambiado');
    }

  } catch (error) {
    console.error('❌ Error en vinculación automática:', error);
    registrarPaso(pasos, '❌', `Error: ${error.message}`);

    if (browser) {
      await browser.close();
    }

    return {
      exito: false,
      mensaje: `Error en vinculación automática: ${error.message}`,
      pasos,
      error: error.message,
      errors: [error.message]
    };
  }
}

module.exports = {
  vincularAutomatico,
  vincularHomologacion
};
