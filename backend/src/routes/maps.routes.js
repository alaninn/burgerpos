const express = require('express');
const router = express.Router();

const TOMTOM_API_KEY = 'v391c1qxphzhWX8F4aAePglC00JIPzj2';

// Prioriza la localidad conocida sobre el partido político
function extraerLocalidad(addr, ciudadConfig) {
  if (ciudadConfig) return ciudadConfig
  const stateDistrict = addr.state_district || ''
  const localidadDePartido = stateDistrict.replace(/^Partido de\s+/i, '').trim()
  if (localidadDePartido) return localidadDePartido
  return addr.town || addr.village || addr.suburb || addr.city_district || addr.city || ''
}

// Geocodificación usando TomTom Maps API (mejor precisión que OSM)
async function geocodificarTomTom(input, ciudad, provincia) {
  try {
    // Construir query con contexto de ubicación
    const contexto = [ciudad, provincia, 'Argentina'].filter(Boolean).join(', ')
    const query = contexto ? `${input}, ${contexto}` : input

    const params = new URLSearchParams({
      key: TOMTOM_API_KEY,
      limit: 5,
      countrySet: 'AR', // Solo Argentina
      language: 'es',
    })

    const url = `https://api.tomtom.com/search/2/geocode/${encodeURIComponent(query)}.json?${params}`
    console.log('[TomTom] Query:', query)

    const resp = await fetch(url, {
      headers: { 'User-Agent': 'BurgerPOS/1.0' }
    })
    const data = await resp.json()

    if (!data.results || data.results.length === 0) return null

    const predictions = data.results.map(r => {
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
        structured_formatting: {
          main_text: mainText || addr.freeformAddress?.split(',')[0] || query,
          secondary_text: secondary,
        },
        description: addr.freeformAddress || `${mainText}, ${localidad}`,
      }
    })

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
async function geocodificarNominatim(input, ciudad, provincia) {
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

// GET /api/maps/autocomplete?input=...&ciudad=...&provincia=...
router.get('/autocomplete', async (req, res) => {
  try {
    const { input, ciudad, provincia } = req.query
    if (!input || input.length < 3) return res.json({ predictions: [] })

    console.log('[Maps] autocomplete ->', input, '| ciudad:', ciudad)

    // Prioridad 1: TomTom (mejor precisión)
    let predictions = await geocodificarTomTom(input, ciudad, provincia)

    // Prioridad 2: Georef (Argentina oficial, altura exacta)
    if (!predictions || predictions.length === 0) {
      console.log('[Maps] TomTom returned 0 results, trying Georef...')
      predictions = await geocodificarGeoref(input, ciudad, provincia)
    }

    // Prioridad 3: Nominatim (fallback final)
    if (!predictions || predictions.length === 0) {
      console.log('[Maps] Georef returned 0 matching results, trying Nominatim...')
      predictions = await geocodificarNominatim(input, ciudad, provincia) || []
      console.log('[Maps] Nominatim results:', predictions.length)
    }

    res.json({ predictions: predictions.slice(0, 5) })
  } catch (err) {
    console.error('Maps autocomplete error:', err)
    res.status(500).json({ predictions: [] })
  }
})

router.get('/details', (req, res) => res.json({ result: null }))

// GET /api/maps/geocode?address=...&ciudad=...&provincia=...
router.get('/geocode', async (req, res) => {
  try {
    const { address, ciudad, provincia } = req.query
    if (!address) return res.status(400).json({ error: 'address required' })

    console.log('[Maps] geocode ->', address)

    // Intentar TomTom primero
    const tomtomResults = await geocodificarTomTom(address, ciudad, provincia)
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
