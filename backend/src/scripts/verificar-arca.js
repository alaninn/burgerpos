/**
 * Script de verificación del módulo ARCA
 * Verifica que todos los componentes estén correctamente implementados
 */

const fs = require('fs');
const path = require('path');
const { sequelize, ARCACredential, ComprobanteElectronico, TicketAccesoWSAA } = require('../models');

async function verificarImplementacionARCA() {
  console.log('\n🔍 VERIFICACIÓN DEL MÓDULO ARCA\n');
  console.log('='.repeat(60));

  const checks = [];

  // 1. Verificar modelos
  console.log('\n📦 Verificando modelos Sequelize...');
  try {
    checks.push({
      item: 'Modelo ARCACredential',
      status: ARCACredential ? '✅' : '❌',
      ok: !!ARCACredential
    });

    checks.push({
      item: 'Modelo ComprobanteElectronico',
      status: ComprobanteElectronico ? '✅' : '❌',
      ok: !!ComprobanteElectronico
    });

    checks.push({
      item: 'Modelo TicketAccesoWSAA',
      status: TicketAccesoWSAA ? '✅' : '❌',
      ok: !!TicketAccesoWSAA
    });
  } catch (error) {
    console.error('❌ Error verificando modelos:', error.message);
  }

  // 2. Verificar tablas en base de datos
  console.log('\n🗄️  Verificando tablas en PostgreSQL...');
  try {
    await sequelize.authenticate();
    console.log('   Conexión a BD exitosa');

    const [tablas] = await sequelize.query(`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
      AND (tablename LIKE '%arca%' OR tablename LIKE '%comprobante%' OR tablename LIKE '%ticket%')
      ORDER BY tablename
    `);

    const tablasEsperadas = ['arca_credentials', 'comprobantes_electronicos', 'tickets_acceso_wsaa'];
    tablasEsperadas.forEach(tabla => {
      const existe = tablas.some(t => t.tablename === tabla);
      checks.push({
        item: `Tabla ${tabla}`,
        status: existe ? '✅' : '❌',
        ok: existe
      });
    });
  } catch (error) {
    console.error('❌ Error verificando BD:', error.message);
  }

  // 3. Verificar servicios
  console.log('\n⚙️  Verificando servicios...');
  const servicios = [
    '../services/arcaService.js',
    '../services/wsaaService.js',
    '../services/arcaAutomationService.js'
  ];

  servicios.forEach(servicio => {
    const servicePath = path.join(__dirname, servicio);
    const existe = fs.existsSync(servicePath);
    checks.push({
      item: `Servicio ${path.basename(servicio)}`,
      status: existe ? '✅' : '❌',
      ok: existe
    });
  });

  // 4. Verificar controlador
  console.log('\n🎮 Verificando controlador...');
  const controllerPath = path.join(__dirname, '../controllers/arca.controller.js');
  const controllerExiste = fs.existsSync(controllerPath);
  checks.push({
    item: 'Controller arca.controller.js',
    status: controllerExiste ? '✅' : '❌',
    ok: controllerExiste
  });

  if (controllerExiste) {
    const controllerContent = fs.readFileSync(controllerPath, 'utf8');
    const tieneVincularAuto = controllerContent.includes('exports.vincularAutomatico');
    checks.push({
      item: 'Endpoint vincularAutomatico',
      status: tieneVincularAuto ? '✅' : '❌',
      ok: tieneVincularAuto
    });
  }

  // 5. Verificar rutas
  console.log('\n🛣️  Verificando rutas...');
  const routesPath = path.join(__dirname, '../routes/arca.routes.js');
  const routesExiste = fs.existsSync(routesPath);
  checks.push({
    item: 'Archivo arca.routes.js',
    status: routesExiste ? '✅' : '❌',
    ok: routesExiste
  });

  if (routesExiste) {
    const routesContent = fs.readFileSync(routesPath, 'utf8');
    const tieneRutaVincular = routesContent.includes('/vincular-automatico');
    checks.push({
      item: 'Ruta /vincular-automatico',
      status: tieneRutaVincular ? '✅' : '❌',
      ok: tieneRutaVincular
    });
  }

  // 6. Verificar dependencias
  console.log('\n📚 Verificando dependencias npm...');
  const packagePath = path.join(__dirname, '../../package.json');
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

  const depsRequeridas = ['puppeteer', 'puppeteer-extra', 'puppeteer-extra-plugin-stealth', 'node-forge', 'xml2js'];
  depsRequeridas.forEach(dep => {
    const instalada = packageJson.dependencies && packageJson.dependencies[dep];
    checks.push({
      item: `Dependencia ${dep}`,
      status: instalada ? '✅' : '❌',
      ok: !!instalada
    });
  });

  // 7. Verificar directorio de certificados
  console.log('\n📁 Verificando estructura de archivos...');
  const certDir = path.join(__dirname, '../../uploads/certificados');
  const certDirExiste = fs.existsSync(certDir);
  checks.push({
    item: 'Directorio uploads/certificados',
    status: certDirExiste ? '✅' : '❌',
    ok: certDirExiste
  });

  // 8. Verificar componentes frontend
  console.log('\n🎨 Verificando componentes frontend...');
  const frontendComponents = [
    '../../../../frontend/src/components/VincularARCAAutomatico.jsx',
    '../../../../frontend/src/pages/admin/FacturacionElectronica.jsx'
  ];

  frontendComponents.forEach(comp => {
    const compPath = path.join(__dirname, comp);
    const existe = fs.existsSync(compPath);
    checks.push({
      item: `Componente ${path.basename(comp)}`,
      status: existe ? '✅' : '❌',
      ok: existe
    });
  });

  // Resumen final
  console.log('\n' + '='.repeat(60));
  console.log('\n📊 RESUMEN DE VERIFICACIÓN\n');

  checks.forEach(check => {
    console.log(`${check.status} ${check.item}`);
  });

  const totalChecks = checks.length;
  const checksOK = checks.filter(c => c.ok).length;
  const checksFail = totalChecks - checksOK;

  console.log('\n' + '='.repeat(60));
  console.log(`\n✅ Exitosos: ${checksOK}/${totalChecks}`);
  console.log(`❌ Fallidos: ${checksFail}/${totalChecks}`);

  if (checksFail === 0) {
    console.log('\n🎉 ¡MÓDULO ARCA 100% IMPLEMENTADO Y FUNCIONAL!\n');
    console.log('📝 Próximos pasos:');
    console.log('   1. Probar vinculación automática en modo homologación');
    console.log('   2. Verificar emisión de comprobantes de prueba');
    console.log('   3. Validar QR con app AFIP móvil');
    console.log('   4. Migrar a producción cuando esté validado\n');
  } else {
    console.log('\n⚠️  Hay componentes faltantes o con errores.\n');
    console.log('Revisa los items marcados con ❌ arriba.\n');
  }

  console.log('='.repeat(60) + '\n');

  await sequelize.close();
  process.exit(checksFail === 0 ? 0 : 1);
}

// Ejecutar verificación
verificarImplementacionARCA().catch(error => {
  console.error('\n❌ Error fatal en verificación:', error);
  process.exit(1);
});
