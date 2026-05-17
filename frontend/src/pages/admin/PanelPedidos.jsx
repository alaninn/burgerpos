import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import api from '../../api/axios'
import toast from 'react-hot-toast'
import { useSocket } from '../../hooks/useSocket'
import MapaPedidos from '../../components/MapaPedidos'
import ModalDetallePedido from '../../components/ModalDetallePedido'
import EditorPedido from './EditorPedido'

const ESTADO_LABEL = {
  nuevo: 'Nuevo', en_preparacion: 'En preparación',
  listo: 'Listo', en_camino: 'En camino',
  entregado: 'Entregado', cancelado: 'Cancelado',
}
const NEXT_ESTADO = {
  nuevo: 'en_preparacion', en_preparacion: 'listo',
  listo: 'en_camino', en_camino: 'entregado',
}
const MODALIDAD_LABEL = { delivery: 'Delivery', takeaway: 'Take Away', salon: 'Salón' }
const MODALIDAD_COLOR = {
  delivery: { bg: '#fff3e0', text: '#e65100', dot: '#f57c00' },
  takeaway: { bg: '#e3f2fd', text: '#1565c0', dot: '#1976d2' },
  salon: { bg: '#e8f5e9', text: '#2e7d32', dot: '#388e3c' },
}
const STATE_CONFIG = {
  nuevo:          { color: '#ef4444', bg: '#fef2f2', label: 'Nuevos',         dot: 'bg-red-500',    icon: '🔔' },
  en_preparacion: { color: '#f59e0b', bg: '#fffbeb', label: 'En preparación', dot: 'bg-amber-500',  icon: '👨‍🍳' },
  listo:          { color: '#22c55e', bg: '#f0fdf4', label: 'Listos',         dot: 'bg-green-500',  icon: '✅' },
  en_camino:      { color: '#3b82f6', bg: '#eff6ff', label: 'En camino',      dot: 'bg-blue-500',   icon: '🚴' },
}

function fmt(n) { return Number(n || 0).toLocaleString('es-AR') }
const esCobrado = (p) => p.cobrado === true || !['efectivo', 'efectivo_sin_descuento'].includes(p.metodoPago)

// ─── Comanda de impresión ─────────────────────────────────
function generarComanda(pedido) {
  const win = window.open('', '_blank', 'width=400,height=600')
  win.document.write(`<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: 'Courier New', monospace; font-size: 13px; padding: 16px; max-width: 380px; }
  .center { text-align: center; }
  .bold { font-weight: bold; }
  .sep { border-top: 1px dashed #000; margin: 8px 0; }
  .row { display: flex; justify-content: space-between; margin: 2px 0; }
  .sub { font-size: 11px; color: #444; margin-left: 12px; }
  @media print { body { padding: 0; } }
</style></head><body>
<div class="center bold" style="font-size:18px;margin-bottom:2px;">COMANDA</div>
<div class="sep"></div>
<div class="row"><span class="bold">N°${pedido.numero}</span><span>${pedido.modalidad === 'delivery' ? 'Delivery' : pedido.modalidad === 'takeaway' ? 'Take Away' : 'Salón'}</span></div>
<div class="row"><span>Cliente:</span><span>${pedido.clienteNombre || '—'}</span></div>
<div class="row"><span>Hora:</span><span>${new Date(pedido.createdAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}</span></div>
<div class="sep"></div>
${pedido.items?.map(item => `
  <div class="row"><span class="bold">${item.cantidad}x ${item.nombre}</span></div>
  ${item.varianteNombre ? `<div class="sub">→ ${item.varianteNombre}</div>` : ''}
  ${(item.adicionales || []).map(a => `<div class="sub">+ ${a.nombre}</div>`).join('')}
  ${item.notas ? `<div class="sub">📝 ${item.notas}</div>` : ''}
`).join('')}
<div class="sep"></div>
<div class="center" style="font-size:11px;">¡Gracias!</div>
</body></html>`)
  win.document.close()
  setTimeout(() => { win.print(); win.close() }, 200)
}

