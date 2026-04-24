#!/usr/bin/env node

/**
 * TEST RÁPIDO DE TOMTOM - SIN PARÁMETRO LANGUAGE
 * 
 * TomTom detecta automáticamente el idioma según countrySet
 * Este test omite el parámetro 'language' completamente
 */

const TOMTOM_API_KEY = 'v391c1qxphzhWX8F4aAePglC00JIPzj2';

async function testTomTom(direccion, ciudad = 'Buenos Aires', provincia = 'Buenos Aires') {
  console.log('\n╔══════════════════════════════════════════════════╗');
  console.log('║  🗺️  TEST TOMTOM - SIN PARÁMETRO LANGUAGE       ║');
  console.log('╚══════════════════════════════════════════════════╝\n');

  const query = `${direccion}, ${ciudad}, ${provincia}, Argentina`;
  
  // ✅ SIN parámetro language - TomTom lo detecta automáticamente
  const params = new URLSearchParams({
    key: TOMTOM_API_KEY,
    limit: 5,
    countrySet: 'AR',
    // NO incluir 'language' - TomTom usa español automáticamente para Argentina
  });

  const url = `https://api.tomtom.com/search/2/geocode/${encodeURIComponent(query)}.json?${params}`;

  console.log('📝 Parámetros:');
  console.log(`   Dirección: "${direccion}"`);
  console.log(`   Query completo: "${query}"`);
  console.log(`   countrySet: AR (Argentina)`);
  console.log(`   language: [OMITIDO - auto-detectado]`);
  console.log('');

  console.log('🚀 Haciendo request a TomTom...\n');

  try {
    const startTime = Date.now();
    const response = await fetch(url, {
      headers: { 
        'User-Agent': 'BurgerPOS-Test/1.0',
        'Accept-Language': 'es-AR,es;q=0.9'  // Header HTTP para preferencia de idioma
      }
    });
    const responseTime = Date.now() - startTime;

    console.log(`⏱️  Tiempo de respuesta: ${responseTime}ms`);
    console.log(`📊 Status HTTP: ${response.status} ${response.statusText}\n`);

    if (!response.ok) {
      const errorText = await response.text();
      console.log('❌ ERROR EN LA API:');
      console.log(errorText);
      console.log('');
      
      if (response.status === 403) {
        console.log('⚠️  Error 403:');
        console.log('   • API key inválida, expirada o bloqueada');
        console.log('   • Límite de 2500 requests/día excedido');
        console.log('   • Verifica en https://developer.tomtom.com/user/me/apps');
      } else if (response.status === 401) {
        console.log('⚠️  Error 401:');
        console.log('   • API key no autorizada');
        console.log('   • Verifica que copiaste la key correctamente');
      } else if (response.status === 400) {
        console.log('⚠️  Error 400:');
        console.log('   • Hay un problema con los parámetros de la URL');
        console.log('   • La query puede tener caracteres inválidos');
        console.log('   • Prueba con una dirección más simple');
      }
      
      console.log('\n💡 PRÓXIMO PASO:');
      console.log('   1. Verifica tu API key en https://developer.tomtom.com');
      console.log('   2. Asegúrate de que "Search API" esté habilitado');
      console.log('   3. Verifica el límite de requests diarios');
      console.log('');
      process.exit(1);
    }

    const data = await response.json();
    const results = data.results || [];

    console.log(`✅ Respuesta exitosa: ${results.length} resultados encontrados\n`);

    if (results.length === 0) {
      console.log('⚠️  TomTom no encontró esta dirección en su base de datos\n');
      console.log('💡 Esto NO significa que la API no funcione.');
      console.log('   • TomTom simplemente no tiene esa dirección específica');
      console.log('   • Prueba con una dirección más conocida:');
      console.log('     - "Av Corrientes 1234"');
      console.log('     - "Av 9 de Julio 1000"');
      console.log('     - "Obelisco"\n');
      console.log('   • Para direcciones locales usa Georef o Nominatim como fallback');
      console.log('');
      process.exit(0);
    }

    // Mostrar resultados
    console.log('📍 RESULTADOS:\n');
    results.forEach((r, idx) => {
      const addr = r.address || {};
      const pos = r.position || {};
      
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`${idx + 1}. 📌 ${addr.freeformAddress || 'N/A'}`);
      console.log(`   🏠 Calle: ${addr.streetName || 'N/A'}`);
      console.log(`   🔢 Número: ${addr.streetNumber || 'N/A'}`);
      console.log(`   🏘️  Barrio: ${addr.municipalitySubdivision || 'N/A'}`);
      console.log(`   🏙️  Ciudad: ${addr.municipality || 'N/A'}`);
      console.log(`   🗺️  Provincia: ${addr.countrySubdivision || 'N/A'}`);
      console.log(`   🌍 País: ${addr.country || 'N/A'}`);
      console.log(`   📍 Coordenadas: ${pos.lat}, ${pos.lon}`);
      console.log(`   🎯 Tipo: ${r.type || 'N/A'}`);
      console.log(`   ⭐ Score: ${r.score?.toFixed(2) || 'N/A'}`);
    });
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('╔══════════════════════════════════════════════════╗');
    console.log('║  ✅ TOMTOM FUNCIONA CORRECTAMENTE                ║');
    console.log('╚══════════════════════════════════════════════════╝\n');
    
    console.log('📊 Información del idioma:');
    console.log(`   • Resultados en: ${results[0].address.language || 'español (auto-detectado)'}`);
    console.log(`   • countrySet: AR → TomTom usa español automáticamente`);
    console.log(`   • NO necesitas especificar parámetro 'language'\n`);
    
    console.log('🎯 Próximos pasos:');
    console.log('   1. ✅ TomTom está funcionando');
    console.log('   2. Aplica este cambio en tu backend:');
    console.log('      • ELIMINA el parámetro language');
    console.log('      • Deja solo: countrySet: \'AR\'');
    console.log('   3. Reinicia el servidor');
    console.log('   4. Prueba en tu app frontend');
    console.log('   5. Monitorea el dashboard de TomTom en 24-48hrs\n');

  } catch (error) {
    console.log('❌ ERROR DE CONEXIÓN:');
    console.log(error.message);
    console.log('');
    console.log('⚠️  Posibles causas:');
    console.log('   • Sin conexión a internet');
    console.log('   • Firewall bloqueando api.tomtom.com');
    console.log('   • DNS no resuelve correctamente');
    console.log('');
    process.exit(1);
  }
}

// Ejecutar el test
const direccionTest = process.argv[2] || 'Av Corrientes 1234';
testTomTom(direccionTest);