// Mini-mapa embebido con un pin arrastrable, para confirmar/ajustar la
// ubicación exacta de una dirección geocodificada (panel de pedidos).
import { useState, useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet'
import L from 'leaflet'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

const iconoPin = L.divIcon({
  className: '',
  html: `<div style="width:30px;height:30px;background:#7c3aed;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid white;box-shadow:0 2px 10px rgba(0,0,0,0.45)"></div>`,
  iconSize: [30, 30],
  iconAnchor: [15, 30],
})

function MapClickMover({ onChange }) {
  useMapEvents({
    click(e) { onChange({ lat: e.latlng.lat, lng: e.latlng.lng }) }
  })
  return null
}

// Recentra el mapa cuando cambian las coords desde afuera (nueva búsqueda)
function Recentrar({ coords }) {
  const map = useMap()
  useEffect(() => {
    if (coords) map.setView([coords.lat, coords.lng], map.getZoom())
  }, [coords, map])
  return null
}

export default function MiniMapaPin({ coords, onChange, height = 220 }) {
  const [dirDetectada, setDirDetectada] = useState('')
  const [buscando, setBuscando] = useState(false)
  const markerRef = useRef(null)

  // Reverse geocoding al mover el pin (vía proxy del backend)
  useEffect(() => {
    if (!coords) return
    setBuscando(true)
    const timeout = setTimeout(async () => {
      try {
        const res = await fetch(`/api/maps/reverse?lat=${coords.lat}&lng=${coords.lng}`)
        const data = await res.json()
        setDirDetectada(data?.direccion || '')
      } catch { /* sin detección */ }
      setBuscando(false)
    }, 600)
    return () => clearTimeout(timeout)
  }, [coords])

  if (!coords) return null

  return (
    <div className="rounded-xl overflow-hidden border border-gray-300 dark:border-gray-700">
      <MapContainer
        center={[coords.lat, coords.lng]}
        zoom={17}
        style={{ height, width: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap" />
        <Recentrar coords={coords} />
        <MapClickMover onChange={onChange} />
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
      </MapContainer>
      <div className="px-3 py-2 bg-gray-50 dark:bg-gray-900 text-xs text-gray-600 dark:text-gray-400 flex items-center gap-2">
        {buscando ? (
          <span>Detectando dirección…</span>
        ) : dirDetectada ? (
          <span>📍 <b>Detectado:</b> {dirDetectada}</span>
        ) : (
          <span>Arrastrá el pin o tocá el mapa para ajustar la ubicación exacta</span>
        )}
      </div>
    </div>
  )
}
