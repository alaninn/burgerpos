/**
 * Script de prueba del módulo ARCA
 * Prueba la generación de certificados y validaciones básicas
 */

const arcaService = require('../services/arcaService');
const path = require('path');
const fs = require('fs');

async function testARCA() {
  console.log('\n🧪 INICIANDO PRUEBAS DEL MÓDULO ARCA\n');
  console.log('='.repeat(60));

  let errores = 0;
  let exitos = 0;

  // TEST 1: Generación de certificados
  console.log('\n📝 TEST 1: Generación de certificados RSA + CSR');
  try {
    const resultado = arcaService.generarCertificados('20123456789', 'Test SRL');

    if (!resultado.keyPem || !resultado.csrPem) {
      throw new Error('No se generaron los certificados en formato PEM');
    }

    if (!resultado.keyPath || !resultado.csrPath) {
      throw new Error('No se obtuvieron las rutas de los certificados');
    }

    // Verificar que los archivos existan
    const keyFullPath = path.join(__dirname, '../../uploads', resultado.keyPath);
    const csrFullPath = path.join(__dirname, '../../uploads', resultado.csrPath);

    if (!fs.existsSync(keyFullPath)) {
      throw new Error(`Archivo KEY no existe: ${keyFullPath}`);
    }

    if (!fs.existsSync(csrFullPath)) {
      throw new Error(`Archivo CSR no existe: ${csrFullPath}`);
    }

    // Verificar contenido de los archivos
    const keyContent = fs.readFileSync(keyFullPath, 'utf8');
    const csrContent = fs.readFileSync(csrFullPath, 'utf8');

    if (!keyContent.includes('BEGIN RSA PRIVATE KEY') && !keyContent.includes('BEGIN PRIVATE KEY')) {
      throw new Error('El archivo KEY no tiene el formato correcto');
    }

    if (!csrContent.includes('BEGIN CERTIFICATE REQUEST')) {
      throw new Error('El archivo CSR no tiene el formato correcto');
    }

    console.log('   ✅ Certificados generados correctamente');
    console.log(`   📄 KEY: ${resultado.keyPath}`);
    console.log(`   📄 CSR: ${resultado.csrPath}`);
    console.log(`   📏 Tamaño KEY: ${keyContent.length} bytes`);
    console.log(`   📏 Tamaño CSR: ${csrContent.length} bytes`);

    exitos++;

    // Limpiar archivos de prueba
    fs.unlinkSync(keyFullPath);
    fs.unlinkSync(csrFullPath);
    console.log('   🗑️  Archivos de prueba eliminados');

  } catch (error) {
    console.error('   ❌ Error:', error.message);
    errores++;
  }

  // TEST 2: Obtener tipos de comprobante
  console.log('\n📝 TEST 2: Obtener tipos de comprobante');
  try {
    const tiposRI = arcaService.obtenerTiposComprobante('responsable_inscripto');
    const tiposMono = arcaService.obtenerTiposComprobante('monotributista');

    if (!Array.isArray(tiposRI) || tiposRI.length === 0) {
      throw new Error('No se obtuvieron tipos de comprobante para RI');
    }

    if (!Array.isArray(tiposMono) || tiposMono.length === 0) {
      throw new Error('No se obtuvieron tipos de comprobante para Monotributista');
    }

    console.log(`   ✅ Tipos RI: ${tiposRI.length} comprobantes`);
    console.log(`   ✅ Tipos Monotributista: ${tiposMono.length} comprobantes`);

    // Mostrar algunos tipos
    console.log('\n   📄 Tipos para Responsable Inscripto:');
    tiposRI.slice(0, 3).forEach(tipo => {
      console.log(`      ${tipo.emoji} ${tipo.nombre} (código ${tipo.codigo})`);
    });

    console.log('\n   📄 Tipos para Monotributista:');
    tiposMono.forEach(tipo => {
      console.log(`      ${tipo.emoji} ${tipo.nombre} (código ${tipo.codigo})`);
    });

    exitos++;
  } catch (error) {
    console.error('   ❌ Error:', error.message);
    errores++;
  }

  // TEST 3: Obtener tipos de documento
  console.log('\n📝 TEST 3: Obtener tipos de documento');
  try {
    const tiposDocs = arcaService.obtenerTiposDocumento();

    if (!Array.isArray(tiposDocs) || tiposDocs.length === 0) {
      throw new Error('No se obtuvieron tipos de documento');
    }

    console.log(`   ✅ ${tiposDocs.length} tipos de documento disponibles`);

    tiposDocs.forEach(tipo => {
      console.log(`      📋 ${tipo.nombre} (código ${tipo.codigo}) - ${tipo.descripcion}`);
    });

    exitos++;
  } catch (error) {
    console.error('   ❌ Error:', error.message);
    errores++;
  }

  // TEST 4: Verificar directorio de certificados
  console.log('\n📝 TEST 4: Verificar directorio de certificados');
  try {
    const certDir = path.join(__dirname, '../../uploads/certificados');

    if (!fs.existsSync(certDir)) {
      throw new Error('El directorio de certificados no existe');
    }

    const stats = fs.statSync(certDir);
    if (!stats.isDirectory()) {
      throw new Error('La ruta de certificados no es un directorio');
    }

    console.log(`   ✅ Directorio existe: ${certDir}`);
    console.log(`   📁 Permisos: ${stats.mode.toString(8)}`);

    exitos++;
  } catch (error) {
    console.error('   ❌ Error:', error.message);
    errores++;
  }

  // TEST 5: Verificar exportaciones del servicio
  console.log('\n📝 TEST 5: Verificar exportaciones del servicio');
  try {
    const funcionesRequeridas = [
      'generarCertificados',
      'guardarCertificado',
      'verificarCertificado',
      'obtenerTiposComprobante',
      'obtenerTiposDocumento',
      'emitirComprobante',
      'obtenerComprobantes',
      'obtenerUltimoNumero',
      'guardarCertificadoNegocio'
    ];

    const funcionesFaltantes = funcionesRequeridas.filter(fn => typeof arcaService[fn] !== 'function');

    if (funcionesFaltantes.length > 0) {
      throw new Error(`Funciones faltantes: ${funcionesFaltantes.join(', ')}`);
    }

    console.log(`   ✅ Todas las funciones exportadas correctamente (${funcionesRequeridas.length})`);
    funcionesRequeridas.forEach(fn => {
      console.log(`      ✓ ${fn}`);
    });

    exitos++;
  } catch (error) {
    console.error('   ❌ Error:', error.message);
    errores++;
  }

  // RESUMEN
  console.log('\n' + '='.repeat(60));
  console.log('\n📊 RESUMEN DE PRUEBAS\n');
  console.log(`   ✅ Exitosas: ${exitos}`);
  console.log(`   ❌ Fallidas: ${errores}`);
  console.log(`   📈 Total: ${exitos + errores}`);
  console.log(`   📊 Porcentaje de éxito: ${Math.round((exitos / (exitos + errores)) * 100)}%`);

  if (errores === 0) {
    console.log('\n   🎉 ¡TODAS LAS PRUEBAS PASARON!\n');
    console.log('   ✨ El módulo ARCA está funcionando correctamente');
    console.log('   🚀 Listo para pruebas de integración\n');
  } else {
    console.log('\n   ⚠️  Algunas pruebas fallaron\n');
    console.log('   🔍 Revisa los errores arriba para más detalles\n');
  }

  console.log('='.repeat(60) + '\n');

  process.exit(errores === 0 ? 0 : 1);
}

// Ejecutar pruebas
testARCA().catch(error => {
  console.error('\n❌ Error fatal en las pruebas:', error);
  process.exit(1);
});
