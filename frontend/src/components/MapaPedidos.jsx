import { useEffect, useRef, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'

// Fix default icon
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

const ESTADO_LABEL = {
  nuevo: 'Nuevo', en_preparacion: 'En preparación',
  listo: 'Listo', en_camino: 'En camino',
}

// Colores por estado de pago (rojo = efectivo / impago, verde = pagado)
const COLOR_PAGO = {
  pagado: '#22c55e',
  pendiente: '#ef4444',
}

// ─── Ícono pedido (color según pago) ─────────────────────
function crearIconoPedido(numero, metodoPago) {
  const isPagado = !['efectivo', 'efectivo_sin_descuento'].includes(metodoPago)
  const color = isPagado ? COLOR_PAGO.pagado : COLOR_PAGO.pendiente
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="36" height="48" viewBox="0 0 36 48">
      <filter id="sh" x="-30%" y="-20%" width="160%" height="150%">
        <feDropShadow dx="0" dy="2" stdDeviation="2" flood-opacity="0.4"/>
      </filter>
      <path d="M18 0C8.059 0 0 8.059 0 18c0 12 18 30 18 30S36 30 36 18C36 8.059 27.941 0 18 0z"
        fill="${color}" filter="url(#sh)"/>
      <circle cx="18" cy="18" r="12" fill="white"/>
      <text x="18" y="23" font-family="system-ui,sans-serif" font-size="11" font-weight="700"
        text-anchor="middle" fill="${color}">#${numero}</text>
    </svg>`
  return L.divIcon({
    html: svg,
    iconSize: [36, 48],
    iconAnchor: [18, 48],
    popupAnchor: [0, -50],
    className: ''
  })
}

// ─── Ícono del negocio (casa) ─────────────────────────────
function crearIconoNegocio() {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="40" height="52" viewBox="0 0 40 52">
      <filter id="sh2" x="-30%" y="-20%" width="160%" height="150%">
        <feDropShadow dx="0" dy="3" stdDeviation="3" flood-opacity="0.5"/>
      </filter>
      <path d="M20 0C8.954 0 0 8.954 0 20c0 13.333 20 32 20 32S40 33.333 40 20C40 8.954 31.046 0 20 0z"
        fill="#1f2937" filter="url(#sh2)"/>
      <circle cx="20" cy="20" r="14" fill="white"/>
      <path d="M20 11l-9 8h3v8h5v-5h2v5h5v-8h3z" fill="#1f2937"/>
    </svg>`
  return L.divIcon({
    html: svg,
    iconSize: [40, 52],
    iconAnchor: [20, 52],
    popupAnchor: [0, -54],
    className: ''
  })
}

// ─── Cache geocodificación ────────────────────────────────
const geoCache = {}
async function geocodificar(direccion, negocio = null) {
  if (!direccion?.trim()) return null
  const key = direccion.trim().toLowerCase()
  if (geoCache[key]) return geoCache[key]
  try {
    const ciudad = negocio?.ciudad || ''
    const provincia = negocio?.configuracion?.provincia || ''
    const params = new URLSearchParams({
      address: direccion,
      ...(ciudad && { ciudad }),
      ...(provincia && { provincia }),
    })
    const res = await fetch(`/api/maps/geocode?${params}`)
    const data = await res.json()
    if (data?.results?.[0]?.geometry?.location) {
      const { lat, lng } = data.results[0].geometry.location
      const coords = { lat, lng }
      geoCache[key] = coords
      return coords
    }
  } catch { }
  return null
}

// ─── Ajuste automático del bounds ─────────────────────────
function FitBounds({ coords }) {
  const map = useMap()
  useEffect(() => {
    if (!coords || coords.length === 0) return
    const bounds = L.latLngBounds(coords.map(c => [c.lat, c.lng]))
    map.fitBounds(bounds, { padding: [60, 60], maxZoom: 15 })
  }, [JSON.stringify(coords)])
  return null
}

// ─── Componente principal ─────────────────────────────────
export default function MapaPedidos({ pedidos, negocio = null }) {
  const [pinsData, setPinsData] = useState([])
  const [geocodificando, setGeocodificando] = useState(false)
  const [progreso, setProgreso] = useState(0)
  const [negocioCoords, setNegocioCoords] = useState(null)

  const pedidosDelivery = pedidos.filter(p =>
    p.modalidad === 'delivery' && p.clienteDireccion?.trim()
  )

  const pedidosKey = pedidosDelivery.map(p => `${p.id}-${p.estado}-${p.metodoPago}`).join(',')

  // Geocodificar dirección del negocio
  useEffect(() => {
    // Prioridad 1: usar lat/lng guardados (desde GPS o selección de autocomplete)
    if (negocio?.configuracion?.lat != null && negocio?.configuracion?.lng != null) {
      setNegocioCoords({ lat: negocio.configuracion.lat, lng: negocio.configuracion.lng })
      return
    }
    // Prioridad 2: geocodificar la dirección texto
    if (!negocio?.direccion) return
    const addr = [negocio.direccion, negocio.ciudad].filter(Boolean).join(', ')
    geocodificar(addr, negocio).then(coords => {
      if (coords) setNegocioCoords(coords)
    })
  }, [negocio?.direccion, negocio?.ciudad, negocio?.configuracion?.lat, negocio?.configuracion?.lng])

  // Geocodificar pedidos delivery
  useEffect(() => {
    if (pedidosDelivery.length === 0) { setPinsData([]); return }
    let cancelado = false

    const run = async () => {
      setGeocodificando(true)
      setProgreso(0)
      const results = []
      for (let i = 0; i < pedidosDelivery.length; i++) {
        if (cancelado) break
        const p = pedidosDelivery[i]
        let coords
        if (p.clienteLat && p.clienteLng) {
          // Coords guardadas al hacer el pedido — exactas, sin geocodificar
          coords = { lat: parseFloat(p.clienteLat), lng: parseFloat(p.clienteLng) }
        } else {
          // Pedidos viejos sin coords: geocodificar con contexto del negocio
          coords = await geocodificar(p.clienteDireccion, negocio)
          if (i < pedidosDelivery.length - 1) await new Promise(r => setTimeout(r, 350))
        }
        if (coords) results.push({ pedido: p, ...coords })
        setProgreso(Math.round(((i + 1) / pedidosDelivery.length) * 100))
      }
      if (!cancelado) { setPinsData(results); setGeocodificando(false) }
    }

    run()
    return () => { cancelado = true }
  }, [pedidosKey])

  // Calcular centro y bounds
  const coordsParaFit = [
    ...pinsData.map(d => ({ lat: d.lat, lng: d.lng })),
    ...(negocioCoords ? [negocioCoords] : [])
  ]
  const centroDefault = negocioCoords
    ? [negocioCoords.lat, negocioCoords.lng]
    : [-34.6037, -58.3816]

  const iconoNegocio = crearIconoNegocio()

  return (
    <div className="flex flex-col h-full bg-[#1a1a2e]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#16213e] border-b border-[#0f3460] flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <svg className="w-4 h-4 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="text-sm font-semibold text-white">Mapa en vivo</span>
          </div>
          {geocodificando && (
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs text-gray-600 dark:text-gray-400">Localizando... {progreso}%</span>
            </div>
          )}
        </div>

        {/* Leyenda */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: COLOR_PAGO.pendiente }} />
            <span className="text-xs text-gray-600 dark:text-gray-400">Efectivo (pendiente)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: COLOR_PAGO.pagado }} />
            <span className="text-xs text-gray-600 dark:text-gray-400">Pagado</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 rounded-full bg-gray-800 border border-white/30" />
            <span className="text-xs text-gray-600 dark:text-gray-400">Negocio</span>
          </div>
        </div>
      </div>

      {/* Mapa */}
      <div className="flex-1 relative min-h-0" style={{ zIndex: 1 }}>
        <MapContainer
          center={centroDefault}
          zoom={12}
          style={{ height: '100%', width: '100%' }}
          zoomControl={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            subdomains="abcd"
            maxZoom={20}
          />

          {coordsParaFit.length > 0 && <FitBounds coords={coordsParaFit} />}

          {/* Pin del negocio */}
          {negocioCoords && (
            <Marker position={[negocioCoords.lat, negocioCoords.lng]} icon={iconoNegocio}>
              <Popup minWidth={180} autoClose={true} closeOnClick={true}>
                <div style={{ fontFamily: 'system-ui,sans-serif', padding: '2px' }}>
                  <p style={{ fontWeight: 700, fontSize: 14, color: '#111', marginBottom: 4 }}>
                    📍 Tu negocio
                  </p>
                  {negocio?.direccion && (
                    <p style={{ fontSize: 12, color: '#555' }}>{negocio.direccion}</p>
                  )}
                  {negocio?.ciudad && (
                    <p style={{ fontSize: 12, color: '#555' }}>{negocio.ciudad}</p>
                  )}
                </div>
              </Popup>
            </Marker>
          )}

          {/* Pins de pedidos */}
          {pinsData.map(({ pedido, lat, lng }) => {
            const isPagado = pedido.cobrado === true || !['efectivo', 'efectivo_sin_descuento'].includes(pedido.metodoPago)
            return (
              <Marker
                key={pedido.id}
                position={[lat, lng]}
                icon={crearIconoPedido(pedido.numero, pedido.metodoPago)}
              >
                <Popup minWidth={220} className="pedido-popup">
                  <div style={{ fontFamily: 'system-ui,sans-serif', padding: '2px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <span style={{ fontWeight: 700, fontSize: 15, color: '#111' }}>Pedido #{pedido.numero}</span>
                      <span style={{
                        fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20,
                        background: isPagado ? '#dcfce7' : '#fee2e2',
                        color: isPagado ? '#16a34a' : '#dc2626'
                      }}>
                        {isPagado ? '✓ Cobrado' : '💰 Sin cobrar'}
                      </span>
                    </div>
                    <p style={{ margin: '4px 0', fontWeight: 600, color: '#333', fontSize: 13 }}>{pedido.clienteNombre}</p>
                    <p style={{ margin: '2px 0', fontSize: 12, color: '#666' }}>{pedido.clienteDireccion}</p>
                    {pedido.clienteTelefono && (
                      <p style={{ margin: '2px 0', fontSize: 12, color: '#666' }}>📞 {pedido.clienteTelefono}</p>
                    )}
                    {pedido.repartidor && (
                      <p style={{ margin: '2px 0', fontSize: 12, color: '#666' }}>🛵 {pedido.repartidor.nombre}</p>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, paddingTop: 8, borderTop: '1px solid #eee' }}>
                      <span style={{ fontSize: 12, color: '#888' }}>{ESTADO_LABEL[pedido.estado] || pedido.estado}</span>
                      <span style={{ fontWeight: 700, color: '#7c3aed', fontSize: 14 }}>
                        ${Number(pedido.total).toLocaleString('es-AR')}
                      </span>
                    </div>
                    <a
                      href={`https://maps.google.com/?q=${encodeURIComponent(pedido.clienteDireccion)}`}
                      target="_blank"
                      rel="noreferrer"
                      style={{ display: 'block', marginTop: 8, textAlign: 'center', fontSize: 12, color: '#7c3aed', textDecoration: 'underline' }}
                    >
                      Ver en Google Maps ↗
                    </a>
                  </div>
                </Popup>
              </Marker>
            )
          })}
        </MapContainer>

        {pedidosDelivery.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="bg-black/60 backdrop-blur-sm rounded-2xl px-8 py-6 text-center text-white">
              <svg className="w-10 h-10 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
              <p className="font-semibold text-sm">Sin pedidos delivery activos</p>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Los pines aparecen al recibir pedidos</p>
            </div>
          </div>
        )}
      </div>

      {/* Lista debajo del mapa */}
      {pedidosDelivery.length > 0 && (
        <div className="flex-shrink-0 max-h-36 overflow-y-auto bg-[#16213e] border-t border-[#0f3460]">
          {pedidosDelivery.map(p => {
            const pinEncontrado = pinsData.find(d => d.pedido.id === p.id)
            const isPagado = p.metodoPago !== 'efectivo'
            return (
              <div key={p.id} className="flex items-center gap-3 px-4 py-2.5 border-b border-[#0f3460]/50 hover:bg-[#0f3460]/30 transition-colors">
                <div className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ background: isPagado ? COLOR_PAGO.pagado : COLOR_PAGO.pendiente }} />
                <span className="text-xs font-bold text-gray-600 dark:text-gray-400 w-8">#{p.numero}</span>
                <span className="text-sm text-gray-200 flex-1 truncate">{p.clienteNombre}</span>
                <span className="text-xs text-gray-700 dark:text-gray-300 truncate max-w-32 hidden md:block">{p.clienteDireccion}</span>
                {pinEncontrado ? (
                  <span className="text-xs text-green-400">📍 localizado</span>
                ) : geocodificando ? (
                  <span className="text-xs text-gray-700 dark:text-gray-300">buscando...</span>
                ) : (
                  <span className="text-xs text-yellow-500">sin coords</span>
                )}
                <a
                  href={`https://maps.google.com/?q=${encodeURIComponent(p.clienteDireccion)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-violet-400 hover:text-violet-200 flex-shrink-0"
                  title="Ver en Google Maps"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
