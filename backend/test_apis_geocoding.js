/**
 * Script de Testing para Comparar APIs de Geocodificación
 * 
 * Uso:
 *   node test_apis_geocoding.js "Estados Unidos 3125" "Buenos Aires" "Buenos Aires"
 * 
 * Compara resultados de:
 *   1. TomTom (PAGO - pero con free tier)
 *   2. Georef (GRATIS - Gobierno Argentino)
 *   3. Nominatim (GRATIS - OpenStreetMap)
 */

const TOMTOM_API_KEY = 'v391c1qxphzhWX8F4aAePglC00JIPzj2';

// Función para hacer fetch con timeout
async function fetchWithTimeout(url, options = {}, timeout = 10000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
}

// 1. TOMTOM API
async function testTomTom(input, ciudad, provincia) {
  console.log('\n🔷 ========== TOMTOM API ==========');
  console.log('📍 API: https://api.tomtom.com/search/2/geocode/');
  console.log('💰 Costo: FREE tier 2500 req/día, luego pago');
  
  try {
    const contexto = [ciudad, provincia, 'Argentina'].filter(Boolean).join(', ');
    const query = contexto ? `${input}, ${contexto}` : input;
    
    const params = new URLSearchParams({
      key: TOMTOM_API_KEY,
      limit: 5,
      countrySet: 'AR',
      language: 'es-AR',
    });

    const url = `https://api.tomtom.com/search/2/geocode/${encodeURIComponent(query)}.json?${params}`;
    
    console.log('🚀 Query:', query);
    console.log('🔗 URL:', url.replace(TOMTOM_API_KEY, 'API_KEY_OCULTA'));
    
    const startTime = Date.now();
    const resp = await fetchWithTimeout(url, {
      headers: { 'User-Agent': 'BurgerPOS-Test/1.0' }
    });
    const endTime = Date.now();
    
    console.log(`⏱️  Tiempo de respuesta: ${endTime - startTime}ms`);
    console.log('📊 Status:', resp.status, resp.statusText);

    if (!resp.ok) {
      const errorText = await resp.text();
      console.log('❌ Error response:', errorText);
      return null;
    }

    const data = await resp.json();
    console.log('📦 Resultados totales:', data.results?.length || 0);

    if (!data.results || data.results.length === 0) {
      console.log('⚠️  Sin resultados');
      return [];
    }

    const results = data.results.slice(0, 5).map((r, idx) => {
      const addr = r.address || {};
      const pos = r.position || {};
      
      console.log(`\n  ${idx + 1}. 📌 ${addr.freeformAddress || 'N/A'}`);
      console.log(`     🏠 Calle: ${addr.streetName || 'N/A'}`);
      console.log(`     🔢 Número: ${addr.streetNumber || 'N/A'}`);
      console.log(`     🏘️  Barrio: ${addr.municipalitySubdivision || 'N/A'}`);
      console.log(`     🏙️  Ciudad: ${addr.municipality || 'N/A'}`);
      console.log(`     📍 Coords: ${pos.lat}, ${pos.lon}`);
      console.log(`     🎯 Tipo: ${r.type || 'N/A'}`);
      console.log(`     ⭐ Score: ${r.score || 'N/A'}`);

      return {
        direccion: addr.freeformAddress,
        calle: addr.streetName || '',
        numero: addr.streetNumber || '',
        barrio: addr.municipalitySubdivision || '',
        ciudad: addr.municipality || '',
        coords: { lat: pos.lat, lng: pos.lon },
        tipo: r.type,
        score: r.score
      };
    });

    return results;
  } catch (err) {
    console.log('❌ ERROR:', err.message);
    return null;
  }
}

