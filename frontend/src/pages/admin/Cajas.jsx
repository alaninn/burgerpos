import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../context/AuthContext'
import api from '../../api/axios'
import toast from 'react-hot-toast'

function ModalDetalleCaja({ caja, onClose }) {
  const fmt = (n) => Number(n || 0).toLocaleString('es-AR')
  const formatHora = (d) => d ? new Date(d).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) : '—'
  const formatFecha = (d) => d ? new Date(d).toLocaleDateString('es-AR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : '—'
  const duracion = () => {
    if (!caja.aperturaAt || !caja.cierreAt) return '—'
    const mins = Math.floor((new Date(caja.cierreAt) - new Date(caja.aperturaAt)) / 60000)
    if (mins < 60) return `${mins} min`
    return `${Math.floor(mins / 60)}h ${mins % 60}min`
  }
  const efEsperado = Number(caja.saldoInicial || 0) + Number(caja.totalEfectivo || 0)
  const diferencia = Number(caja.diferencia || 0)

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h3 className="font-bold text-gray-900 dark:text-gray-100 text-lg">Arqueo de caja</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5 capitalize">{formatFecha(caja.aperturaAt)}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
            <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Horarios */}
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-3">
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Apertura</p>
              <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{formatHora(caja.aperturaAt)}</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-3">
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Cierre</p>
              <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{formatHora(caja.cierreAt)}</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-3">
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Duración</p>
              <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{duracion()}</p>
            </div>
          </div>

          {/* Ventas por método */}
          <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4 space-y-2.5">
            <p className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-3">Ventas del turno</p>
            {[
              { label: 'Efectivo', value: caja.totalEfectivo, icon: '💵', color: 'text-green-600 dark:text-green-400' },
              { label: 'Tarjeta', value: caja.totalTarjeta, icon: '💳', color: 'text-blue-600 dark:text-blue-400' },
              { label: 'Transferencia', value: caja.totalTransferencia, icon: '📲', color: 'text-violet-600 dark:text-violet-400' },
            ].map(r => (
              <div key={r.label} className="flex items-center justify-between">
                <span className="text-sm text-gray-700 dark:text-gray-300 flex items-center gap-2">
                  <span>{r.icon}</span>{r.label}
                </span>
                <span className={`text-sm font-semibold ${r.color}`}>${fmt(r.value)}</span>
              </div>
            ))}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-2.5 flex justify-between">
              <span className="font-bold text-gray-900 dark:text-gray-100">Total ventas</span>
              <span className="font-black text-violet-700 dark:text-violet-400 text-lg">${fmt(caja.totalVentas)}</span>
            </div>
          </div>

          {/* Arqueo de efectivo */}
          <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4 space-y-2.5">
            <p className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-3">Arqueo de efectivo</p>
            <div className="flex justify-between text-sm">
              <span className="text-gray-700 dark:text-gray-300">Saldo inicial</span>
              <span className="font-medium">${fmt(caja.saldoInicial)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-700 dark:text-gray-300">+ Ventas efectivo</span>
              <span className="font-medium text-green-600 dark:text-green-400">+${fmt(caja.totalEfectivo)}</span>
            </div>
            <div className="flex justify-between text-sm border-t border-gray-200 dark:border-gray-700 pt-2">
              <span className="font-medium text-gray-700 dark:text-gray-300">Efectivo esperado</span>
              <span className="font-bold">${fmt(efEsperado)}</span>
            </div>
            <div className={`flex justify-between text-sm font-bold p-2 rounded-lg ${diferencia >= 0 ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}>
              <span className={diferencia >= 0 ? 'text-green-700 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                {diferencia >= 0 ? 'Sobrante' : 'Faltante'}
              </span>
              <span className={diferencia >= 0 ? 'text-green-700 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                {diferencia >= 0 ? '+' : ''}${fmt(diferencia)}
              </span>
            </div>
          </div>

          {/* Notas */}
          {caja.notas && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-3">
              <p className="text-xs font-bold text-amber-700 dark:text-amber-400 mb-1">📝 Notas del cierre</p>
              <p className="text-sm text-amber-800 dark:text-amber-300">{caja.notas}</p>
            </div>
          )}

          {/* Usuario */}
          {caja.usuario && (
            <p className="text-xs text-gray-600 dark:text-gray-400 text-center">
              Operado por <span className="font-medium">{caja.usuario.nombre}</span>
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

function ModalAbrirCaja({ negocioId, onClose, onOpened }) {
  const [saldoInicial, setSaldoInicial] = useState('')
  const [loading, setLoading] = useState(false)

  const abrir = async () => {
    setLoading(true)
    try {
      await api.post(`/negocios/${negocioId}/cajas/abrir`, { saldoInicial: Number(saldoInicial) || 0 })
      toast.success('Caja abierta')
      onOpened(); onClose()
    } catch (err) { toast.error(err.response?.data?.message || 'Error') }
    finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">Abrir caja</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
            <svg className="w-4 h-4 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="p-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Saldo inicial en caja</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 dark:text-gray-400">$</span>
            <input type="number" value={saldoInicial} onChange={e => setSaldoInicial(e.target.value)}
              placeholder="0"
              className="w-full pl-8 pr-4 py-3 border border-gray-300 dark:border-gray-700 rounded-xl text-lg font-bold focus:outline-none focus:ring-2 focus:ring-violet-500 text-gray-900 dark:text-gray-100"
            />
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">Ingresá el efectivo con que inicia la caja</p>
        </div>
        <div className="flex gap-3 px-6 pb-6">
          <button onClick={onClose} className="flex-1 py-2.5 border border-gray-300 dark:border-gray-700 rounded-xl text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">Cancelar</button>
          <button onClick={abrir} disabled={loading}
            className="flex-1 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-xl text-sm font-bold transition-colors disabled:opacity-50">
            {loading ? 'Abriendo...' : 'Abrir caja'}
          </button>
        </div>
      </div>
    </div>
  )
}

function ModalCerrarCaja({ negocioId, caja, onClose, onClosed }) {
  const [efectivoReal, setEfectivoReal] = useState('')
  const [notas, setNotas] = useState('')
  const [loading, setLoading] = useState(false)

  const efExpected = parseFloat(caja.saldoInicial) + parseFloat(caja.totalEfectivo)
  const diferencia = efectivoReal !== '' ? parseFloat(efectivoReal) - efExpected : 0

  const cerrar = async () => {
    if (!confirm('¿Cerrar la caja ahora?')) return
    setLoading(true)
    try {
      await api.patch(`/negocios/${negocioId}/cajas/${caja.id}/cerrar`, { efectivoReal: Number(efectivoReal), notas })
      toast.success('Caja cerrada correctamente')
      onClosed(); onClose()
    } catch (err) { toast.error(err.response?.data?.message || 'Error') }
    finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">Cerrar caja</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
            <svg className="w-4 h-4 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="p-6 space-y-4">
          {/* Resumen ventas en tiempo real */}
          <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4 space-y-2 text-sm">
            <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-3">Resumen del turno</p>
            {caja.totalPedidos > 0 && (
              <div className="flex justify-between"><span className="text-gray-700 dark:text-gray-300">Pedidos procesados</span><span className="font-medium">{caja.totalPedidos}</span></div>
            )}
            <div className="flex justify-between"><span className="text-gray-700 dark:text-gray-300">Saldo inicial</span><span className="font-medium">${Number(caja.saldoInicial).toLocaleString('es-AR')}</span></div>
            <div className="flex justify-between"><span className="text-gray-700 dark:text-gray-300">Ventas efectivo</span><span className="font-medium text-green-600 dark:text-green-400">+${Number(caja.totalEfectivo).toLocaleString('es-AR')}</span></div>
            <div className="flex justify-between"><span className="text-gray-700 dark:text-gray-300">Ventas tarjeta</span><span className="font-medium">${Number(caja.totalTarjeta).toLocaleString('es-AR')}</span></div>
            <div className="flex justify-between"><span className="text-gray-700 dark:text-gray-300">Transferencias</span><span className="font-medium">${Number(caja.totalTransferencia).toLocaleString('es-AR')}</span></div>
            <div className="border-t border-gray-300 dark:border-gray-700 pt-2 flex justify-between font-bold"><span>Total ventas</span><span className="text-violet-700 dark:text-violet-400">${Number(caja.totalVentas).toLocaleString('es-AR')}</span></div>
            <div className="flex justify-between text-gray-600 dark:text-gray-400"><span>Efectivo esperado en caja</span><span>${(Number(caja.saldoInicial) + Number(caja.totalEfectivo)).toLocaleString('es-AR')}</span></div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Efectivo real en caja</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 dark:text-gray-400">$</span>
              <input type="number" value={efectivoReal} onChange={e => setEfectivoReal(e.target.value)}
                placeholder={efExpected.toLocaleString('es-AR')}
                className="w-full pl-8 pr-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
            {efectivoReal !== '' && (
              <p className={`text-xs mt-1 font-medium ${diferencia >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                {diferencia >= 0 ? 'Sobrante' : 'Faltante'}: ${Math.abs(diferencia).toLocaleString('es-AR')}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Notas del cierre</label>
            <textarea value={notas} onChange={e => setNotas(e.target.value)} rows={2} placeholder="Observaciones..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
            />
          </div>
        </div>
        <div className="flex gap-3 px-6 pb-6">
          <button onClick={onClose} className="flex-1 py-2.5 border border-gray-300 dark:border-gray-700 rounded-xl text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">Cancelar</button>
          <button onClick={cerrar} disabled={loading}
            className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl text-sm font-bold transition-colors disabled:opacity-50">
            {loading ? 'Cerrando...' : 'Cerrar caja'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Cajas() {
  const { usuario } = useAuth()
  const negocioId = usuario?.negocioId
  const [cajaActual, setCajaActual] = useState(null)
  const [historial, setHistorial] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAbrir, setShowAbrir] = useState(false)
  const [showCerrar, setShowCerrar] = useState(false)
  const [cajaDetalle, setCajaDetalle] = useState(null)

  const cargar = useCallback(() => {
    if (!negocioId) return
    setLoading(true)
    Promise.all([
      api.get(`/negocios/${negocioId}/cajas/actual`),
      api.get(`/negocios/${negocioId}/cajas`)
    ])
      .then(([act, hist]) => {
        setCajaActual(act.data?.caja || null)
        setHistorial(hist.data?.cajas || [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [negocioId])

  useEffect(() => { cargar() }, [cargar])

  const formatHora = (d) => d ? new Date(d).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) : '—'
  const formatFecha = (d) => d ? new Date(d).toLocaleDateString('es-AR') : '—'

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Cajas</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">Control de apertura y cierre de caja</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16"><div className="w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <>
          {/* Estado actual */}
          <div className={`rounded-2xl border-2 p-6 mb-6 ${cajaActual ? 'border-green-400 bg-green-50 dark:bg-green-900/20 dark:border-green-700' : 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl ${cajaActual ? 'bg-green-500' : 'bg-gray-400 dark:bg-gray-600'}`}>
                  💰
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-sm font-bold px-2.5 py-0.5 rounded-full ${cajaActual ? 'bg-green-500 text-white' : 'bg-gray-400 dark:bg-gray-600 text-white'}`}>
                      {cajaActual ? '● Caja abierta' : '○ Caja cerrada'}
                    </span>
                  </div>
                  {cajaActual ? (
                    <>
                      <p className="text-sm text-gray-600 dark:text-gray-300">Abierta desde las {formatHora(cajaActual.aperturaAt)}</p>
                      <p className="text-sm text-gray-700 dark:text-gray-300">Saldo inicial: <span className="font-semibold">${Number(cajaActual.saldoInicial).toLocaleString('es-AR')}</span></p>
                    </>
                  ) : (
                    <p className="text-sm text-gray-700 dark:text-gray-300">No hay caja abierta actualmente</p>
                  )}
                </div>
              </div>
              <div>
                {cajaActual ? (
                  <button onClick={() => setShowCerrar(true)}
                    className="px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold text-sm transition-colors">
                    Cerrar caja
                  </button>
                ) : (
                  <button onClick={() => setShowAbrir(true)}
                    className="px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl font-bold text-sm transition-colors">
                    Abrir caja
                  </button>
                )}
              </div>
            </div>

            {cajaActual && (
              <div className="grid grid-cols-4 gap-4 mt-5 pt-5 border-t border-green-200 dark:border-green-800">
                {[
                  { label: 'Total ventas', value: cajaActual.totalVentas, color: 'text-green-700' },
                  { label: 'Efectivo', value: cajaActual.totalEfectivo, color: 'text-gray-700' },
                  { label: 'Tarjeta', value: cajaActual.totalTarjeta, color: 'text-gray-700' },
                  { label: 'Transferencia', value: cajaActual.totalTransferencia, color: 'text-gray-700' },
                ].map(s => (
                  <div key={s.label} className="text-center">
                    <p className={`text-lg font-bold ${s.color}`}>${Number(s.value || 0).toLocaleString('es-AR')}</p>
                    <p className="text-xs text-gray-700 dark:text-gray-300 mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Historial */}
          {historial.filter(c => c.estado === 'cerrada').length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <h2 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">Historial de cajas</h2>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">Hacé click en una fila para ver el detalle</p>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-900">
                  <tr>
                    <th className="text-left px-6 py-2.5 text-xs font-semibold text-gray-700 dark:text-gray-300">Fecha</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-700 dark:text-gray-300">Apertura</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-700 dark:text-gray-300">Cierre</th>
                    <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-700 dark:text-gray-300">Total ventas</th>
                    <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-700 dark:text-gray-300">Diferencia</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {historial.filter(c => c.estado === 'cerrada').map(c => (
                    <tr key={c.id} onClick={() => setCajaDetalle(c)} className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors">
                      <td className="px-6 py-3 text-gray-600 dark:text-gray-300">{formatFecha(c.aperturaAt)}</td>
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{formatHora(c.aperturaAt)}</td>
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{formatHora(c.cierreAt)}</td>
                      <td className="px-4 py-3 text-right font-medium text-gray-900 dark:text-gray-100">${Number(c.totalVentas).toLocaleString('es-AR')}</td>
                      <td className={`px-4 py-3 text-right font-medium ${Number(c.diferencia) >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                        {Number(c.diferencia) >= 0 ? '+' : ''}${Number(c.diferencia).toLocaleString('es-AR')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {cajaDetalle && <ModalDetalleCaja caja={cajaDetalle} onClose={() => setCajaDetalle(null)} />}
      {showAbrir && <ModalAbrirCaja negocioId={negocioId} onClose={() => setShowAbrir(false)} onOpened={cargar} />}
      {showCerrar && cajaActual && <ModalCerrarCaja negocioId={negocioId} caja={cajaActual} onClose={() => setShowCerrar(false)} onClosed={cargar} />}
    </div>
  )
}
