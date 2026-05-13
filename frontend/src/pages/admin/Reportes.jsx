import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../context/AuthContext'
import api from '../../api/axios'
import toast from 'react-hot-toast'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'

function hoy() { return new Date().toISOString().split('T')[0] }

function getDatePreset(preset) {
  const today = new Date()
  const yyyy = today.getFullYear()
  const mm = String(today.getMonth() + 1).padStart(2, '0')
  const dd = String(today.getDate()).padStart(2, '0')
  const hoyStr = `${yyyy}-${mm}-${dd}`

  const formatDate = (date) => {
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }

  switch (preset) {
    case 'hoy': return { desde: hoyStr, hasta: hoyStr }
    case 'ayer': {
      const ayer = new Date(today)
      ayer.setDate(ayer.getDate() - 1)
      return { desde: formatDate(ayer), hasta: formatDate(ayer) }
    }
    case '7dias': {
      const hace7 = new Date(today)
      hace7.setDate(hace7.getDate() - 6)
      return { desde: formatDate(hace7), hasta: hoyStr }
    }
    case '30dias': {
      const hace30 = new Date(today)
      hace30.setDate(hace30.getDate() - 29)
      return { desde: formatDate(hace30), hasta: hoyStr }
    }
    case 'mes': return { desde: `${yyyy}-${mm}-01`, hasta: hoyStr }
    default: return { desde: hoyStr, hasta: hoyStr }
  }
}

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

function GraficoBarrasApiladas({ desglose }) {
  if (!desglose || desglose.length === 0) return null

  const chartData = desglose.map(bloque => {
    const obj = { modalidad: bloque.modalidad }
    bloque.filas?.forEach(fila => {
      if (!fila.esTotal) {
        obj[fila.metodo] = Number(fila.facturado) || 0
      }
    })
    return obj
  })

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 mb-4">
      <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-4">
        Facturación por Modalidad y Método de Pago
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData}>
          <XAxis dataKey="modalidad" stroke="#9ca3af" style={{ fontSize: '12px' }} />
          <YAxis stroke="#9ca3af" style={{ fontSize: '12px' }}
            tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} />
          <Tooltip contentStyle={{
            backgroundColor: '#1f2937',
            border: '1px solid #374151',
            borderRadius: '8px',
            color: '#fff'
          }}
            formatter={(value) => `$${Number(value).toLocaleString('es-AR')}`} />
          <Legend />
          <Bar dataKey="Efectivo" stackId="a" fill="#f59e0b" />
          <Bar dataKey="Transferencia" stackId="a" fill="#3b82f6" />
          <Bar dataKey="Tarjeta" stackId="a" fill="#10b981" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

