// Mapa de pedidos a pantalla completa, pensado para un segundo monitor:
// los repartidores ven los deliveries en vivo sin interrumpir la venta.
import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useSocket } from '../../hooks/useSocket'
import api from '../../api/axios'
import MapaPedidos from '../../components/MapaPedidos'

export default function MapaVivo() {
  const { getNegocioId } = useAuth()
  const negocioId = getNegocioId()

  const [negocio, setNegocio] = useState(null)
  const [pedidos, setPedidos] = useState([])
  const [hora, setHora] = useState(new Date())

  useEffect(() => {
    if (!negocioId) return
    api.get(`/negocios/${negocioId}`)
      .then(({ data }) => setNegocio(data.negocio || null))
      .catch(() => {})
  }, [negocioId])

  const cargarPedidos = useCallback(() => {
    if (!negocioId) return
    api.get(`/negocios/${negocioId}/pedidos?estado=nuevo,en_preparacion,listo,en_camino`)
      .then(({ data }) => setPedidos((data.pedidos || []).filter(p => p.modalidad === 'delivery')))
      .catch(() => {})
  }, [negocioId])

  useEffect(() => { cargarPedidos() }, [cargarPedidos])
  useEffect(() => {
    const i = setInterval(cargarPedidos, 20000)
    const t = setInterval(() => setHora(new Date()), 30000)
    return () => { clearInterval(i); clearInterval(t) }
  }, [cargarPedidos])
  useSocket(negocioId, cargarPedidos, cargarPedidos)

  return (
    <div className="h-screen w-screen overflow-hidden relative bg-gray-900">
      {/* Barra flotante minima */}
      <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none" style={{ zIndex: 500 }}>
        <div className="flex items-center gap-2 px-4 py-2 rounded-xl shadow-lg pointer-events-auto"
          style={{ background: 'rgba(17,17,24,0.85)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.1)' }}>
          <span className="text-base">🗺️</span>
          <div>
            <p className="text-white text-sm font-bold leading-tight">Mapa de pedidos {negocio?.nombre ? `· ${negocio.nombre}` : ''}</p>
            <p className="text-[11px] text-gray-400 leading-tight">
              {pedidos.length} delivery activo{pedidos.length !== 1 ? 's' : ''} · {hora.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })} · se actualiza solo
            </p>
          </div>
        </div>
        <button onClick={() => window.close()}
          title="Cerrar ventana"
          className="w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-lg pointer-events-auto"
          style={{ background: 'rgba(17,17,24,0.85)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.1)' }}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="h-full w-full">
        {negocio && <MapaPedidos pedidos={pedidos} negocio={negocio} />}
      </div>
    </div>
  )
}
