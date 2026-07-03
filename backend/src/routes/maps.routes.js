const express = require('express');
const router = express.Router();

// Key por env (fallback a la histórica para no romper entornos sin .env actualizado)
const TOMTOM_API_KEY = process.env.TOMTOM_API_KEY || 'v391c1qxphzhWX8F4aAePglC00JIPzj2';

// Radio de sesgo geográfico alrededor del local (en metros)
const RADIO_BIAS_METROS = 15000;

// Mapea el tipo de resultado de TomTom a una precisión entendible
function precisionTomTom(tipo) {
  if (tipo === 'Point Address') return 'exacta';       // parcela/altura exacta
  if (tipo === 'Address Range') return 'aproximada';   // interpolada sobre la cuadra
  return 'calle';                                      // centro de calle o zona
}

// Prioriza la localidad conocida sobre el partido político
function extraerLocalidad(addr, ciudadConfig) {
  if (ciudadConfig) return ciudadConfig
  const stateDistrict = addr.state_district || ''
  const localidadDePartido = stateDistrict.replace(/^Partido de\s+/i, '').trim()
  if (localidadDePartido) return localidadDePartido
  return addr.town || addr.village || addr.suburb || addr.city_district || addr.city || ''
}

// Geocodificación usando TomTom Maps API (mejor precisión que OSM)
// bias: { lat, lng } opcional — coords del local para acotar la búsqueda a su zona
async function geocodificarTomTom(input, ciudad, provincia, bias) {
  try {
    // Construir query con contexto de ubicación
    const contexto = [ciudad, provincia, 'Argentina'].filter(Boolean).join(', ')
    const query = contexto ? `${input}, ${contexto}` : input

    const params = new URLSearchParams({
      key: TOMTOM_API_KEY,
      limit: 5,
      countrySet: 'AR', // Solo Argentina
      language: 'es-ES', // TomTom rechaza 'es' a secas con 400
    })

    // Sesgo geográfico: prioriza resultados cerca del local
    if (bias?.lat && bias?.lng) {
      params.set('lat', bias.lat)
      params.set('lon', bias.lng)
      params.set('radius', RADIO_BIAS_METROS)
    }

    const url = `https://api.tomtom.com/search/2/geocode/${encodeURIComponent(query)}.json?${params}`
    console.log('[TomTom] Query:', query, bias ? `| bias: ${bias.lat},${bias.lng}` : '')

    const resp = await fetch(url, {
      headers: { 'User-Agent': 'BurgerPOS/1.0' }
    })
    const data = await resp.json()

    if (!data.results || data.results.length === 0) {
      if (data.errorText) console.error('[TomTom] API error:', data.errorText)
      return null
    }

    let predictions = data.results.map(r => {
      const addr = r.address || {}
      const pos = r.position || {}

      // Construir dirección principal (calle + número)
      const calle = addr.streetName || ''
      const numero = addr.streetNumber || ''
      const mainText = [calle, numero].filter(Boolean).join(' ')

      // Contexto secundario (barrio, ciudad)
      const barrio = addr.municipalitySubdivision || ''
      const localidad = addr.municipality || ciudad || ''
      const secondary = [barrio, localidad].filter(Boolean).join(', ')

      return {
        _coords: { lat: pos.lat, lng: pos.lon },
        precision: precisionTomTom(r.type),
        confidence: r.matchConfidence?.score || 0,
        _municipio: (addr.municipality || '').toLowerCase(),
        structured_formatting: {
          main_text: mainText || addr.freeformAddress?.split(',')[0] || query,
          secondary_text: secondary,
        },
        description: addr.freeformAddress || `${mainText}, ${localidad}`,
      }
    })

    // Priorizar resultados de la ciudad del local
    if (ciudad) {
      const ciudadLower = ciudad.toLowerCase()
      predictions.sort((a, b) => {
        const aMatch = a._municipio.includes(ciudadLower) ? 1 : 0
        const bMatch = b._municipio.includes(ciudadLower) ? 1 : 0
        if (aMatch !== bMatch) return bMatch - aMatch
        return b.confidence - a.confidence
      })
    }
    predictions.forEach(p => delete p._municipio)

    console.log('[TomTom] Results:', predictions.length)
    return predictions.length > 0 ? predictions : null
  } catch (err) {
    console.error('[TomTom] error:', err.message)
    return null
  }
}

