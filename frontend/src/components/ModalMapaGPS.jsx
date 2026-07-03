import { useState, useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet'
import L from 'leaflet'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

const iconoPin = L.divIcon({
  className: '',
  html: `<div style="width:36px;height:36px;background:#7c3aed;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid white;box-shadow:0 2px 12px rgba(0,0,0,0.5)"></div>`,
  iconSize: [36, 36],
  iconAnchor: [18, 36],
})

// Mueve el mapa al hacer click (alternativa al drag)
function MapClickMover({ onChange }) {
  useMapEvents({
    click(e) {
      onChange({ lat: e.latlng.lat, lng: e.latlng.lng })
    }
  })
  return null
}

function PinArrastrable({ coords, onChange }) {
  const markerRef = useRef(null)

  useEffect(() => {
    if (markerRef.current) markerRef.current.setLatLng([coords.lat, coords.lng])
  }, [coords])

  return (
    <Marker
      position={[coords.lat, coords.lng]}
      draggable={true}
      ref={markerRef}
      icon={iconoPin}
      eventHandlers={{
        dragend: (e) => {
          const { lat, lng } = e.target.getLatLng()
          onChange({ lat, lng })
        }
      }}
    />
  )
}

export default function ModalMapaGPS({ coords, direccionInicial = '', onConfirm, onClose, dark = false, color = '#7c3aed' }) {
  const [pinCoords, setPinCoords] = useState(coords)
  const [buscandoDireccion, setBuscandoDireccion] = useState(false)
  const [dirDetectada, setDirDetectada] = useState('')
  const [dirManual, setDirManual] = useState(direccionInicial)

  // Geocodificación inversa cuando el pin se mueve
  useEffect(() => {
    if (!pinCoords) return
    setBuscandoDireccion(true)
    const timeout = setTimeout(async () => {
      try {
        // Reverse geocoding vía el proxy del backend (TomTom con fallback OSM)
        const resReverse = await fetch(`/api/maps/reverse?lat=${pinCoords.lat}&lng=${pinCoords.lng}`)
        const data = await resReverse.json()
        if (data?.direccion || data?.calle) {
          setDirDetectada([data.calle || data.direccion, data.localidad].filter(Boolean).join(' — '))
        }
      } catch { /* sin detección */ }
      setBuscandoDireccion(false)
    }, 600)
    return () => clearTimeout(timeout)
  }, [pinCoords])

  const bg = dark ? '#1c1c1e' : 'white'
  const border = dark ? '#3c3c3e' : '#e5e7eb'
  const titulo = dark ? 'white' : '#111827'
  const sub = dark ? '#8e8e93' : '#6b7280'
  const cancelBorder = dark ? '#3c3c3e' : '#d1d5db'
  const cancelColor = dark ? '#9ca3af' : '#4b5563'

  return (
    // backdrop — NO cierra al hacer click (sin onClick)
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)' }}>

      {/* Modal — stopPropagation para que clicks internos no lleguen al backdrop */}
      <div
        className="w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl flex flex-col"
        style={{ background: bg, maxHeight: '90vh' }}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="px-5 py-4" style={{ borderBottom: `1px solid ${border}` }}>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-bold text-base" style={{ color: titulo }}>Confirmá tu ubicación</h3>
              <p className="text-xs mt-0.5" style={{ color: sub }}>
                Arrastrá el pin o tocá el mapa
              </p>
            </div>
            <button
              onClick={onClose}
              style={{ color: sub, fontSize: 26, lineHeight: 1, background: 'none', border: 'none', cursor: 'pointer' }}>
              ×
            </button>
          </div>
          
          {/* Input dirección manual */}
          <input
            type="text"
            value={dirManual}
            onChange={e => setDirManual(e.target.value)}
            placeholder="Escribí tu dirección (calle y número)"
            className="w-full px-3 py-2.5 rounded-lg text-sm"
            style={{
              background: dark ? '#2c2c2e' : '#f3f4f6',
              border: `1px solid ${border}`,
              color: titulo,
              outline: 'none'
            }}
          />
        </div>

        {/* Mapa */}
        <div style={{ height: 320, position: 'relative' }}>
          <MapContainer
            center={[pinCoords.lat, pinCoords.lng]}
            zoom={17}
            style={{ height: '100%', width: '100%' }}
            zoomControl={true}>
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='© OpenStreetMap'
            />
            <MapClickMover onChange={setPinCoords} />
            <PinArrastrable coords={pinCoords} onChange={setPinCoords} />
          </MapContainer>

          {/* Instrucción flotante */}
          <div
            className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap"
            style={{ background: 'rgba(0,0,0,0.65)', color: 'white', pointerEvents: 'none' }}>
            📌 Arrastrá el pin o tocá el mapa
          </div>
        </div>

        {/* Preview dirección detectada */}
        <div className="px-4 py-2.5" style={{ borderTop: `1px solid ${border}`, minHeight: 38 }}>
          {buscandoDireccion
            ? <p className="text-xs" style={{ color: sub }}>Detectando dirección...</p>
            : dirDetectada
              ? <p className="text-xs font-medium" style={{ color: titulo }}>📍 Detectado: {dirDetectada}</p>
              : <p className="text-xs" style={{ color: sub }}>Mové el pin para detectar la dirección</p>
          }
        </div>

        {/* Footer */}
        <div className="p-4 pt-2 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl text-sm font-semibold"
            style={{ border: `1px solid ${cancelBorder}`, color: cancelColor, background: 'transparent' }}>
            Cancelar
          </button>
          <button
            onClick={() => onConfirm(pinCoords, dirDetectada, dirManual)}
            className="flex-1 py-3 rounded-xl text-sm font-bold text-white"
            style={{ background: color }}>
            ✓ Confirmar ubicación
          </button>
        </div>

        <p className="text-center text-xs pb-3 px-4" style={{ color: sub }}>
          La dirección escrita se usará para el pedido. La ubicación GPS es para el repartidor.
        </p>
      </div>
    </div>
  )
}
