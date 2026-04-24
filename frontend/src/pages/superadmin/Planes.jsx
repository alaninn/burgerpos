import { useState, useEffect, useCallback } from 'react'
import api from '../../api/axios'
import toast from 'react-hot-toast'

const PLAN_DEF = {
  estandar: {
    nombre: 'Estándar',
    color: 'bg-gray-100 text-gray-700',
    badge: 'bg-gray-100 text-gray-600',
    limites: { productos: 30, categorias: 8, operadores: 2, repartidores: 3 },
    accesos: { monitorCocina: false, fiscal: false, reportesAvanzados: false, descuentos: false, stock: false },
  },
  premium: {
    nombre: 'Premium',
    color: 'bg-amber-100 text-amber-700',
    badge: 'bg-amber-100 text-amber-700',
    limites: { productos: -1, categorias: -1, operadores: -1, repartidores: -1 },
    accesos: { monitorCocina: true, fiscal: true, reportesAvanzados: true, descuentos: true, stock: true },
  },
}

const FEATURE_LABELS = {
  monitorCocina: 'Monitor de cocina (KDS)',
  fiscal: 'Facturación ARCA',
  reportesAvanzados: 'Reportes avanzados',
  descuentos: 'Cupones y descuentos',
  stock: 'Control de stock',
}

function LimiteVal({ val }) {
  return <span className="font-semibold text-gray-800 dark:text-gray-200">{val === -1 ? '∞ Ilimitado' : val}</span>
}