// Geocodificación con altura exacta usando API Georef del gobierno argentino
// Devuelve coords con interpolación de altura si encuentra la dirección
async function geocodificarGeoref(input, ciudad, provincia) {
  try {
    const todosLosNumeros = input.match(/\b\d{2,5}\b/g) || []
    const numeroDelInput = todosLosNumeros.length > 1
      ? todosLosNumeros[todosLosNumeros.length - 1]
      : todosLosNumeros[0] || ''

    // Buscar con filtro de provincia (georef no soporta filtro por departamento/ciudad)
    const params = new URLSearchParams({
      direccion: input,
      max: '8',
      ...(provincia && { provincia }),
    })
    const resp = await fetch(
      `https://apis.datos.gob.ar/georef/api/direcciones?${params}`,
      { headers: { 'User-Agent': 'BurgerPOS/1.0' } }
    )
    const data = await resp.json()
    let dirs = data?.direcciones || []

    // Si no hay resultados con provincia, intentar sin filtro (otras provincias)
    if (dirs.length === 0) {
      const params2 = new URLSearchParams({ direccion: input, max: '8' })
      const resp2 = await fetch(
        `https://apis.datos.gob.ar/georef/api/direcciones?${params2}`,
        { headers: { 'User-Agent': 'BurgerPOS/1.0' } }
      )
      const data2 = await resp2.json()
      dirs = data2?.direcciones || []
    }

    if (dirs.length === 0) return null

    console.log('[Georef] Total results before filter:', dirs.length)
    console.log('[Georef] Sample results:', dirs.slice(0, 3).map(d => ({
      calle: d.calle?.nombre,
      altura: d.altura?.valor,
      dept: d.departamento?.nombre,
      loc: d.localidad_censal?.nombre,
    })))

    // Particionar: resultados que coinciden con ciudad PRIMERO, después el resto
    if (ciudad) {
      const ciudadLower = ciudad.toLowerCase()
      const matching = []
      const nonMatching = []

      dirs.forEach(d => {
        const deptMatch = (d.departamento?.nombre || '').toLowerCase().includes(ciudadLower)
        const locMatch = (d.localidad_censal?.nombre || '').toLowerCase().includes(ciudadLower)
        if (deptMatch || locMatch) {
          matching.push(d)
        } else {
          nonMatching.push(d)
        }
      })

      console.log('[Georef] Matching ciudad:', matching.length, '| Non-matching:', nonMatching.length)
      console.log('[Georef] Matching sample:', matching.slice(0, 2).map(d => `${d.calle?.nombre} ${d.altura?.valor}, ${d.departamento?.nombre}`))

      // Si NO hay resultados de la ciudad especificada, retornar null para activar fallback Nominatim
      if (matching.length === 0) {
        console.log('[Georef] No results for specified ciudad, will fallback to Nominatim')
        return null
      }

      // Combinar: matching primero, luego non-matching (como fallback secundario)
      dirs = [...matching, ...nonMatching]
    }

    const seen = new Set()
    const predictions = []

    for (const d of dirs) {
      if (!d.ubicacion) continue
      const calle = d.calle?.nombre || d.nomenclatura?.split(',')[0] || ''
      const numero = d.altura?.valor || numeroDelInput || ''
      const mainText = [calle, numero].filter(Boolean).join(' ')
      const localidad = d.localidad_censal?.nombre || d.departamento?.nombre || ''
      const prov = d.provincia?.nombre || provincia || ''

      const key = `${calle}|${numero}|${localidad}`.toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)

      predictions.push({
        _coords: { lat: d.ubicacion.lat, lng: d.ubicacion.lon },
        structured_formatting: {
          main_text: mainText,
          secondary_text: [localidad, prov].filter(Boolean).join(', '),
        },
        description: [mainText, localidad, prov].filter(Boolean).join(', '),
      })
    }
    return predictions.length > 0 ? predictions : null
  } catch (err) {
    console.error('[Georef] error:', err.message)
    return null
  }
}

