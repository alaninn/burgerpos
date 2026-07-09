import { useState, useEffect, useCallback } from 'react'
import api from '../../api/axios'
import toast from 'react-hot-toast'

const FEATURE_LABELS = {
  monitorCocina: 'Monitor de cocina (KDS)',
  fiscal: 'Facturación ARCA',
  reportesAvanzados: 'Reportes avanzados',
  descuentos: 'Cupones y descuentos',
  stock: 'Control de stock y gestión',
}

const LIMITE_LABELS = {
  productos: 'Productos',
  categorias: 'Categorías',
  operadores: 'Operadores',
  repartidores: 'Repartidores',
}

// Módulos del menú del negocio que se pueden habilitar por plan
const MODULO_LABELS = {
  menu: 'Menú',
  panelPedidos: 'Panel de pedidos',
  cajas: 'Cajas',
  pedidos: 'Pedidos',
  repartidores: 'Repartidores',
  reportes: 'Reportes',
  gestion: 'Gestión (stock, compras, recetas)',
  clientes: 'Clientes',
  descuentos: 'Descuentos',
  monitorCocina: 'Monitor cocina',
  facturacion: 'Facturación ARCA',
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

function ModalCambiarPlan({ negocio, planes, onClose, onSaved }) {
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
              {Object.entries(planes || {}).map(([key, def]) => (
                <button key={key} onClick={() => setPlan(key)}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${plan === key ? 'border-violet-500 bg-violet-50' : 'border-gray-200 hover:border-gray-300'}`}>
                  <div className="font-semibold text-gray-900 dark:text-gray-100 mb-1">{def.nombre}</div>
                  <div className="text-xs text-gray-700 dark:text-gray-300">
                    ${Number(def.precio).toLocaleString('es-AR')}/mes
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

// Tarjeta editable de definición de un plan
function PlanEditor({ planKey, def, negociosActivos, onSaved }) {
  const [form, setForm] = useState({
    nombre: def.nombre,
    precio: def.precio,
    limites: { ...def.limites },
    accesos: { ...def.accesos },
    modulos: [...(def.modulos || [])],
  })
  const [guardando, setGuardando] = useState(false)
  const esPremium = planKey === 'premium'

  const setLimite = (k, v) => setForm(f => ({ ...f, limites: { ...f.limites, [k]: v } }))
  const toggleAcceso = (k) => setForm(f => ({ ...f, accesos: { ...f.accesos, [k]: !f.accesos[k] } }))
  const toggleModulo = (k) => setForm(f => ({
    ...f,
    modulos: f.modulos.includes(k) ? f.modulos.filter(m => m !== k) : [...f.modulos, k]
  }))

  const guardar = async () => {
    setGuardando(true)
    try {
      await api.put(`/superadmin/planes/${planKey}`, {
        nombre: form.nombre,
        precio: parseFloat(form.precio) || 0,
        limites: Object.fromEntries(Object.entries(form.limites).map(([k, v]) => [k, parseInt(v)])),
        accesos: form.accesos,
        modulos: form.modulos,
      })
      toast.success(`Plan ${form.nombre} actualizado`)
      onSaved()
    } catch (err) { toast.error(err.response?.data?.message || 'Error al guardar el plan') }
    finally { setGuardando(false) }
  }

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-2xl border-2 p-6 shadow-sm ${esPremium ? 'border-amber-200' : 'border-gray-200'}`}>
      <div className="flex items-center justify-between mb-4">
        <div>
          {esPremium && (
            <span className="text-xs font-bold bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full mb-2 inline-block">⭐ PREMIUM</span>
          )}
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">{form.nombre}</h2>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-600 dark:text-gray-400">Negocios activos</p>
          <p className="text-2xl font-bold text-violet-600 dark:text-violet-400">{negociosActivos}</p>
        </div>
      </div>

      {/* Precio */}
      <div className="mb-4">
        <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Precio mensual (ARS)</label>
        <div className="relative mt-1 max-w-[180px]">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
          <input type="number" value={form.precio}
            onChange={e => setForm(f => ({ ...f, precio: e.target.value }))}
            className="w-full pl-7 pr-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-violet-500" />
        </div>
      </div>

      {/* Límites */}
      <div className="mb-4">
        <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-2">Límites de recursos (-1 = ilimitado)</p>
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(LIMITE_LABELS).map(([k, l]) => (
            <div key={k}>
              <label className="text-xs text-gray-600 dark:text-gray-400">{l}</label>
              <input type="number" value={form.limites[k] ?? 0} min={-1}
                onChange={e => setLimite(k, e.target.value)}
                className="w-full px-2.5 py-1.5 border border-gray-300 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-violet-500" />
            </div>
          ))}
        </div>
      </div>

      {/* Funcionalidades */}
      <div className="mb-4">
        <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-2">Funcionalidades</p>
        <div className="space-y-1.5">
          {Object.entries(FEATURE_LABELS).map(([k, l]) => (
            <label key={k} className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={!!form.accesos[k]} onChange={() => toggleAcceso(k)}
                className="w-4 h-4 accent-violet-600" />
              <span className={form.accesos[k] ? 'text-gray-700 dark:text-gray-300' : 'text-gray-400'}>{l}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Módulos del menú */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Módulos del menú</p>
          <button onClick={() => setForm(f => ({ ...f, modulos: Object.keys(MODULO_LABELS) }))}
            className="text-xs text-violet-600 hover:underline">Agregar todos</button>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {Object.entries(MODULO_LABELS).map(([k, l]) => (
            <label key={k} className="flex items-center gap-2 text-xs cursor-pointer">
              <input type="checkbox" checked={form.modulos.includes(k)} onChange={() => toggleModulo(k)}
                className="w-3.5 h-3.5 accent-violet-600" />
              <span className={form.modulos.includes(k) ? 'text-gray-700 dark:text-gray-300' : 'text-gray-400'}>{l}</span>
            </label>
          ))}
        </div>
        <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1.5">Dashboard, Configuraciones y Usuarios están siempre habilitados.</p>
      </div>

      <button onClick={guardar} disabled={guardando}
        className="w-full py-2.5 bg-violet-600 text-white rounded-lg text-sm font-medium hover:bg-violet-700 transition-colors disabled:opacity-50">
        {guardando ? 'Guardando...' : 'Guardar plan'}
      </button>
    </div>
  )
}

export default function SAPlanes() {
  const [negocios, setNegocios] = useState([])
  const [planes, setPlanes] = useState(null)
  const [usos, setUsos] = useState({})
  const [loading, setLoading] = useState(true)
  const [modalNeg, setModalNeg] = useState(null)
  const [tab, setTab] = useState('negocios') // 'negocios' | 'definicion'

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const [negRes, planesRes] = await Promise.all([
        api.get('/negocios'),
        api.get('/superadmin/planes'),
      ])
      const negs = negRes.data.negocios || []
      setNegocios(negs)
      setPlanes(planesRes.data.planes || null)

      // Cargar uso de cada negocio en paralelo
      const usosData = {}
      await Promise.allSettled(
        negs.map(async n => {
          try {
            const r = await api.get(`/negocios/${n.id}/uso`)
            usosData[n.id] = r.data
          } catch { /* sin datos de uso */ }
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
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${tab === k ? 'bg-white text-gray-900 dark:text-gray-100 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-100'}`}>
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
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${neg.plan === 'premium' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'}`}>
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
        planes ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Object.entries(planes).map(([key, def]) => (
              <PlanEditor
                key={key + JSON.stringify(def.precio)}
                planKey={key}
                def={def}
                negociosActivos={negocios.filter(n => n.plan === key).length}
                onSaved={cargar}
              />
            ))}
          </div>
        ) : (
          <p className="text-center py-12 text-gray-500 text-sm">Cargando planes…</p>
        )
      )}

      {modalNeg && (
        <ModalCambiarPlan
          negocio={modalNeg}
          planes={planes}
          onClose={() => setModalNeg(null)}
          onSaved={cargar}
        />
      )}
    </div>
  )
}