function BarUso({ uso, limite, label }) {
  if (limite === -1) return (
    <div className="flex items-center justify-between text-xs py-1">
      <span className="text-gray-700 dark:text-gray-300">{label}</span>
      <span className="text-violet-600 dark:text-violet-400 font-medium">{uso} / ∞</span>
    </div>
  )
  const pct = Math.min((uso / limite) * 100, 100)
  const color = pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-500' : 'bg-violet-500'
  return (
    <div className="py-1">
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="text-gray-700 dark:text-gray-300">{label}</span>
        <span className={`font-semibold text-xs ${pct >= 90 ? 'text-red-600' : 'text-gray-700'}`}>{uso}/{limite}</span>
      </div>
      <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%`, transition: 'width 0.5s' }} />
      </div>
    </div>
  )
}

function ModalCambiarPlan({ negocio, onClose, onSaved }) {
  const [plan, setPlan] = useState(negocio.plan)
  const [vencimiento, setVencimiento] = useState(
    negocio.vencimiento ? new Date(negocio.vencimiento).toISOString().split('T')[0] : ''
  )
  const [loading, setLoading] = useState(false)

  const guardar = async () => {
    setLoading(true)
    try {
      await api.put(`/negocios/${negocio.id}`, {
        plan,
        vencimiento: vencimiento || null
      })
      toast.success('Plan actualizado')
      onSaved(); onClose()
    } catch { toast.error('Error al actualizar') }
    finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">Cambiar plan — {negocio.nombre}</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-600 dark:text-gray-400">✕</button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Plan</label>
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(PLAN_DEF).map(([key, def]) => (
                <button key={key} onClick={() => setPlan(key)}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${plan === key ? 'border-violet-500 bg-violet-50' : 'border-gray-200 hover:border-gray-300'}`}>
                  <div className="font-semibold text-gray-900 dark:text-gray-100 mb-1">{def.nombre}</div>
                  <div className="text-xs text-gray-700 dark:text-gray-300">
                    {key === 'premium' ? 'Todo ilimitado' : `${def.limites.productos} productos · ${def.limites.categorias} categorías`}
                  </div>
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fecha de vencimiento</label>
            <input type="date" value={vencimiento} onChange={e => setVencimiento(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Dejá vacío para sin vencimiento</p>
          </div>
        </div>
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-700">
          <button onClick={onClose} className="text-sm text-gray-700 dark:text-gray-300 hover:underline">Cancelar</button>
          <button onClick={guardar} disabled={loading}
            className="px-5 py-2.5 bg-violet-600 text-white rounded-lg text-sm font-medium hover:bg-violet-700 transition-colors disabled:opacity-50">
            {loading ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function SAPlanes() {
  const [negocios, setNegocios] = useState([])
  const [usos, setUsos] = useState({})
  const [loading, setLoading] = useState(true)
  const [modalNeg, setModalNeg] = useState(null)
  const [tab, setTab] = useState('negocios') // 'negocios' | 'definicion'

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/negocios')
      const negs = data.negocios || []
      setNegocios(negs)

      // Cargar uso de cada negocio en paralelo
      const usosData = {}
      await Promise.allSettled(
        negs.map(async n => {
          try {
            const r = await api.get(`/negocios/${n.id}/uso`)
            usosData[n.id] = r.data
          } catch {}
        })
      )
      setUsos(usosData)
    } catch { toast.error('Error cargando datos') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { cargar() }, [cargar])

  const resumen = {
    total: negocios.length,
    premium: negocios.filter(n => n.plan === 'premium').length,
    estandar: negocios.filter(n => n.plan === 'estandar').length,
    activos: negocios.filter(n => n.activo).length,
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Planes</h1>
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 p-1 rounded-xl">
          {[['negocios','Por negocio'],['definicion','Definición']].map(([k,l]) => (
            <button key={k} onClick={() => setTab(k)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${tab === k ? 'bg-white text-gray-900 dark:text-gray-100 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total negocios', value: resumen.total, color: 'text-gray-900' },
          { label: 'Activos', value: resumen.activos, color: 'text-green-600' },
          { label: 'Plan Estándar', value: resumen.estandar, color: 'text-gray-600' },
          { label: 'Plan Premium', value: resumen.premium, color: 'text-amber-600' },
        ].map(m => (
          <div key={m.label} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-4">
            <p className="text-xs text-gray-700 dark:text-gray-300 mb-1">{m.label}</p>
            <p className={`text-2xl font-bold ${m.color}`}>{m.value}</p>
          </div>
        ))}
      </div>

      {tab === 'negocios' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
          <div className="px-6 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
            <p className="text-xs text-gray-700 dark:text-gray-300 font-medium">Uso de recursos por negocio</p>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {negocios.map(neg => {
                const u = usos[neg.id]
                const planDef = PLAN_DEF[neg.plan] || PLAN_DEF.estandar
                const vencido = neg.vencimiento && new Date(neg.vencimiento) < new Date()
                return (
                  <div key={neg.id} className="px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 bg-violet-100 dark:bg-violet-900/30 rounded-xl flex items-center justify-center flex-shrink-0 text-sm font-bold text-violet-700 dark:text-violet-400">
                          {neg.nombre?.[0]?.toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{neg.nombre}</p>
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${planDef.badge}`}>
                              {neg.plan === 'premium' ? '⭐ Premium' : 'Estándar'}
                            </span>
                            {vencido && (
                              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-600 dark:text-red-400">
                                ⚠ Vencido
                              </span>
                            )}
                            {!neg.activo && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">Inactivo</span>
                            )}
                          </div>
                          {neg.vencimiento && !vencido && (
                            <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                              Vence {new Date(neg.vencimiento).toLocaleDateString('es-AR')}
                            </p>
                          )}
                        </div>
                      </div>

                      <button onClick={() => setModalNeg(neg)}
                        className="flex-shrink-0 px-3 py-1.5 text-xs font-medium bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-400 rounded-lg hover:bg-violet-100 transition-colors">
                        Cambiar plan
                      </button>
                    </div>

                    {u && (
                      <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-0">
                        <BarUso uso={u.uso.productos}    limite={u.limites.productos}    label="Productos" />
                        <BarUso uso={u.uso.categorias}   limite={u.limites.categorias}   label="Categorías" />
                        <BarUso uso={u.uso.operadores}   limite={u.limites.operadores}   label="Operadores" />
                        <BarUso uso={u.uso.repartidores} limite={u.limites.repartidores} label="Repartidores" />
                      </div>
                    )}
                  </div>
                )
              })}
              {negocios.length === 0 && (
                <p className="text-center py-12 text-gray-600 dark:text-gray-400 text-sm">No hay negocios registrados</p>
              )}
            </div>
          )}
        </div>
      )}

      {tab === 'definicion' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Object.entries(PLAN_DEF).map(([key, def]) => (
            <div key={key} className={`bg-white dark:bg-gray-800 rounded-2xl border-2 p-6 shadow-sm ${key === 'premium' ? 'border-amber-200' : 'border-gray-200'}`}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  {key === 'premium' && (
                    <span className="text-xs font-bold bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full mb-2 inline-block">⭐ PREMIUM</span>
                  )}
                  <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">{def.nombre}</h2>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-600 dark:text-gray-400">Negocios activos</p>
                  <p className="text-2xl font-bold text-violet-600 dark:text-violet-400">{negocios.filter(n => n.plan === key).length}</p>
                </div>
              </div>

              <div className="mb-4">
                <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-2">Límites de recursos</p>
                <div className="space-y-1.5">
                  {[
                    ['productos', 'Productos'],
                    ['categorias', 'Categorías'],
                    ['operadores', 'Operadores'],
                    ['repartidores', 'Repartidores'],
                  ].map(([k, l]) => (
                    <div key={k} className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-300">{l}</span>
                      <LimiteVal val={def.limites[k]} />
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-2">Funcionalidades</p>
                <div className="space-y-1.5">
                  {Object.entries(FEATURE_LABELS).map(([k, l]) => (
                    <div key={k} className="flex items-center gap-2 text-sm">
                      {def.accesos[k] ? (
                        <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4 text-gray-500 dark:text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      )}
                      <span className={def.accesos[k] ? 'text-gray-700' : 'text-gray-400'}>{l}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalNeg && (
        <ModalCambiarPlan
          negocio={modalNeg}
          onClose={() => setModalNeg(null)}
          onSaved={cargar}
        />
      )}
    </div>
  )
}