function TablaOrdenable({ columnas, datos, keyExtractor, emptyMessage = "No hay datos" }) {
  const [sortCol, setSortCol] = useState(null)
  const [sortDir, setSortDir] = useState('desc')

  const toggleSort = (colKey) => {
    if (sortCol === colKey) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    } else {
      setSortCol(colKey)
      setSortDir('desc')
    }
  }

  const datosSorted = [...datos].sort((a, b) => {
    if (!sortCol) return 0
    const col = columnas.find(c => c.key === sortCol)
    const valA = col?.getValue ? col.getValue(a) : a[sortCol]
    const valB = col?.getValue ? col.getValue(b) : b[sortCol]
    const dir = sortDir === 'asc' ? 1 : -1

    if (typeof valA === 'number' && typeof valB === 'number') {
      return (valA - valB) * dir
    }
    return String(valA || '').localeCompare(String(valB || '')) * dir
  })

  if (datos.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center text-gray-600 dark:text-gray-400">
        <div className="text-4xl mb-3">📊</div>
        <p>{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <tr>
            {columnas.map(col => (
              <th key={col.key}
                onClick={() => col.sortable && toggleSort(col.key)}
                className={`text-${col.align || 'left'} px-6 py-2.5 text-xs font-semibold text-gray-700 dark:text-gray-300 ${col.sortable ? 'cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 select-none' : ''
                  }`}>
                <div className={`flex items-center gap-1.5 ${col.align === 'right' ? 'justify-end' : ''}`}>
                  {col.label}
                  {col.sortable && sortCol === col.key && (
                    <span className="text-violet-600 dark:text-violet-400">{sortDir === 'asc' ? '↑' : '↓'}</span>
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
          {datosSorted.map((row, idx) => (
            <tr key={keyExtractor(row, idx)} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
              {columnas.map(col => (
                <td key={col.key} className={`px-6 py-2.5 text-${col.align || 'left'} text-gray-700 dark:text-gray-300`}>
                  {col.render ? col.render(row, idx) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function Reportes() {
  const { usuario, getNegocioId } = useAuth()
  const negocioId = getNegocioId()

  const TABS = [
    { id: 'facturacion', label: 'Facturación', icon: '💰' },
    { id: 'productos', label: 'Productos', icon: '🍔' },
    { id: 'clientes', label: 'Clientes', icon: '👥' },
    { id: 'repartidores', label: 'Repartidores', icon: '🏍️' },
  ]

  const PRESETS = [
    { id: 'hoy', label: 'Hoy' },
    { id: 'ayer', label: 'Ayer' },
    { id: '7dias', label: '7 días' },
    { id: '30dias', label: '30 días' },
    { id: 'mes', label: 'Este mes' },
  ]

  const [tab, setTab] = useState('facturacion')
  const [loading, setLoading] = useState(true)
  const [datos, setDatos] = useState(null)
  const [datosProductos, setDatosProductos] = useState(null)
  const [datosClientes, setDatosClientes] = useState(null)
  const [datosRepartidores, setDatosRepartidores] = useState(null)
  const [fechaDesde, setFechaDesde] = useState(hoy())
  const [fechaHasta, setFechaHasta] = useState(hoy())
  const [modalidad, setModalidad] = useState('')
  const [metodoPago, setMetodoPago] = useState('')

  const cargarFacturacion = useCallback(() => {
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

  const cargarProductos = useCallback(() => {
    if (!negocioId) return
    setLoading(true)
    const params = new URLSearchParams({ fechaDesde, fechaHasta })
    if (modalidad) params.set('modalidad', modalidad)
    if (metodoPago) params.set('metodoPago', metodoPago)

    api.get(`/negocios/${negocioId}/reportes/productos?${params}`)
      .then(({ data }) => setDatosProductos(data.productos || []))
      .catch(() => setDatosProductos([]))
      .finally(() => setLoading(false))
  }, [negocioId, fechaDesde, fechaHasta, modalidad, metodoPago])

  const cargarClientes = useCallback(() => {
    if (!negocioId) return
    setLoading(true)
    const params = new URLSearchParams({ fechaDesde, fechaHasta })

    api.get(`/negocios/${negocioId}/reportes/clientes?${params}`)
      .then(({ data }) => setDatosClientes(data.clientes || []))
      .catch(() => setDatosClientes([]))
      .finally(() => setLoading(false))
  }, [negocioId, fechaDesde, fechaHasta])

  const cargarRepartidores = useCallback(() => {
    if (!negocioId) return
    setLoading(true)
    const params = new URLSearchParams({ fechaDesde, fechaHasta })

    api.get(`/negocios/${negocioId}/reportes/repartidores?${params}`)
      .then(({ data }) => setDatosRepartidores(data.repartidores || []))
      .catch(() => setDatosRepartidores([]))
      .finally(() => setLoading(false))
  }, [negocioId, fechaDesde, fechaHasta])

  useEffect(() => {
    if (!negocioId) return
    if (tab === 'facturacion') cargarFacturacion()
    if (tab === 'productos') cargarProductos()
    if (tab === 'clientes') cargarClientes()
    if (tab === 'repartidores') cargarRepartidores()
  }, [tab, negocioId, fechaDesde, fechaHasta, modalidad, metodoPago, cargarFacturacion, cargarProductos, cargarClientes, cargarRepartidores])

  const aplicarPreset = (preset) => {
    const { desde, hasta } = getDatePreset(preset)
    setFechaDesde(desde)
    setFechaHasta(hasta)
  }

  const exportarExcel = () => {
    const token = localStorage.getItem('token')
    const params = new URLSearchParams({ fechaDesde, fechaHasta })

    // Incluir filtros activos
    if (modalidad) params.set('modalidad', modalidad)
    if (metodoPago) params.set('metodoPago', metodoPago)
    params.set('tab', tab)

    const url = `/api/negocios/${negocioId}/reportes/export?${params}`
    // Descarga directa con token en header no es posible con <a>, usamos fetch + blob
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => {
        if (!r.ok) throw new Error('Error en export')
        return r.blob()
      })
      .then(blob => {
        const a = document.createElement('a')
        a.href = URL.createObjectURL(blob)
        a.download = `reporte_${tab}_${fechaDesde}_${fechaHasta}.xlsx`
        a.click()
        URL.revokeObjectURL(a.href)
        toast.success('Reporte exportado')
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
        {/* Presets de fecha */}
        <div className="w-full flex flex-wrap gap-2 mb-2">
          {PRESETS.map(p => (
            <button key={p.id} onClick={() => aplicarPreset(p.id)}
              className="px-3 py-1.5 text-xs font-medium border border-gray-300 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-violet-50 dark:hover:bg-violet-900/20 hover:border-violet-300 dark:hover:border-violet-700 transition-colors">
              {p.label}
            </button>
          ))}
        </div>

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
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`pb-3 px-4 text-sm font-medium border-b-2 -mb-px transition-colors ${tab === t.id ? 'border-violet-600 text-violet-700 dark:text-violet-400' : 'border-transparent text-gray-700 dark:text-gray-300 hover:text-violet-600'
                }`}>
              <span className="mr-1.5">{t.icon}</span>
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

          {/* Gráfico de barras apiladas */}
          {tab === 'facturacion' && <GraficoBarrasApiladas desglose={desglose} />}

          {/* Tablas por modalidad */}
          {tab === 'facturacion' && (
            <>
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
              <div className="px-6 py-3 border-b border-gray-50 dark:border-gray-700">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">{bloque.modalidad}</h3>
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

          {/* Tab Productos */}
          {tab === 'productos' && (
            <TablaOrdenable
              columnas={[
                { key: 'productoNombre', label: 'Producto', align: 'left', sortable: true },
                {
                  key: 'totalVendido', label: 'Cantidad vendida', align: 'right', sortable: true,
                  getValue: (row) => Number(row.totalVendido) || 0
                },
                {
                  key: 'totalFacturado', label: 'Facturado', align: 'right', sortable: true,
                  getValue: (row) => Number(row.totalFacturado) || 0,
                  render: (row) => `$${Number(row.totalFacturado || 0).toLocaleString('es-AR')}`
                },
                {
                  key: 'porcentaje', label: '% del total', align: 'right', sortable: true,
                  getValue: (row) => {
                    const total = (datosProductos || []).reduce((sum, p) => sum + (Number(p.totalFacturado) || 0), 0)
                    return total > 0 ? (Number(row.totalFacturado) / total) * 100 : 0
                  },
                  render: (row) => {
                    const total = (datosProductos || []).reduce((sum, p) => sum + (Number(p.totalFacturado) || 0), 0)
                    const pct = total > 0 ? ((Number(row.totalFacturado) || 0) / total) * 100 : 0
                    return `${pct.toFixed(1)}%`
                  }
                },
              ]}
              datos={datosProductos || []}
              keyExtractor={(row, idx) => row.productoNombre || idx}
              emptyMessage="No hay productos vendidos en este período"
            />
          )}

          {/* Tab Clientes */}
          {tab === 'clientes' && (
            <TablaOrdenable
              columnas={[
                {
                  key: 'clienteNombre', label: 'Cliente', align: 'left', sortable: true,
                  render: (row, idx) => (
                    <div className="flex items-center gap-2">
                      <span>{row.clienteNombre || 'Sin nombre'}</span>
                      {idx < 10 && (
                        <span className="px-2 py-0.5 bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-xs font-bold rounded-full shadow-sm">
                          👑 VIP
                        </span>
                      )}
                    </div>
                  )
                },
                { key: 'clienteTelefono', label: 'Teléfono', align: 'left', sortable: false },
                {
                  key: 'totalPedidos', label: 'Pedidos', align: 'right', sortable: true,
                  getValue: (row) => Number(row.totalPedidos) || 0
                },
                {
                  key: 'totalGastado', label: 'Gastado', align: 'right', sortable: true,
                  getValue: (row) => Number(row.totalGastado) || 0,
                  render: (row) => `$${Number(row.totalGastado || 0).toLocaleString('es-AR')}`
                },
                {
                  key: 'ticketPromedio', label: 'Ticket promedio', align: 'right', sortable: true,
                  getValue: (row) => Number(row.ticketPromedio) || 0,
                  render: (row) => `$${Number(row.ticketPromedio || 0).toLocaleString('es-AR')}`
                },
              ]}
              datos={datosClientes || []}
              keyExtractor={(row, idx) => `${row.clienteNombre}-${row.clienteTelefono}-${idx}`}
              emptyMessage="No hay clientes en este período"
            />
          )}

          {/* Tab Repartidores */}
          {tab === 'repartidores' && (
            <TablaOrdenable
              columnas={[
                {
                  key: 'nombre', label: 'Repartidor', align: 'left', sortable: true,
                  getValue: (row) => row.Repartidor?.nombre || 'Sin asignar',
                  render: (row) => row.Repartidor?.nombre || 'Sin asignar'
                },
                {
                  key: 'totalEntregas', label: 'Entregas', align: 'right', sortable: true,
                  getValue: (row) => Number(row.totalEntregas) || 0
                },
                {
                  key: 'totalMonto', label: 'Monto total', align: 'right', sortable: true,
                  getValue: (row) => Number(row.totalMonto) || 0,
                  render: (row) => `$${Number(row.totalMonto || 0).toLocaleString('es-AR')}`
                },
                {
                  key: 'totalPropinas', label: 'Propinas', align: 'right', sortable: true,
                  getValue: (row) => Number(row.totalPropinas) || 0,
                  render: (row) => `$${Number(row.totalPropinas || 0).toLocaleString('es-AR')}`
                },
                {
                  key: 'ticketPromedio', label: 'Ticket promedio', align: 'right', sortable: true,
                  getValue: (row) => Number(row.ticketPromedio) || 0,
                  render: (row) => `$${Number(row.ticketPromedio || 0).toLocaleString('es-AR')}`
                },
              ]}
              datos={datosRepartidores || []}
              keyExtractor={(row, idx) => row.repartidorId || idx}
              emptyMessage="No hay repartidores en este período"
            />
          )}
        </>
      )}
    </div>
  )
}
