import { useState, useEffect } from 'react'
import { useAuth } from '../../../context/AuthContext'
import api from '../../../api/axios'
import toast from 'react-hot-toast'
import ModalGasto from '../../../components/gestion/ModalGasto'
import ModalCompra from '../../../components/gestion/ModalCompra'

const hoyISO = () => {
  const d = new Date()
  return new Date(d - d.getTimezoneOffset() * 60000).toISOString().split('T')[0]
}

const formatearPeso = (n) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(Number(n) || 0)
const iconoMetodo = (m) => m === 'tarjeta' ? '💳' : m === 'transferencia' ? '🏦' : m === 'mercadopago' ? '📱' : '💵'

export default function GastosDiarios() {
  const { getNegocioId } = useAuth()
  const [gastos, setGastos] = useState([])
  const [loading, setLoading] = useState(true)
  const [cajaAbierta, setCajaAbierta] = useState(false)

  const [showGasto, setShowGasto] = useState(false)
  const [showCompra, setShowCompra] = useState(false)
  const [gastoEditando, setGastoEditando] = useState(null)

  // Filtros
  const [periodo, setPeriodo] = useState('hoy') // hoy | dia | mes | rango | todo
  const [dia, setDia] = useState(hoyISO())
  const [mes, setMes] = useState(() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` })
  const [rangoDesde, setRangoDesde] = useState(hoyISO())
  const [rangoHasta, setRangoHasta] = useState(hoyISO())
  const [filtroOrigen, setFiltroOrigen] = useState('todos')

  const calcularFechas = () => {
    if (periodo === 'hoy') return { desde: hoyISO(), hasta: hoyISO() }
    if (periodo === 'dia') return { desde: dia, hasta: dia }
    if (periodo === 'mes') {
      const [a, m] = mes.split('-')
      const ultimo = new Date(a, m, 0).getDate()
      return { desde: `${a}-${m}-01`, hasta: `${a}-${m}-${ultimo}` }
    }
    if (periodo === 'rango') return { desde: rangoDesde, hasta: rangoHasta }
    return { desde: null, hasta: null }
  }

  useEffect(() => { cargarCaja() }, [])
  useEffect(() => { cargarGastos() }, [periodo, dia, mes, rangoDesde, rangoHasta])

  const cargarCaja = async () => {
    try {
      const { data } = await api.get(`/negocios/${getNegocioId()}/cajas/actual`)
      const caja = data?.caja ?? data
      setCajaAbierta(!!(caja && caja.id))
    } catch { setCajaAbierta(false) }
  }

  const cargarGastos = async () => {
    try {
      setLoading(true)
      const { desde, hasta } = calcularFechas()
      const params = {}
      if (desde) params.fechaDesde = desde
      if (hasta) params.fechaHasta = hasta
      const { data } = await api.get(`/negocios/${getNegocioId()}/gastos`, { params })
      setGastos(data.gastos || [])
    } catch (error) {
      console.error('Error:', error)
      toast.error('Error al cargar gastos')
    } finally {
      setLoading(false)
    }
  }

  const eliminarGasto = async (gasto) => {
    if (!confirm('¿Eliminar este movimiento?\n\nSi era un pago a proveedor, los saldos se ajustan automáticamente.')) return
    try {
      await api.delete(`/negocios/${getNegocioId()}/gastos/${gasto.id}`)
      toast.success('Movimiento eliminado')
      cargarGastos()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al eliminar')
    }
  }

  // Clasificación
  const esCompra = (g) => g.tipo === 'compra' || !!g.compraId
  const esPagoProv = (g) => g.tipo === 'pago_proveedor'
  const esComun = (g) => !esCompra(g) && !esPagoProv(g)
  const origenDe = (g) => g.origenDinero || 'local'

  // Totales
  const totalGeneral = gastos.reduce((a, g) => a + Number(g.monto), 0)
  const totalComunes = gastos.filter(esComun).reduce((a, g) => a + Number(g.monto), 0)
  const totalCompras = gastos.filter(esCompra).reduce((a, g) => a + Number(g.monto), 0)
  const totalPagos = gastos.filter(esPagoProv).reduce((a, g) => a + Number(g.monto), 0)

  const totalPorOrigen = (o) => gastos.filter(g => origenDe(g) === o).reduce((a, g) => a + Number(g.monto), 0)
  const gastosVisibles = filtroOrigen === 'todos' ? gastos : gastos.filter(g => origenDe(g) === filtroOrigen)

  const etiquetaTipo = (g) => {
    if (esCompra(g)) return { label: 'Compra', clase: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400', emoji: '🛒' }
    if (esPagoProv(g)) return { label: 'Pago proveedor', clase: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', emoji: '🧾' }
    return { label: 'Gasto', clase: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400', emoji: '💸' }
  }
  const etiquetaOrigen = (o) => o === 'local' ? '🏪 Local' : o === 'otro' ? '📱 MP local' : '🧰 Caja'

  const btnPeriodo = (key, label) => (
    <button onClick={() => setPeriodo(key)}
      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${periodo === key ? 'bg-violet-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`}>
      {label}
    </button>
  )

  const Tarjeta = ({ titulo, valor, color, activa, onClick, sub }) => (
    <button onClick={onClick} disabled={!onClick}
      className={`text-left bg-white dark:bg-gray-800 rounded-xl p-3.5 border-l-4 ${color} border border-gray-200 dark:border-gray-700 ${onClick ? 'hover:shadow-md cursor-pointer' : ''} ${activa ? 'ring-2 ring-violet-400' : ''}`}>
      <p className="text-[11px] uppercase tracking-wide text-gray-400 font-semibold">{titulo}</p>
      <p className="text-xl font-bold text-gray-800 dark:text-gray-100 tabular-nums">{formatearPeso(valor)}</p>
      {sub && <p className="text-[11px] text-gray-400 mt-0.5">{sub}</p>}
    </button>
  )

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Gastos</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">Gastos, compras y pagos a proveedores del negocio</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { setGastoEditando(null); setShowGasto(true) }}
            className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg font-medium">+ Nuevo gasto</button>
          <button onClick={() => setShowCompra(true)}
            title="Cargar una boleta completa con items que actualizan el stock"
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium">📑 Compra avanzada</button>
        </div>
      </div>

      {/* Filtros de período */}
      <div className="flex items-center gap-2 flex-wrap">
        {btnPeriodo('hoy', 'Hoy')}
        {btnPeriodo('dia', 'Por día')}
        {btnPeriodo('mes', 'Por mes')}
        {btnPeriodo('rango', 'Rango')}
        {btnPeriodo('todo', 'Todo')}
        {periodo === 'dia' && <input type="date" value={dia} onChange={e => setDia(e.target.value)} className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-white" />}
        {periodo === 'mes' && <input type="month" value={mes} onChange={e => setMes(e.target.value)} className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-white" />}
        {periodo === 'rango' && <>
          <input type="date" value={rangoDesde} onChange={e => setRangoDesde(e.target.value)} className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-white" />
          <span className="text-gray-400">→</span>
          <input type="date" value={rangoHasta} onChange={e => setRangoHasta(e.target.value)} className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-white" />
        </>}
      </div>

      {/* Tarjetas por tipo */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Tarjeta titulo="Total" valor={totalGeneral} color="border-violet-500" sub={`${gastos.length} movimiento(s)`} />
        <Tarjeta titulo="Gastos" valor={totalComunes} color="border-orange-400" />
        <Tarjeta titulo="Compras" valor={totalCompras} color="border-teal-400" />
        <Tarjeta titulo="Pagos proveedor" valor={totalPagos} color="border-emerald-400" />
      </div>

      {/* Tarjetas por origen (filtran la lista) */}
      <div className="grid grid-cols-3 gap-3">
        <Tarjeta titulo="🧰 Caja" valor={totalPorOrigen('caja')} color="border-blue-400" activa={filtroOrigen === 'caja'} onClick={() => setFiltroOrigen(filtroOrigen === 'caja' ? 'todos' : 'caja')} />
        <Tarjeta titulo="🏪 Local" valor={totalPorOrigen('local')} color="border-slate-400" activa={filtroOrigen === 'local'} onClick={() => setFiltroOrigen(filtroOrigen === 'local' ? 'todos' : 'local')} />
        <Tarjeta titulo="📱 MP local" valor={totalPorOrigen('otro')} color="border-cyan-400" activa={filtroOrigen === 'otro'} onClick={() => setFiltroOrigen(filtroOrigen === 'otro' ? 'todos' : 'otro')} />
      </div>

      {/* Tabla */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
              <tr>
                {['Descripción', 'Tipo', 'Origen', 'Método', 'Proveedor', 'Monto', 'Acciones'].map((h, i) => (
                  <th key={h} className={`px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider ${i === 5 ? 'text-right' : i === 6 ? 'text-right' : 'text-left'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-500 dark:text-gray-400">Cargando...</td></tr>
              ) : gastosVisibles.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-500 dark:text-gray-400">No hay movimientos en este período</td></tr>
              ) : gastosVisibles.map(gasto => {
                const et = etiquetaTipo(gasto)
                const bloqueado = esCompra(gasto)
                return (
                  <tr key={gasto.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{gasto.descripcion || '-'}</div>
                      <div className="text-xs text-gray-400">{new Date(gasto.fecha).toLocaleDateString('es-AR')}{gasto.tipoComprobante === 'factura_a' && <span className="ml-2 text-violet-500">🧾 Factura A</span>}</div>
                    </td>
                    <td className="px-4 py-3"><span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${et.clase}`}>{et.emoji} {et.label}</span></td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{etiquetaOrigen(origenDe(gasto))}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{iconoMetodo(gasto.metodoPago)} <span className="capitalize">{gasto.metodoPago}</span></td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{gasto.proveedor?.nombre || '-'}</td>
                    <td className="px-4 py-3 text-right text-sm font-semibold text-gray-900 dark:text-gray-100">{formatearPeso(gasto.monto)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {!bloqueado ? (
                          <>
                            <button onClick={() => { setGastoEditando(gasto); setShowGasto(true) }} className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg" title="Editar">✏️</button>
                            <button onClick={() => eliminarGasto(gasto)} className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg" title="Eliminar">🗑️</button>
                          </>
                        ) : <span className="text-xs text-gray-400">compra</span>}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
            {gastosVisibles.length > 0 && (
              <tfoot className="bg-gray-50 dark:bg-gray-900/50 border-t-2 border-gray-300 dark:border-gray-600">
                <tr>
                  <td colSpan={5} className="px-4 py-3 font-semibold text-gray-900 dark:text-gray-100">Total {filtroOrigen !== 'todos' ? `(${etiquetaOrigen(filtroOrigen)})` : ''}</td>
                  <td className="px-4 py-3 text-right font-bold text-violet-600 text-lg">{formatearPeso(gastosVisibles.reduce((a, g) => a + Number(g.monto), 0))}</td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {showGasto && (
        <ModalGasto
          cajaAbierta={cajaAbierta}
          gastoExistente={gastoEditando}
          onCerrar={() => { setShowGasto(false); setGastoEditando(null) }}
          onGuardado={cargarGastos}
        />
      )}
      {showCompra && (
        <ModalCompra
          onClose={() => setShowCompra(false)}
          onGuardado={cargarGastos}
        />
      )}
    </div>
  )
}