// Fallback: Nominatim para calles no encontradas en georef
async function geocodificarNominatim(input, ciudad, provincia, bias) {
  try {
    const todosLosNumeros = input.match(/\b\d{2,5}\b/g) || []
    const numeroDelInput = todosLosNumeros.length > 1
      ? todosLosNumeros[todosLosNumeros.length - 1]
      : todosLosNumeros[0] || ''

    const contexto = [ciudad, provincia, 'Argentina'].filter(Boolean).join(', ')
    const q = `${input}, ${contexto}`
    const params = new URLSearchParams({
      q, format: 'json', limit: '8', addressdetails: '1',
      'accept-language': 'es', countrycodes: 'ar',
    })

    // Sesgo geográfico: viewbox alrededor del local (sin bounded, solo prioriza)
    if (bias?.lat && bias?.lng) {
      const delta = 0.15 // ~15 km
      params.set('viewbox', `${bias.lng - delta},${bias.lat + delta},${bias.lng + delta},${bias.lat - delta}`)
    }
    const resp = await fetch(
      `https://nominatim.openstreetmap.org/search?${params}`,
      { headers: { 'User-Agent': 'BurgerPOS/1.0' } }
    )
    const raw = await resp.json()
    if (!raw?.length) return null

    const seen = new Set()
    const unique = raw.filter(r => {
      const addr = r.address || {}
      const calle = addr.road || addr.pedestrian || addr.path || ''
      if (!calle) return false
      const numero = addr.house_number || numeroDelInput
      const key = `${calle}|${numero}`.toLowerCase()
      if (seen.has(key)) return false
      seen.add(key)
      return true
    }).slice(0, 5)

    return unique.map(r => {
      const addr = r.address || {}
      const calle = addr.road || addr.pedestrian || addr.path || r.display_name.split(',')[0]
      const numero = addr.house_number || numeroDelInput
      const mainText = [calle, numero].filter(Boolean).join(' ')
      const localidad = extraerLocalidad(addr, ciudad)
      const barrio = addr.quarter || addr.suburb || addr.neighbourhood || ''
      return {
        _coords: { lat: parseFloat(r.lat), lng: parseFloat(r.lon) },
        structured_formatting: {
          main_text: mainText,
          secondary_text: [barrio, localidad, addr.state].filter(Boolean).join(', '),
        },
        description: [mainText, localidad, addr.state].filter(Boolean).join(', '),
      }
    })
  } catch (err) {
    console.error('[Nominatim] error:', err.message)
    return null
  }
}

// Lee el bias opcional (coords del local) de la query
function leerBias(query) {
  const lat = parseFloat(query.lat)
  const lng = parseFloat(query.lng)
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null
}

// GET /api/maps/autocomplete?input=...&ciudad=...&provincia=...&lat=...&lng=...
router.get('/autocomplete', async (req, res) => {
  try {
    const { input, ciudad, provincia } = req.query
    if (!input || input.length < 3) return res.json({ predictions: [] })
    const bias = leerBias(req.query)

    console.log('[Maps] autocomplete ->', input, '| ciudad:', ciudad)

    // Prioridad 1: TomTom (mejor precisión)
    let predictions = await geocodificarTomTom(input, ciudad, provincia, bias)

    // Prioridad 2: Georef (Argentina oficial, altura exacta)
    if (!predictions || predictions.length === 0) {
      console.log('[Maps] TomTom returned 0 results, trying Georef...')
      predictions = await geocodificarGeoref(input, ciudad, provincia)
    }

    // Prioridad 3: Nominatim (fallback final)
    if (!predictions || predictions.length === 0) {
      console.log('[Maps] Georef returned 0 matching results, trying Nominatim...')
      predictions = await geocodificarNominatim(input, ciudad, provincia, bias) || []
      console.log('[Maps] Nominatim results:', predictions.length)
    }

    res.json({ predictions: predictions.slice(0, 5) })
  } catch (err) {
    console.error('Maps autocomplete error:', err)
    res.status(500).json({ predictions: [] })
  }
})