// ─── Tarjeta premium de pedido ────────────────────────────
function PedidoCard({ pedido, onUpdate, onClick }) {
  const [loading, setLoading] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [tiempoConfirmar, setTiempoConfirmar] = useState(15)

  const esNuevo = pedido.estado === 'nuevo'
  const minutos = Math.floor((Date.now() - new Date(pedido.createdAt)) / 60000)
  const tiempoEstimado = pedido.tiempoEstimado || 30
  const pct = Math.min(100, Math.round((minutos / tiempoEstimado) * 100))

  let timeColor = '#22c55e'
  if (pct >= 100) timeColor = '#ef4444'
  else if (pct >= 70) timeColor = '#f59e0b'

  const stateConf = STATE_CONFIG[pedido.estado] || STATE_CONFIG.nuevo
  const modColor = MODALIDAD_COLOR[pedido.modalidad] || MODALIDAD_COLOR.delivery

  const confirmarPedido = async (e) => {
    e.stopPropagation()
    setLoading(true)
    try {
      await api.patch(`/negocios/${pedido.negocioId}/pedidos/${pedido.id}/estado`, { estado: 'en_preparacion', tiempoEstimado: tiempoConfirmar })
      setShowConfirm(false)
      onUpdate()
      toast.success('Pedido confirmado')
    } catch { toast.error('Error') } finally { setLoading(false) }
  }

  const avanzar = async (e, estadoForzado = null) => {
    e.stopPropagation()
    const next = estadoForzado || NEXT_ESTADO[pedido.estado]
    if (!next) return
    setLoading(true)
    try {
      const body = { estado: next }
      await api.patch(`/negocios/${pedido.negocioId}/pedidos/${pedido.id}/estado`, body)
      onUpdate()
      toast.success(`${ESTADO_LABEL[next]}`)
    } catch { toast.error('Error') } finally { setLoading(false) }
  }

  const itemsResumen = pedido.items?.slice(0, 3).map(i => `${i.cantidad}× ${i.nombre}`).join(' · ') +
    (pedido.items?.length > 3 ? ` +${pedido.items.length - 3} más` : '')

  return (
    <>
    <div onClick={onClick}
      className="group relative rounded-2xl cursor-pointer transition-all duration-200 hover:-translate-y-0.5 overflow-hidden"
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderLeft: `4px solid ${stateConf.color}`,
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
      }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.12)'; e.currentTarget.style.borderColor = stateConf.color }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.06)'; e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.borderLeftColor = stateConf.color }}>

      {/* Barra de progreso tiempo */}
      <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: 'var(--border)' }}>
        <div className="h-full transition-all duration-1000" style={{ width: `${pct}%`, background: timeColor }} />
      </div>

      {/* Header */}
      <div className="px-4 pt-3.5 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="text-base font-black" style={{ color: 'var(--text-primary)' }}>#{pedido.numero}</span>
          <span className="text-xs font-bold px-2 py-0.5 rounded-full"
            style={{ background: modColor.bg, color: modColor.text }}>
            <span className="inline-block w-1.5 h-1.5 rounded-full mr-1 align-middle" style={{ background: modColor.dot }} />
            {MODALIDAD_LABEL[pedido.modalidad]}
          </span>
          {esNuevo && (
            <span className="text-xs font-black px-2 py-0.5 rounded-full bg-red-500 text-white animate-pulse tracking-wide">
              NUEVO
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: timeColor }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm font-black tabular-nums" style={{ color: timeColor }}>{minutos}m</span>
          </div>
          <button onClick={e => { e.stopPropagation(); generarComanda(pedido) }}
            className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-gray-100 transition-all"
            title="Imprimir comanda">
            <svg className="w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Cliente */}
      <div className="px-4 pb-1.5">
        <p className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>{pedido.clienteNombre || '—'}</p>
        {pedido.modalidad === 'delivery' && pedido.clienteDireccion && (
          <p className="text-xs truncate mt-0.5" style={{ color: 'var(--text-muted)', maxWidth: '95%' }}>
            📍 {pedido.clienteDireccion}
          </p>
        )}
      </div>

      {/* Items */}
      {itemsResumen && (
        <div className="px-4 pb-2.5">
          <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{itemsResumen}</p>
        </div>
      )}

      {/* Footer */}
      <div className="px-4 py-2.5 flex items-center justify-between"
        style={{ borderTop: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2">
          <span className="font-black text-base" style={{ color: 'var(--text-primary)' }}>${fmt(pedido.total)}</span>
          {!esCobrado(pedido)
            ? <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-100 animate-pulse">
                Sin cobrar
              </span>
            : <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-100">
                Cobrado
              </span>
          }
        </div>

        {/* Acciones */}
        <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
          {esNuevo && (
            <button onClick={(e) => { e.stopPropagation(); setShowConfirm(true) }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white transition-all hover:opacity-90 active:scale-95"
              style={{ background: stateConf.color }}>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
              Confirmar
            </button>
          )}
          {!esNuevo && (() => {
            const next = NEXT_ESTADO[pedido.estado]
            if (!next) return null
            const isEntrega = pedido.modalidad !== 'delivery' && next === 'en_camino'
            return (
              <button
                onClick={(e) => isEntrega ? avanzar(e, 'entregado') : avanzar(e)}
                disabled={loading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white transition-all hover:opacity-90 active:scale-95 disabled:opacity-40"
                style={{ background: isEntrega ? '#22c55e' : stateConf.color }}>
                {loading
                  ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : isEntrega ? 'Entregar' : next === 'listo' ? 'Listo' : 'Siguiente'
                }
                {!loading && (
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                  </svg>
                )}
              </button>
            )
          })()}
        </div>
      </div>
    </div>

    {/* Modal confirmar con tiempo */}
    {showConfirm && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: 'rgba(0,0,0,0.5)' }} onClick={() => setShowConfirm(false)}>
        <div className="rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden" style={{ background: 'var(--bg-card)' }} onClick={e => e.stopPropagation()}>
          <div className="px-6 pt-6 pb-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{ background: '#fef2f2' }}>🔔</div>
              <div>
                <h3 className="font-black text-base" style={{ color: 'var(--text-primary)' }}>Pedido #{pedido.numero}</h3>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{pedido.clienteNombre}</p>
              </div>
            </div>
            <p className="text-sm font-semibold mb-3" style={{ color: 'var(--text-secondary)' }}>Tiempo estimado de preparación</p>
            <div className="grid grid-cols-3 gap-2 mb-3">
              {[5, 10, 15, 20, 30, 45].map(m => (
                <button key={m} onClick={() => setTiempoConfirmar(m)}
                  className="py-2.5 rounded-xl text-sm font-bold transition-all"
                  style={tiempoConfirmar === m
                    ? { background: '#ef4444', color: '#fff' }
                    : { background: 'var(--bg-secondary)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
                  {m} min
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>O ingresá manualmente:</span>
              <input
                type="number"
                min="1"
                max="180"
                value={tiempoConfirmar}
                onChange={(e) => setTiempoConfirmar(Math.max(1, Math.min(180, parseInt(e.target.value) || 15)))}
                className="flex-1 px-3 py-2 rounded-xl text-sm font-bold text-center"
                style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                placeholder="Minutos"
              />
            </div>
          </div>
          <div className="px-6 pb-6 flex gap-3">
            <button onClick={() => setShowConfirm(false)}
              className="flex-1 py-3 rounded-xl text-sm font-semibold transition-colors"
              style={{ color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
              Cancelar
            </button>
            <button onClick={confirmarPedido} disabled={loading}
              className="flex-1 py-3 rounded-xl text-sm font-black text-white transition-all hover:opacity-90 disabled:opacity-40"
              style={{ background: '#22c55e' }}>
              {loading ? '...' : 'Confirmar'}
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  )
}

// ─── Modal historial ──────────────────────────────────────
function HistorialModal({ negocioId, onClose }) {
  const [tab, setTab] = useState('entregado')
  const [pedidos, setPedidos] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    api.get(`/negocios/${negocioId}/pedidos?estado=${tab}`)
      .then(({ data }) => setPedidos(data.pedidos || []))
      .catch(() => setPedidos([]))
      .finally(() => setLoading(false))
  }, [negocioId, tab])

  const totalVentas = pedidos.reduce((s, p) => s + Number(p.total || 0), 0)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.5)' }} onClick={onClose}>
      <div className="rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden" style={{ background: 'var(--bg-card)' }} onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)' }}>
          <h3 className="font-black text-lg" style={{ color: 'var(--text-primary)' }}>Historial del día</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center transition-colors" style={{ background: 'var(--bg-hover)' }}>
            <svg className="w-4 h-4" style={{ color: 'var(--text-muted)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="flex px-6 gap-1" style={{ borderBottom: '1px solid var(--border)' }}>
          {[['entregado', '✅ Entregados'], ['cancelado', '❌ Cancelados']].map(([t, l]) => (
            <button key={t} onClick={() => setTab(t)}
              className="py-3.5 px-4 text-sm font-bold transition-all"
              style={tab === t
                ? { borderBottom: '2px solid #7c3aed', color: '#7c3aed', marginBottom: -1 }
                : { borderBottom: '2px solid transparent', color: '#9ca3af' }}>
              {l}
            </button>
          ))}
        </div>
        {!loading && pedidos.length > 0 && tab === 'entregado' && (
          <div className="px-6 py-3 flex items-center gap-3" style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}>
            <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>{pedidos.length} pedidos</span>
            <span className="w-1 h-1 rounded-full" style={{ background: 'var(--border)' }} />
            <span className="text-sm font-black" style={{ color: 'var(--text-primary)' }}>Total: ${fmt(totalVentas)}</span>
          </div>
        )}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-6 h-6 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : pedidos.length === 0 ? (
            <div className="text-center py-16" style={{ color: 'var(--text-muted)' }}>
              <div className="text-4xl mb-3">{tab === 'entregado' ? '📋' : '❌'}</div>
              <p className="text-sm font-medium">Sin pedidos {tab === 'entregado' ? 'entregados' : 'cancelados'} hoy</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead style={{ background: 'var(--bg-secondary)', position: 'sticky', top: 0 }}>
                <tr>
                  {['Pedido', 'Cliente', 'Total', 'Hora'].map(h => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pedidos.map((p, i) => (
                  <tr key={p.id} style={{ borderTop: i > 0 ? '1px solid var(--border)' : 'none' }}
                    className="transition-colors" onMouseEnter={e => e.currentTarget.style.background='var(--bg-hover)'} onMouseLeave={e => e.currentTarget.style.background=''}>
                    <td className="px-5 py-3">
                      <span className="font-black text-violet-600">#{p.numero}</span>
                      <span className="ml-2 text-xs" style={{ color: 'var(--text-muted)' }}>{MODALIDAD_LABEL[p.modalidad]}</span>
                    </td>
                    <td className="px-5 py-3 font-medium" style={{ color: 'var(--text-secondary)' }}>{p.clienteNombre || '—'}</td>
                    <td className="px-5 py-3 font-black" style={{ color: 'var(--text-primary)' }}>${fmt(p.total)}</td>
                    <td className="px-5 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                      {new Date(p.createdAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────
export default function PanelPedidos() {
  const { usuario, getNegocioId } = useAuth()
  const navigate = useNavigate()
  const negocioId = getNegocioId()
  const [pedidos, setPedidos] = useState([])
  const [filtroModalidad, setFiltroModalidad] = useState('todos')
  const [tabEstado, setTabEstado] = useState('nuevo')
  const [loading, setLoading] = useState(true)
  const [showOtros, setShowOtros] = useState(false)
  const [repartidores, setRepartidores] = useState([])
  const [showMapa, setShowMapa] = useState(true)
  const [negocio, setNegocio] = useState(null)
  const [pedidoDetalle, setPedidoDetalle] = useState(null)
  const [pedidoEditar, setPedidoEditar] = useState(null)
  const [showConfig, setShowConfig] = useState(false)
  const [showConfigMapa, setShowConfigMapa] = useState(false)
  const [mapaConfigTemp, setMapaConfigTemp] = useState(null)
  const [mapaConfigOriginal, setMapaConfigOriginal] = useState(null)
  const [guardandoMapa, setGuardandoMapa] = useState(false)
  const intervaloAlertaRef = useRef(null)

  // Lista de sonidos disponibles
  const SONIDOS_DISPONIBLES = [
    { id: 'default', nombre: 'Sonido 1', archivo: '/sounds/alert1.mp3' },
    { id: 'chime', nombre: 'Sonido 2', archivo: '/sounds/alert2.mp3' },
    { id: 'ding', nombre: 'Sonido 3', archivo: '/sounds/alert3.mp3' },
    { id: 'pop', nombre: 'Sonido 4', archivo: '/sounds/alert4.mp3' },
    { id: 'notify', nombre: 'Sonido 5', archivo: '/sounds/alert5.mp3' },
    { id: 'bell', nombre: 'Sonido 6', archivo: '/sounds/alert6.mp3' },
  ]

  // ✅ CONFIGURACIONES DEL PANEL DE PEDIDOS
  const [configPanel, setConfigPanel] = useState(() => {
    try {
      const saved = localStorage.getItem('panelPedidos_config')
      return saved ? JSON.parse(saved) : {
        // Sonidos
        sonidoNuevoPedido: true,
        sonidoAlertaTiempo: true,
        tiempoAlertaMinutos: 15,
        intervaloAlertaSegundos: 30,
        sonidoSeleccionado: 'default',
        volumen: 0.8,
        // Impresion
        tamanioPapel: 58,
        imprimirAutomatico: false,
        copiasImpresion: 1,
        imprimirDireccion: true,
        imprimirTelefono: true,
        cortarPapelAutomatico: true,
        // Mensajes
        mensajesAutomaticosEstado: true,
        preguntarAntesEnviarMensaje: true,
        enviarMensajePorEstado: {
          nuevo: true,
          confirmado: true,
          listo: true,
          encamino: true,
          entregado: true
        }
      }
    } catch {
      return {}
    }
  })

  // Funcion para reproducir sonido con diferentes tonos
  const reproducirSonido = (sonidoId = configPanel.sonidoSeleccionado) => {
    try {
      // Alertas sonoras fuertes para notificaciones de pedidos
      const sonidos = {
        default:  'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3',  // Alerta urgente
        chime:    'https://assets.mixkit.co/active_storage/sfx/2870/2870-preview.mp3',  // Alerta fuerte 1
        ding:     'https://assets.mixkit.co/active_storage/sfx/2875/2875-preview.mp3',  // 🔔 Campana de servicio
        pop:      'https://assets.mixkit.co/active_storage/sfx/2858/2858-preview.mp3',  // Alerta triple
        notify:   'https://assets.mixkit.co/active_storage/sfx/2866/2866-preview.mp3',  // Alerta digital
        bell:     'https://assets.mixkit.co/active_storage/sfx/2868/2868-preview.mp3',  // Timbre fuerte
      }

      const audio = new Audio(sonidos[sonidoId] || sonidos.default)
      audio.volume = Math.max(configPanel.volumen, 0.7)  // Mínimo 70% de volumen
      audio.play().catch(err => console.warn('Error reproduciendo sonido:', err))
    } catch (e) {
      console.warn('Error inicializando audio:', e)
    }
  }

  useEffect(() => {
    localStorage.setItem('panelPedidos_config', JSON.stringify(configPanel))
  }, [configPanel])

  useEffect(() => {
    if (!negocioId) return
    api.get(`/negocios/${negocioId}/repartidores`)
      .then(({ data }) => setRepartidores((data.repartidores || []).filter(r => r.activo !== false)))
      .catch(() => {})
    api.get(`/negocios/${negocioId}`)
      .then(({ data }) => setNegocio(data.negocio || null))
      .catch(() => {})
  }, [negocioId])

  const cargarPedidos = useCallback(() => {
    if (!negocioId) return
    setLoading(true)
    api.get(`/negocios/${negocioId}/pedidos?estado=nuevo,en_preparacion,listo,en_camino`)
      .then(({ data }) => setPedidos(data.pedidos || []))
      .catch(() => setPedidos([]))
      .finally(() => setLoading(false))
  }, [negocioId])

  useEffect(() => { cargarPedidos() }, [cargarPedidos])
  useEffect(() => {
    const interval = setInterval(cargarPedidos, 60000)
    return () => clearInterval(interval)
  }, [cargarPedidos])

  const onNuevoPedido = useCallback(async (data) => {
    cargarPedidos()
    toast('🔔 Nuevo pedido recibido', { duration: 4000, position: 'top-right', icon: '🍔' })

    // Reproducir sonido automaticamente
    if (configPanel.sonidoNuevoPedido) {
      reproducirSonido()
    }

    // 4B. Impresión automática al recibir pedido
    if (configPanel.imprimirAutomatico && data?.pedido) {
      for (let i = 0; i < configPanel.cantidadCopias; i++) {
        await generarComanda(data.pedido)
      }
    }
  }, [cargarPedidos, configPanel.sonidoNuevoPedido, configPanel.sonidoSeleccionado, configPanel.volumen, configPanel.imprimirAutomatico, configPanel.cantidadCopias])
  useSocket(negocioId, onNuevoPedido, cargarPedidos)

  const porModalidad = pedidos.filter(p => filtroModalidad === 'todos' || p.modalidad === filtroModalidad)
  const cuentas = {
    nuevo: porModalidad.filter(p => p.estado === 'nuevo').length,
    en_preparacion: porModalidad.filter(p => p.estado === 'en_preparacion').length,
    listo: porModalidad.filter(p => p.estado === 'listo').length,
    en_camino: porModalidad.filter(p => p.estado === 'en_camino').length,
  }
  const pedidosVisibles = porModalidad.filter(p => p.estado === tabEstado)
  const todosParaMapa = porModalidad.filter(p => p.modalidad === 'delivery')
  const totalActivo = porModalidad.reduce((s, p) => s + Number(p.total || 0), 0)

  const modalidadesActivas = [
    { id: 'todos', label: 'Todos' },
    ...(negocio?.configuracion?.modalidades?.delivery !== false ? [{ id: 'delivery', label: 'Delivery' }] : []),
    ...(negocio?.configuracion?.modalidades?.takeaway !== false ? [{ id: 'takeaway', label: 'Take Away' }] : []),
    ...(negocio?.configuracion?.modalidades?.salon !== false ? [{ id: 'salon', label: 'Salón' }] : []),
  ]

  const currentState = STATE_CONFIG[tabEstado]

  // ✅ ⚠️ REPETICION INFINITA DE ALERTA AHORA SI FUNCIONA
  useEffect(() => {
    // Limpiamos intervalo anterior primero
    if (intervaloAlertaRef.current) {
      clearInterval(intervaloAlertaRef.current)
      intervaloAlertaRef.current = null
    }

    // Si hay pedidos nuevos y tenemos activada la alerta
    if (cuentas.nuevo > 0 && configPanel.sonidoNuevoPedido) {
      // Repetimos INFINITAMENTE cada X segundos
      intervaloAlertaRef.current = setInterval(() => {
        if (cuentas.nuevo > 0) {
          reproducirSonido()
        }
      }, configPanel.intervaloAlertaSegundos * 1000)
    }

    return () => {
      if (intervaloAlertaRef.current) {
        clearInterval(intervaloAlertaRef.current)
      }
    }
  }, [cuentas.nuevo, configPanel.sonidoNuevoPedido, configPanel.intervaloAlertaSegundos, configPanel.sonidoSeleccionado, configPanel.volumen])

  // 4A. Alerta por tiempo límite - Revisar pedidos antiguos cada minuto
  useEffect(() => {
    if (!configPanel.sonidoAlertaTiempo) return

    const checkPedidosAntiguos = () => {
      const ahora = Date.now()
      pedidos.forEach(ped => {
        if (['nuevo', 'en_preparacion'].includes(ped.estado)) {
          const minutos = (ahora - new Date(ped.createdAt).getTime()) / 60000
          if (minutos >= configPanel.tiempoAlertaMinutos) {
            reproducirSonido(configPanel.sonidoSeleccionado)
          }
        }
      })
    }

    // Ejecutar inmediatamente y luego cada minuto
    checkPedidosAntiguos()
    const interval = setInterval(checkPedidosAntiguos, 60000)

    return () => clearInterval(interval)
  }, [pedidos, configPanel.sonidoAlertaTiempo, configPanel.tiempoAlertaMinutos, configPanel.sonidoSeleccionado])

  return (
    <div className="h-full flex flex-col" style={{ background: 'var(--bg-main)' }}>

      {/* ── Toolbar ───────────────────────────────────────── */}
      <div className="flex-shrink-0" style={{ background: 'var(--bg-card)', borderBottom: '1px solid var(--border)' }}>

        {/* Top bar: filtros de modalidad + acciones */}
        <div className="px-5 pt-3 pb-0 flex items-center justify-between gap-4">
          {/* Filtros modalidad */}
          <div className="flex items-center gap-1.5">
            {modalidadesActivas.map(f => {
              const active = filtroModalidad === f.id
              const mc = f.id !== 'todos' ? MODALIDAD_COLOR[f.id] : null
              return (
                <button key={f.id} onClick={() => setFiltroModalidad(f.id)}
                  className="px-4 py-2 rounded-xl text-sm font-bold transition-all"
                  style={active
                    ? mc
                      ? { background: mc.bg, color: mc.text, border: `1.5px solid ${mc.dot}` }
                      : { background: '#7c3aed', color: '#fff', border: '1.5px solid #7c3aed' }
                    : { background: 'transparent', color: 'var(--text-muted)', border: '1.5px solid var(--border)' }}>
                  {f.label}
                  {f.id !== 'todos' && (
                    <span className="ml-1.5 text-xs opacity-70">
                      {pedidos.filter(p => p.modalidad === f.id).length}
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          {/* Acciones */}
           <div className="flex items-center gap-2">
             <button onClick={() => setShowMapa(m => !m)}
               className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-bold transition-all"
               style={showMapa
                 ? { background: '#ede9fe', color: '#7c3aed', border: '1.5px solid #c4b5fd' }
                 : { background: 'transparent', color: '#6b7280', border: '1.5px solid #e5e7eb' }}>
               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
               </svg>
               Mapa
             </button>
             <button
               onClick={() => {
                 const configDefecto = {
                   tema: 'standard',
                   colorPinPagado: '#22c55e',
                   colorPinPendiente: '#ef4444',
                   colorFondo: '#f5f5f5',
                   colorHeader: '#ffffff',
                   colorTexto: '#1f2937',
                   colorTextoSecundario: '#6b7280',
                   colorNegocio: '#1f2937',
                   tamanioPins: 'mediano',
                   opacidadMapa: 1,
                   tileLayer: 'standard',
                   brillo: 0,
                   contraste: 0,
                   saturacion: 0,
                   matiz: 0
                 }
                 const config = { ...configDefecto, ...(negocio?.configuracion?.mapaConfiguracion || {}) }
                 // Guardar copia profunda de los valores originales
                 setMapaConfigOriginal(JSON.parse(JSON.stringify(config)))
                 setMapaConfigTemp(JSON.parse(JSON.stringify(config)))
                 setShowConfigMapa(true)
               }}
               className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-bold transition-all"
               style={{ background: 'transparent', color: '#6b7280', border: '1.5px solid #e5e7eb' }}
               title="Personalizar colores y estilo del mapa"
             >
               <span>🎨</span>
               <span className="hidden lg:inline">Config. Mapa</span>
             </button>
             <button onClick={() => setShowOtros(true)}
               className="px-3.5 py-2 rounded-xl text-sm font-bold transition-all"
               style={{ background: 'transparent', color: '#6b7280', border: '1.5px solid #e5e7eb' }}>
               Historial
             </button>
             <button onClick={() => setShowConfig(true)}
               className="p-2 rounded-xl text-sm font-bold transition-all"
               style={{ background: 'transparent', color: '#6b7280', border: '1.5px solid #e5e7eb' }}
               title="Configuracion del panel de pedidos">
               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
               </svg>
             </button>
             <button onClick={() => setPedidoEditar({})}
               className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-black text-white transition-all hover:opacity-90 active:scale-95"
               style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', boxShadow: '0 2px 8px rgba(124,58,237,0.35)' }}>
               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
               </svg>
               Nuevo pedido
             </button>
           </div>
        </div>

        {/* Tabs de estado */}
        <div className="flex px-5 gap-1" style={{ borderTop: '1px solid var(--border)' }}>
          {Object.entries(STATE_CONFIG).map(([id, s]) => (
            <button key={id} onClick={() => setTabEstado(id)}
              className="flex items-center gap-2 px-4 py-3 text-sm font-bold transition-all relative"
              style={tabEstado === id
                ? { color: s.color }
                : { color: 'var(--text-muted)' }}>
              {tabEstado === id && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full" style={{ background: s.color }} />
              )}
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: tabEstado === id ? s.color : 'var(--border)' }} />
              {s.label}
              {cuentas[id] > 0 && (
                <span className="text-xs font-black px-1.5 py-0.5 rounded-full"
                  style={tabEstado === id
                    ? { background: s.color, color: '#fff' }
                    : { background: 'var(--bg-secondary)', color: 'var(--text-muted)' }}>
                  {cuentas[id]}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Contenido ─────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden">

        {/* Lista */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          {/* Sub-header */}
          <div className="px-5 py-3 flex items-center gap-2 flex-shrink-0">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: currentState?.color }} />
            <span className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
              {currentState?.label} · {pedidosVisibles.length} pedido{pedidosVisibles.length !== 1 ? 's' : ''}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-3">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <div className="w-8 h-8 border-3 border-violet-600 border-t-transparent rounded-full animate-spin"
                  style={{ borderWidth: 3 }} />
                <p className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>Cargando pedidos…</p>
              </div>
            ) : pedidosVisibles.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mb-4"
                  style={{ background: 'var(--bg-secondary)', border: '2px dashed var(--border)' }}>
                  {currentState?.icon}
                </div>
                <p className="font-bold text-base mb-1" style={{ color: 'var(--text-primary)' }}>Sin pedidos {currentState?.label?.toLowerCase()}</p>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Los pedidos aparecerán aquí en tiempo real</p>
              </div>
            ) : (
              pedidosVisibles.map(p => (
                <PedidoCard
                  key={p.id}
                  pedido={p}
                  repartidores={repartidores}
                  onUpdate={cargarPedidos}
                  onClick={() => setPedidoDetalle(p)}
                />
              ))
            )}
          </div>
        </div>

        {/* Mapa */}
        {showMapa && (
          <div className="flex-shrink-0 overflow-hidden" style={{ width: '48%', minWidth: 320, maxWidth: 680, borderLeft: '1px solid var(--border)' }}>
            <MapaPedidos
              key={showConfigMapa && mapaConfigTemp ? JSON.stringify(mapaConfigTemp) : 'mapa-default'}
              pedidos={todosParaMapa}
              negocio={
                showConfigMapa && mapaConfigTemp
                  ? { ...negocio, configuracion: { ...negocio?.configuracion, mapaConfiguracion: mapaConfigTemp } }
                  : negocio
              }
            />
          </div>
        )}
      </div>

      {/* ── Modales ───────────────────────────────────────── */}
      {showOtros && <HistorialModal negocioId={negocioId} onClose={() => setShowOtros(false)} />}

      {pedidoDetalle && (
        <ModalDetallePedido
          pedido={pedidoDetalle}
          repartidores={repartidores}
          onClose={() => setPedidoDetalle(null)}
          onUpdate={() => { cargarPedidos(); setPedidoDetalle(null) }}
          onEditar={(p) => { setPedidoDetalle(null); setPedidoEditar(p) }}
        />
      )}

      {pedidoEditar !== null && (
        <EditorPedido
          negocioId={negocioId}
          pedidoExistente={pedidoEditar?.id ? pedidoEditar : null}
          config={negocio?.configuracion || {}}
          ciudad={negocio?.ciudad || ''}
          onClose={() => setPedidoEditar(null)}
          onGuardado={cargarPedidos}
        />
      )}

      {/* ✅ MODAL CONFIGURACION PANEL PEDIDOS */}
      {showConfig && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={() => setShowConfig(false)}>
          <div className="w-full max-w-md rounded-2xl shadow-2xl overflow-hidden" style={{ background: 'var(--bg-card)' }} onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)' }}>
              <h3 className="font-black text-lg" style={{ color: 'var(--text-primary)' }}>⚙️ Configuración del panel</h3>
              <button onClick={() => setShowConfig(false)} className="w-8 h-8 rounded-full flex items-center justify-center transition-colors" style={{ background: 'var(--bg-hover)' }}>
                <svg className="w-4 h-4" style={{ color: 'var(--text-muted)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-6 overflow-y-auto max-h-[75vh]">

              {/* 🔊 SONIDOS Y ALERTAS */}
              <div>
                <h4 className="font-bold text-sm mb-3" style={{ color: 'var(--text-primary)' }}>🔊 Sonidos y alertas</h4>
                <div className="space-y-3">
                  <label className="flex items-center justify-between p-3 rounded-xl" style={{ background: 'var(--bg-secondary)' }}>
                    <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Sonido al recibir nuevo pedido</span>
                    <input type="checkbox" checked={configPanel.sonidoNuevoPedido} onChange={e => setConfigPanel({ ...configPanel, sonidoNuevoPedido: e.target.checked })} className="w-5 h-5" />
                  </label>
                  <label className="flex items-center justify-between p-3 rounded-xl" style={{ background: 'var(--bg-secondary)' }}>
                    <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Alerta sonora por tiempo limite</span>
                    <input type="checkbox" checked={configPanel.sonidoAlertaTiempo} onChange={e => setConfigPanel({ ...configPanel, sonidoAlertaTiempo: e.target.checked })} className="w-5 h-5" />
                  </label>
                  <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: 'var(--bg-secondary)' }}>
                    <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Tiempo limite para alerta</span>
                    <select value={configPanel.tiempoAlertaMinutos} onChange={e => setConfigPanel({ ...configPanel, tiempoAlertaMinutos: parseInt(e.target.value) })} className="px-3 py-1.5 rounded-lg text-sm font-medium" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
                      {[5,10,15,20,30,45,60].map(m => <option key={m} value={m}>{m} minutos</option>)}
                    </select>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: 'var(--bg-secondary)' }}>
                    <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Repetir alerta cada</span>
                    <select value={configPanel.intervaloAlertaSegundos} onChange={e => setConfigPanel({ ...configPanel, intervaloAlertaSegundos: parseInt(e.target.value) })} className="px-3 py-1.5 rounded-lg text-sm font-medium" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
                      {[1,3,5].map(s => <option key={s} value={s}>{s} segundo{s>1 ? 's' : ''}</option>)}
                    </select>
                  </div>

                  <div className="p-3 rounded-xl" style={{ background: 'var(--bg-secondary)' }}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Sonido de alerta</span>
                      <button onClick={() => reproducirSonido()} className="p-1.5 rounded-lg transition-all hover:bg-violet-100">
                        <svg className="w-4 h-4 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </button>
                    </div>
                    <select value={configPanel.sonidoSeleccionado} onChange={e => setConfigPanel({ ...configPanel, sonidoSeleccionado: e.target.value })} className="w-full px-3 py-2 rounded-lg text-sm font-medium" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
                      {SONIDOS_DISPONIBLES.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                    </select>
                  </div>

                  <div className="p-3 rounded-xl" style={{ background: 'var(--bg-secondary)' }}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Volumen</span>
                      <span className="text-xs font-bold text-violet-600">{Math.round(configPanel.volumen * 100)}%</span>
                    </div>
                    <input type="range" min="0" max="1" step="0.1" value={configPanel.volumen} onChange={e => setConfigPanel({ ...configPanel, volumen: parseFloat(e.target.value) })} className="w-full" />
                  </div>

                </div>
              </div>

              {/* 🖨️ IMPRESION DE COMANDAS */}
              <div>
                <h4 className="font-bold text-sm mb-3" style={{ color: 'var(--text-primary)' }}>🖨️ Impresión de comandas</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: 'var(--bg-secondary)' }}>
                    <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Tamaño de papel</span>
                    <select value={configPanel.tamanioPapel} onChange={e => setConfigPanel({ ...configPanel, tamanioPapel: parseInt(e.target.value) })} className="px-3 py-1.5 rounded-lg text-sm font-medium" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
                      <option value={58}>58 mm (estandar)</option>
                      <option value={80}>80 mm</option>
                    </select>
                  </div>
                  <label className="flex items-center justify-between p-3 rounded-xl" style={{ background: 'var(--bg-secondary)' }}>
                    <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Imprimir automaticamente al recibir pedido</span>
                    <input type="checkbox" checked={configPanel.imprimirAutomatico} onChange={e => setConfigPanel({ ...configPanel, imprimirAutomatico: e.target.checked })} className="w-5 h-5" />
                  </label>
                  <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: 'var(--bg-secondary)' }}>
                    <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Cantidad de copias</span>
                    <select value={configPanel.copiasImpresion} onChange={e => setConfigPanel({ ...configPanel, copiasImpresion: parseInt(e.target.value) })} className="px-3 py-1.5 rounded-lg text-sm font-medium" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
                      {[1,2,3].map(n => <option key={n} value={n}>{n} copia{n>1 ? 's' : ''}</option>)}
                    </select>
                  </div>
                  <label className="flex items-center justify-between p-3 rounded-xl" style={{ background: 'var(--bg-secondary)' }}>
                    <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Imprimir dirección del cliente</span>
                    <input type="checkbox" checked={configPanel.imprimirDireccion} onChange={e => setConfigPanel({ ...configPanel, imprimirDireccion: e.target.checked })} className="w-5 h-5" />
                  </label>
                  <label className="flex items-center justify-between p-3 rounded-xl" style={{ background: 'var(--bg-secondary)' }}>
                    <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Imprimir numero de telefono</span>
                    <input type="checkbox" checked={configPanel.imprimirTelefono} onChange={e => setConfigPanel({ ...configPanel, imprimirTelefono: e.target.checked })} className="w-5 h-5" />
                  </label>
                  <label className="flex items-center justify-between p-3 rounded-xl" style={{ background: 'var(--bg-secondary)' }}>
                    <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Cortar papel automaticamente</span>
                    <input type="checkbox" checked={configPanel.cortarPapelAutomatico} onChange={e => setConfigPanel({ ...configPanel, cortarPapelAutomatico: e.target.checked })} className="w-5 h-5" />
                  </label>
                </div>
              </div>

              {/* 📱 MENSAJES AUTOMATICOS */}
              <div>
                <h4 className="font-bold text-sm mb-3" style={{ color: 'var(--text-primary)' }}>📱 Mensajes automáticos</h4>
                <div className="space-y-3">
                  <label className="flex items-center justify-between p-3 rounded-xl" style={{ background: 'var(--bg-secondary)' }}>
                    <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Enviar mensaje al cambiar estado</span>
                    <input type="checkbox" checked={configPanel.mensajesAutomaticosEstado} onChange={e => setConfigPanel({ ...configPanel, mensajesAutomaticosEstado: e.target.checked })} className="w-5 h-5" />
                  </label>
                  <label className="flex items-center justify-between p-3 rounded-xl" style={{ background: 'var(--bg-secondary)' }}>
                    <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Preguntar confirmación antes de enviar</span>
                    <input type="checkbox" checked={configPanel.preguntarAntesEnviarMensaje} onChange={e => setConfigPanel({ ...configPanel, preguntarAntesEnviarMensaje: e.target.checked })} className="w-5 h-5" />
                  </label>
                </div>
              </div>

            </div>

            <div className="px-6 py-4" style={{ borderTop: '1px solid var(--border)' }}>
              <button onClick={() => setShowConfig(false)} className="w-full py-3 rounded-xl font-black text-white" style={{ background: '#7c3aed' }}>
                Listo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Configuración del Mapa */}
      {showConfigMapa && mapaConfigTemp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={() => setShowConfigMapa(false)}>
          <div className="w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden" style={{ background: 'var(--bg-card)' }} onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)' }}>
              <h3 className="font-black text-lg" style={{ color: 'var(--text-primary)' }}>🗺️ Personalizar Mapa de Pedidos</h3>
              <button onClick={() => setShowConfigMapa(false)} className="w-8 h-8 rounded-full flex items-center justify-center transition-colors" style={{ background: 'var(--bg-hover)' }}>
                <svg className="w-4 h-4" style={{ color: 'var(--text-muted)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="px-6 py-6 max-h-[70vh] overflow-y-auto space-y-6">

              {/* Tema */}
              <div>
                <label className="block text-sm font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
                  Modo del Mapa
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setMapaConfigTemp({
                      ...mapaConfigTemp,
                      tema: 'standard',
                      colorFondo: '#f5f5f5',
                      colorHeader: '#ffffff',
                      colorTexto: '#1f2937',
                      colorTextoSecundario: '#6b7280',
                      brillo: 0,
                      contraste: 0,
                      saturacion: 0,
                      matiz: 0
                    })}
                    className={`py-3 px-4 rounded-lg border-2 font-medium transition ${
                      mapaConfigTemp.tema === 'standard' ? 'border-violet-600 bg-violet-50' : 'border-gray-300'
                    }`}
                  >
                    ☀️ Standard
                  </button>
                  <button
                    onClick={() => setMapaConfigTemp({
                      ...mapaConfigTemp,
                      tema: 'oscuro',
                      colorFondo: '#1a1a2e',
                      colorHeader: '#16213e',
                      colorTexto: '#ffffff',
                      colorTextoSecundario: '#9ca3af',
                      brillo: 0,
                      contraste: 0,
                      saturacion: 0,
                      matiz: 0
                    })}
                    className={`py-3 px-4 rounded-lg border-2 font-medium transition ${
                      mapaConfigTemp.tema === 'oscuro' ? 'border-violet-600 bg-violet-50' : 'border-gray-300'
                    }`}
                  >
                    🌙 Modo Noche
                  </button>
                </div>
              </div>

              {/* Colores de Pins */}
              <div>
                <label className="block text-sm font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
                  Colores de Pins de Pedidos
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
                      Pin Pagado
                    </label>
                    <input
                      type="color"
                      value={mapaConfigTemp.colorPinPagado}
                      onChange={(e) => setMapaConfigTemp({ ...mapaConfigTemp, colorPinPagado: e.target.value })}
                      className="w-full h-10 rounded-lg cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
                      Pin Pendiente
                    </label>
                    <input
                      type="color"
                      value={mapaConfigTemp.colorPinPendiente}
                      onChange={(e) => setMapaConfigTemp({ ...mapaConfigTemp, colorPinPendiente: e.target.value })}
                      className="w-full h-10 rounded-lg cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              {/* Colores de UI */}
              <div>
                <label className="block text-sm font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
                  Colores de Interfaz
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
                      Fondo del Contenedor
                    </label>
                    <input
                      type="color"
                      value={mapaConfigTemp.colorFondo}
                      onChange={(e) => setMapaConfigTemp({ ...mapaConfigTemp, colorFondo: e.target.value })}
                      className="w-full h-10 rounded-lg cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
                      Header/Toolbar
                    </label>
                    <input
                      type="color"
                      value={mapaConfigTemp.colorHeader}
                      onChange={(e) => setMapaConfigTemp({ ...mapaConfigTemp, colorHeader: e.target.value })}
                      className="w-full h-10 rounded-lg cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
                      Texto Principal (Header)
                    </label>
                    <input
                      type="color"
                      value={mapaConfigTemp.colorTexto}
                      onChange={(e) => setMapaConfigTemp({ ...mapaConfigTemp, colorTexto: e.target.value })}
                      className="w-full h-10 rounded-lg cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
                      Texto Secundario (Leyenda)
                    </label>
                    <input
                      type="color"
                      value={mapaConfigTemp.colorTextoSecundario}
                      onChange={(e) => setMapaConfigTemp({ ...mapaConfigTemp, colorTextoSecundario: e.target.value })}
                      className="w-full h-10 rounded-lg cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
                      Pin de Negocio
                    </label>
                    <input
                      type="color"
                      value={mapaConfigTemp.colorNegocio}
                      onChange={(e) => setMapaConfigTemp({ ...mapaConfigTemp, colorNegocio: e.target.value })}
                      className="w-full h-10 rounded-lg cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              {/* Nota informativa */}
              <div className="text-xs p-3 rounded-lg" style={{ background: 'var(--bg-hover)', color: 'var(--text-muted)' }}>
                <strong>💡 Nota:</strong> El tema del mapa (claro/oscuro) cambia las calles y el fondo base. Los colores personalizables son solo para los pines, header y textos de la interfaz.
              </div>

              {/* Tamaño de Pins */}
              <div>
                <label className="block text-sm font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
                  Tamaño de Pins
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {['pequeño', 'mediano', 'grande'].map((size) => (
                    <button
                      key={size}
                      onClick={() => setMapaConfigTemp({ ...mapaConfigTemp, tamanioPins: size })}
                      className={`py-2 px-4 rounded-lg border-2 font-medium capitalize transition ${
                        mapaConfigTemp.tamanioPins === size ? 'border-violet-600 bg-violet-50' : 'border-gray-300'
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>

              {/* Opacidad del Mapa */}
              <div>
                <label className="block text-sm font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
                  Opacidad del Mapa Base: {Math.round(mapaConfigTemp.opacidadMapa * 100)}%
                </label>
                <input
                  type="range"
                  min="0.3"
                  max="1"
                  step="0.1"
                  value={mapaConfigTemp.opacidadMapa}
                  onChange={(e) => setMapaConfigTemp({ ...mapaConfigTemp, opacidadMapa: parseFloat(e.target.value) })}
                  className="w-full"
                />
              </div>

              {/* Filtros del Mapa Base */}
              <div className="border-t pt-4" style={{ borderColor: 'var(--border)' }}>
                <h4 className="text-sm font-bold mb-3" style={{ color: 'var(--text-primary)' }}>
                  🎨 Ajustes del Mapa Base (Calles y Fondo)
                </h4>

                {/* Brillo */}
                <div className="mb-4">
                  <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
                    Brillo: {mapaConfigTemp.brillo > 0 ? '+' : ''}{Math.round((mapaConfigTemp.brillo || 0) * 100)}%
                    {mapaConfigTemp.brillo === 0 && ' (Balance)'}
                  </label>
                  <input
                    type="range"
                    min="-0.5"
                    max="0.5"
                    step="0.05"
                    value={mapaConfigTemp.brillo || 0}
                    onChange={(e) => setMapaConfigTemp({ ...mapaConfigTemp, brillo: parseFloat(e.target.value) })}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                    <span>← Más oscuro</span>
                    <span className="font-bold">Balance</span>
                    <span>Más claro →</span>
                  </div>
                </div>

                {/* Contraste */}
                <div className="mb-4">
                  <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
                    Contraste: {mapaConfigTemp.contraste > 0 ? '+' : ''}{Math.round((mapaConfigTemp.contraste || 0) * 100)}%
                    {mapaConfigTemp.contraste === 0 && ' (Balance)'}
                  </label>
                  <input
                    type="range"
                    min="-0.5"
                    max="0.5"
                    step="0.05"
                    value={mapaConfigTemp.contraste || 0}
                    onChange={(e) => setMapaConfigTemp({ ...mapaConfigTemp, contraste: parseFloat(e.target.value) })}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                    <span>← Menos</span>
                    <span className="font-bold">Balance</span>
                    <span>Más →</span>
                  </div>
                </div>

                {/* Saturación */}
                <div className="mb-4">
                  <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
                    Saturación: {mapaConfigTemp.saturacion > 0 ? '+' : ''}{Math.round((mapaConfigTemp.saturacion || 0) * 100)}%
                    {mapaConfigTemp.saturacion === 0 && ' (Balance)'}
                  </label>
                  <input
                    type="range"
                    min="-1"
                    max="1"
                    step="0.1"
                    value={mapaConfigTemp.saturacion || 0}
                    onChange={(e) => setMapaConfigTemp({ ...mapaConfigTemp, saturacion: parseFloat(e.target.value) })}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                    <span>← B&N</span>
                    <span className="font-bold">Balance</span>
                    <span>Intenso →</span>
                  </div>
                </div>

                {/* Matiz */}
                <div className="mb-4">
                  <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
                    Matiz: {mapaConfigTemp.matiz > 0 ? '+' : ''}{Math.round(mapaConfigTemp.matiz || 0)}°
                    {mapaConfigTemp.matiz === 0 && ' (Original)'}
                  </label>
                  <input
                    type="range"
                    min="-180"
                    max="180"
                    step="10"
                    value={mapaConfigTemp.matiz || 0}
                    onChange={(e) => setMapaConfigTemp({ ...mapaConfigTemp, matiz: parseFloat(e.target.value) })}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                    <span>← Cambiar</span>
                    <span className="font-bold">Original</span>
                    <span>Cambiar →</span>
                  </div>
                </div>
              </div>

            </div>

            <div className="px-6 py-4 flex gap-3" style={{ borderTop: '1px solid var(--border)' }}>
              <button
                onClick={async () => {
                  try {
                    setGuardandoMapa(true)
                    const updatedConfig = {
                      ...negocio.configuracion,
                      mapaConfiguracion: mapaConfigTemp
                    }
                    await api.put(`/negocios/${negocio.id}`, { configuracion: updatedConfig })
                    setNegocio({ ...negocio, configuracion: updatedConfig })
                    toast.success('Configuración del mapa guardada')
                    setShowConfigMapa(false)
                  } catch (err) {
                    toast.error('Error al guardar configuración')
                  } finally {
                    setGuardandoMapa(false)
                  }
                }}
                disabled={guardandoMapa}
                className="flex-1 py-3 rounded-xl font-black text-white transition"
                style={{ background: guardandoMapa ? '#9ca3af' : '#7c3aed' }}
              >
                {guardandoMapa ? 'Guardando...' : '💾 Guardar'}
              </button>
              <button
                onClick={() => {
                  if (mapaConfigOriginal) {
                    setMapaConfigTemp(JSON.parse(JSON.stringify(mapaConfigOriginal)))
                  }
                }}
                className="px-6 py-3 rounded-xl font-bold transition"
                style={{ background: 'var(--bg-hover)', color: 'var(--text-primary)' }}
              >
                🔄 Restablecer
              </button>
              <button
                onClick={() => setShowConfigMapa(false)}
                className="px-6 py-3 rounded-xl font-bold transition"
                style={{ background: 'var(--bg-hover)', color: 'var(--text-primary)' }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}