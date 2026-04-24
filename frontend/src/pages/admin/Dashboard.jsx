import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import api from '../../api/axios'
import PlanBanner from '../../components/PlanBanner'

function hoy() { return new Date().toISOString().split('T')[0] }
function fmt(n) { return Number(n || 0).toLocaleString('es-AR') }

const ESTADO_COLOR = {
  nuevo: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-400', dot: 'bg-blue-500' },
  en_preparacion: { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-400', dot: 'bg-amber-500' },
  listo: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-400', dot: 'bg-green-500' },
  en_camino: { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-400', dot: 'bg-orange-500' },
  entregado: { bg: 'bg-gray-200 dark:bg-gray-700', text: 'text-gray-600 dark:text-gray-400', dot: 'bg-gray-400' },
  cancelado: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-600 dark:text-red-400', dot: 'bg-red-400' },
}
const ESTADO_LABEL = {
  nuevo: 'Nuevo', en_preparacion: 'En prep.', listo: 'Listo',
  en_camino: 'En camino', entregado: 'Entregado', cancelado: 'Cancelado',
}

// ─── Card KPI ─────────────────────────────────────────────
function KpiCard({ icon, label, value, sub, subIcon, color = '#7c3aed' }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 hover:shadow-lg transition-all duration-200 group">
      <div className="flex items-start justify-between mb-3">
        <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: color + '12' }}>
          <div style={{ color }}>{icon}</div>
        </div>
      </div>
      <p className="text-2xl font-black text-gray-900 dark:text-gray-100 leading-none tracking-tight">{value}</p>
      <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mt-2">{label}</p>
      {sub && (
        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 flex items-center gap-1">
          {subIcon && <span>{subIcon}</span>}
          {sub}
        </p>
      )}
    </div>
  )
}

// ─── Icono SVG facturación ─────────────────────────────────
const IconMoney = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
)
const IconOrders = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
  </svg>
)
const IconDelivery = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
  </svg>
)
const IconCard = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
  </svg>
)

