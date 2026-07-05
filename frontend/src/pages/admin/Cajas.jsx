import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../context/AuthContext'
import api from '../../api/axios'
import toast from 'react-hot-toast'

const fmt = (n) => Number(n || 0).toLocaleString('es-AR')
const formatHora = (d) => d ? new Date(d).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) : '—'
const formatFecha = (d) => d ? new Date(d).toLocaleDateString('es-AR') : '—'

function ModalDetalleCaja({ caja, onClose }) {
  const formatFechaLarga = (d) => d ? new Date(d).toLocaleDateString('es-AR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : '—'
  const duracion = () => {
    if (!caja.aperturaAt || !caja.cierreAt) return '—'
    const mins = Math.floor((new Date(caja.cierreAt) - new Date(caja.aperturaAt)) / 60000)
    return mins < 60 ? `${mins} min` : `${Math.floor(mins / 60)}h ${mins % 60}min`
  }
  const efEsperado = Number(caja.saldoInicial || 0) + Number(caja.totalEfectivo || 0) - Number(caja.gastosCaja || 0)
  const diferencia = Number(caja.diferencia || 0)

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h3 className="font-bold text-gray-900 dark:text-gray-100 text-lg">Arqueo · {caja.nombre || 'Caja'}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5 capitalize">{formatFechaLarga(caja.aperturaAt)}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-500 text-xl">✕</button>
        </div>
        <div className="p-6 space-y-5">
          <div className="grid grid-cols-3 gap-3 text-center">
            {[['Apertura', formatHora(caja.aperturaAt)], ['Cierre', formatHora(caja.cierreAt)], ['Duración', duracion()]].map(([l, v]) => (
              <div key={l} className="bg-gray-50 dark:bg-gray-900 rounded-xl p-3">
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">{l}</p>
                <p className="text-base font-bold text-gray-900 dark:text-gray-100">{v}</p>
              </div>
            ))}
          </div>
          <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4 space-y-2.5">
            <p className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase mb-3">Ventas del turno</p>
            {[['Efectivo', caja.totalEfectivo, '💵'], ['Tarjeta', caja.totalTarjeta, '💳'], ['Transferencia', caja.totalTransferencia, '📲']].map(([l, v, i]) => (
              <div key={l} className="flex items-center justify-between text-sm">
                <span className="text-gray-700 dark:text-gray-300">{i} {l}</span>
                <span className="font-semibold text-gray-900 dark:text-gray-100">${fmt(v)}</span>
              </div>
            ))}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-2.5 flex justify-between">
              <span className="font-bold text-gray-900 dark:text-gray-100">Total ventas</span>
              <span className="font-black text-violet-700 dark:text-violet-400 text-lg">${fmt(caja.totalVentas)}</span>
            </div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4 space-y-2.5 text-sm">
            <p className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase mb-3">Arqueo de efectivo</p>
            <div className="flex justify-between"><span className="text-gray-700 dark:text-gray-300">Saldo inicial</span><span className="font-medium">${fmt(caja.saldoInicial)}</span></div>
            <div className="flex justify-between"><span className="text-gray-700 dark:text-gray-300">+ Ventas efectivo</span><span className="font-medium text-green-600 dark:text-green-400">+${fmt(caja.totalEfectivo)}</span></div>
            {Number(caja.gastosCaja) > 0 && <div className="flex justify-between"><span className="text-gray-700 dark:text-gray-300">− Gastos de la caja</span><span className="font-medium text-red-500">−${fmt(caja.gastosCaja)}</span></div>}
            <div className="flex justify-between border-t border-gray-200 dark:border-gray-700 pt-2"><span className="font-medium text-gray-700 dark:text-gray-300">Efectivo esperado</span><span className="font-bold">${fmt(efEsperado)}</span></div>
            {(Number(caja.efectivoRetirado) > 0 || Number(caja.dineroSiguiente) > 0) && (
              <>
                <div className="flex justify-between"><span className="text-gray-700 dark:text-gray-300">Efectivo retirado</span><span className="font-medium text-blue-600 dark:text-blue-400">${fmt(caja.efectivoRetirado)}</span></div>
                <div className="flex justify-between"><span className="text-gray-700 dark:text-gray-300">Queda para el próximo turno</span><span className="font-medium text-blue-600 dark:text-blue-400">${fmt(caja.dineroSiguiente)}</span></div>
              </>
            )}
            <div className={`flex justify-between font-bold p-2 rounded-lg ${diferencia >= 0 ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400' : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'}`}>
              <span>{diferencia >= 0 ? 'Sobrante' : 'Faltante'}</span>
              <span>{diferencia >= 0 ? '+' : ''}${fmt(diferencia)}</span>
            </div>
          </div>
          {caja.notas && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-3">
              <p className="text-xs font-bold text-amber-700 dark:text-amber-400 mb-1">📝 Notas del cierre</p>
              <p className="text-sm text-amber-800 dark:text-amber-300">{caja.notas}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function ModalAbrirCaja({ negocioId, cajasFijas, onClose, onOpened }) {
  const [saldoInicial, setSaldoInicial] = useState('')
  const [cajaDefinidaId, setCajaDefinidaId] = useState('')
  const [nombre, setNombre] = useState('')
  const [loading, setLoading] = useState(false)
  const disponibles = cajasFijas.filter(c => !c.turnoAbiertoId)

  const abrir = async () => {
    setLoading(true)
    try {
      const body = { saldoInicial: Number(saldoInicial) || 0 }
      if (cajaDefinidaId) body.cajaDefinidaId = cajaDefinidaId
      else if (nombre.trim()) body.nombre = nombre.trim()
      await api.post(`/negocios/${negocioId}/cajas/abrir`, body)
      toast.success('Caja abierta')
      onOpened(); onClose()
    } catch (err) { toast.error(err.response?.data?.message || 'Error') }
    finally { setLoading(false) }
  }

  const inputBase = 'w-full px-3 py-2.5 border border-gray-300 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 dark:bg-gray-700 dark:text-white'

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">Abrir caja</h3>
          <button onClick={onClose} className="text-gray-500 text-xl">✕</button>
        </div>
        <div className="p-6 space-y-4">
          {disponibles.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Caja fija (opcional)</label>
              <select value={cajaDefinidaId} onChange={e => { setCajaDefinidaId(e.target.value); if (e.target.value) setNombre('') }} className={inputBase}>
                <option value="">— Caja libre —</option>
                {disponibles.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </div>
          )}
          {!cajaDefinidaId && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nombre de la caja</label>
              <input value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Caja Principal" className={inputBase} />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Saldo inicial</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
              <input type="number" value={saldoInicial} onChange={e => setSaldoInicial(e.target.value)} placeholder="0" className={inputBase + ' pl-8 text-lg font-bold'} />
            </div>
          </div>
        </div>
        <div className="flex gap-3 px-6 pb-6">
          <button onClick={onClose} className="flex-1 py-2.5 border border-gray-300 dark:border-gray-700 rounded-xl text-sm text-gray-600 dark:text-gray-300">Cancelar</button>
          <button onClick={abrir} disabled={loading} className="flex-1 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-xl text-sm font-bold disabled:opacity-50">{loading ? 'Abriendo...' : 'Abrir caja'}</button>
        </div>
      </div>
    </div>
  )
}

function ModalCerrarCaja({ negocioId, caja, onClose, onClosed }) {
  const [retirado, setRetirado] = useState('')
  const [siguiente, setSiguiente] = useState('')
  const [notas, setNotas] = useState('')
  const [loading, setLoading] = useState(false)
  const efExpected = parseFloat(caja.saldoInicial) + parseFloat(caja.totalEfectivo || 0) - parseFloat(caja.gastosCaja || 0)
  const contado = (retirado !== '' || siguiente !== '') ? (Number(retirado || 0) + Number(siguiente || 0)) : null
  const diferencia = contado !== null ? contado - efExpected : 0

  const cerrar = async () => {
    if (!confirm(`¿Cerrar la caja "${caja.nombre || 'actual'}" ahora?`)) return
    setLoading(true)
    try {
      await api.patch(`/negocios/${negocioId}/cajas/${caja.id}/cerrar`, {
        efectivoRetirado: Number(retirado || 0),
        dineroSiguiente: Number(siguiente || 0),
        notas
      })
      toast.success('Caja cerrada correctamente')
      onClosed(); onClose()
    } catch (err) { toast.error(err.response?.data?.message || 'Error') }
    finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">Cerrar caja · {caja.nombre || 'actual'}</h3>
          <button onClick={onClose} className="text-gray-500 text-xl">✕</button>
        </div>
        <div className="p-6 space-y-4">
          <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4 space-y-2 text-sm">
            <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase mb-3">Resumen del turno</p>
            {caja.totalPedidos > 0 && <div className="flex justify-between"><span className="text-gray-700 dark:text-gray-300">Pedidos</span><span className="font-medium">{caja.totalPedidos}</span></div>}
            <div className="flex justify-between"><span className="text-gray-700 dark:text-gray-300">Saldo inicial</span><span className="font-medium">${fmt(caja.saldoInicial)}</span></div>
            <div className="flex justify-between"><span className="text-gray-700 dark:text-gray-300">Ventas efectivo</span><span className="font-medium text-green-600 dark:text-green-400">+${fmt(caja.totalEfectivo)}</span></div>
            {Number(caja.gastosCaja) > 0 && <div className="flex justify-between"><span className="text-gray-700 dark:text-gray-300">Gastos de la caja</span><span className="font-medium text-red-500">−${fmt(caja.gastosCaja)}</span></div>}
            <div className="flex justify-between"><span className="text-gray-700 dark:text-gray-300">Ventas tarjeta</span><span className="font-medium">${fmt(caja.totalTarjeta)}</span></div>
            <div className="flex justify-between"><span className="text-gray-700 dark:text-gray-300">Transferencias</span><span className="font-medium">${fmt(caja.totalTransferencia)}</span></div>
            <div className="border-t border-gray-300 dark:border-gray-700 pt-2 flex justify-between font-bold"><span>Total ventas</span><span className="text-violet-700 dark:text-violet-400">${fmt(caja.totalVentas)}</span></div>
            <div className="flex justify-between text-gray-600 dark:text-gray-400"><span>Efectivo esperado</span><span>${fmt(efExpected)}</span></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Efectivo retirado</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                <input type="number" value={retirado} onChange={e => setRetirado(e.target.value)} placeholder="0" className="w-full pl-8 pr-3 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 dark:bg-gray-700 dark:text-white" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Queda para el próximo turno</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                <input type="number" value={siguiente} onChange={e => setSiguiente(e.target.value)} placeholder="0" className="w-full pl-8 pr-3 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 dark:bg-gray-700 dark:text-white" />
              </div>
            </div>
          </div>
          {contado !== null && (
            <div className="flex items-center justify-between text-sm bg-gray-50 dark:bg-gray-900 rounded-lg px-3 py-2">
              <span className="text-gray-600 dark:text-gray-400">Contado ${fmt(contado)} vs esperado ${fmt(efExpected)}</span>
              <span className={`font-bold ${diferencia >= 0 ? 'text-green-600' : 'text-red-500'}`}>{diferencia >= 0 ? 'Sobrante' : 'Faltante'}: ${fmt(Math.abs(diferencia))}</span>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Notas del cierre</label>
            <textarea value={notas} onChange={e => setNotas(e.target.value)} rows={2} placeholder="Observaciones..." className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 dark:bg-gray-700 dark:text-white resize-none" />
          </div>
        </div>
        <div className="flex gap-3 px-6 pb-6">
          <button onClick={onClose} className="flex-1 py-2.5 border border-gray-300 dark:border-gray-700 rounded-xl text-sm text-gray-600 dark:text-gray-300">Cancelar</button>
          <button onClick={cerrar} disabled={loading} className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl text-sm font-bold disabled:opacity-50">{loading ? 'Cerrando...' : 'Cerrar caja'}</button>
        </div>
      </div>
    </div>
  )
}

export default function Cajas() {
  const { usuario, getNegocioId } = useAuth()
  const negocioId = getNegocioId()
  const esAdmin = ['admin', 'superadmin'].includes(usuario?.rol)

  const [miCaja, setMiCaja] = useState(null)
  const [abiertas, setAbiertas] = useState([])
  const [cajasFijas, setCajasFijas] = useState([])
  const [historial, setHistorial] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAbrir, setShowAbrir] = useState(false)
  const [cerrarCaja, setCerrarCaja] = useState(null)
  const [cajaDetalle, setCajaDetalle] = useState(null)
  const [nuevaFija, setNuevaFija] = useState('')

  const cargar = useCallback(() => {
    if (!negocioId) return
    setLoading(true)
    Promise.all([
      api.get(`/negocios/${negocioId}/cajas/actual`),
      api.get(`/negocios/${negocioId}/cajas/abiertas`),
      api.get(`/negocios/${negocioId}/cajas/fijas`),
      api.get(`/negocios/${negocioId}/cajas`)
    ]).then(([act, ab, fij, hist]) => {
      setMiCaja(act.data?.caja || null)
      setAbiertas(ab.data?.cajas || [])
      setCajasFijas(fij.data?.cajasFijas || [])
      setHistorial(hist.data?.cajas || [])
    }).catch(() => {}).finally(() => setLoading(false))
  }, [negocioId])

  useEffect(() => { cargar() }, [cargar])

  const miCajaId = miCaja?.id
  const accion = async (fn, msg) => { try { await fn(); if (msg) toast.success(msg); cargar() } catch (e) { toast.error(e.response?.data?.message || 'Error') } }
  const unirse = (id) => accion(() => api.post(`/negocios/${negocioId}/cajas/${id}/unirse`), 'Te uniste a la caja')
  const salir = (id) => accion(() => api.post(`/negocios/${negocioId}/cajas/${id}/salir`), 'Saliste de la caja')

  const crearFija = () => {
    if (!nuevaFija.trim()) return
    accion(() => api.post(`/negocios/${negocioId}/cajas/fijas`, { nombre: nuevaFija.trim() }), 'Caja fija creada').then(() => setNuevaFija(''))
  }
  const eliminarFija = (id, nombre) => {
    if (!confirm(`¿Eliminar la caja fija "${nombre}"? El historial de turnos se conserva.`)) return
    accion(() => api.delete(`/negocios/${negocioId}/cajas/fijas/${id}`), 'Caja fija eliminada')
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Cajas</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">Turnos de caja: abrí, unite o cerrá. Varias cajas pueden estar abiertas a la vez.</p>
        </div>
        {!miCaja && <button onClick={() => setShowAbrir(true)} className="px-5 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-xl font-bold text-sm">+ Abrir caja</button>}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16"><div className="w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <>
          {/* Cajas abiertas */}
          {abiertas.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-600 p-8 text-center text-gray-500 dark:text-gray-400">
              No hay cajas abiertas. Abrí una para empezar a operar.
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {abiertas.map(caja => {
                const soyMiembro = (caja.operadores || []).some(o => o.usuarioId === usuario?.id) || miCajaId === caja.id
                return (
                  <div key={caja.id} className={`rounded-2xl border-2 p-5 ${soyMiembro ? 'border-green-400 bg-green-50 dark:bg-green-900/20 dark:border-green-700' : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'}`}>
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">💰</span>
                          <div>
                            <p className="font-bold text-gray-900 dark:text-gray-100">{caja.nombre || 'Caja'}</p>
                            <p className="text-xs text-gray-600 dark:text-gray-400">Desde las {formatHora(caja.aperturaAt)} · saldo inicial ${fmt(caja.saldoInicial)}</p>
                          </div>
                        </div>
                        {(caja.operadores || []).length > 0 && (
                          <p className="text-xs text-gray-500 mt-2">👥 {caja.operadores.map(o => o.usuario?.nombre).filter(Boolean).join(', ')}</p>
                        )}
                      </div>
                      {soyMiembro && <span className="text-[10px] bg-green-500 text-white px-2 py-0.5 rounded-full font-bold">Estás acá</span>}
                    </div>

                    <div className="grid grid-cols-4 gap-2 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 text-center">
                      {[['Ventas', caja.totalVentas], ['Efectivo', caja.totalEfectivo], ['Tarjeta', caja.totalTarjeta], ['Transf.', caja.totalTransferencia]].map(([l, v]) => (
                        <div key={l}><p className="text-sm font-bold text-gray-900 dark:text-gray-100">${fmt(v)}</p><p className="text-[10px] text-gray-500 mt-0.5">{l}</p></div>
                      ))}
                    </div>

                    <div className="flex gap-2 mt-4">
                      {soyMiembro ? (
                        <>
                          <button onClick={() => setCerrarCaja(miCajaId === caja.id ? miCaja : caja)} className="flex-1 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-bold">Cerrar</button>
                          <button onClick={() => salir(caja.id)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-600 dark:text-gray-300">Salir</button>
                        </>
                      ) : (
                        <button onClick={() => unirse(caja.id)} disabled={!!miCaja} title={miCaja ? 'Salí de tu caja actual primero' : ''} className="flex-1 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-sm font-bold disabled:opacity-40">Unirse</button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Cajas fijas */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">Cajas fijas del local</h2>
            </div>
            {cajasFijas.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">No hay cajas fijas. {esAdmin ? 'Creá una abajo (ej: Mañana, Tarde).' : 'El administrador puede crearlas.'}</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {cajasFijas.map(c => (
                  <div key={c.id} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm ${c.turnoAbiertoId ? 'border-green-300 bg-green-50 dark:bg-green-900/20' : 'border-gray-200 dark:border-gray-600'}`}>
                    <span className="font-medium text-gray-800 dark:text-gray-200">{c.nombre}</span>
                    {c.turnoAbiertoId ? (
                      miCajaId === c.turnoAbiertoId ? <span className="text-[10px] text-green-600">abierta (tuya)</span>
                        : <button onClick={() => unirse(c.turnoAbiertoId)} disabled={!!miCaja} className="text-[11px] text-violet-600 font-semibold disabled:opacity-40">unirse</button>
                    ) : <span className="text-[10px] text-gray-400">cerrada</span>}
                    {esAdmin && <button onClick={() => eliminarFija(c.id, c.nombre)} className="text-red-400 hover:text-red-600 text-xs">✕</button>}
                  </div>
                ))}
              </div>
            )}
            {esAdmin && (
              <div className="flex gap-2 mt-4">
                <input value={nuevaFija} onChange={e => setNuevaFija(e.target.value)} onKeyDown={e => e.key === 'Enter' && crearFija()} placeholder="Nueva caja fija (ej: Mañana)" className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 dark:bg-gray-700 dark:text-white" />
                <button onClick={crearFija} className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-sm font-medium">Agregar</button>
              </div>
            )}
          </div>

          {/* Historial */}
          {historial.filter(c => c.estado === 'cerrada').length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <h2 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">Historial de cajas</h2>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">Tocá una fila para ver el arqueo</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-900">
                    <tr>
                      {['Caja', 'Fecha', 'Apertura', 'Cierre', 'Total ventas', 'Diferencia'].map((h, i) => (
                        <th key={h} className={`px-4 py-2.5 text-xs font-semibold text-gray-700 dark:text-gray-300 ${i >= 4 ? 'text-right' : 'text-left'}`}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {historial.filter(c => c.estado === 'cerrada').map(c => (
                      <tr key={c.id} onClick={() => setCajaDetalle(c)} className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
                        <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{c.nombre || '—'}</td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{formatFecha(c.aperturaAt)}</td>
                        <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{formatHora(c.aperturaAt)}</td>
                        <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{formatHora(c.cierreAt)}</td>
                        <td className="px-4 py-3 text-right font-medium text-gray-900 dark:text-gray-100">${fmt(c.totalVentas)}</td>
                        <td className={`px-4 py-3 text-right font-medium ${Number(c.diferencia) >= 0 ? 'text-green-600' : 'text-red-500'}`}>{Number(c.diferencia) >= 0 ? '+' : ''}${fmt(c.diferencia)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {cajaDetalle && <ModalDetalleCaja caja={cajaDetalle} onClose={() => setCajaDetalle(null)} />}
      {showAbrir && <ModalAbrirCaja negocioId={negocioId} cajasFijas={cajasFijas} onClose={() => setShowAbrir(false)} onOpened={cargar} />}
      {cerrarCaja && <ModalCerrarCaja negocioId={negocioId} caja={cerrarCaja} onClose={() => setCerrarCaja(null)} onClosed={cargar} />}
    </div>
  )
}
