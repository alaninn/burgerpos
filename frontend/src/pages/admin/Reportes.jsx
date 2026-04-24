import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../context/AuthContext'
import api from '../../api/axios'
import toast from 'react-hot-toast'

function hoy() { return new Date().toISOString().split('T')[0] }

function DonutChart({ data }) {
  const total = data.reduce((s, d) => s + d.value, 0)
  if (total === 0) return <div className="w-24 h-24 rounded-full bg-gray-100 dark:bg-gray-700 mx-auto" />

  let offset = 0
  const COLORS = ['#7c3aed', '#f59e0b', '#3b82f6', '#10b981']
  const circumference = 2 * Math.PI * 36
  const slices = data.filter(d => d.value > 0).map((d, i) => {
    const pct = d.value / total
    const dash = pct * circumference
    const slice = { ...d, offset, dash, color: COLORS[i % COLORS.length] }
    offset += dash
    return slice
  })

  return (
    <svg viewBox="0 0 100 100" className="w-24 h-24 mx-auto -rotate-90">
      <circle cx="50" cy="50" r="36" fill="none" stroke="#f3f4f6" strokeWidth="16" />
      {slices.map((s, i) => (
        <circle key={i} cx="50" cy="50" r="36" fill="none" stroke={s.color} strokeWidth="16"
          strokeDasharray={`${s.dash} ${circumference - s.dash}`}
          strokeDashoffset={-s.offset}
        />
      ))}
    </svg>
  )
}