// 2. GEOREF (Gobierno Argentino)
async function testGeoref(input, ciudad, provincia) {
  console.log('\n🔶 ========== GEOREF API (Gobierno Argentino) ==========');
  console.log('📍 API: https://apis.datos.gob.ar/georef/api/direcciones');
  console.log('💰 Costo: GRATIS - Gobierno Argentino');
  
  try {
    const params = new URLSearchParams({
      direccion: input,
      max: '8',
      ...(provincia && { provincia }),
    });

    const url = `https://apis.datos.gob.ar/georef/api/direcciones?${params}`;
    
    console.log('🚀 Query:', input);
    console.log('🔗 URL:', url);
    
    const startTime = Date.now();
    const resp = await fetchWithTimeout(url, {
      headers: { 'User-Agent': 'BurgerPOS-Test/1.0' }
    });
    const endTime = Date.now();
    
    console.log(`⏱️  Tiempo de respuesta: ${endTime - startTime}ms`);
    console.log('📊 Status:', resp.status, resp.statusText);

    const data = await resp.json();
    let dirs = data?.direcciones || [];
    console.log('📦 Resultados totales:', dirs.length);

    if (dirs.length === 0) {
      console.log('⚠️  Sin resultados para esta provincia, probando sin filtro...');
      const params2 = new URLSearchParams({ direccion: input, max: '8' });
      const resp2 = await fetchWithTimeout(
        `https://apis.datos.gob.ar/georef/api/direcciones?${params2}`,
        { headers: { 'User-Agent': 'BurgerPOS-Test/1.0' } }
      );
      const data2 = await resp2.json();
      dirs = data2?.direcciones || [];
      console.log('📦 Resultados sin filtro:', dirs.length);
    }

    if (dirs.length === 0) {
      console.log('⚠️  Sin resultados');
      return [];
    }

    // Filtrar por ciudad si se especificó
    if (ciudad) {
      const ciudadLower = ciudad.toLowerCase();
      const matching = dirs.filter(d => {
        const deptMatch = (d.departamento?.nombre || '').toLowerCase().includes(ciudadLower);
        const locMatch = (d.localidad_censal?.nombre || '').toLowerCase().includes(ciudadLower);
        return deptMatch || locMatch;
      });
      
      console.log(`🎯 Filtrados por ciudad "${ciudad}": ${matching.length}/${dirs.length}`);
      dirs = matching.length > 0 ? matching : dirs;
    }

    const results = dirs.slice(0, 5).map((d, idx) => {
      const calle = d.calle?.nombre || '';
      const numero = d.altura?.valor || '';
      const localidad = d.localidad_censal?.nombre || d.departamento?.nombre || '';
      const prov = d.provincia?.nombre || '';

      console.log(`\n  ${idx + 1}. 📌 ${calle} ${numero}, ${localidad}`);
      console.log(`     🏠 Calle: ${calle}`);
      console.log(`     🔢 Número: ${numero}`);
      console.log(`     🏘️  Localidad Censal: ${d.localidad_censal?.nombre || 'N/A'}`);
      console.log(`     🏙️  Departamento: ${d.departamento?.nombre || 'N/A'}`);
      console.log(`     🗺️  Provincia: ${prov}`);
      console.log(`     📍 Coords: ${d.ubicacion?.lat}, ${d.ubicacion?.lon}`);

      return {
        direccion: `${calle} ${numero}, ${localidad}`,
        calle,
        numero,
        localidad,
        provincia: prov,
        coords: { lat: d.ubicacion?.lat, lng: d.ubicacion?.lon }
      };
    });

    return results;
  } catch (err) {
    console.log('❌ ERROR:', err.message);
    return null;
  }
}

// 3. NOMINATIM (OpenStreetMap)
async function testNominatim(input, ciudad, provincia) {
  console.log('\n🔷 ========== NOMINATIM API (OpenStreetMap) ==========');
  console.log('📍 API: https://nominatim.openstreetmap.org/search');
  console.log('💰 Costo: GRATIS - OpenStreetMap');
  
  try {
    const contexto = [ciudad, provincia, 'Argentina'].filter(Boolean).join(', ');
    const q = `${input}, ${contexto}`;
    
    const params = new URLSearchParams({
      q,
      format: 'json',
      limit: '8',
      addressdetails: '1',
      'accept-language': 'es',
      countrycodes: 'ar',
    });

    const url = `https://nominatim.openstreetmap.org/search?${params}`;
    
    console.log('🚀 Query:', q);
    console.log('🔗 URL:', url);
    
    const startTime = Date.now();
    const resp = await fetchWithTimeout(url, {
      headers: { 'User-Agent': 'BurgerPOS-Test/1.0' }
    });
    const endTime = Date.now();
    
    console.log(`⏱️  Tiempo de respuesta: ${endTime - startTime}ms`);
    console.log('📊 Status:', resp.status, resp.statusText);

    const raw = await resp.json();
    console.log('📦 Resultados totales:', raw?.length || 0);

    if (!raw?.length) {
      console.log('⚠️  Sin resultados');
      return [];
    }

    const results = raw.slice(0, 5).map((r, idx) => {
      const addr = r.address || {};
      const calle = addr.road || addr.pedestrian || addr.path || '';
      const numero = addr.house_number || '';
      const barrio = addr.suburb || addr.quarter || '';
      const localidad = addr.city || addr.town || addr.village || '';

      console.log(`\n  ${idx + 1}. 📌 ${r.display_name}`);
      console.log(`     🏠 Calle: ${calle}`);
      console.log(`     🔢 Número: ${numero}`);
      console.log(`     🏘️  Barrio: ${barrio}`);
      console.log(`     🏙️  Ciudad: ${localidad}`);
      console.log(`     📍 Coords: ${r.lat}, ${r.lon}`);
      console.log(`     🎯 Tipo: ${r.type || 'N/A'}`);
      console.log(`     ⭐ Importancia: ${r.importance || 'N/A'}`);

      return {
        direccion: r.display_name,
        calle,
        numero,
        barrio,
        ciudad: localidad,
        coords: { lat: parseFloat(r.lat), lng: parseFloat(r.lon) },
        tipo: r.type,
        importancia: r.importance
      };
    });

    return results;
  } catch (err) {
    console.log('❌ ERROR:', err.message);
    return null;
  }
}

