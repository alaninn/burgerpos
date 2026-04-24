import { useEffect, useRef, useState, useCallback } from 'react'
import { MapContainer, TileLayer, Polygon, Circle, Tooltip, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet-draw'

const geoCache = {}
async function geocodificar(direccion) {
  if (!direccion?.trim()) return null
  const key = direccion.trim().toLowerCase()
  if (geoCache[key]) return geoCache[key]
  try {
    const params = new URLSearchParams({ address: direccion })
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

function crearIconoNegocio() {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="40" height="52" viewBox="0 0 40 52">
      <filter id="sh2" x="-30%" y="-20%" width="160%" height="150%">
        <feDropShadow dx="0" dy="3" stdDeviation="3" flood-opacity="0.4"/>
      </filter>
      <path d="M20 0C8.954 0 0 8.954 0 20c0 13.333 20 32 20 32S40 33.333 40 20C40 8.954 31.046 0 20 0z"
        fill="#1f2937" filter="url(#sh2)"/>
      <circle cx="20" cy="20" r="14" fill="white"/>
      <path d="M20 11l-9 8h3v8h5v-5h2v5h5v-8h3z" fill="#1f2937"/>
    </svg>`
  return L.divIcon({ html: svg, iconSize: [40, 52], iconAnchor: [20, 52], popupAnchor: [0, -54], className: '' })
}

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

const COLORES_ZONA = [
  '#7c3aed', '#3b82f6', '#10b981', '#f59e0b',
  '#ef4444', '#8b5cf6', '#06b6d4', '#f97316',
]

const defaultZona = () => ({
  nombre: '',
  tipo: 'poligono',    // 'poligono' | 'radio'
  radioKm: 3,
  coordenadas: [],
  tipoCosto: 'fijo',   // 'fijo' | 'variable'
  costo: 0,
  precioPorKm: 0,
  kmGratis: 0,
  montoMinimo: 0,
})

// ─── Control de dibujo ───────────────────────────────────
function DrawControl({ onPolygonComplete }) {
  const map = useMap()
  const drawRef = useRef(null)

  useEffect(() => {
    if (drawRef.current) return

    const drawnItems = new L.FeatureGroup()
    map.addLayer(drawnItems)

    const drawControl = new L.Control.Draw({
      draw: {
        polygon: {
          allowIntersection: false,
          shapeOptions: { color: '#7c3aed', fillOpacity: 0.2 },
          showArea: false, showLength: false, metric: false,
        },
        rectangle: false, circle: false, circlemarker: false, marker: false, polyline: false,
      },
      edit: { featureGroup: drawnItems, remove: true }
    })
    map.addControl(drawControl)
    drawRef.current = { drawControl, drawnItems }

    map.on(L.Draw.Event.CREATED, (e) => {
      drawnItems.clearLayers()
      drawnItems.addLayer(e.layer)
      const latLngs = e.layer.getLatLngs()[0]
      onPolygonComplete(latLngs.map(ll => ({ lat: ll.lat, lng: ll.lng })))
    })
    map.on(L.Draw.Event.DELETED, () => onPolygonComplete([]))

    return () => {
      map.removeControl(drawControl)
      map.removeLayer(drawnItems)
      map.off(L.Draw.Event.CREATED)
      map.off(L.Draw.Event.DELETED)
      drawRef.current = null
    }
  }, [map, onPolygonComplete])

  return null
}

// ─── Pill toggle ─────────────────────────────────────────
function PillToggle({ options, value, onChange }) {
  return (
    <div className="flex rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 w-fit">
      {options.map(opt => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`px-4 py-1.5 text-xs font-bold transition-colors ${
            value === opt.value
              ? 'bg-violet-600 text-white'
              : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

// ─── Tarjeta de zona ─────────────────────────────────────
function ZonaCard({ zona, idx, zonaEditando, onEdit, onDelete, onChange, onPolygonComplete }) {
  const isOpen = zonaEditando === idx
  const color = COLORES_ZONA[idx % COLORES_ZONA.length]

  const set = (campo, valor) => onChange(idx, campo, valor)

  return (
    <div className={`border rounded-xl transition-all ${isOpen ? 'border-violet-400 dark:border-violet-600' : 'border-gray-200 dark:border-gray-700'}`}>
      {/* Header colapsado */}
      <div
        className={`flex items-center gap-3 px-4 py-3 cursor-pointer rounded-xl ${isOpen ? 'bg-violet-50 dark:bg-violet-900/10 rounded-b-none' : 'bg-white dark:bg-gray-800'}`}
        onClick={() => onEdit(isOpen ? null : idx)}
      >
        <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: color }} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
            {zona.nombre || `Zona ${idx + 1}`}
          </p>
          <p className="text-xs text-gray-600 dark:text-gray-400">
            {zona.tipo === 'radio' ? `Radio: ${zona.radioKm} km` : zona.coordenadas?.length >= 3 ? `${zona.coordenadas.length} puntos` : 'Sin área'}
            {' · '}
            {zona.tipoCosto === 'fijo'
              ? `$${Number(zona.costo || 0).toLocaleString('es-AR')} envío`
              : `$${Number(zona.precioPorKm || 0).toLocaleString('es-AR')}/km`
            }
            {zona.montoMinimo > 0 && ` · mín. $${Number(zona.montoMinimo).toLocaleString('es-AR')}`}
          </p>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
          <button
            onClick={() => onEdit(isOpen ? null : idx)}
            className={`p-1.5 rounded-lg transition-colors ${isOpen ? 'text-violet-600 bg-violet-100 dark:bg-violet-900/30' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </button>
          <button onClick={() => onDelete(idx)} className="p-1.5 text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* Body expandido */}
      {isOpen && (
        <div className="px-4 pb-4 pt-3 bg-white dark:bg-gray-800 border-t border-violet-100 dark:border-violet-900/30 rounded-b-xl space-y-4">
          {/* Nombre */}
          <input
            value={zona.nombre}
            onChange={e => set('nombre', e.target.value)}
            placeholder="Nombre de la zona (ej: Centro, Zona 1)"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
          />

          {/* Toggles */}
          <div className="flex flex-wrap gap-4 items-center">
            <div>
              <p className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-widest mb-1.5">Forma</p>
              <PillToggle
                options={[{ value: 'poligono', label: 'Polígono' }, { value: 'radio', label: 'Radio' }]}
                value={zona.tipo}
                onChange={v => set('tipo', v)}
              />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-widest mb-1.5">Costo</p>
              <PillToggle
                options={[{ value: 'fijo', label: 'Fijo' }, { value: 'variable', label: 'Variable' }]}
                value={zona.tipoCosto}
                onChange={v => set('tipoCosto', v)}
              />
            </div>
          </div>

          {/* Radio km (solo si tipo === 'radio') */}
          {zona.tipo === 'radio' && (
            <div>
              <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-widest mb-1.5">Radio de cobertura</label>
              <div className="flex items-center gap-2">
                <div className="relative w-36">
                  <input
                    type="number" min="0.5" step="0.5"
                    value={zona.radioKm}
                    onChange={e => set('radioKm', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-600 dark:text-gray-400">km</span>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400">desde el local</p>
              </div>
            </div>
          )}

          {/* Polígono: botón de área */}
          {zona.tipo === 'poligono' && (
            <div className="flex items-center gap-2">
              {zona.coordenadas?.length >= 3 ? (
                <span className="text-xs text-green-600 dark:text-green-400 font-medium flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                  Área definida ({zona.coordenadas.length} puntos)
                </span>
              ) : (
                <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  Usá el ícono de polígono en el mapa para dibujar el área
                </p>
              )}
            </div>
          )}

          {/* Campos de precio */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-widest mb-1.5">
                {zona.tipoCosto === 'variable' ? 'Costo base' : 'Costo envío'}
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 dark:text-gray-400 text-sm">$</span>
                <input
                  type="number" min="0"
                  value={zona.costo}
                  onChange={e => set('costo', Number(e.target.value))}
                  className="w-full pl-7 pr-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
            </div>

            {zona.tipoCosto === 'variable' ? (
              <div>
                <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-widest mb-1.5">Precio por km</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 dark:text-gray-400 text-sm">$</span>
                  <input
                    type="number" min="0"
                    value={zona.precioPorKm}
                    onChange={e => set('precioPorKm', Number(e.target.value))}
                    className="w-full pl-7 pr-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-widest mb-1.5">Monto mínimo</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 dark:text-gray-400 text-sm">$</span>
                  <input
                    type="number" min="0"
                    value={zona.montoMinimo}
                    onChange={e => set('montoMinimo', Number(e.target.value))}
                    className="w-full pl-7 pr-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
              </div>
            )}

            {zona.tipoCosto === 'variable' && (
              <>
                <div>
                  <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-widest mb-1.5">km gratis</label>
                  <div className="relative">
                    <input
                      type="number" min="0" step="0.5"
                      value={zona.kmGratis}
                      onChange={e => set('kmGratis', parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-600 dark:text-gray-400">km</span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Primeros X km sin cargo extra</p>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-widest mb-1.5">Monto mínimo</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 dark:text-gray-400 text-sm">$</span>
                    <input
                      type="number" min="0"
                      value={zona.montoMinimo}
                      onChange={e => set('montoMinimo', Number(e.target.value))}
                      className="w-full pl-7 pr-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                    />
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Resumen de costo */}
          {zona.tipoCosto === 'variable' && (zona.precioPorKm > 0 || zona.kmGratis > 0) && (
            <div className="bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800 rounded-lg px-3 py-2">
              <p className="text-xs text-violet-700 dark:text-violet-400">
                <span className="font-bold">Ejemplo:</span> 5km →{' '}
                {zona.kmGratis >= 5
                  ? `$${Number(zona.costo).toLocaleString('es-AR')} (dentro de km gratis)`
                  : `$${Number(zona.costo + Math.max(0, 5 - zona.kmGratis) * zona.precioPorKm).toLocaleString('es-AR')}`
                }
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Actualizador de centro del mapa ─────────────────────
function MapCenterUpdater({ coords }) {
  const map = useMap()
  useEffect(() => {
    if (coords) {
      map.flyTo([coords.lat, coords.lng], map.getZoom(), { duration: 1.2 })
    }
  }, [coords, map])
  return null
}

// ─── Componente principal ─────────────────────────────────
export default function EditorZonasMapa({ zonas, onChange, negocio = null }) {
  const [zonaEditando, setZonaEditando] = useState(null)
  const [negocioCoords, setNegocioCoords] = useState(null)
  const centroDefault = negocioCoords
    ? [negocioCoords.lat, negocioCoords.lng]
    : [-34.6037, -58.3816]

  useEffect(() => {
    // Prioridad 1: usar lat/lng guardados (desde GPS o selección de autocomplete)
    if (negocio?.configuracion?.lat != null && negocio?.configuracion?.lng != null) {
      setNegocioCoords({ lat: negocio.configuracion.lat, lng: negocio.configuracion.lng })
      return
    }
    // Prioridad 2: geocodificar la dirección texto
    if (!negocio?.direccion) return
    const provincia = negocio?.configuracion?.provincia || ''
    const addr = [negocio.direccion, negocio.ciudad, provincia, 'Argentina'].filter(Boolean).join(', ')
    geocodificar(addr).then(coords => { if (coords) setNegocioCoords(coords) })
  }, [negocio?.direccion, negocio?.ciudad, negocio?.configuracion?.provincia, negocio?.configuracion?.lat, negocio?.configuracion?.lng])

  const iconoNegocio = crearIconoNegocio()

  const handlePolygonComplete = useCallback((coordenadas) => {
    if (zonaEditando === null) return
    onChange(zonas.map((z, i) => i === zonaEditando ? { ...z, coordenadas } : z))
  }, [zonaEditando, zonas, onChange])

  const agregarZona = () => {
    onChange([...zonas, defaultZona()])
    setZonaEditando(zonas.length)
  }

  const eliminarZona = (idx) => {
    onChange(zonas.filter((_, i) => i !== idx))
    if (zonaEditando === idx) setZonaEditando(null)
    else if (zonaEditando > idx) setZonaEditando(v => v - 1)
  }

  const cambiarZona = (idx, campo, valor) => {
    onChange(zonas.map((z, i) => i === idx ? { ...z, [campo]: valor } : z))
  }

  const zonaActual = zonaEditando !== null ? zonas[zonaEditando] : null

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-700 dark:text-gray-300">
        Configurá las zonas de delivery con sus costos, radio de cobertura y monto mínimo de pedido.
      </p>

      {/* Lista de zonas */}
      <div className="space-y-2">
        {zonas.map((rawZona, i) => {
          // Normalizar zona para compatibilidad con modelo anterior
          const zona = { ...defaultZona(), ...rawZona }
          return (
            <ZonaCard
              key={i}
              zona={zona}
              idx={i}
              zonaEditando={zonaEditando}
              onEdit={setZonaEditando}
              onDelete={eliminarZona}
              onChange={cambiarZona}
              onPolygonComplete={handlePolygonComplete}
            />
          )
        })}
      </div>

      <button
        onClick={agregarZona}
        className="flex items-center gap-2 px-4 py-2.5 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl text-sm text-gray-700 dark:text-gray-300 hover:border-violet-400 hover:text-violet-600 dark:hover:text-violet-400 transition-colors w-full justify-center"
      >
        + Agregar zona de entrega
      </button>

      {/* Mapa — solo si hay zonas */}
      {zonas.length > 0 && (
        <div className="rounded-2xl overflow-hidden border border-gray-300 dark:border-gray-700" style={{ height: 400 }}>
          <MapContainer center={centroDefault} zoom={12} style={{ height: '100%', width: '100%' }}>
            <MapCenterUpdater coords={negocioCoords} />
            <TileLayer
              attribution='&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
              url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
              subdomains="abcd"
            />

            {/* Zonas */}
            {zonas.map((rawZona, idx) => {
              const zona = { ...defaultZona(), ...rawZona }
              const color = COLORES_ZONA[idx % COLORES_ZONA.length]
              const isEditing = zonaEditando === idx

              if (zona.tipo === 'radio' && negocioCoords && zona.radioKm > 0) {
                return (
                  <Circle
                    key={`circle-${idx}`}
                    center={[negocioCoords.lat, negocioCoords.lng]}
                    radius={zona.radioKm * 1000}
                    pathOptions={{
                      color,
                      fillColor: color,
                      fillOpacity: isEditing ? 0.25 : 0.12,
                      weight: isEditing ? 3 : 2,
                      dashArray: isEditing ? undefined : '6 4',
                    }}
                  >
                    <Tooltip sticky>
                      <div style={{ fontFamily: 'system-ui,sans-serif', padding: '4px 2px' }}>
                        <p style={{ fontWeight: 700, fontSize: 13, color, margin: 0 }}>
                          {zona.nombre || `Zona ${idx + 1}`}
                        </p>
                        <p style={{ fontSize: 12, color: '#555', margin: '2px 0 0' }}>Radio: {zona.radioKm} km</p>
                        <p style={{ fontSize: 12, color: '#555', margin: '2px 0 0' }}>
                          {zona.tipoCosto === 'fijo'
                            ? `Envío: $${Number(zona.costo || 0).toLocaleString('es-AR')}`
                            : `$${Number(zona.precioPorKm || 0).toLocaleString('es-AR')}/km`}
                        </p>
                      </div>
                    </Tooltip>
                  </Circle>
                )
              }

              if (zona.tipo === 'poligono' && zona.coordenadas?.length >= 3) {
                return (
                  <Polygon
                    key={`poly-${idx}`}
                    positions={zona.coordenadas.map(c => [c.lat, c.lng])}
                    pathOptions={{
                      color,
                      fillColor: color,
                      fillOpacity: isEditing ? 0.3 : 0.15,
                      weight: isEditing ? 3 : 2,
                      dashArray: isEditing ? undefined : '6 4',
                    }}
                  >
                    <Tooltip sticky>
                      <div style={{ fontFamily: 'system-ui,sans-serif', padding: '4px 2px' }}>
                        <p style={{ fontWeight: 700, fontSize: 13, color, margin: 0 }}>
                          {zona.nombre || `Zona ${idx + 1}`}
                        </p>
                        <p style={{ fontSize: 12, color: '#555', margin: '2px 0 0' }}>
                          {zona.tipoCosto === 'fijo'
                            ? `Envío: $${Number(zona.costo || 0).toLocaleString('es-AR')}`
                            : `$${Number(zona.precioPorKm || 0).toLocaleString('es-AR')}/km`}
                        </p>
                      </div>
                    </Tooltip>
                  </Polygon>
                )
              }

              return null
            })}

            {/* Pin del negocio */}
            {negocioCoords && (
              <Marker position={[negocioCoords.lat, negocioCoords.lng]} icon={iconoNegocio}>
                <Popup>
                  <div style={{ fontFamily: 'system-ui,sans-serif' }}>
                    <p style={{ fontWeight: 700, marginBottom: 2 }}>📍 Tu negocio</p>
                    {negocio?.direccion && <p style={{ fontSize: 12, color: '#555' }}>{negocio.direccion}</p>}
                    {negocio?.ciudad && <p style={{ fontSize: 12, color: '#555' }}>{negocio.ciudad}</p>}
                  </div>
                </Popup>
              </Marker>
            )}

            {/* Control de dibujo (solo polígono en edición) */}
            {zonaActual?.tipo === 'poligono' && zonaEditando !== null && (
              <DrawControl onPolygonComplete={handlePolygonComplete} />
            )}
          </MapContainer>
        </div>
      )}

      {zonas.length > 0 && (
        <p className="text-xs text-gray-600 dark:text-gray-400">
          💡 Los clientes ven el nombre y costo de cada zona al hacer su pedido. El área es solo para tu referencia visual.
        </p>
      )}
    </div>
  )
}