// GET /api/maps/reverse?lat=...&lng=... — coordenadas a dirección
// (TomTom reverse con fallback a Nominatim)
router.get('/reverse', async (req, res) => {
  try {
    const lat = parseFloat(req.query.lat)
    const lng = parseFloat(req.query.lng)
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return res.status(400).json({ error: 'lat y lng requeridos' })
    }

    // TomTom reverse
    try {
      const params = new URLSearchParams({ key: TOMTOM_API_KEY, language: 'es-ES' })
      const resp = await fetch(
        `https://api.tomtom.com/search/2/reverseGeocode/${lat},${lng}.json?${params}`,
        { headers: { 'User-Agent': 'BurgerPOS/1.0' } }
      )
      const data = await resp.json()
      const addr = data?.addresses?.[0]?.address
      if (addr) {
        const calle = [addr.streetName, addr.streetNumber].filter(Boolean).join(' ')
        const direccion = addr.freeformAddress || [calle, addr.municipality].filter(Boolean).join(', ')
        return res.json({
          direccion,
          calle: calle || null,
          localidad: addr.municipality || null,
          provincia: addr.countrySubdivisionName || null,
        })
      }
    } catch (e) {
      console.error('[TomTom reverse] error:', e.message)
    }

    // Fallback: Nominatim reverse
    const params = new URLSearchParams({
      lat, lon: lng, format: 'json', 'accept-language': 'es', zoom: '18',
    })
    const resp = await fetch(
      `https://nominatim.openstreetmap.org/reverse?${params}`,
      { headers: { 'User-Agent': 'BurgerPOS/1.0' } }
    )
    const data = await resp.json()
    const a = data?.address || {}
    const calle = [a.road, a.house_number].filter(Boolean).join(' ')
    res.json({
      direccion: data?.display_name ? [calle, extraerLocalidad(a)].filter(Boolean).join(', ') || data.display_name : null,
      calle: calle || null,
      localidad: extraerLocalidad(a) || null,
      provincia: a.state || null,
    })
  } catch (err) {
    console.error('Maps reverse error:', err)
    res.status(500).json({ error: 'Error en reverse geocoding' })
  }
})

router.get('/details', (req, res) => res.json({ result: null }))

// GET /api/maps/geocode?address=...&ciudad=...&provincia=...&lat=...&lng=...
router.get('/geocode', async (req, res) => {
  try {
    const { address, ciudad, provincia } = req.query
    if (!address) return res.status(400).json({ error: 'address required' })
    const bias = leerBias(req.query)

    console.log('[Maps] geocode ->', address)

    // Intentar TomTom primero
    const tomtomResults = await geocodificarTomTom(address, ciudad, provincia, bias)
    if (tomtomResults?.[0]?._coords) {
      const { lat, lng } = tomtomResults[0]._coords
      console.log('[Maps] geocode tomtom result:', lat, lng)
      return res.json({ results: [{ geometry: { location: { lat, lng } } }] })
    }

    // Intentar georef segundo
    const georefResults = await geocodificarGeoref(address, ciudad, provincia)
    if (georefResults?.[0]?._coords) {
      const { lat, lng } = georefResults[0]._coords
      console.log('[Maps] geocode georef result:', lat, lng)
      return res.json({ results: [{ geometry: { location: { lat, lng } } }] })
    }

    // Fallback Nominatim
    const contexto = [address, ciudad, provincia, 'Argentina'].filter(Boolean).join(', ')
    const params = new URLSearchParams({
      q: contexto, format: 'json', limit: '1',
      'accept-language': 'es', countrycodes: 'ar',
    })
    const resp = await fetch(
      `https://nominatim.openstreetmap.org/search?${params}`,
      { headers: { 'User-Agent': 'BurgerPOS/1.0' } }
    )
    const data = await resp.json()
    const r = data?.[0]
    if (!r) return res.json({ results: [] })
    const lat = parseFloat(r.lat)
    const lng = parseFloat(r.lon)
    console.log('[Maps] geocode nominatim result:', lat, lng)
    res.json({ results: [{ geometry: { location: { lat, lng } } }] })
  } catch (err) {
    console.error('Maps geocode error:', err)
    res.status(500).json({ error: 'Error fetching geocode' })
  }
})

module.exports = router;
