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

// ─── Modal pedidos de un repartidor ──────────────────────
function ModalPedidosRepartidor({ negocioId, repartidor, fechaDesde, onClose }) {
  const [pedidos, setPedidos] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const params = new URLSearchParams({ fechaDesde, repartidorId: repartidor.id })
    api.get(`/negocios/${negocioId}/pedidos?${params}`)
      .then(({ data }) => setPedidos(data.pedidos || []))
      .catch(() => setPedidos([]))
      .finally(() => setLoading(false))
  }, [negocioId, repartidor.id, fechaDesde])

  const totalMonto = pedidos.reduce((s, p) => s + Number(p.total || 0), 0)

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">Pedidos — {repartidor.nombre}</h3>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">Desde {new Date(fechaDesde + 'T12:00:00').toLocaleDateString('es-AR')}</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
            <svg className="w-4 h-4 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-7 h-7 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : pedidos.length === 0 ? (
            <div className="text-center py-12 text-gray-600 dark:text-gray-400">
              <div className="text-3xl mb-2">📦</div>
              <p className="text-sm">Sin pedidos en este período</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 sticky top-0">
                <tr>
                  <th className="text-left px-5 py-2.5 text-xs font-semibold text-gray-700 dark:text-gray-300">N°</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-700 dark:text-gray-300">Cliente</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-700 dark:text-gray-300">Estado</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-700 dark:text-gray-300">Pago</th>
                  <th className="text-right px-5 py-2.5 text-xs font-semibold text-gray-700 dark:text-gray-300">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {pedidos.map(p => (
                  <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-5 py-3 font-bold text-violet-600 dark:text-violet-400">N°{p.numero}</td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{p.clienteNombre || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ESTADO_BADGE[p.estado]}`}>
                        {ESTADO_LABEL[p.estado]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300 capitalize text-xs">{p.metodoPago?.replace('_', ' ')}</td>
                    <td className="px-5 py-3 text-right font-semibold text-gray-900 dark:text-gray-100">${Number(p.total).toLocaleString('es-AR')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {!loading && pedidos.length > 0 && (
          <div className="px-6 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex justify-between text-sm flex-shrink-0">
            <span className="text-gray-700 dark:text-gray-300">{pedidos.length} pedidos</span>
            <span className="font-semibold text-gray-900 dark:text-gray-100">Total: ${totalMonto.toLocaleString('es-AR')}</span>
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
  const { usuario } = useAuth()
  const negocioId = usuario?.negocioId
  const [tab, setTab] = useState('envios')
  const [repartidores, setRepartidores] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editRep, setEditRep] = useState(null)
  const [pedidosRep, setPedidosRep] = useState(null) // repartidor para mostrar pedidos
  const [fechaDesde, setFechaDesde] = useState(new Date().toISOString().split('T')[0])

  const cargar = useCallback(() => {
    if (!negocioId) return
    setLoading(true)
    api.get(`/negocios/${negocioId}/repartidores?includeStats=true&fechaDesde=${fechaDesde}`)
      .then(({ data }) => setRepartidores(data.repartidores || []))
      .catch(() => setRepartidores([]))
      .finally(() => setLoading(false))
  }, [negocioId, fechaDesde])

  useEffect(() => { cargar() }, [cargar])

  const eliminar = async (id) => {
    if (!confirm('¿Eliminar este repartidor?')) return
    try {
      await api.delete(`/negocios/${negocioId}/repartidores/${id}`)
      toast.success('Repartidor eliminado')
      cargar()
    } catch { toast.error('Error al eliminar') }
  }

  const activos = repartidores.filter(r => r.activo)

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex gap-4 border-b border-gray-300 dark:border-gray-700">
          {[{ id: 'envios', label: 'Envíos' }, { id: 'mis_envios', label: 'Mis envíos' }].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`pb-3 px-1 text-sm font-medium border-b-2 -mb-px transition-colors ${tab === t.id ? 'border-violet-600 text-violet-700' : 'border-transparent text-gray-700 dark:text-gray-300 hover:text-gray-700'}`}>
              {t.label}
            </button>
          ))}
        </div>
        <button onClick={() => { setEditRep(null); setShowModal(true) }}
          className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg text-sm font-medium hover:bg-violet-700 transition-colors">
          + Nuevo repartidor
        </button>
      </div>

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
            <div key={rep.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-gray-800 dark:text-gray-200">{rep.nombre}</h3>
                  {rep.telefono && <p className="text-xs text-gray-600 dark:text-gray-400">{rep.telefono}</p>}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPedidosRep(rep)}
                    className="text-xs text-violet-600 dark:text-violet-400 font-medium hover:underline px-2 py-1 hover:bg-violet-50 dark:hover:bg-violet-900/30 rounded-lg transition-colors">
                    Pedidos
                  </button>
                  <button onClick={() => { setEditRep(rep); setShowModal(true) }}
                    className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                    <svg className="w-3.5 h-3.5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                  </button>
                  <button onClick={() => eliminar(rep.id)}
                    className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                    <svg className="w-3.5 h-3.5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
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

      {pedidosRep && (
        <ModalPedidosRepartidor
          negocioId={negocioId}
          repartidor={pedidosRep}
          fechaDesde={fechaDesde}
          onClose={() => setPedidosRep(null)}
        />
      )}
    </div>
  )
}