// Función principal
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('❌ Uso: node test_apis_geocoding.js "DIRECCION" ["CIUDAD"] ["PROVINCIA"]');
    console.log('');
    console.log('Ejemplos:');
    console.log('  node test_apis_geocoding.js "Estados Unidos 3125"');
    console.log('  node test_apis_geocoding.js "Estados Unidos 3125" "Buenos Aires"');
    console.log('  node test_apis_geocoding.js "Estados Unidos 3125" "Buenos Aires" "Buenos Aires"');
    console.log('  node test_apis_geocoding.js "Av. Corrientes 1234" "CABA"');
    process.exit(1);
  }

  const input = args[0];
  const ciudad = args[1] || '';
  const provincia = args[2] || '';

  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║  🗺️  TEST DE APIS DE GEOCODIFICACIÓN                      ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');
  console.log('');
  console.log('📝 Parámetros de búsqueda:');
  console.log(`   Dirección: "${input}"`);
  console.log(`   Ciudad: "${ciudad || 'NO ESPECIFICADA'}"`);
  console.log(`   Provincia: "${provincia || 'NO ESPECIFICADA'}"`);

  // Ejecutar las 3 APIs en paralelo
  const [tomtomResults, georefResults, nominatimResults] = await Promise.all([
    testTomTom(input, ciudad, provincia),
    testGeoref(input, ciudad, provincia),
    testNominatim(input, ciudad, provincia)
  ]);

  // Resumen comparativo
  console.log('\n');
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║  📊 RESUMEN COMPARATIVO                                    ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');
  console.log('');
  
  const tomtomCount = tomtomResults?.length || 0;
  const georefCount = georefResults?.length || 0;
  const nominatimCount = nominatimResults?.length || 0;

  console.log('📈 Cantidad de resultados:');
  console.log(`   TomTom:    ${tomtomCount} ${tomtomCount > 0 ? '✅' : '❌'}`);
  console.log(`   Georef:    ${georefCount} ${georefCount > 0 ? '✅' : '❌'}`);
  console.log(`   Nominatim: ${nominatimCount} ${nominatimCount > 0 ? '✅' : '❌'}`);
  console.log('');

  // Comparar primer resultado de cada API
  if (tomtomCount > 0 || georefCount > 0 || nominatimCount > 0) {
    console.log('🎯 Comparación del primer resultado:');
    console.log('');
    
    if (tomtomCount > 0) {
      const r = tomtomResults[0];
      console.log('   🔷 TomTom:');
      console.log(`      ${r.calle} ${r.numero}`.trim() || r.direccion);
      console.log(`      📍 ${r.coords.lat}, ${r.coords.lng}`);
      if (r.score) console.log(`      ⭐ Score: ${r.score}`);
    }
    
    if (georefCount > 0) {
      const r = georefResults[0];
      console.log('   🔶 Georef:');
      console.log(`      ${r.calle} ${r.numero}`.trim() || r.direccion);
      console.log(`      📍 ${r.coords.lat}, ${r.coords.lng}`);
    }
    
    if (nominatimCount > 0) {
      const r = nominatimResults[0];
      console.log('   🔷 Nominatim:');
      console.log(`      ${r.calle} ${r.numero}`.trim() || r.direccion);
      console.log(`      📍 ${r.coords.lat}, ${r.coords.lng}`);
      if (r.importancia) console.log(`      ⭐ Importancia: ${r.importancia}`);
    }
  }

  console.log('');
  console.log('✅ Test completado');
  console.log('');
}

// Ejecutar
main().catch(console.error);