export default function Reportes() {
  const { usuario } = useAuth()
  const negocioId = usuario?.negocioId
  const [tab, setTab] = useState('facturacion')
  const [loading, setLoading] = useState(true)
  const [datos, setDatos] = useState(null)
  const [fechaDesde, setFechaDesde] = useState(hoy())
  const [fechaHasta, setFechaHasta] = useState(hoy())
  const [modalidad, setModalidad] = useState('')
  const [metodoPago, setMetodoPago] = useState('')

  const cargar = useCallback(() => {
    if (!negocioId) return
    setLoading(true)
    const params = new URLSearchParams({ fechaDesde, fechaHasta })
    if (modalidad) params.set('modalidad', modalidad)
    if (metodoPago) params.set('metodoPago', metodoPago)

    api.get(`/negocios/${negocioId}/reportes?${params}`)
      .then(({ data }) => setDatos(data))
      .catch(() => setDatos(null))
      .finally(() => setLoading(false))
  }, [negocioId, fechaDesde, fechaHasta, modalidad, metodoPago])

  useEffect(() => { cargar() }, [cargar])

  const exportarExcel = () => {
    const token = localStorage.getItem('token')
    const params = new URLSearchParams({ fechaDesde, fechaHasta })
    const url = `/api/negocios/${negocioId}/reportes/export?${params}`
    // Descarga directa con token en header no es posible con <a>, usamos fetch + blob
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.blob())
      .then(blob => {
        const a = document.createElement('a')
        a.href = URL.createObjectURL(blob)
        a.download = `reporte_${fechaDesde}_${fechaHasta}.xlsx`
        a.click()
        URL.revokeObjectURL(a.href)
      })
      .catch(() => toast.error('Error al exportar'))
  }

  const resumen = datos?.resumen || {}
  const desglose = datos?.desglose || []

  const chartData = [
    { label: 'Efectivo', value: resumen.efectivo || 0 },
    { label: 'Transferencia', value: resumen.transferencia || 0 },
    { label: 'Tarjeta', value: resumen.tarjeta || 0 },
  ]
  const totalFacturado = chartData.reduce((s, d) => s + d.value, 0)

  const pedidosChart = [
    { label: 'Delivery', value: resumen.delivery || 0 },
    { label: 'Take Away', value: resumen.takeaway || 0 },
    { label: 'Salón', value: resumen.salon || 0 },
  ]
  const totalPedidos = pedidosChart.reduce((s, d) => s + d.value, 0)

  return (
    <div className="p-6">
      {/* Filtros */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="flex items-center gap-2">
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
          <option value="">Delivery, Take Away, Salón</option>
          <option value="delivery">Delivery</option>
          <option value="takeaway">Take Away</option>
          <option value="salon">Salón</option>
        </select>
        <select value={metodoPago} onChange={e => setMetodoPago(e.target.value)}
          className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 text-gray-600 dark:text-gray-300">
          <option value="">Método de pago</option>
          <option value="efectivo">Efectivo</option>
          <option value="transferencia">Transferencia</option>
          <option value="tarjeta">Tarjeta</option>
        </select>
      </div>

      {/* Tabs + botón exportar */}
      <div className="flex items-center justify-between border-b border-gray-300 dark:border-gray-700 mb-6">
        <div className="flex">
        {[{ id: 'facturacion', label: 'Facturación' }, { id: 'ventas', label: 'Ventas' }].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`pb-3 px-4 text-sm font-medium border-b-2 -mb-px transition-colors ${tab === t.id ? 'border-violet-600 text-violet-700' : 'border-transparent text-gray-700 dark:text-gray-300 hover:text-gray-700'}`}>
            {t.label}
          </button>
        ))}
        </div>
        <button onClick={exportarExcel}
          className="flex items-center gap-1.5 mb-1 px-3 py-1.5 border border-gray-300 dark:border-gray-700 rounded-lg text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
          Exportar Excel
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16"><div className="w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <>
          {/* Cards resumen */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            {/* Facturación total */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
              <div className="flex items-center gap-6">
                <DonutChart data={chartData} />
                <div className="flex-1">
                  <p className="text-2xl font-bold text-violet-700 dark:text-violet-400">${totalFacturado.toLocaleString('es-AR')}</p>
                  <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">Facturación total</p>
                  <div className="space-y-1">
                    {chartData.filter(d => d.value > 0).map((d, i) => (
                      <div key={i} className="flex justify-between text-xs">
                        <span className="text-gray-700 dark:text-gray-300">{d.label}</span>
                        <span className="text-gray-600 dark:text-gray-400">{totalFacturado > 0 ? ((d.value / totalFacturado) * 100).toFixed(1) : 0}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Pedidos totales */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
              <div className="flex items-center gap-6">
                <DonutChart data={pedidosChart} />
                <div className="flex-1">
                  <p className="text-2xl font-bold text-violet-700 dark:text-violet-400">{totalPedidos}</p>
                  <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">Pedidos totales</p>
                  <div className="space-y-1">
                    {pedidosChart.filter(d => d.value > 0).map((d, i) => (
                      <div key={i} className="flex justify-between text-xs">
                        <span className="text-gray-700 dark:text-gray-300">{d.label}</span>
                        <span className="text-gray-600 dark:text-gray-400">{totalPedidos > 0 ? ((d.value / totalPedidos) * 100).toFixed(0) : 0}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Tablas por modalidad */}
          {/* Alerta sin cobrar */}
          {resumen?.sinCobrar > 0 && (
            <div className="mb-4 flex items-center gap-3 px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
              <span className="text-lg">💰</span>
              <div>
                <p className="text-sm font-bold text-red-700 dark:text-red-400">
                  {resumen.sinCobrar} pedido{resumen.sinCobrar !== 1 ? 's' : ''} sin cobrar
                </p>
                <p className="text-xs text-red-600 dark:text-red-500">Efectivo pendiente de cobro</p>
              </div>
            </div>
          )}

          {desglose.length > 0 ? desglose.map((bloque, i) => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden mb-4">
              <div className="flex items-center justify-between px-6 py-3 border-b border-gray-50">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">{bloque.modalidad}</h3>
                <button onClick={exportarExcel} className="flex items-center gap-1.5 text-sm text-gray-700 dark:text-gray-300 hover:text-gray-700 hover:underline">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                  Exportar Excel
                </button>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <th className="text-left px-6 py-2.5 text-xs font-semibold text-gray-700 dark:text-gray-300">Pago</th>
                    <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-700 dark:text-gray-300">Ticket prom.</th>
                    <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-700 dark:text-gray-300">Productos + Extras</th>
                    {bloque.modalidad === 'Delivery' && <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-700 dark:text-gray-300">Delivery</th>}
                    <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-700 dark:text-gray-300">Propinas</th>
                    <th className="text-right px-6 py-2.5 text-xs font-semibold text-gray-700 dark:text-gray-300">Facturado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {bloque.filas?.map((fila, j) => (
                    <tr key={j} className={fila.esTotal ? 'bg-gray-100 dark:bg-gray-700/50 font-semibold' : 'hover:bg-gray-50 dark:hover:bg-gray-700/30'}>
                      <td className="px-6 py-2.5 text-gray-700 dark:text-gray-300">
                        <div className="flex items-center gap-2">
                          <span>{fila.metodo}</span>
                          {fila.sinCobrar > 0 && (
                            <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">
                              {fila.sinCobrar} sin cobrar
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-right text-gray-600 dark:text-gray-300">${Number(fila.ticketPromedio || 0).toLocaleString('es-AR')}</td>
                      <td className="px-4 py-2.5 text-right text-gray-600 dark:text-gray-300">${Number(fila.productos || 0).toLocaleString('es-AR')}</td>
                      {bloque.modalidad === 'Delivery' && <td className="px-4 py-2.5 text-right text-gray-600 dark:text-gray-300">${Number(fila.delivery || 0).toLocaleString('es-AR')}</td>}
                      <td className="px-4 py-2.5 text-right text-gray-600 dark:text-gray-300">${Number(fila.propinas || 0).toLocaleString('es-AR')}</td>
                      <td className="px-6 py-2.5 text-right font-medium text-gray-900 dark:text-gray-100">${Number(fila.facturado || 0).toLocaleString('es-AR')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )) : (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center text-gray-600 dark:text-gray-400">
              <div className="text-4xl mb-3">📊</div>
              <p>No hay datos para el período seleccionado</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
