import { useState, useEffect, useCallback } from 'react'
import api from '../../api/axios'
import toast from 'react-hot-toast'

const SEVERIDAD_COLOR = {
  critica: 'border-red-300 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400',
  alta: 'border-amber-300 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400',
  media: 'border-gray-200 bg-gray-50 dark:bg-gray-900/40 text-gray-700 dark:text-gray-300',
}

function fmt(n) {
  return n?.toLocaleString('es-AR', { minimumFractionDigits: 0 }) ?? '—'
}

function KPI({ label, value, sub, color = 'text-gray-900', icon, trend }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-5">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg ${icon.bg}`}>
          {icon.emoji}
        </div>
        {trend !== undefined && (
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${trend >= 0 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'}`}>
            {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
          </span>
        )}
      </div>
      <p className={`text-2xl font-bold ${color} mb-0.5`}>{value}</p>
      <p className="text-sm text-gray-600 dark:text-gray-400">{label}</p>
      {sub && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{sub}</p>}
    </div>
  )
}

function PlanBar({ plan, datos, total }) {
  const pct = total > 0 ? (datos.activos / total) * 100 : 0
  const colors = {
    estandar: { bar: 'bg-gray-400', badge: 'bg-gray-100 text-gray-600', label: 'Estándar' },
    premium:  { bar: 'bg-amber-400', badge: 'bg-amber-100 text-amber-700', label: 'Premium ⭐' },
  }
  const c = colors[plan] || colors.estandar
  return (
    <div className="flex items-center gap-4 py-3 border-b border-gray-50 last:border-0">
      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${c.badge} w-24 text-center flex-shrink-0`}>{c.label}</span>
      <div className="flex-1">
        <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
          <div className={`h-full ${c.bar} rounded-full transition-all duration-700`} style={{ width: `${pct}%` }} />
        </div>
      </div>
      <div className="text-right flex-shrink-0 w-28">
        <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">{datos.activos} activos</span>
        <span className="text-xs text-gray-600 dark:text-gray-400 ml-1">/ {datos.total} total</span>
      </div>
      <div className="text-right flex-shrink-0 w-28">
        <span className="text-sm font-semibold text-violet-600 dark:text-violet-400">${fmt(datos.mrr)}</span>
        <span className="text-xs text-gray-600 dark:text-gray-400 ml-1">MRR</span>
      </div>
    </div>
  )
}

export default function SADashboard() {
  const [metricas, setMetricas] = useState(null)
  const [negocios, setNegocios] = useState([])
  const [alertas, setAlertas] = useState([])
  const [ranking, setRanking] = useState([])
  const [loading, setLoading] = useState(true)

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const [mRes, nRes, aRes, rRes] = await Promise.all([
        api.get('/negocios/metricas'),
        api.get('/negocios'),
        api.get('/superadmin/alertas').catch(() => ({ data: { alertas: [] } })),
        api.get('/superadmin/top-negocios').catch(() => ({ data: { ranking: [] } })),
      ])
      setMetricas(mRes.data.metricas)
      setNegocios((nRes.data.negocios || []).slice().reverse().slice(0, 5))
      setAlertas(aRes.data.alertas || [])
      setRanking(rRes.data.ranking || [])
    } catch { /* silencioso */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { cargar() }, [cargar])

  const resolverAlerta = async (id) => {
    try {
      await api.put(`/superadmin/alertas/${id}/resolver`)
      setAlertas(prev => prev.filter(a => a.id !== id))
    } catch { toast.error('Error al resolver la alerta') }
  }

  const m = metricas

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Dashboard</h1>
        <button onClick={cargar} className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-600 dark:hover:text-gray-100 transition-colors flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
          Actualizar
        </button>
      </div>

      {/* Alertas activas */}
      {alertas.length > 0 && (
        <div className="mb-6 space-y-2">
          {alertas.slice(0, 6).map(a => (
            <div key={a.id} className={`flex items-center justify-between gap-3 border rounded-xl px-4 py-2.5 ${SEVERIDAD_COLOR[a.severidad] || SEVERIDAD_COLOR.media}`}>
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate">{a.titulo}</p>
                {a.descripcion && <p className="text-xs opacity-80 truncate">{a.descripcion}</p>}
              </div>
              <button onClick={() => resolverAlerta(a.id)}
                className="flex-shrink-0 text-xs font-medium px-3 py-1.5 rounded-lg bg-white/70 dark:bg-gray-800/70 hover:bg-white transition">
                Resolver
              </button>
            </div>
          ))}
          {alertas.length > 6 && (
            <p className="text-xs text-gray-500 text-center">y {alertas.length - 6} alertas más…</p>
          )}
        </div>
      )}

      {/* KPIs principales */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KPI
          label="MRR"
          value={`$${fmt(m?.mrr)}`}
          sub="Ingresos mensuales recurrentes"
          color="text-violet-700"
          icon={{ emoji: '💰', bg: 'bg-violet-100' }}
        />
        <KPI
          label="Negocios activos"
          value={m?.activos ?? 0}
          sub={`${m?.total ?? 0} en total`}
          color="text-green-700"
          icon={{ emoji: '🏪', bg: 'bg-green-100' }}
        />
        <KPI
          label="Churn rate"
          value={`${m?.churnRate ?? 0}%`}
          sub={`${m?.inactivos ?? 0} inactivos`}
          color={m?.churnRate > 10 ? 'text-red-600' : 'text-gray-900'}
          icon={{ emoji: '📉', bg: 'bg-red-50' }}
        />
        <KPI
          label="Nuevos este mes"
          value={m?.nuevosEsteMes ?? 0}
          sub="Negocios registrados"
          color="text-blue-700"
          icon={{ emoji: '🆕', bg: 'bg-blue-50' }}
        />
      </div>

      {/* Fila secundaria */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KPI
          label="Plan Estándar"
          value={m?.porPlan?.estandar?.activos ?? 0}
          sub={`$${fmt(m?.porPlan?.estandar?.mrr)} MRR`}
          icon={{ emoji: '📋', bg: 'bg-gray-100' }}
        />
        <KPI
          label="Plan Premium"
          value={m?.porPlan?.premium?.activos ?? 0}
          sub={`$${fmt(m?.porPlan?.premium?.mrr)} MRR`}
          color="text-amber-600"
          icon={{ emoji: '⭐', bg: 'bg-amber-50' }}
        />
        <KPI
          label="Vencen en 30 días"
          value={m?.proximosAVencer ?? 0}
          sub="Requieren renovación"
          color={m?.proximosAVencer > 0 ? 'text-orange-600' : 'text-gray-900'}
          icon={{ emoji: '⏰', bg: 'bg-orange-50' }}
        />
        <KPI
          label="Vencidos"
          value={m?.vencidos ?? 0}
          sub="Con acceso activo"
          color={m?.vencidos > 0 ? 'text-red-600' : 'text-gray-900'}
          icon={{ emoji: '⚠️', bg: 'bg-red-50' }}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Distribución por plan */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Distribución por plan</h2>
            <span className="text-xs text-gray-600 dark:text-gray-400">MRR total: <span className="font-bold text-violet-600 dark:text-violet-400">${fmt(m?.mrr)}</span></span>
          </div>
          {m?.porPlan && Object.entries(m.porPlan).map(([plan, datos]) => (
            <PlanBar key={plan} plan={plan} datos={datos} total={m.activos} />
          ))}

          {/* Precio por plan (desde la definición editable) */}
          <div className="mt-4 pt-4 border-t border-gray-50 grid grid-cols-2 gap-3">
            {m?.porPlan && Object.entries(m.porPlan).map(([plan, datos]) => (
              <div key={plan} className="text-center p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-0.5 capitalize">{plan}</p>
                <p className="text-sm font-bold text-gray-800 dark:text-gray-200">${fmt(datos.precio)}<span className="text-xs font-normal text-gray-600 dark:text-gray-400">/mes</span></p>
              </div>
            ))}
          </div>
        </div>

        {/* Últimos negocios */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Negocios recientes</h2>
          <div className="space-y-3">
            {negocios.length === 0 && (
              <p className="text-sm text-gray-600 dark:text-gray-400 text-center py-6">Sin datos</p>
            )}
            {negocios.map(neg => {
              const vencido = neg.vencimiento && new Date(neg.vencimiento) < new Date()
              return (
                <div key={neg.id} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center text-xs font-bold text-violet-700 dark:text-violet-400 flex-shrink-0">
                    {neg.nombre?.[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{neg.nombre}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">{neg.ciudad || 'Sin ciudad'}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${neg.plan === 'premium' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'}`}>
                      {neg.plan === 'premium' ? '⭐ Premium' : 'Estándar'}
                    </span>
                    {vencido && <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-500">Vencido</span>}
                    {!neg.activo && <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">Inactivo</span>}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Resumen salud */}
          <div className="mt-4 pt-4 border-t border-gray-50">
            <div className="flex items-center justify-between text-xs text-gray-700 dark:text-gray-300">
              <span>Salud de la base</span>
              <span className={`font-semibold ${m?.churnRate <= 5 ? 'text-green-600' : m?.churnRate <= 15 ? 'text-orange-500' : 'text-red-600'}`}>
                {m?.churnRate <= 5 ? '🟢 Excelente' : m?.churnRate <= 15 ? '🟡 Atención' : '🔴 Crítico'}
              </span>
            </div>
            <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full mt-2 overflow-hidden">
              <div
                className={`h-full rounded-full ${m?.churnRate <= 5 ? 'bg-green-400' : m?.churnRate <= 15 ? 'bg-amber-400' : 'bg-red-400'}`}
                style={{ width: `${100 - (m?.churnRate || 0)}%`, transition: 'width 0.7s' }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
              <span>{m?.activos} activos</span>
              <span>{m?.inactivos} inactivos</span>
            </div>
          </div>
        </div>
      </div>

      {/* Ranking por facturación (últimos 30 días) */}
      {ranking.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-5 mt-6">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">🏆 Top negocios por facturación (últimos 30 días)</h2>
          <div className="space-y-2">
            {ranking.map((n, i) => {
              const max = ranking[0]?.facturado || 1
              const pct = Math.max(4, (n.facturado / max) * 100)
              return (
                <div key={n.negocioId} className="flex items-center gap-3">
                  <span className={`w-6 text-center text-sm font-bold flex-shrink-0 ${i === 0 ? 'text-amber-500' : i === 1 ? 'text-gray-400' : i === 2 ? 'text-amber-700' : 'text-gray-500'}`}>
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                        {n.nombre}
                        {n.plan === 'premium' && <span className="ml-1.5 text-xs">⭐</span>}
                      </p>
                      <p className="text-sm font-bold text-gray-900 dark:text-gray-100 flex-shrink-0 ml-3">
                        ${fmt(Math.round(n.facturado))}
                        <span className="text-xs font-normal text-gray-500 ml-1.5">{n.pedidos} ped.</span>
                      </p>
                    </div>
                    <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-violet-500 to-purple-400 rounded-full" style={{ width: `${pct}%`, transition: 'width 0.6s' }} />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