export default function Dashboard() {
  const { usuario } = useAuth()
  const navigate = useNavigate()
  const negocioId = usuario?.negocioId
  const [resumen, setResumen] = useState(null)
  const [pedidosRecientes, setPedidosRecientes] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!negocioId) return
    const fecha = hoy()
    Promise.all([
      api.get(`/negocios/${negocioId}/reportes?fechaDesde=${fecha}&fechaHasta=${fecha}`),
      api.get(`/negocios/${negocioId}/pedidos?fechaDesde=${fecha}&fechaHasta=${fecha}`)
    ])
      .then(([rep, ped]) => {
        setResumen(rep.data?.resumen || {})
        const todos = ped.data?.pedidos || []
        // Mostrar los 5 más recientes pero activos primero
        const activos = todos.filter(p => !['entregado', 'cancelado'].includes(p.estado))
        const resto = todos.filter(p => ['entregado', 'cancelado'].includes(p.estado))
        setPedidosRecientes([...activos, ...resto].slice(0, 7))
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [negocioId])

  const digital = (resumen?.transferencia || 0) + (resumen?.tarjeta || 0)
  const efectivoTotal = (resumen?.efectivo || 0) + (resumen?.efectivo_sin_descuento || 0)

  const quickActions = [
    { label: 'Nuevo pedido', icon: '＋', to: '/admin/panel-pedidos', color: '#7c3aed' },
    { label: 'Ver menú QR', icon: '↗', to: '#menu', color: '#059669', external: true },
    { label: 'Reportes', icon: '📊', to: '/admin/reportes', color: '#2563eb' },
    { label: 'Configurar', icon: '⚙', to: '/admin/configuraciones', color: '#64748b' },
  ]

  return (
    <div className="p-6 max-w-7xl">
      <PlanBanner />

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-gray-100">
            Hola, {usuario?.nombre?.split(' ')[0]} 👋
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5 capitalize">
            {new Date().toLocaleDateString('es-AR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <button
          onClick={() => navigate('/admin/panel-pedidos')}
          className="flex items-center gap-2 px-4 py-2 border-2 border-violet-600 text-violet-600 dark:text-violet-400 dark:border-violet-500 rounded-xl text-sm font-bold hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
          Ver panel
        </button>
      </div>

      {/* Hero card: Facturación */}
      {!loading && resumen && (
        <div className="rounded-2xl mb-6 p-6 relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)' }}>
          <div className="absolute inset-0 opacity-10"
            style={{ backgroundImage: 'radial-gradient(circle at 80% 50%, white 0%, transparent 60%)' }} />
          <div className="relative flex items-center justify-between">
            <div>
              <p className="text-violet-200 text-sm font-medium mb-1">Facturación de hoy</p>
              <p className="text-4xl font-black text-white tracking-tight">${fmt(resumen.totalFacturado)}</p>
              <p className="text-violet-300 text-sm mt-2">
                {resumen.totalPedidos} pedido{resumen.totalPedidos !== 1 ? 's' : ''} · Ticket prom. ${Math.round(resumen.ticketPromedio || 0).toLocaleString('es-AR')}
              </p>
            </div>
            <div className="flex gap-4 text-center">
              <div className="bg-white/10 rounded-xl px-5 py-3">
                <p className="text-2xl font-black text-white">{resumen.delivery || 0}</p>
                <p className="text-xs text-violet-200 mt-0.5">Delivery</p>
              </div>
              <div className="bg-white/10 rounded-xl px-5 py-3">
                <p className="text-2xl font-black text-white">{resumen.takeaway || 0}</p>
                <p className="text-xs text-violet-200 mt-0.5">Take Away</p>
              </div>
              <div className="bg-white/10 rounded-xl px-5 py-3">
                <p className="text-2xl font-black text-white">{resumen.salon || 0}</p>
                <p className="text-xs text-violet-200 mt-0.5">Salón</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* KPIs secundarios */}
      {loading ? (
        <div className="grid grid-cols-4 gap-4 mb-6">
          {[1,2,3,4].map(i => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 h-32 animate-pulse">
              <div className="w-11 h-11 bg-gray-100 dark:bg-gray-700 rounded-xl mb-4" />
              <div className="h-7 bg-gray-100 dark:bg-gray-700 rounded w-2/3 mb-2" />
              <div className="h-4 bg-gray-50 dark:bg-gray-900 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-4 mb-6">
          <KpiCard
            icon={<IconOrders />}
            label="Pedidos hoy"
            value={resumen?.totalPedidos ?? '—'}
            sub={`Ticket prom. $${fmt(Math.round(resumen?.ticketPromedio || 0))}`}
            color="#7c3aed"
          />
          <KpiCard
            icon={<IconCard />}
            label="Cobrado digital"
            value={`$${fmt(digital)}`}
            sub={`Efectivo: $${fmt(efectivoTotal)}`}
            color="#2563eb"
          />
          <KpiCard
            icon={<IconDelivery />}
            label="Deliveries"
            value={resumen?.delivery ?? '—'}
            sub={`Take Away: ${resumen?.takeaway ?? 0}`}
            color="#ea580c"
          />
          <KpiCard
            icon={<IconMoney />}
            label="Propinas"
            value={`$${fmt(resumen?.propinas || 0)}`}
            sub="Acumuladas hoy"
            color="#059669"
          />
        </div>
      )}

      {/* Últimos pedidos */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="font-bold text-gray-900 dark:text-gray-100">Actividad de hoy</h2>
            {!loading && (
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                {pedidosRecientes.filter(p => !['entregado','cancelado'].includes(p.estado)).length} activos de {pedidosRecientes.length} mostrados
              </p>
            )}
          </div>
          <button onClick={() => navigate('/admin/pedidos')}
            className="text-xs text-violet-600 dark:text-violet-400 hover:text-violet-800 font-bold px-3 py-1.5 rounded-lg hover:bg-violet-50 dark:hover:bg-violet-900/30 transition-colors">
            Ver historial →
          </button>
        </div>

        {loading ? (
          <div className="divide-y divide-gray-50">
            {[1,2,3,4].map(i => (
              <div key={i} className="px-6 py-4 flex items-center gap-4 animate-pulse">
                <div className="w-8 h-4 bg-gray-100 dark:bg-gray-700 rounded" />
                <div className="flex-1 h-4 bg-gray-100 dark:bg-gray-700 rounded" />
                <div className="w-20 h-4 bg-gray-100 dark:bg-gray-700 rounded" />
                <div className="w-16 h-6 bg-gray-100 dark:bg-gray-700 rounded-full" />
              </div>
            ))}
          </div>
        ) : pedidosRecientes.length === 0 ? (
          <div className="text-center py-14 text-gray-600 dark:text-gray-400 text-sm">
            <div className="text-5xl mb-3">🍔</div>
            <p className="font-semibold text-gray-700 dark:text-gray-300">Sin pedidos hoy todavía</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Cuando lleguen aparecerán aquí</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {pedidosRecientes.map(p => {
              const ec = ESTADO_COLOR[p.estado] || ESTADO_COLOR.entregado
              const isActivo = !['entregado', 'cancelado'].includes(p.estado)
              return (
                <div key={p.id}
                  onClick={() => navigate('/admin/panel-pedidos')}
                  className={`flex items-center gap-4 px-6 py-3.5 cursor-pointer transition-colors ${isActivo ? 'hover:bg-violet-50 dark:hover:bg-violet-900/20' : 'hover:bg-gray-100 dark:hover:bg-gray-700/50'}`}>
                  {/* N° */}
                  <span className="text-sm font-black text-violet-600 dark:text-violet-400 w-12 flex-shrink-0">#{p.numero}</span>

                  {/* Cliente */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">{p.clienteNombre || 'Sin nombre'}</p>
                    {p.clienteDireccion && (
                      <p className="text-xs text-gray-600 dark:text-gray-400 truncate">{p.clienteDireccion}</p>
                    )}
                  </div>

                  {/* Modalidad */}
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${ p.modalidad === 'delivery' ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400' : p.modalidad === 'takeaway' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' }`}>
                    {p.modalidad === 'takeaway' ? 'Take Away' : p.modalidad === 'salon' ? 'Salón' : 'Delivery'}
                  </span>

                  {/* Total */}
                  <span className="text-sm font-black text-gray-900 dark:text-gray-100 w-24 text-right flex-shrink-0">
                    ${fmt(p.total)}
                  </span>

                  {/* Estado */}
                  <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0 w-28 justify-center ${ec.bg} ${ec.text}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${ec.dot}`} />
                    {ESTADO_LABEL[p.estado]}
                  </span>

                  {/* Hora */}
                  <span className="text-xs text-gray-600 dark:text-gray-400 w-12 text-right flex-shrink-0">
                    {new Date(p.createdAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
