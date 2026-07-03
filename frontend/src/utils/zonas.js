// Utilidades de zonas de entrega (compartidas entre la tienda pública y el
// panel de pedidos). Extraídas de MenuPublico.

export function puntoEnPoligono(punto, poligono) {
  let dentro = false, j = poligono.length - 1
  for (let i = 0; i < poligono.length; i++) {
    const xi = poligono[i].lat, yi = poligono[i].lng
    const xj = poligono[j].lat, yj = poligono[j].lng
    if ((yi > punto.lng) !== (yj > punto.lng) &&
      punto.lat < ((xj - xi) * (punto.lng - yi)) / (yj - yi) + xi) dentro = !dentro
    j = i
  }
  return dentro
}

export function haversineKm(a, b) {
  const R = 6371, dLat = (b.lat - a.lat) * Math.PI / 180, dLng = (b.lng - a.lng) * Math.PI / 180
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s))
}

export function detectarZonaEntrega(punto, negocioCoords, zonas) {
  for (let i = 0; i < zonas.length; i++) {
    const z = { tipo: 'poligono', radioKm: 0, coordenadas: [], ...zonas[i] }
    if (z.tipo === 'radio' && negocioCoords && z.radioKm > 0) {
      if (haversineKm(punto, negocioCoords) <= z.radioKm) return { idx: i, zona: z }
    } else if (z.coordenadas?.length >= 3) {
      if (puntoEnPoligono(punto, z.coordenadas)) return { idx: i, zona: z }
    }
  }
  return null
}

export function calcularCostoZona(zona, coordsCliente, negocioCoords) {
  if (!zona) return 0
  if (zona.tipoCosto === 'variable' && coordsCliente && negocioCoords) {
    const km = haversineKm(coordsCliente, negocioCoords)
    return Math.round(Number(zona.costo || 0) + Math.max(0, km - Number(zona.kmGratis || 0)) * Number(zona.precioPorKm || 0))
  }
  return Number(zona.costo || 0)
}
