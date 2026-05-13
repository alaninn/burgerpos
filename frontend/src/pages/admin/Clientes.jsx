import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../context/AuthContext'
import api from '../../api/axios'
import toast from 'react-hot-toast'
import DireccionAutocomplete from '../../components/DireccionAutocomplete'

function fmt(n) { return Number(n || 0).toLocaleString('es-AR') }

// ─── Modal editar cliente ─────────────────────────────────
function ModalCliente({ negocioId, cliente, onClose, onSaved, ciudad = '' }) {
  const [form, setForm] = useState({
    nombre: '', telefono: '', email: '', direccion: '', notas: '',
    descuentoFijo: 0,
    ...cliente,
    direcciones: Array.isArray(cliente?.direcciones) ? [...cliente.direcciones] : [],
  })
  const [loading, setLoading] = useState(false)
  const [nuevaDireccion, setNuevaDireccion] = useState('')
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const agregarDireccion = () => {
    const dir = nuevaDireccion.trim()
    if (!dir || form.direcciones.includes(dir)) return
    setForm(p => ({ ...p, direcciones: [...p.direcciones, dir] }))
    setNuevaDireccion('')
  }

  const guardar = async () => {
    if (!form.nombre.trim()) return toast.error('El nombre es obligatorio')
    setLoading(true)
    try {
      const payload = {
        nombre: form.nombre, telefono: form.telefono, email: form.email,
        notas: form.notas, descuentoFijo: Number(form.descuentoFijo) || 0,
        direccion: form.direcciones[0] || form.direccion || '',
        direcciones: form.direcciones,
      }
      if (cliente?.id) await api.put(`/negocios/${negocioId}/clientes/${cliente.id}`, payload)
      else await api.post(`/negocios/${negocioId}/clientes`, payload)
      toast.success(cliente?.id ? 'Cliente actualizado' : 'Cliente creado')
      onSaved(); onClose()
    } catch (err) { toast.error(err.response?.data?.message || 'Error') }
    finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="font-bold text-gray-900 dark:text-gray-100">{cliente?.id ? 'Editar cliente' : 'Nuevo cliente'}</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
            <svg className="w-4 h-4 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-widest mb-1.5">Nombre *</label>
            <input value={form.nombre} onChange={e => set('nombre', e.target.value)} placeholder="Nombre del cliente"
              className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-widest mb-1.5">Teléfono</label>
              <input value={form.telefono} onChange={e => set('telefono', e.target.value)} placeholder="+54 11..."
                className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-widest mb-1.5">Email</label>
              <input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="email@..."
                className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
            </div>
          </div>
          {/* Descuento personalizado */}
          <div>
            <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-widest mb-1.5">Descuento fijo (%)</label>
            <div className="relative">
              <input type="number" value={form.descuentoFijo} onChange={e => set('descuentoFijo', e.target.value)}
                min="0" max="100" placeholder="0"
                className="w-full px-3 py-2.5 pr-8 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 dark:text-gray-400 text-sm">%</span>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Se aplica automáticamente en sus pedidos</p>
          </div>
          {/* Direcciones */}
          <div>
            <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-widest mb-1.5">Direcciones</label>
            {form.direcciones.map((dir, idx) => (
              <div key={idx} className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm mb-1.5 ${idx === 0 ? 'border-violet-300 bg-violet-50 dark:bg-violet-900/20 dark:border-violet-700' : 'border-gray-200 dark:border-gray-700'}`}>
                <span className="flex-1 text-xs truncate text-gray-700 dark:text-gray-300">{idx === 0 ? '📍 ' : ''}{dir}</span>
                <button onClick={() => setForm(p => ({ ...p, direcciones: p.direcciones.filter((_,i) => i !== idx) }))}
                  className="text-gray-400 hover:text-red-400">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            ))}
            <div className="flex gap-2 items-start">
              <div className="flex-1">
                <DireccionAutocomplete
                  value={nuevaDireccion}
                  onChange={setNuevaDireccion}
                  ciudad={ciudad}
                  placeholder="Buscar dirección..."
                  rows={1}
                />
              </div>
              <button onClick={agregarDireccion} className="px-3 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-sm font-bold flex-shrink-0">+</button>
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-widest mb-1.5">Notas</label>
            <textarea value={form.notas} onChange={e => set('notas', e.target.value)} rows={2} placeholder="Notas internas..."
              className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none" />
          </div>
        </div>
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-700">
          <button onClick={onClose} className="text-sm text-gray-600 dark:text-gray-400 hover:text-red-500">Cancelar</button>
          <button onClick={guardar} disabled={loading}
            className="px-6 py-2.5 bg-violet-600 text-white rounded-xl text-sm font-semibold hover:bg-violet-700 disabled:opacity-50 transition-colors">
            {loading ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Modal perfil completo del cliente ───────────────────
function ModalPerfil({ negocioId, cliente, onClose, onEditar }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get(`/negocios/${negocioId}/clientes/${cliente.id}`)
      .then(({ data: d }) => setData(d.cliente))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [negocioId, cliente.id])

  const stats = data?.stats || {}
  const pedidos = data?.pedidos || []
  const ESTADO_COLOR = {
    entregado: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
    cancelado: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400',
    nuevo: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
    en_preparacion: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400',
    listo: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
    en_camino: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400',
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-violet-600 rounded-2xl flex items-center justify-center text-white font-black text-xl">
              {cliente.nombre?.[0]?.toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-gray-900 dark:text-gray-100 text-lg">{cliente.nombre}</h3>
                {data?.numeroCliente && (
                  <span className="text-xs font-bold px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full">
                    #{data.numeroCliente}
                  </span>
                )}
                {data?.descuentoFijo > 0 && (
                  <span className="text-xs font-bold px-2 py-0.5 bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400 rounded-full">
                    {data.descuentoFijo}% dto.
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {cliente.telefono && <span>{cliente.telefono}</span>}
                {cliente.telefono && cliente.email && <span> · </span>}
                {cliente.email && <span>{cliente.email}</span>}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => { onClose(); onEditar(cliente) }}
              className="px-3 py-1.5 border-2 border-violet-600 text-violet-600 dark:text-violet-400 rounded-lg text-sm font-semibold hover:bg-violet-600 hover:text-white transition-colors">
              Editar
            </button>
            <button onClick={onClose} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
              <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-3 border-violet-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {/* Stats */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4 text-center">
                  <p className="text-2xl font-black text-gray-900 dark:text-gray-100">{stats.totalPedidos || 0}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Pedidos totales</p>
                </div>
                <div className="bg-violet-50 dark:bg-violet-900/20 rounded-xl p-4 text-center">
                  <p className="text-2xl font-black text-violet-700 dark:text-violet-400">${fmt(stats.totalGastado)}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Total gastado</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4 text-center">
                  <p className="text-2xl font-black text-gray-900 dark:text-gray-100">
                    ${stats.totalPedidos > 0 ? fmt(Math.round(stats.totalGastado / stats.totalPedidos)) : 0}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Ticket promedio</p>
                </div>
              </div>

              {/* Productos favoritos */}
              {stats.productosFavoritos?.length > 0 && (
                <div>
                  <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-3">⭐ Productos favoritos</h4>
                  <div className="space-y-2">
                    {stats.productosFavoritos.map((p, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <span className="w-6 h-6 bg-violet-100 dark:bg-violet-900/30 rounded-full flex items-center justify-center text-xs font-bold text-violet-700 dark:text-violet-400">
                          {i + 1}
                        </span>
                        <span className="flex-1 text-sm text-gray-900 dark:text-gray-100">{p.nombre}</span>
                        <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">×{p.cantidad}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Direcciones */}
              {data?.direcciones?.length > 0 && (
                <div>
                  <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-2">📍 Direcciones</h4>
                  {data.direcciones.map((dir, i) => (
                    <p key={i} className={`text-sm mb-1 ${i === 0 ? 'text-violet-700 dark:text-violet-400 font-medium' : 'text-gray-600 dark:text-gray-400'}`}>
                      {i === 0 ? '• ' : '  '}{dir}
                    </p>
                  ))}
                </div>
              )}

              {/* Notas */}
              {data?.notas && (
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-3">
                  <p className="text-xs font-bold text-amber-700 dark:text-amber-400 mb-1">📝 Notas</p>
                  <p className="text-sm text-amber-800 dark:text-amber-300">{data.notas}</p>
                </div>
              )}

              {/* Historial de pedidos */}
              <div>
                <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-3">🧾 Últimos pedidos</h4>
                {pedidos.length === 0 ? (
                  <p className="text-sm text-gray-600 dark:text-gray-400 text-center py-4">Sin pedidos</p>
                ) : (
                  <div className="space-y-2">
                    {pedidos.map(p => (
                      <div key={p.id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-xl">
                        <span className="font-bold text-violet-600 dark:text-violet-400 text-sm w-12">#{p.numero}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                            {p.items?.map(i => `${i.cantidad}× ${i.nombre}`).join(', ') || '—'}
                          </p>
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            {new Date(p.createdAt).toLocaleDateString('es-AR')} · {p.modalidad}
                          </p>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${ESTADO_COLOR[p.estado] || ''}`}>
                          {p.estado}
                        </span>
                        <span className="font-bold text-gray-900 dark:text-gray-100 text-sm">${fmt(p.total)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────
export default function Clientes() {
  const { usuario, getNegocioId } = useAuth()
  const negocioId = getNegocioId()
  const [clientes, setClientes] = useState([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editCliente, setEditCliente] = useState(null)
  const [perfilCliente, setPerfilCliente] = useState(null)
  const [ciudad, setCiudad] = useState('')

  useEffect(() => {
    if (!negocioId) return
    api.get(`/negocios/${negocioId}`)
      .then(({ data }) => setCiudad(data.negocio?.ciudad || ''))
      .catch(() => {})
  }, [negocioId])

  const cargar = useCallback(() => {
    if (!negocioId) return
    setLoading(true)
    api.get(`/negocios/${negocioId}/clientes`)
      .then(({ data }) => setClientes(data.clientes || []))
      .catch(() => setClientes([]))
      .finally(() => setLoading(false))
  }, [negocioId])

  useEffect(() => { cargar() }, [cargar])

  const filtrados = clientes.filter(c =>
    busqueda ? (c.nombre?.toLowerCase().includes(busqueda.toLowerCase()) || c.telefono?.includes(busqueda)) : true
  )

  const eliminar = async (id) => {
    if (!confirm('¿Eliminar este cliente?')) return
    try {
      await api.delete(`/negocios/${negocioId}/clientes/${id}`)
      toast.success('Cliente eliminado')
      cargar()
    } catch { toast.error('Error') }
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Clientes</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">{clientes.length} clientes registrados</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
              placeholder="Buscar por nombre o teléfono..."
              className="pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-xl text-sm w-72 focus:outline-none focus:ring-2 focus:ring-violet-500" />
          </div>
          <button onClick={() => { setEditCliente(null); setShowModal(true) }}
            className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 text-white rounded-xl text-sm font-semibold hover:bg-violet-700 transition-colors">
            + Nuevo cliente
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtrados.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-4xl mb-3">👥</div>
          <p className="text-gray-600 dark:text-gray-400">{busqueda ? 'No se encontraron clientes' : 'No hay clientes aún'}</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-700 dark:text-gray-300">N°</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-700 dark:text-gray-300">Cliente</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-700 dark:text-gray-300">Teléfono</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-700 dark:text-gray-300">Dirección</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-700 dark:text-gray-300">Pedidos</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-700 dark:text-gray-300">Descuento</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {filtrados.map(c => (
                <tr key={c.id}
                  onClick={() => setPerfilCliente(c)}
                  className="hover:bg-violet-50/40 dark:hover:bg-violet-900/10 transition-colors cursor-pointer">
                  <td className="px-6 py-3 text-xs font-bold text-gray-500 dark:text-gray-400">
                    {c.numeroCliente ? `#${c.numeroCliente}` : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-violet-100 dark:bg-violet-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-bold text-violet-700 dark:text-violet-400">{c.nombre?.[0]?.toUpperCase()}</span>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{c.nombre}</p>
                        {c.email && <p className="text-xs text-gray-600 dark:text-gray-400">{c.email}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{c.telefono || '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 max-w-xs">
                    <span className="truncate block">{c.direccion || '—'}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm font-semibold text-violet-600 dark:text-violet-400">
                      {c._count?.pedidos || 0}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {c.descuentoFijo > 0 ? (
                      <span className="text-xs font-bold px-2 py-0.5 bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400 rounded-full">
                        {c.descuentoFijo}%
                      </span>
                    ) : <span className="text-gray-400 dark:text-gray-600 text-sm">—</span>}
                  </td>
                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center gap-1 justify-end">
                      <button onClick={() => { setEditCliente(c); setShowModal(true) }}
                        className="p-1.5 hover:bg-violet-50 dark:hover:bg-violet-900/30 rounded-lg text-gray-600 dark:text-gray-400 hover:text-violet-600 transition-colors">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                      </button>
                      <button onClick={() => eliminar(c.id)}
                        className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-gray-600 dark:text-gray-400 hover:text-red-500 transition-colors">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-6 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-xs text-gray-600 dark:text-gray-400">
            {filtrados.length} cliente{filtrados.length !== 1 ? 's' : ''}
            {clientes.length !== filtrados.length && ` de ${clientes.length}`}
          </div>
        </div>
      )}

      {showModal && (
        <ModalCliente negocioId={negocioId} cliente={editCliente} ciudad={ciudad}
          onClose={() => { setShowModal(false); setEditCliente(null) }}
          onSaved={cargar} />
      )}

      {perfilCliente && (
        <ModalPerfil negocioId={negocioId} cliente={perfilCliente}
          onClose={() => setPerfilCliente(null)}
          onEditar={(c) => { setEditCliente(c); setShowModal(true) }} />
      )}
    </div>
  )
}
