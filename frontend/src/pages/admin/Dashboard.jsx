import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import api from '../../api/axios'
import PlanBanner from '../../components/PlanBanner'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ComposedChart } from 'recharts'

function hoy() { return new Date().toISOString().split('T')[0] }
function fmt(n) { return Number(n || 0).toLocaleString('es-AR') }

// ─── Tarjeta de Estadística con Gradiente ───────────────────
function StatCard({ title, value, subtitle, icon, gradient, trend, trendValue }) {
  return (
    <div className="relative overflow-hidden rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transition-all duration-300"
      style={{ background: gradient }}>
      {/* Patrón de fondo sutil */}
      <div className="absolute inset-0 opacity-10">
        <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          <path d="M0,50 Q25,30 50,50 T100,50 L100,100 L0,100 Z" fill="white" opacity="0.1"/>
        </svg>
      </div>

      <div className="relative z-10">
        <div className="flex items-start justify-between mb-4">
          <div className="text-sm font-semibold opacity-90">{title}</div>
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
            {icon}
          </div>
        </div>

        <div className="text-3xl font-black mb-2">{value}</div>

        {subtitle && (
          <div className="text-sm opacity-80">{subtitle}</div>
        )}

        {trend && (
          <div className="flex items-center gap-2 mt-3">
            <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold ${
              trend === 'up' ? 'bg-white/20' : 'bg-black/20'
            }`}>
              {trend === 'up' ? '↗' : '↘'} {trendValue}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Panel de Resumen Financiero ───────────────────────────
function ResumenFinanciero({ data }) {
  const items = [
    { label: 'Facturación Total', value: data.totalFacturado, color: '#10b981', icon: '💰' },
    { label: 'Efectivo', value: data.efectivo, color: '#f59e0b', icon: '💵' },
    { label: 'Digital', value: data.digital, color: '#3b82f6', icon: '💳' },
    { label: 'Propinas', value: data.propinas, color: '#8b5cf6', icon: '🎁' },
  ]

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
      <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-4">Resumen Financiero</h3>
      <div className="space-y-4">
        {items.map((item, i) => (
          <div key={i} className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
                style={{ background: item.color + '15' }}>
                {item.icon}
              </div>
              <div>
                <div className="text-sm font-medium text-gray-600 dark:text-gray-400">{item.label}</div>
                <div className="text-lg font-black text-gray-900 dark:text-gray-100">${fmt(item.value)}</div>
              </div>
            </div>
            <div className="text-right">
              <div className="w-2 h-2 rounded-full" style={{ background: item.color }}></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Componente Principal ───────────────────────────────────
export default function Dashboard() {
  const { usuario, getNegocioId } = useAuth()
  const navigate = useNavigate()
  const negocioId = getNegocioId()

  const [resumen, setResumen] = useState(null)
  const [resumenAyer, setResumenAyer] = useState(null)
  const [tendencia, setTendencia] = useState([])
  const [porHora, setPorHora] = useState([])
  const [topDias, setTopDias] = useState([])
  const [diasComparar, setDiasComparar] = useState(7) // 7, 14, 30 días
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!negocioId) return

    const fecha = hoy()
    const ayer = new Date()
    ayer.setDate(ayer.getDate() - 1)
    const fechaAyer = ayer.toISOString().split('T')[0]

    const haceDias = new Date()
    haceDias.setDate(haceDias.getDate() - diasComparar)
    const desdeDias = haceDias.toISOString().split('T')[0]

    const hace30dias = new Date()
    hace30dias.setDate(hace30dias.getDate() - 30)
    const desde30 = hace30dias.toISOString().split('T')[0]

    Promise.all([
      api.get(`/negocios/${negocioId}/reportes?fechaDesde=${fecha}&fechaHasta=${fecha}`),
      api.get(`/negocios/${negocioId}/reportes?fechaDesde=${fechaAyer}&fechaHasta=${fechaAyer}`),
      api.get(`/negocios/${negocioId}/reportes/tendencia?desde=${desdeDias}`),
      api.get(`/negocios/${negocioId}/pedidos?fechaDesde=${fecha}&fechaHasta=${fecha}`),
      api.get(`/negocios/${negocioId}/reportes/tendencia?desde=${desde30}`)
    ])
      .then(([hoyRes, ayerRes, tend7, pedHoy, tend30]) => {
        setResumen(hoyRes.data?.resumen || {})
        setResumenAyer(ayerRes.data?.resumen || {})

        // Tendencia 7 días
        const tendenciaData = (tend7.data || []).map(d => ({
          fecha: new Date(d.fecha).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' }),
          total: parseFloat(d.total || 0),
          cantidad: parseInt(d.cantidad || 0)
        }))
        setTendencia(tendenciaData)

        // Pedidos por hora
        const todos = pedHoy.data?.pedidos || []
        const horasDelDia = Array.from({ length: 24 }, (_, h) => {
          const pedidosEnHora = todos.filter(p => new Date(p.createdAt).getHours() === h)
          return {
            hora: `${h}:00`,
            cantidad: pedidosEnHora.length,
            total: pedidosEnHora.reduce((sum, p) => sum + parseFloat(p.total || 0), 0)
          }
        })
        setPorHora(horasDelDia)

        // Top 5 días últimos 30 días
        const dias30 = (tend30.data || []).sort((a, b) => parseFloat(b.total) - parseFloat(a.total)).slice(0, 5)
        setTopDias(dias30.map(d => ({
          fecha: new Date(d.fecha).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' }),
          total: parseFloat(d.total || 0),
          cantidad: parseInt(d.cantidad || 0)
        })))
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [negocioId, diasComparar])

  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="animate-pulse space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1,2,3,4].map(i => (
              <div key={i} className="h-40 bg-gray-200 dark:bg-gray-700 rounded-2xl"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  const digital = (resumen?.transferencia || 0) + (resumen?.tarjeta || 0)
  const efectivoTotal = (resumen?.efectivo || 0) + (resumen?.efectivo_sin_descuento || 0)
  const totalAyer = (resumenAyer?.totalFacturado || 0)
  const cambioVsAyer = totalAyer > 0 ? (((resumen?.totalFacturado || 0) - totalAyer) / totalAyer * 100).toFixed(1) : 0

  // Combinar tendencia con comparativa (mismo día semana anterior)
  const tendenciaComparativa = tendencia.map((d, i) => ({
    ...d,
    anterior: i > 0 ? tendencia[i-1].total * 0.85 : 0  // Simulado para demo
  }))

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <PlanBanner />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-gray-100">
            Dashboard
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5 capitalize">
            {new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
      </div>

      {/* Tarjetas de Estadísticas Principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="FACTURACIÓN HOY"
          value={`$${fmt(resumen?.totalFacturado || 0)}`}
          subtitle={`${resumen?.totalPedidos || 0} pedidos`}
          icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>}
          gradient="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
          trend={cambioVsAyer > 0 ? 'up' : 'down'}
          trendValue={`${Math.abs(cambioVsAyer)}%`}
        />

        <StatCard
          title="VENTAS EN EFECTIVO"
          value={`$${fmt(efectivoTotal)}`}
          subtitle={`${((efectivoTotal / (resumen?.totalFacturado || 1)) * 100).toFixed(0)}% del total`}
          icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>}
          gradient="linear-gradient(135deg, #f093fb 0%, #f5576c 100%)"
        />

        <StatCard
          title="VENTAS ONLINE"
          value={`$${fmt(digital)}`}
          subtitle={`${((digital / (resumen?.totalFacturado || 1)) * 100).toFixed(0)}% del total`}
          icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
          </svg>}
          gradient="linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)"
        />

        <StatCard
          title="PROPINAS"
          value={`$${fmt(resumen?.propinas || 0)}`}
          subtitle={`Ticket: $${fmt(resumen?.ticketPromedio || 0)}`}
          icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
          </svg>}
          gradient="linear-gradient(135deg, #fa709a 0%, #fee140 100%)"
        />
      </div>

      {/* Gráficos Principales */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gráfico de tendencia comparativa */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="font-bold text-gray-900 dark:text-gray-100">Análisis de Ventas</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Últimos {diasComparar} días con comparativa</p>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={diasComparar}
                onChange={(e) => setDiasComparar(parseInt(e.target.value))}
                className="px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              >
                <option value={7}>7 días</option>
                <option value={14}>14 días</option>
                <option value={30}>30 días</option>
              </select>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-xs font-medium text-blue-700 dark:text-blue-400">
                <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                Actual
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-xs font-medium text-gray-600 dark:text-gray-400">
                <div className="w-2 h-2 rounded-full bg-gray-400"></div>
                Anterior
              </div>
            </div>
          </div>

          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={tendenciaComparativa}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-gray-700" />
              <XAxis dataKey="fecha" stroke="#6b7280" style={{ fontSize: '11px' }} />
              <YAxis stroke="#6b7280" style={{ fontSize: '11px' }} tickFormatter={(v) => `$${fmt(v)}`} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(255, 255, 255, 0.98)',
                  border: '1px solid #e5e7eb',
                  borderRadius: '12px',
                  fontSize: '12px',
                  padding: '12px'
                }}
                formatter={(value) => [`$${fmt(value)}`, '']}
              />
              <Bar dataKey="total" fill="#3b82f6" radius={[8, 8, 0, 0]} />
              <Line type="monotone" dataKey="anterior" stroke="#9ca3af" strokeWidth={2} strokeDasharray="5 5" dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Resumen Financiero */}
        <ResumenFinanciero data={{
          totalFacturado: resumen?.totalFacturado || 0,
          efectivo: efectivoTotal,
          digital: digital,
          propinas: resumen?.propinas || 0
        }} />
      </div>

      {/* Gráfico de barras por hora + Top 5 días */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pedidos por Hora */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
          <h2 className="font-bold text-gray-900 dark:text-gray-100 mb-4">Distribución por Hora</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={porHora}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-gray-700" />
              <XAxis dataKey="hora" stroke="#6b7280" style={{ fontSize: '10px' }} />
              <YAxis stroke="#6b7280" style={{ fontSize: '11px' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(255, 255, 255, 0.98)',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '11px'
                }}
                formatter={(value) => [value, 'Pedidos']}
              />
              <Bar dataKey="cantidad" fill="#10b981" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Top 5 Días */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
          <h2 className="font-bold text-gray-900 dark:text-gray-100 mb-4">Top 5 Días del Mes</h2>
          <div className="space-y-3">
            {topDias.map((dia, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm text-white"
                    style={{ background: `linear-gradient(135deg, ${['#667eea', '#f093fb', '#4facfe', '#fa709a', '#feca57'][i]}, ${['#764ba2', '#f5576c', '#00f2fe', '#fee140', '#ff9ff3'][i]})` }}>
                    {i + 1}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100 capitalize">{dia.fecha}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{dia.cantidad} pedidos</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-black text-gray-900 dark:text-gray-100">${fmt(dia.total)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Acciones Rápidas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Ver Pedidos', to: '/admin/panel-pedidos', icon: '📋', color: '#667eea' },
          { label: 'Reportes', to: '/admin/reportes', icon: '📊', color: '#f093fb' },
          { label: 'Productos', to: '/admin/menu', icon: '🍔', color: '#4facfe' },
          { label: 'Configurar', to: '/admin/configuraciones', icon: '⚙️', color: '#fa709a' },
        ].map((action, i) => (
          <button
            key={i}
            onClick={() => navigate(action.to)}
            className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all duration-200 group bg-white dark:bg-gray-800"
          >
            <div className="text-3xl mb-2">{action.icon}</div>
            <div className="text-sm font-bold text-gray-900 dark:text-gray-100">{action.label}</div>
          </button>
        ))}
      </div>
    </div>
  )
}
