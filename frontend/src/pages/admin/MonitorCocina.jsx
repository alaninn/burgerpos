import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../context/AuthContext'
import api from '../../api/axios'
import toast from 'react-hot-toast'
import { useSocket } from '../../hooks/useSocket'

const ESTADO_LABEL = {
  nuevo: 'Nuevo', en_preparacion: 'En preparación', listo: 'Listo', en_camino: 'En camino'
}
const NEXT = { nuevo: 'en_preparacion', en_preparacion: 'listo', listo: 'en_camino' }
const PREV = { en_preparacion: 'nuevo', listo: 'en_preparacion', en_camino: 'listo' }
const PREV_LABEL = { en_preparacion: '← Nuevo', listo: '← En prep.', en_camino: '← Listo' }
const NEXT_LABEL = { nuevo: 'Iniciar', en_preparacion: 'Listo', listo: 'Entregar' }
const ESTADO_BG = {
  nuevo: 'bg-blue-500', en_preparacion: 'bg-yellow-500', listo: 'bg-green-500'
}

function tiempoTranscurrido(fecha) {
  const mins = Math.floor((Date.now() - new Date(fecha)) / 60000)
  if (mins < 60) return `${mins}m`
  return `${Math.floor(mins / 60)}h ${mins % 60}m`
}

