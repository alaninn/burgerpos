import React, { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../context/AuthContext'
import api from '../../api/axios'
import ModalDetallePedido from '../../components/ModalDetallePedido'
import EditorPedido from './EditorPedido'

const MODALIDAD_LABEL = { delivery: 'Delivery', takeaway: 'Take Away', salon: 'Salón' }
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

function hoy() {
  return new Date().toISOString().split('T')[0]
}

export default function Pedidos() {
  const { usuario, getNegocioId } = useAuth()
  const negocioId = getNegocioId()
  const [pedidos, setPedidos] = useState([])
  const [repartidores, setRepartidores] = useState([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [fechaDesde, setFechaDesde] = useState(hoy())
  const [fechaHasta, setFechaHasta] = useState(hoy())
  const [modalidad, setModalidad] = useState('')
  const [estado, setEstado] = useState('')
  const [metodoPago, setMetodoPago] = useState('')
  const [total, setTotal] = useState(null)

  // Modal detalle + editor
  const [pedidoDetalle, setPedidoDetalle] = useState(null)
  const [pedidoEditar, setPedidoEditar] = useState(null)

  const cargar = useCallback(() => {
    if (!negocioId) return
    setLoading(true)
    const params = new URLSearchParams()
    if (fechaDesde) params.set('fechaDesde', fechaDesde)
    if (fechaHasta) params.set('fechaHasta', fechaHasta)
    if (modalidad) params.set('modalidad', modalidad)
    if (estado) params.set('estado', estado)
    if (metodoPago) params.set('metodoPago', metodoPago)

    Promise.all([
      api.get(`/negocios/${negocioId}/pedidos?${params}`),
      api.get(`/negocios/${negocioId}/repartidores`),
    ])
      .then(([pedRes, repRes]) => {
        const ps = pedRes.data.pedidos || []
        setPedidos(ps)
        setTotal(ps.reduce((s, p) => s + Number(p.total), 0))
        setRepartidores(repRes.data.repartidores || [])
      })
      .catch(() => setPedidos([]))
      .finally(() => setLoading(false))
  }, [negocioId, fechaDesde, fechaHasta, modalidad, estado, metodoPago])

  useEffect(() => { cargar() }, [cargar])

  const filtrados = pedidos.filter(p =>
    busqueda ? (p.numero?.toString().includes(busqueda) || p.clienteNombre?.toLowerCase().includes(busqueda.toLowerCase())) : true
  )

  const abrirDetalle = (p) => {
    // Enriquecer pedido con repartidor si está en la lista local
    const rep = repartidores.find(r => r.id === p.repartidorId)
    setPedidoDetalle({ ...p, repartidor: p.repartidor || rep || null })
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6 text-center">Pedidos</h1>

      {/* Buscador */}
      <div className="flex justify-center mb-4">
        <div className="relative w-80">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar por N° o cliente"
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 mb-6 flex flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-700 dark:text-gray-300">Fecha</label>
          <input type="date" value={fechaDesde} onChange={e => setFechaDesde(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
          <span className="text-gray-600 dark:text-gray-400">—</span>
          <input type="date" value={fechaHasta} onChange={e => setFechaHasta(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
        </div>

        <select value={modalidad} onChange={e => setModalidad(e.target.value)}
          className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 text-gray-600 dark:text-gray-300">
          <option value="">Modalidad</option>
          <option value="delivery">Delivery</option>
          <option value="takeaway">Take Away</option>
          <option value="salon">Salón</option>
        </select>

        <select value={estado} onChange={e => setEstado(e.target.value)}
          className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 text-gray-600 dark:text-gray-300">
          <option value="">Estado</option>
          <option value="nuevo">Nuevo</option>
          <option value="en_preparacion">En preparación</option>
          <option value="listo">Listo</option>
          <option value="en_camino">En camino</option>
          <option value="entregado">Entregado</option>
          <option value="cancelado">Cancelado</option>
        </select>

        <select value={metodoPago} onChange={e => setMetodoPago(e.target.value)}
          className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 text-gray-600 dark:text-gray-300">
          <option value="">Método de pago</option>
          <option value="efectivo">Efectivo</option>
          <option value="transferencia">Transferencia</option>
          <option value="tarjeta">Tarjeta</option>
        </select>

        <div className="flex-1" />
        <button
          onClick={() => {
            const token = localStorage.getItem('token')
            const params = new URLSearchParams()
            if (fechaDesde) params.set('fechaDesde', fechaDesde)
            if (fechaHasta) params.set('fechaHasta', fechaHasta)
            fetch(`/api/negocios/${negocioId}/reportes/export?${params}`, { headers: { Authorization: `Bearer ${token}` } })
              .then(r => r.blob()).then(blob => {
                const a = document.createElement('a')
                a.href = URL.createObjectURL(blob)
                a.download = `pedidos_${fechaDesde}_${fechaHasta}.xlsx`
                a.click()
                URL.revokeObjectURL(a.href)
              })
          }}
          className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
          Exportar Excel
        </button>
      </div>

      {/* Tabla */}
      {loading ? (
        <div className="flex items-center justify-center py-16"><div className="w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full animate-spin" /></div>
      ) : filtrados.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          </div>
          <p className="text-gray-700 dark:text-gray-300 font-medium">No se encontraron pedidos.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-700 dark:text-gray-300">Pedido</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-700 dark:text-gray-300">Modalidad</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-700 dark:text-gray-300">Cliente</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-700 dark:text-gray-300">Repartidor</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-700 dark:text-gray-300">Pago</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-700 dark:text-gray-300">Cobrado</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-700 dark:text-gray-300">Total</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-700 dark:text-gray-300">Estado</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-700 dark:text-gray-300">Fecha</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-700 dark:text-gray-300">Items</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtrados.map(p => (
                <tr key={p.id}
                  onClick={() => abrirDetalle(p)}
                  className="hover:bg-violet-50/40 transition-colors cursor-pointer">
                  <td className="px-6 py-3 text-sm font-bold text-violet-600 dark:text-violet-400">N°{p.numero}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{MODALIDAD_LABEL[p.modalidad]}</td>
                  <td className="px-4 py-3 text-sm text-gray-800 dark:text-gray-200">{p.clienteNombre || '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{p.repartidor?.nombre || '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300 capitalize">{p.metodoPago?.replace('_', ' ')}</td>
                  <td className="px-4 py-3">
                    {(p.cobrado === true || !['efectivo','efectivo_sin_descuento'].includes(p.metodoPago))
                      ? <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">✓ Cobrado</span>
                      : <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">💰 Pendiente</span>
                    }
                  </td>
                  <td className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-gray-100">${Number(p.total).toLocaleString('es-AR')}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${ESTADO_BADGE[p.estado]}`}>{ESTADO_LABEL[p.estado]}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-400">
                    {new Date(p.createdAt).toLocaleDateString('es-AR')} {new Date(p.createdAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-400">{p.items?.length || 0} ítems</td>
                </tr>
              ))}
            </tbody>
          </table>
          {total !== null && (
            <div className="px-6 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex justify-between text-sm">
              <span className="text-gray-700 dark:text-gray-300">{filtrados.length} pedidos</span>
              <span className="font-semibold text-gray-900 dark:text-gray-100">Total: ${filtrados.reduce((s, p) => s + Number(p.total), 0).toLocaleString('es-AR')}</span>
            </div>
          )}
        </div>
      )}

      {/* Modal detalle */}
      {pedidoDetalle && (
        <ModalDetallePedido
          pedido={pedidoDetalle}
          repartidores={repartidores}
          onClose={() => setPedidoDetalle(null)}
          onUpdate={() => { cargar(); setPedidoDetalle(null) }}
          onEditar={(p) => { setPedidoDetalle(null); setPedidoEditar(p) }}
        />
      )}

      {/* Editor de pedido */}
      {pedidoEditar && (
        <EditorPedido
          negocioId={negocioId}
          pedidoExistente={pedidoEditar}
          onClose={() => setPedidoEditar(null)}
          onGuardado={() => { cargar(); setPedidoEditar(null) }}
        />
      )}
    </div>
  )
}
