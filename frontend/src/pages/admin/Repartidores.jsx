import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../context/AuthContext'
import api from '../../api/axios'
import toast from 'react-hot-toast'

const ESTADO_BADGE = {
  nuevo: 'bg-blue-100 text-blue-700',
  en_preparacion: 'bg-yellow-100 text-yellow-700',
  listo: 'bg-green-100 text-green-700',
  en_camino: 'bg-orange-100 text-orange-700',
  entregado: 'bg-gray-100 text-gray-600',
  cancelado: 'bg-red-100 text-red-600',
}
const ESTADO_LABEL = {
  nuevo: 'Nuevo', en_preparacion: 'En prep.', listo: 'Listo',
  en_camino: 'En camino', entregado: 'Entregado', cancelado: 'Cancelado',
}

// ─── Modal detalles repartidor con estadísticas ──────────
function ModalDetallesRepartidor({ negocioId, repartidor, onClose, onUpdate }) {
  const [periodo, setPeriodo] = useState('hoy')
  const [stats, setStats] = useState(null)
  const [pedidos, setPedidos] = useState([])
  const [loading, setLoading] = useState(true)
  const [editando, setEditando] = useState(false)
  const [form, setForm] = useState({ nombre: repartidor.nombre, telefono: repartidor.telefono || '', activo: repartidor.activo })

  const calcularFechas = (per) => {
    const hoy = new Date()
    let desde = new Date()

    switch(per) {
      case 'hoy':
        desde = new Date(hoy.setHours(0,0,0,0))
        break
      case 'semana':
        desde = new Date(hoy.setDate(hoy.getDate() - 7))
        break
      case 'mes':
        desde = new Date(hoy.setMonth(hoy.getMonth() - 1))
        break
      case 'trimestre':
        desde = new Date(hoy.setMonth(hoy.getMonth() - 3))
        break
    }

    return desde.toISOString().split('T')[0]
  }

  useEffect(() => {
    setLoading(true)
    const fechaDesde = calcularFechas(periodo)
    const params = new URLSearchParams({
      fechaDesde,
      repartidorId: repartidor.id,
      modalidad: 'delivery'
    })

    api.get(`/negocios/${negocioId}/pedidos?${params}`)
      .then(({ data }) => {
        const pedidosFiltrados = (data.pedidos || []).filter(p => p.repartidorId === repartidor.id)
        setPedidos(pedidosFiltrados)

        // Calcular estadísticas
        const totalPedidos = pedidosFiltrados.length
        const totalMonto = pedidosFiltrados.reduce((s, p) => s + Number(p.total || 0), 0)
        const totalPropinas = pedidosFiltrados.reduce((s, p) => s + Number(p.propina || 0), 0)
        const totalEnvios = pedidosFiltrados.reduce((s, p) => s + Number(p.costoEnvio || 0), 0)
        const efectivo = pedidosFiltrados.filter(p => ['efectivo','efectivo_sin_descuento'].includes(p.metodoPago)).reduce((s, p) => s + Number(p.total || 0), 0)
        const online = totalMonto - efectivo
        const entregados = pedidosFiltrados.filter(p => p.estado === 'entregado').length
        const enCamino = pedidosFiltrados.filter(p => p.estado === 'en_camino').length
        const ticketPromedio = totalPedidos > 0 ? totalMonto / totalPedidos : 0

        setStats({
          totalPedidos,
          totalMonto,
          totalPropinas,
          totalEnvios,
          efectivo,
          online,
          entregados,
          enCamino,
          ticketPromedio
        })
      })
      .catch(() => {
        setPedidos([])
        setStats(null)
      })
      .finally(() => setLoading(false))
  }, [negocioId, repartidor.id, periodo])

  const guardarCambios = async () => {
    try {
      await api.put(`/negocios/${negocioId}/repartidores/${repartidor.id}`, form)
      toast.success('Repartidor actualizado')
      setEditando(false)
      onUpdate()
    } catch {
      toast.error('Error al actualizar')
    }
  }

  const totalMonto = pedidos.reduce((s, p) => s + Number(p.total || 0), 0)

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg">
              {repartidor.nombre.charAt(0).toUpperCase()}
            </div>
            <div>
              {editando ? (
                <input
                  value={form.nombre}
                  onChange={e => setForm({ ...form, nombre: e.target.value })}
                  className="font-semibold text-lg bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded"
                />
              ) : (
                <h3 className="font-bold text-lg text-gray-900 dark:text-gray-100">{repartidor.nombre}</h3>
              )}
              {editando ? (
                <input
                  value={form.telefono}
                  onChange={e => setForm({ ...form, telefono: e.target.value })}
                  placeholder="Teléfono"
                  className="text-sm bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded mt-1"
                />
              ) : (
                <p className="text-sm text-gray-600 dark:text-gray-400">{repartidor.telefono || 'Sin teléfono'}</p>
              )}
            </div>
            <span className={`ml-2 px-2.5 py-1 rounded-full text-xs font-semibold ${repartidor.activo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
              {repartidor.activo ? 'Activo' : 'Inactivo'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {editando ? (
              <>
                <button onClick={() => setEditando(false)} className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">
                  Cancelar
                </button>
                <button onClick={guardarCambios} className="px-3 py-1.5 text-sm bg-violet-600 text-white rounded-lg hover:bg-violet-700">
                  Guardar
                </button>
              </>
            ) : (
              <button onClick={() => setEditando(true)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
              </button>
            )}
            <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
              <svg className="w-4 h-4 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        </div>

        {/* Filtro de período */}
        <div className="px-6 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Período:</span>
            {['hoy', 'semana', 'mes', 'trimestre'].map(p => (
              <button
                key={p}
                onClick={() => setPeriodo(p)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  periodo === p
                    ? 'bg-violet-600 text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}>
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Estadísticas */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-3 border-violet-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : stats && (
          <div className="px-6 py-4 grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-4 text-white">
              <div className="text-xs opacity-90 mb-1">Total Pedidos</div>
              <div className="text-2xl font-bold">{stats.totalPedidos}</div>
              <div className="text-xs opacity-75 mt-1">{stats.entregados} entregados</div>
            </div>
            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-4 text-white">
              <div className="text-xs opacity-90 mb-1">Facturado</div>
              <div className="text-2xl font-bold">${Number(stats.totalMonto).toLocaleString('es-AR')}</div>
              <div className="text-xs opacity-75 mt-1">Promedio: ${Number(stats.ticketPromedio).toLocaleString('es-AR')}</div>
            </div>
            <div className="bg-gradient-to-br from-yellow-500 to-orange-500 rounded-xl p-4 text-white">
              <div className="text-xs opacity-90 mb-1">Propinas</div>
              <div className="text-2xl font-bold">${Number(stats.totalPropinas).toLocaleString('es-AR')}</div>
              <div className="text-xs opacity-75 mt-1">Envíos: ${Number(stats.totalEnvios).toLocaleString('es-AR')}</div>
            </div>
            <div className="bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl p-4 text-white">
              <div className="text-xs opacity-90 mb-1">Efectivo</div>
              <div className="text-2xl font-bold">${Number(stats.efectivo).toLocaleString('es-AR')}</div>
              <div className="text-xs opacity-75 mt-1">Online: ${Number(stats.online).toLocaleString('es-AR')}</div>
            </div>
          </div>
        )}

        {/* Lista de pedidos */}
        <div className="flex-1 overflow-y-auto px-6">
          <h4 className="font-semibold text-sm text-gray-700 dark:text-gray-300 mb-3 sticky top-0 bg-white dark:bg-gray-800 py-2">
            Detalle de pedidos ({pedidos.length})
          </h4>
          {pedidos.length === 0 ? (
            <div className="text-center py-12 text-gray-600 dark:text-gray-400">
              <div className="text-3xl mb-2">📦</div>
              <p className="text-sm">Sin pedidos en este período</p>
            </div>
          ) : (
            <div className="space-y-2 pb-4">
              {pedidos.map(p => (
                <div key={p.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-violet-600 dark:text-violet-400">N°{p.numero}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ESTADO_BADGE[p.estado]}`}>
                        {ESTADO_LABEL[p.estado]}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300">{p.clienteNombre || 'Sin nombre'}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{p.clienteDireccion || 'Sin dirección'}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-900 dark:text-gray-100">${Number(p.total).toLocaleString('es-AR')}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 capitalize">{p.metodoPago?.replace('_', ' ')}</p>
                    {p.propina > 0 && (
                      <p className="text-xs text-green-600 dark:text-green-400">+${Number(p.propina).toLocaleString('es-AR')} propina</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer totales */}
        {!loading && pedidos.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex justify-between text-sm flex-shrink-0">
            <span className="text-gray-700 dark:text-gray-300 font-medium">{pedidos.length} pedidos</span>
            <span className="font-bold text-gray-900 dark:text-gray-100">Total: ${totalMonto.toLocaleString('es-AR')}</span>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Modal editar repartidor ──────────────────────────────
function ModalRepartidor({ negocioId, repartidor, onClose, onSaved }) {
  const [form, setForm] = useState({ nombre: '', telefono: '', activo: true, ...repartidor })
  const [loading, setLoading] = useState(false)

  const guardar = async () => {
    if (!form.nombre.trim()) return toast.error('El nombre es obligatorio')
    setLoading(true)
    try {
      if (repartidor?.id) await api.put(`/negocios/${negocioId}/repartidores/${repartidor.id}`, form)
      else await api.post(`/negocios/${negocioId}/repartidores`, form)
      toast.success(repartidor?.id ? 'Repartidor actualizado' : 'Repartidor creado')
      onSaved(); onClose()
    } catch (err) { toast.error(err.response?.data?.message || 'Error') }
    finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">{repartidor?.id ? 'Editar repartidor' : 'Nuevo repartidor'}</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"><svg className="w-4 h-4 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nombre *</label>
            <input value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
              placeholder="Nombre del repartidor"
              className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Teléfono</label>
            <input value={form.telefono || ''} onChange={e => setForm(f => ({ ...f, telefono: e.target.value }))}
              placeholder="Teléfono del repartidor"
              className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.activo} onChange={e => setForm(f => ({ ...f, activo: e.target.checked }))} className="w-4 h-4 accent-violet-600" />
            <span className="text-sm text-gray-700 dark:text-gray-300">Activo</span>
          </label>
        </div>
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-700">
          <button onClick={onClose} className="text-sm text-red-500 hover:underline">Cancelar</button>
          <button onClick={guardar} disabled={loading}
            className="px-6 py-2 bg-violet-600 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-50">
            {loading ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────
export default function Repartidores() {
  const { usuario, getNegocioId } = useAuth()
  const negocioId = getNegocioId()
  const [tab, setTab] = useState('envios')
  const [repartidores, setRepartidores] = useState([])
  const [statsHoy, setStatsHoy] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editRep, setEditRep] = useState(null)
  const [detallesRep, setDetallesRep] = useState(null) // repartidor para mostrar detalles
  const [fechaDesde, setFechaDesde] = useState(new Date().toISOString().split('T')[0])

  const cargar = useCallback(() => {
    if (!negocioId) return
    setLoading(true)
    // Cargar usuarios con rol repartidor en lugar de tabla repartidores
    api.get(`/negocios/${negocioId}/usuarios`)
      .then(({ data }) => {
        const repartidoresUsuarios = (data.usuarios || []).filter(u => u.rol === 'repartidor')
        // Cargar stats para cada repartidor
        return Promise.all(repartidoresUsuarios.map(async (rep) => {
          try {
            const statsRes = await api.get(`/negocios/${negocioId}/pedidos?fechaDesde=${fechaDesde}&repartidorId=${rep.id}&modalidad=delivery`)
            const pedidos = (statsRes.data.pedidos || []).filter(p => p.repartidorId === rep.id)
            const totalMonto = pedidos.reduce((s, p) => s + Number(p.total || 0), 0)
            const efectivo = pedidos.filter(p => ['efectivo','efectivo_sin_descuento'].includes(p.metodoPago)).reduce((s, p) => s + Number(p.total || 0), 0)
            const online = totalMonto - efectivo
            rep.stats = {
              totalPedidos: pedidos.length,
              totalMonto,
              efectivo,
              online,
              envios: pedidos.reduce((s, p) => s + Number(p.costoEnvio || 0), 0),
              propinas: pedidos.reduce((s, p) => s + Number(p.propina || 0), 0)
            }
          } catch {
            rep.stats = { totalPedidos: 0, totalMonto: 0, efectivo: 0, online: 0, envios: 0, propinas: 0 }
          }
          return rep
        }))
      })
      .then(reps => setRepartidores(reps))
      .catch(() => setRepartidores([]))
      .finally(() => setLoading(false))
  }, [negocioId, fechaDesde])

  const cargarStatsHoy = useCallback(() => {
    if (!negocioId) return
    const hoy = new Date().toISOString().split('T')[0]
    api.get(`/negocios/${negocioId}/reportes/repartidores?fechaDesde=${hoy}&fechaHasta=${hoy}`)
      .then(({ data }) => setStatsHoy(data || []))
      .catch(() => setStatsHoy([]))
  }, [negocioId])

  useEffect(() => { cargar(); cargarStatsHoy() }, [cargar, cargarStatsHoy])


  const activos = repartidores.filter(r => r.activo)

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Repartidores</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">Los repartidores se crean desde Usuarios con rol "Repartidor"</p>
        </div>
      </div>

      {/* Estadísticas del día */}
      {statsHoy.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">📊 Rendimiento de Hoy</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {statsHoy.map((stat, idx) => {
              const gradientes = [
                'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
                'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
                'linear-gradient(135deg, #30cfd0 0%, #330867 100%)',
              ]
              const gradient = gradientes[idx % gradientes.length]

              return (
                <div key={stat.repartidorId || idx}
                  style={{ background: gradient }}
                  className="rounded-2xl p-6 text-white shadow-lg hover:shadow-2xl transition-all">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2.5 bg-white/20 rounded-xl backdrop-blur-sm">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-lg">{stat['Repartidor.nombre'] || 'Sin nombre'}</h3>
                    </div>
                  </div>

                  <div className="space-y-2.5 text-sm">
                    <div className="flex items-center justify-between bg-white/10 rounded-lg px-3 py-2 backdrop-blur-sm">
                      <span className="font-medium">Entregas</span>
                      <span className="font-bold text-lg">{stat.totalEntregas || 0}</span>
                    </div>
                    <div className="flex items-center justify-between bg-white/10 rounded-lg px-3 py-2 backdrop-blur-sm">
                      <span className="font-medium">Monto total</span>
                      <span className="font-bold">${Number(stat.totalMonto || 0).toLocaleString('es-AR')}</span>
                    </div>
                    <div className="flex items-center justify-between bg-white/10 rounded-lg px-3 py-2 backdrop-blur-sm">
                      <span className="font-medium">Propinas</span>
                      <span className="font-bold text-yellow-200">${Number(stat.totalPropinas || 0).toLocaleString('es-AR')}</span>
                    </div>
                    <div className="flex items-center justify-between bg-white/10 rounded-lg px-3 py-2 backdrop-blur-sm">
                      <span className="font-medium">Ticket prom.</span>
                      <span className="font-bold">${Number(stat.ticketPromedio || 0).toLocaleString('es-AR')}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Filtro fecha */}
      <div className="flex items-center gap-3 mb-6">
        <label className="text-sm text-gray-700 dark:text-gray-300">Desde</label>
        <input type="date" value={fechaDesde} onChange={e => setFechaDesde(e.target.value)}
          className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16"><div className="w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {activos.map(rep => (
            <div key={rep.id}
              onClick={() => setDetallesRep(rep)}
              className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm hover:shadow-md transition-all cursor-pointer hover:border-violet-300 dark:hover:border-violet-600">
              <div className="flex items-center justify-between mb-4">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-800 dark:text-gray-200">{rep.nombre}</h3>
                  {rep.telefono && <p className="text-xs text-gray-600 dark:text-gray-400">{rep.telefono}</p>}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Editar desde Usuarios
                </div>
              </div>

              {/* Stats */}
              <div className="space-y-3 text-sm">
                <div className="flex justify-between font-semibold text-gray-900 dark:text-gray-100">
                  <span>{rep.stats?.totalPedidos || 0} Pedidos</span>
                  <span>${Number(rep.stats?.totalMonto || 0).toLocaleString('es-AR')}</span>
                </div>
                <div className="flex justify-between text-gray-600 dark:text-gray-400 text-xs">
                  <div className="flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                    Efectivo
                  </div>
                  <span>${Number(rep.stats?.efectivo || 0).toLocaleString('es-AR')}</span>
                </div>
                <div className="flex justify-between text-gray-600 dark:text-gray-400 text-xs">
                  <div className="flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
                    Pagos Online
                  </div>
                  <span>${Number(rep.stats?.online || 0).toLocaleString('es-AR')}</span>
                </div>
                <div className="flex justify-between font-medium text-gray-700 dark:text-gray-300 pt-1 border-t border-gray-50">
                  <span>Envíos</span>
                  <span>${Number(rep.stats?.envios || 0).toLocaleString('es-AR')}</span>
                </div>
                <div className="flex justify-between font-medium text-gray-700 dark:text-gray-300">
                  <span>Propina</span>
                  <span>${Number(rep.stats?.propinas || 0).toLocaleString('es-AR')}</span>
                </div>
              </div>
            </div>
          ))}

          {activos.length === 0 && (
            <div className="col-span-3 text-center py-12 text-gray-600 dark:text-gray-400">
              <div className="text-4xl mb-3">🛵</div>
              <p>No hay repartidores activos</p>
            </div>
          )}
        </div>
      )}

      {showModal && (
        <ModalRepartidor negocioId={negocioId} repartidor={editRep}
          onClose={() => { setShowModal(false); setEditRep(null) }}
          onSaved={cargar}
        />
      )}

      {detallesRep && (
        <ModalDetallesRepartidor
          negocioId={negocioId}
          repartidor={detallesRep}
          onClose={() => setDetallesRep(null)}
          onUpdate={() => { cargar(); cargarStatsHoy() }}
        />
      )}
    </div>
  )
}