function KDSCard({ pedido, onUpdate }) {
  const [loading, setLoading] = useState(false)
  const next = NEXT[pedido.estado]
  const prev = PREV[pedido.estado]

  const cambiarEstado = async (nuevoEstado) => {
    setLoading(true)
    try {
      await api.put(`/negocios/${pedido.negocioId}/pedidos/${pedido.id}`, { estado: nuevoEstado })
      onUpdate()
      toast.success(`→ ${ESTADO_LABEL[nuevoEstado]}`)
    } catch { toast.error('Error') }
    finally { setLoading(false) }
  }

  const mins = Math.floor((Date.now() - new Date(pedido.createdAt)) / 60000)
  const urgente = mins > 20

  const headerBg = pedido.estado === 'nuevo' ? 'bg-blue-500'
    : pedido.estado === 'en_preparacion' ? 'bg-yellow-500'
    : 'bg-green-500'

  const borderColor = urgente && pedido.estado === 'nuevo' ? 'border-red-400 shadow-red-100'
    : pedido.estado === 'en_preparacion' ? 'border-yellow-300'
    : pedido.estado === 'listo' ? 'border-green-300'
    : 'border-gray-200 dark:border-gray-700'

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-2xl shadow-sm border-2 flex flex-col overflow-hidden ${borderColor}`}>
      {/* Header */}
      <div className={`px-4 py-3 flex items-center justify-between ${headerBg}`}>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-white font-black text-xl">N°{pedido.numero}</span>
          <span className="bg-white/20 text-white text-xs px-2 py-0.5 rounded-full font-medium">
            {pedido.modalidad === 'delivery' ? '🛵 Delivery' : pedido.modalidad === 'takeaway' ? '🥡 Take Away' : '🍽 Salón'}
          </span>
          {pedido.clienteNombre && (
            <span className="bg-white/20 text-white text-xs px-2 py-0.5 rounded-full font-medium truncate max-w-[120px]">
              👤 {pedido.clienteNombre}
            </span>
          )}
        </div>
        <div className={`flex items-center gap-1 text-white text-sm font-bold flex-shrink-0 ${urgente && pedido.estado === 'nuevo' ? 'animate-pulse' : ''}`}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {tiempoTranscurrido(pedido.createdAt)}
        </div>
      </div>

      {/* Notas del pedido */}
      {pedido.notas && (
        <div className="mx-4 mt-3 px-3 py-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <p className="text-xs font-bold text-yellow-800 dark:text-yellow-400">📝 Nota del pedido</p>
          <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-0.5">{pedido.notas}</p>
        </div>
      )}

      {/* Dirección delivery */}
      {pedido.modalidad === 'delivery' && pedido.clienteDireccion && (
        <div className="mx-4 mt-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <p className="text-xs text-blue-700 dark:text-blue-400">🏠 {pedido.clienteDireccion}</p>
        </div>
      )}

      {/* Items — detalle completo */}
      <div className="flex-1 px-4 pt-3 pb-2 space-y-3">
        {pedido.items?.map((item, i) => (
          <div key={i} className="border-b border-gray-100 dark:border-gray-700 pb-2 last:border-0 last:pb-0">
            {/* Nombre + cantidad */}
            <div className="flex items-start gap-2">
              <span className="w-7 h-7 bg-gray-900 dark:bg-gray-200 text-white dark:text-gray-900 text-sm font-black rounded-lg flex items-center justify-center flex-shrink-0">
                {item.cantidad}
              </span>
              <p className="font-bold text-gray-900 dark:text-gray-100 text-base leading-tight">{item.nombre}</p>
            </div>
            {/* Variante */}
            {item.varianteNombre && (
              <p className="text-sm text-gray-700 dark:text-gray-300 ml-9 mt-0.5 font-medium">
                → {item.varianteNombre}
              </p>
            )}
            {/* Adicionales agrupados */}
            {item.adicionales?.length > 0 && (() => {
              const grupos = {}
              item.adicionales.forEach(a => {
                const k = a.grupoTitulo || 'Adicionales'
                if (!grupos[k]) grupos[k] = []
                grupos[k].push(a)
              })
              return Object.entries(grupos).map(([titulo, items]) => (
                <div key={titulo} className="ml-9 mt-1">
                  <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{titulo}</p>
                  {items.map((a, j) => (
                    <p key={j} className="text-sm text-gray-700 dark:text-gray-300">
                      • {a.nombre}{a.cantidad > 1 ? ` ×${a.cantidad}` : ''}
                    </p>
                  ))}
                </div>
              ))
            })()}
            {/* Notas del item */}
            {item.notas && (
              <p className="text-sm text-amber-600 dark:text-amber-400 ml-9 mt-1 italic">
                📝 {item.notas}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Acciones: volver + avanzar */}
      <div className={`px-4 pb-4 flex gap-2 ${prev ? '' : ''}`}>
        {prev && (
          <button onClick={() => cambiarEstado(prev)} disabled={loading}
            className="flex-shrink-0 px-3 py-2.5 rounded-xl border-2 border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 text-xs font-bold hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-40"
            title={`Volver a ${ESTADO_LABEL[prev]}`}>
            ←
          </button>
        )}
        {next && (
          <button onClick={() => cambiarEstado(next)} disabled={loading}
            className={`flex-1 py-2.5 rounded-xl text-white font-bold text-sm transition-all active:scale-95 disabled:opacity-50 ${
              pedido.estado === 'nuevo' ? 'bg-blue-500 hover:bg-blue-600'
              : pedido.estado === 'en_preparacion' ? 'bg-yellow-500 hover:bg-yellow-600'
              : 'bg-green-500 hover:bg-green-600'
            }`}>
            {loading ? '...' : `→ ${NEXT_LABEL[pedido.estado]}`}
          </button>
        )}
      </div>
    </div>
  )
}

export default function MonitorCocina() {
  const { usuario } = useAuth()
  const negocioId = usuario?.negocioId
  const [pedidos, setPedidos] = useState([])
  const [loading, setLoading] = useState(true)
  const [pantallaCocina, setPantallaCocina] = useState(false)

  const cargar = useCallback(() => {
    if (!negocioId) return
    api.get(`/negocios/${negocioId}/pedidos?estado=nuevo,en_preparacion,listo`)
      .then(({ data }) => {
        setPedidos(data.pedidos || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [negocioId])

  useEffect(() => { cargar() }, [cargar])

  // Socket.io en tiempo real
  useSocket(negocioId, () => {
    cargar()
    // Sonido de notificación visual
    if (pantallaCocina) {
      document.title = '🔔 NUEVO PEDIDO - Cocina'
      setTimeout(() => { document.title = 'Monitor de Cocina' }, 3000)
    }
  }, cargar)

  // Fallback polling cada 30s
  useEffect(() => {
    const i = setInterval(cargar, 30000)
    return () => clearInterval(i)
  }, [cargar])

  const nuevos = pedidos.filter(p => p.estado === 'nuevo')
  const enPrep = pedidos.filter(p => p.estado === 'en_preparacion')
  const listos = pedidos.filter(p => p.estado === 'listo')

  if (pantallaCocina) {
    return (
      <div className="fixed inset-0 bg-gray-950 z-50 overflow-y-auto p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <h1 className="text-white text-2xl font-bold">Monitor de Cocina</h1>
            <div className="flex gap-3 text-sm">
              <span className="bg-blue-500 text-white px-3 py-1 rounded-full font-medium">{nuevos.length} Nuevos</span>
              <span className="bg-yellow-500 text-white px-3 py-1 rounded-full font-medium">{enPrep.length} En prep.</span>
              <span className="bg-green-500 text-white px-3 py-1 rounded-full font-medium">{listos.length} Listos</span>
            </div>
          </div>
          <button onClick={() => setPantallaCocina(false)}
            className="text-gray-600 dark:text-gray-400 hover:text-white text-sm px-4 py-2 border border-gray-700 rounded-lg transition-colors">
            Salir de pantalla completa
          </button>
        </div>

        {pedidos.length === 0 ? (
          <div className="flex items-center justify-center h-96 text-gray-600 dark:text-gray-300 text-center">
            <div>
              <div className="text-6xl mb-4">👨‍🍳</div>
              <p className="text-xl">No hay pedidos activos</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-4">
            {/* Columna Nuevos */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-3 h-3 rounded-full bg-blue-500" />
                <span className="text-white font-semibold">Nuevos ({nuevos.length})</span>
              </div>
              <div className="space-y-3">
                {nuevos.map(p => <KDSCard key={p.id} pedido={p} onUpdate={cargar} />)}
              </div>
            </div>
            {/* Columna En preparación */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <span className="text-white font-semibold">En preparación ({enPrep.length})</span>
              </div>
              <div className="space-y-3">
                {enPrep.map(p => <KDSCard key={p.id} pedido={p} onUpdate={cargar} />)}
              </div>
            </div>
            {/* Columna Listos */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span className="text-white font-semibold">Listos ({listos.length})</span>
              </div>
              <div className="space-y-3">
                {listos.map(p => <KDSCard key={p.id} pedido={p} onUpdate={cargar} />)}
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Monitor de Cocina</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">KDS — Kitchen Display System</p>
        </div>
        <button onClick={() => setPantallaCocina(true)}
          className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg text-sm font-medium hover:bg-violet-700 transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
          Pantalla completa
        </button>
      </div>

      {/* Stats rápidas */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Nuevos', count: nuevos.length, color: 'bg-blue-500', bg: 'bg-blue-50 border-blue-200' },
          { label: 'En preparación', count: enPrep.length, color: 'bg-yellow-500', bg: 'bg-yellow-50 border-yellow-200' },
          { label: 'Listos', count: listos.length, color: 'bg-green-500', bg: 'bg-green-50 border-green-200' },
        ].map(s => (
          <div key={s.label} className={`border rounded-xl p-4 ${s.bg} flex items-center gap-4`}>
            <div className={`w-10 h-10 ${s.color} rounded-xl flex items-center justify-center`}>
              <span className="text-white text-xl font-bold">{s.count}</span>
            </div>
            <span className="font-medium text-gray-700 dark:text-gray-300">{s.label}</span>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : pedidos.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-16 text-center text-gray-600 dark:text-gray-400">
          <div className="text-5xl mb-3">👨‍🍳</div>
          <p className="font-medium text-gray-700 dark:text-gray-300">No hay pedidos activos</p>
          <p className="text-sm mt-1">Los nuevos pedidos aparecerán aquí automáticamente</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-3">
            <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Nuevos</p>
            {nuevos.map(p => <KDSCard key={p.id} pedido={p} onUpdate={cargar} />)}
            {nuevos.length === 0 && <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">—</p>}
          </div>
          <div className="space-y-3">
            <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">En preparación</p>
            {enPrep.map(p => <KDSCard key={p.id} pedido={p} onUpdate={cargar} />)}
            {enPrep.length === 0 && <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">—</p>}
          </div>
          <div className="space-y-3">
            <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Listos</p>
            {listos.map(p => <KDSCard key={p.id} pedido={p} onUpdate={cargar} />)}
            {listos.length === 0 && <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">—</p>}
          </div>
        </div>
      )}
    </div>
  )
}
