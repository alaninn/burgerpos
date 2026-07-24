// Mapa de cobertura de envíos para el menú público. Muestra, en solo lectura,
// las zonas de entrega configuradas por el negocio (polígonos y radios) sobre
// el MISMO mapa base que usa el POS (OpenStreetMap estándar + los filtros de
// tema de configuracion.mapaConfiguracion), no el mapa gris del editor.
import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, Polygon, Circle, Tooltip, useMap } from 'react-leaflet'
import L from 'leaflet'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

// Paleta para distinguir zonas (misma familia que el editor)
const COLORES = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#ec4899']

// Ícono "casa" del negocio, igual que el del POS (MapaPedidos)
function crearIconoNegocio(color) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="40" height="52" viewBox="0 0 40 52">
      <filter id="shc" x="-30%" y="-20%" width="160%" height="150%">
        <feDropShadow dx="0" dy="3" stdDeviation="3" flood-opacity="0.5"/>
      </filter>
      <path d="M20 0C8.954 0 0 8.954 0 20c0 13.333 20 32 20 32S40 33.333 40 20C40 8.954 31.046 0 20 0z"
        fill="${color}" filter="url(#shc)"/>
      <circle cx="20" cy="20" r="14" fill="white"/>
      <path d="M20 11l-9 8h3v8h5v-5h2v5h5v-8h3z" fill="${color}"/>
    </svg>`
  return L.divIcon({ html: svg, iconSize: [40, 52], iconAnchor: [20, 52], className: '' })
}

// Ajusta el encuadre para que entren todas las zonas + el negocio
function FitBounds({ puntos }) {
  const map = useMap()
  useEffect(() => {
    if (!puntos || puntos.length === 0) return
    map.fitBounds(L.latLngBounds(puntos), { padding: [30, 30], maxZoom: 15 })
  }, [JSON.stringify(puntos)])
  return null
}

// Geocodifica la dirección del negocio si no tiene lat/lng guardados
async function geocodificar(direccion, negocio) {
  if (!direccion?.trim()) return null
  try {
    const params = new URLSearchParams({
      address: direccion,
      ...(negocio?.ciudad && { ciudad: negocio.ciudad }),
      ...(negocio?.configuracion?.provincia && { provincia: negocio.configuracion.provincia }),
    })
    const res = await fetch(`/api/maps/geocode?${params}`)
    const data = await res.json()
    const loc = data?.results?.[0]?.geometry?.location
    return loc ? { lat: loc.lat, lng: loc.lng } : null
  } catch {
    return null
  }
}

function textoCosto(z) {
  if (z.tipoCosto === 'variable') {
    const porKm = Number(z.precioPorKm || 0)
    return porKm > 0 ? `$${porKm.toLocaleString('es-AR')}/km` : 'Envío variable'
  }
  const costo = Number(z.costo || 0)
  return costo > 0 ? `$${costo.toLocaleString('es-AR')}` : 'Gratis'
}

export default function MapaCobertura({ negocio, color = '#7c3aed' }) {
  const conf = negocio?.configuracion || {}

  // Solo zonas con geometría dibujable (el nombre es opcional: si falta, se
  // usa "Zona N", igual que en el editor)
  const zonas = (conf.zonasEntrega || [])
    .filter(z => z && (
      (z.tipo === 'poligono' && z.coordenadas?.length >= 3) ||
      (z.tipo === 'radio' && Number(z.radioKm) > 0)
    ))
    .map((z, i) => ({ ...z, _color: COLORES[i % COLORES.length], _nombre: z.nombre?.trim() || `Zona ${i + 1}` }))

  const [negocioCoords, setNegocioCoords] = useState(
    (conf.lat != null && conf.lng != null) ? { lat: conf.lat, lng: conf.lng } : null
  )

  // Filtros de tema, idénticos a los del mapa del POS (MapaPedidos)
  const mapaConfig = conf.mapaConfiguracion || {}
  const modoOscuro = mapaConfig.tema === 'oscuro'
  const brilloCSS = modoOscuro ? 0.6 + (mapaConfig.brillo || 0) : 1 + (mapaConfig.brillo || 0)
  const contrasteCSS = modoOscuro ? 1.1 + (mapaConfig.contraste || 0) : 1 + (mapaConfig.contraste || 0)
  const saturacionCSS = modoOscuro ? 0.7 + (mapaConfig.saturacion || 0) : 1 + (mapaConfig.saturacion || 0)
  const matizCSS = modoOscuro ? 200 + (mapaConfig.matiz || 0) : (mapaConfig.matiz || 0)

  useEffect(() => {
    if (negocioCoords || !negocio?.direccion) return
    const addr = [negocio.direccion, negocio.ciudad].filter(Boolean).join(', ')
    geocodificar(addr, negocio).then(c => { if (c) setNegocioCoords(c) })
  }, [negocio?.direccion, negocio?.ciudad]) // eslint-disable-line react-hooks/exhaustive-deps

  if (zonas.length === 0) return null

  // Los radios necesitan el centro del negocio; los polígonos no
  const zonasVisibles = zonas.filter(z => z.tipo === 'poligono' || negocioCoords)
  if (zonasVisibles.length === 0) return null

  // Puntos para encuadrar el mapa
  const puntos = []
  for (const z of zonasVisibles) {
    if (z.tipo === 'poligono') {
      z.coordenadas.forEach(c => puntos.push([c.lat, c.lng]))
    } else if (negocioCoords) {
      const dLat = z.radioKm / 111
      const dLng = z.radioKm / (111 * Math.cos(negocioCoords.lat * Math.PI / 180))
      puntos.push(
        [negocioCoords.lat + dLat, negocioCoords.lng],
        [negocioCoords.lat - dLat, negocioCoords.lng],
        [negocioCoords.lat, negocioCoords.lng + dLng],
        [negocioCoords.lat, negocioCoords.lng - dLng],
      )
    }
  }
  if (negocioCoords) puntos.push([negocioCoords.lat, negocioCoords.lng])

  const centro = negocioCoords
    ? [negocioCoords.lat, negocioCoords.lng]
    : (puntos[0] || [-34.6037, -58.3816])

  return (
    <div>
      <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.12)', background: '#000' }}>
        <div style={{ height: 300 }}>
          <MapContainer
            center={centro}
            zoom={12}
            scrollWheelZoom={false}
            style={{ height: '100%', width: '100%', filter: `brightness(${brilloCSS}) contrast(${contrasteCSS}) saturate(${saturacionCSS}) hue-rotate(${matizCSS}deg)` }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
              subdomains="abc"
              maxZoom={19}
              opacity={mapaConfig.opacidadMapa ?? 1}
            />

            {puntos.length > 0 && <FitBounds puntos={puntos} />}

            {zonasVisibles.map((z, idx) => {
              const pathOptions = { color: z._color, fillColor: z._color, fillOpacity: 0.18, weight: 2 }
              const tip = (
                <Tooltip sticky>
                  <div style={{ fontFamily: 'system-ui,sans-serif', padding: '2px' }}>
                    <p style={{ fontWeight: 700, fontSize: 13, color: z._color, margin: 0 }}>{z._nombre}</p>
                    <p style={{ fontSize: 12, color: '#555', margin: '2px 0 0' }}>Envío: {textoCosto(z)}</p>
                  </div>
                </Tooltip>
              )
              if (z.tipo === 'radio') {
                return (
                  <Circle key={`c-${idx}`} center={[negocioCoords.lat, negocioCoords.lng]} radius={z.radioKm * 1000} pathOptions={pathOptions}>
                    {tip}
                  </Circle>
                )
              }
              return (
                <Polygon key={`p-${idx}`} positions={z.coordenadas.map(c => [c.lat, c.lng])} pathOptions={pathOptions}>
                  {tip}
                </Polygon>
              )
            })}

            {negocioCoords && (
              <Marker position={[negocioCoords.lat, negocioCoords.lng]} icon={crearIconoNegocio(color)} />
            )}
          </MapContainer>
        </div>
      </div>

      {/* Leyenda: útil sobre todo en celular, donde no hay hover */}
      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
        {zonasVisibles.map((z, idx) => (
          <div key={idx} className="flex items-center justify-between gap-3 px-3 py-2 rounded-xl" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: z._color }} />
              <span className="text-xs font-medium text-white truncate">{z._nombre}</span>
            </div>
            <span className="text-xs flex-shrink-0" style={{ color: '#a1a1aa' }}>{textoCosto(z)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
