import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../context/AuthContext'
import api from '../../api/axios'
import toast from 'react-hot-toast'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'

const fmt = (n) => Number(n || 0).toLocaleString('es-AR')
const $fmt = (n) => '$' + Number(n || 0).toLocaleString('es-AR')
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

// Helper para contar el efectivo por denominaciones (portado de gestionQ24)
function ModalContarBilletes({ onCerrar, onConfirmar }) {
  const BILLETES = [100, 200, 500, 1000, 2000, 10000, 20000]
  const [cant, setCant] = useState({})
  const total = BILLETES.reduce((a, b) => a + (parseInt(cant[b] || 0) * b), 0)
  const set = (b, v) => setCant(p => ({ ...p, [b]: String(Math.max(0, parseInt(v) || 0)) }))

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 bg-gradient-to-r from-emerald-600 to-green-500 text-white flex-shrink-0">
          <div>
            <h3 className="text-2xl font-bold">💵 Contar billetes</h3>
            <p className="text-emerald-100 text-sm">Desglose de efectivo por denominación</p>
          </div>
          <button onClick={onCerrar} className="text-white/80 hover:text-white text-3xl leading-none">×</button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          <button onClick={() => setCant({})} className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 underline mb-3">Limpiar todo</button>
          <div className="grid gap-3">
            {BILLETES.map(b => {
              const c = parseInt(cant[b] || 0), sub = c * b
              return (
                <div key={b} className={`rounded-2xl p-4 border-2 ${c > 0 ? 'border-emerald-200 bg-emerald-50 dark:bg-emerald-900/20 dark:border-emerald-800' : 'border-gray-200 dark:border-gray-700'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-white ${c > 0 ? 'bg-emerald-500' : 'bg-gray-400 dark:bg-gray-600'}`}>{b >= 1000 ? (b / 1000) + 'k' : b}</div>
                      <span className="text-gray-400 text-xl">×</span>
                      <input type="number" min="0" value={cant[b] || ''} onChange={e => set(b, e.target.value)} placeholder="0"
                        className="w-20 h-12 border-2 border-gray-300 dark:border-gray-600 rounded-xl px-3 text-center text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-400 dark:bg-gray-700 dark:text-white" />
                    </div>
                    <p className={`text-xl font-bold ${c > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400'}`}>{$fmt(sub)}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
        <div className="border-t border-gray-200 dark:border-gray-700 p-6">
          <div className="bg-gradient-to-r from-emerald-500 to-green-500 rounded-2xl p-5 mb-4 text-white flex items-center justify-between">
            <div><p className="text-emerald-100 text-sm">Total contado</p><p className="text-3xl font-bold">{$fmt(total)}</p></div>
            <span className="text-3xl">💰</span>
          </div>
          <div className="flex gap-3">
            <button onClick={onCerrar} className="flex-1 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-2xl text-gray-700 dark:text-gray-300 font-semibold">Cancelar</button>
            <button onClick={() => onConfirmar(total)} disabled={total === 0} className="flex-1 py-3 bg-gradient-to-r from-emerald-600 to-green-500 text-white rounded-2xl font-bold disabled:opacity-50">✅ Usar {$fmt(total)}</button>
          </div>
        </div>
      </div>
    </div>
  )
}

function ModalCerrarCaja({ negocioId, caja, onClose, onClosed }) {
  const [datos, setDatos] = useState({
    efectivoRetirado: '', dineroSiguiente: '',
    tarjetaDeclarada: '', mercadopagoDeclarada: '', transferenciaDeclarada: '', notas: ''
  })
  const [cargando, setCargando] = useState(false)
  const [resultado, setResultado] = useState(null)
  const [contar, setContar] = useState(false)

  const inicio = parseFloat(caja.saldoInicial || 0)
  const gastosCaja = parseFloat(caja.gastosCaja || 0)
  const porMetodo = {
    efectivo: Number(caja.totalEfectivo || 0),
    tarjeta: Number(caja.totalTarjeta || 0),
    mercadopago: Number(caja.totalMercadopago || 0),
    transferencia: Number(caja.totalTransferencia || 0)
  }
  const totalVentas = Number(caja.totalVentas || 0)

  const datosGrafico = [
    { name: 'Efectivo', value: porMetodo.efectivo, color: '#10B981' },
    { name: 'Tarjeta', value: porMetodo.tarjeta, color: '#3B82F6' },
    { name: 'Mercado Pago', value: porMetodo.mercadopago, color: '#8B5CF6' },
    { name: 'Transferencias', value: porMetodo.transferencia, color: '#F59E0B' }
  ].filter(i => i.value > 0)

  const camposCompletos = () => ['efectivoRetirado', 'dineroSiguiente', 'tarjetaDeclarada', 'mercadopagoDeclarada', 'transferenciaDeclarada'].every(k => datos[k] !== '')
  const set = (k, v) => setDatos(p => ({ ...p, [k]: v }))

  const cerrar = async () => {
    if (!camposCompletos()) return
    setCargando(true)
    try {
      await api.patch(`/negocios/${negocioId}/cajas/${caja.id}/cerrar`, {
        efectivoRetirado: Number(datos.efectivoRetirado || 0),
        dineroSiguiente: Number(datos.dineroSiguiente || 0),
        tarjetaDeclarada: Number(datos.tarjetaDeclarada || 0),
        mercadopagoDeclarada: Number(datos.mercadopagoDeclarada || 0),
        transferenciaDeclarada: Number(datos.transferenciaDeclarada || 0),
        notas: datos.notas
      })
      const efectivoDeclaro = Number(datos.efectivoRetirado || 0) + Number(datos.dineroSiguiente || 0)
      const efectivoSistema = porMetodo.efectivo + inicio - gastosCaja
      const tarjetasDeclaro = Number(datos.tarjetaDeclarada || 0)
      const mpDeclaro = Number(datos.mercadopagoDeclarada || 0)
      const transfDeclaro = Number(datos.transferenciaDeclarada || 0)
      const totalDeclaro = efectivoDeclaro + tarjetasDeclaro + mpDeclaro + transfDeclaro
      const totalSistema = totalVentas + inicio - gastosCaja
      setResultado({
        totalDeclaro, totalSistema, diferencia: totalDeclaro - totalSistema,
        efectivo: { declaro: efectivoDeclaro, sistema: efectivoSistema, diff: efectivoDeclaro - efectivoSistema },
        tarjetas: { declaro: tarjetasDeclaro, sistema: porMetodo.tarjeta, diff: tarjetasDeclaro - porMetodo.tarjeta },
        mp: { declaro: mpDeclaro, sistema: porMetodo.mercadopago, diff: mpDeclaro - porMetodo.mercadopago },
        transf: { declaro: transfDeclaro, sistema: porMetodo.transferencia, diff: transfDeclaro - porMetodo.transferencia }
      })
      toast.success('Caja cerrada')
    } catch (err) { toast.error(err.response?.data?.message || 'Error al cerrar caja') }
    finally { setCargando(false) }
  }

  const imprimir = () => {
    const efectivoDeclarado = Number(datos.efectivoRetirado || 0) + Number(datos.dineroSiguiente || 0)
    const totalDeclarado = efectivoDeclarado + Number(datos.tarjetaDeclarada || 0) + Number(datos.mercadopagoDeclarada || 0) + Number(datos.transferenciaDeclarada || 0)
    const totalSistema = totalVentas + inicio - gastosCaja
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Cierre de Caja</title><style>
      *{margin:0;padding:0;box-sizing:border-box}body{font-family:'Courier New',monospace;font-size:14px;font-weight:bold;width:80mm;padding:3mm}
      .center{text-align:center}.grande{font-size:18px}.small{font-size:12px}.sep{border-top:1px dashed #000;margin:4px 0}.sep2{border-top:2px solid #000;margin:4px 0}
      .fila{display:flex;justify-content:space-between;margin:4px 0}@media print{@page{size:80mm auto;margin:0}}</style></head><body>
      <div class="center grande">Cierre de Caja</div>
      <div class="fila small"><span>Caja:</span><span>${caja.nombre || ''}</span></div>
      <div class="fila small"><span>Apertura:</span><span>${new Date(caja.aperturaAt).toLocaleString('es-AR')}</span></div>
      <div class="fila small"><span>Cierre:</span><span>${new Date().toLocaleString('es-AR')}</span></div>
      <div class="sep"></div>
      <div class="fila"><span>Inicio de caja</span><span>${$fmt(inicio)}</span></div>
      <div class="fila"><span>Retirado</span><span>${$fmt(datos.efectivoRetirado)}</span></div>
      <div class="fila"><span>Siguiente turno</span><span>${$fmt(datos.dineroSiguiente)}</span></div>
      ${gastosCaja > 0 ? `<div class="fila"><span>Gastos de caja</span><span>-${$fmt(gastosCaja)}</span></div>` : ''}
      <div class="sep"></div>
      <div class="fila"><span>Total ventas</span><span>${$fmt(totalVentas)}</span></div>
      <div class="fila"><span>Total esperado</span><span>${$fmt(totalSistema)}</span></div>
      <div class="fila"><span>Total declarado</span><span>${$fmt(totalDeclarado)}</span></div>
      <div class="fila"><span>Diferencia</span><span>${$fmt(totalDeclarado - totalSistema)}</span></div>
      <div class="sep"></div>
      <div class="fila"><span>Tarjetas</span><span>${$fmt(datos.tarjetaDeclarada)}</span></div>
      <div class="fila"><span>Mercado Pago</span><span>${$fmt(datos.mercadopagoDeclarada)}</span></div>
      <div class="fila"><span>Transferencias</span><span>${$fmt(datos.transferenciaDeclarada)}</span></div>
      ${datos.notas ? `<div class="sep"></div><div class="small">Notas: ${datos.notas}</div>` : ''}
      <div class="sep2"></div></body></html>`
    const w = window.open('', '_blank', 'width=400,height=600')
    w.document.write(html); w.document.close()
    w.onload = () => { w.focus(); w.print(); w.onafterprint = () => w.close() }
  }

  // Pantalla de resultado
  if (resultado) {
    const ok = Math.abs(resultado.diferencia) < 1
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
          <div className={`p-6 text-white text-center flex-shrink-0 ${ok ? 'bg-green-600' : 'bg-red-500'}`}>
            <p className="text-5xl mb-3">{ok ? '✅' : '⚠️'}</p>
            <h3 className="text-2xl font-bold">{ok ? '¡Cierre perfecto!' : 'Hay diferencias'}</h3>
            <p className="text-white/80 mt-1">{ok ? 'Los valores coinciden con el sistema' : 'Los valores no coinciden con el sistema'}</p>
          </div>
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 dark:bg-gray-900 rounded-2xl p-4 text-center border border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-500 dark:text-gray-400">Vos declaraste</p>
                <p className="text-2xl font-bold text-gray-800 dark:text-gray-100 mt-2">{$fmt(resultado.totalDeclaro)}</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-900 rounded-2xl p-4 text-center border border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-500 dark:text-gray-400">Sistema registró</p>
                <p className="text-2xl font-bold text-gray-800 dark:text-gray-100 mt-2">{$fmt(resultado.totalSistema)}</p>
              </div>
            </div>
            {!ok && (
              <>
                <div className={`rounded-2xl p-4 text-center border-2 ${resultado.diferencia > 0 ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'}`}>
                  <p className="text-lg font-medium text-gray-600 dark:text-gray-300">Diferencia</p>
                  <p className={`text-3xl font-bold mt-2 ${resultado.diferencia > 0 ? 'text-blue-600' : 'text-red-600'}`}>{resultado.diferencia > 0 ? '+' : ''}{$fmt(resultado.diferencia)}</p>
                  <p className="text-sm text-gray-400 mt-2">{resultado.diferencia > 0 ? '📈 Sobrante en caja' : '📉 Faltante en caja'}</p>
                </div>
                <div className="space-y-3">
                  {[['💵 Efectivo', resultado.efectivo], ['💳 Tarjetas', resultado.tarjetas], ['📱 Mercado Pago', resultado.mp], ['🏦 Transferencias', resultado.transf]]
                    .filter(([, v]) => v.diff !== 0).map(([label, v]) => (
                    <div key={label} className="flex items-center justify-between bg-gray-50 dark:bg-gray-900 rounded-xl px-4 py-3 border border-gray-200 dark:border-gray-700">
                      <span className="text-gray-700 dark:text-gray-200 font-medium">{label}</span>
                      <div className="text-right">
                        <span className="text-gray-500 dark:text-gray-400 text-xs block">{$fmt(v.declaro)} declarado vs {$fmt(v.sistema)} sistema</span>
                        <span className={`text-lg font-bold ${v.diff > 0 ? 'text-blue-600' : 'text-red-600'}`}>{v.diff > 0 ? '+' : ''}{$fmt(v.diff)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
          <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex flex-col md:flex-row gap-3">
            <button onClick={imprimir} className="py-3 px-4 border border-gray-300 dark:border-gray-600 rounded-2xl text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-700">🖨️ Imprimir cierre</button>
            <button onClick={() => { onClosed(); onClose() }} className="md:flex-1 py-3 bg-green-600 hover:bg-green-700 text-white rounded-2xl font-bold text-lg">Finalizar</button>
          </div>
        </div>
      </div>
    )
  }

  const inputCls = 'w-full border border-gray-200 dark:border-gray-600 rounded-lg pl-7 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-400 dark:bg-gray-700 dark:text-white'
  const totalG = datosGrafico.reduce((a, x) => a + x.value, 0) || 1

  return (
    <>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
          <div className="flex items-center justify-between p-6 bg-gradient-to-r from-red-600 to-red-500 text-white flex-shrink-0">
            <div>
              <h3 className="text-2xl font-bold">🔒 Cierre de caja</h3>
              <p className="text-red-100 text-sm">{caja.nombre || 'Turno'} · finalizá y cuadrá la caja</p>
            </div>
            <button onClick={onClose} className="text-white/80 hover:text-white text-3xl leading-none">×</button>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto md:flex md:overflow-hidden">
            {/* Panel izquierdo: resumen */}
            <div className="w-full md:w-1/2 p-6 md:border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 md:overflow-y-auto">
              <h4 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-4">📊 Resumen del turno</h4>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Total ventas</p>
                    <p className="text-2xl font-bold text-green-600">{$fmt(totalVentas)}</p>
                    <p className="text-xs text-gray-400">{caja.totalPedidos || 0} transacciones</p>
                  </div>
                  <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Inicio de caja</p>
                    <p className="text-2xl font-bold text-blue-600">{$fmt(inicio)}</p>
                    <p className="text-xs text-gray-400">Saldo de apertura</p>
                  </div>
                </div>
                {gastosCaja > 0 && (
                  <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-3 border border-red-200 dark:border-red-800 flex items-center justify-between">
                    <div><p className="text-sm font-medium text-red-700 dark:text-red-300">💸 Gastos pagados con la caja</p><p className="text-xs text-red-400">Bajan el efectivo esperado</p></div>
                    <p className="text-xl font-bold text-red-600">−{$fmt(gastosCaja)}</p>
                  </div>
                )}
                {datosGrafico.length > 0 && (
                  <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                    <h5 className="font-medium text-gray-700 dark:text-gray-200 mb-3 text-center">📈 Distribución de pagos</h5>
                    <div className="h-44">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={datosGrafico} cx="50%" cy="50%" innerRadius={40} outerRadius={75} dataKey="value">
                            {datosGrafico.map((e, i) => <Cell key={i} fill={e.color} />)}
                          </Pie>
                          <Tooltip formatter={(v) => $fmt(v)} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5">
                      {datosGrafico.map(item => (
                        <div key={item.name} className="flex items-center justify-between gap-2">
                          <span className="flex items-center gap-1.5 min-w-0"><span className="w-2.5 h-2.5 rounded-full" style={{ background: item.color }} /><span className="text-xs text-gray-600 dark:text-gray-300 truncate">{item.name}</span></span>
                          <span className="text-xs font-semibold text-gray-700 dark:text-gray-200">{Math.round((item.value / totalG) * 100)}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Panel derecho: comprobantes y validación */}
            <div className="w-full md:w-1/2 p-6 flex flex-col md:overflow-y-auto border-t md:border-t-0 border-gray-200 dark:border-gray-700">
              <h4 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-4">📄 Comprobantes virtuales</h4>
              <div className="flex-1 space-y-4">
                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between mb-3">
                    <h5 className="font-medium text-gray-700 dark:text-gray-200">💵 Arqueo de efectivo</h5>
                    <button type="button" onClick={() => setContar(true)} className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium">Contar billetes</button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Efectivo a retirar *</label>
                      <div className="relative"><span className="absolute left-3 top-2.5 text-gray-500">$</span>
                        <input type="number" value={datos.efectivoRetirado} onChange={e => set('efectivoRetirado', e.target.value)} className={inputCls} placeholder="0" /></div>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Para siguiente turno *</label>
                      <div className="relative"><span className="absolute left-3 top-2.5 text-gray-500">$</span>
                        <input type="number" value={datos.dineroSiguiente} onChange={e => set('dineroSiguiente', e.target.value)} className={inputCls} placeholder="0" /></div>
                    </div>
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                  <h5 className="font-medium text-gray-700 dark:text-gray-200 mb-3">🧾 Totales por método *</h5>
                  <div className="grid grid-cols-3 gap-3">
                    {[['tarjetaDeclarada', '💳 Tarjetas'], ['mercadopagoDeclarada', '📱 Mercado Pago'], ['transferenciaDeclarada', '🏦 Transf.']].map(([k, label]) => (
                      <div key={k}>
                        <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">{label} *</label>
                        <div className="relative"><span className="absolute left-2 top-2.5 text-gray-500">$</span>
                          <input type="number" value={datos[k]} onChange={e => set(k, e.target.value)} className="w-full border border-gray-200 dark:border-gray-600 rounded-lg pl-6 pr-2 py-2 focus:outline-none focus:ring-2 focus:ring-red-400 dark:bg-gray-700 dark:text-white" placeholder="0" /></div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                  <h5 className="font-medium text-gray-700 dark:text-gray-200 mb-3">📝 Comentarios</h5>
                  <textarea value={datos.notas} onChange={e => set('notas', e.target.value)} rows={2} className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-red-400 dark:bg-gray-700 dark:text-white" placeholder="Notas sobre el cierre (opcional)..." />
                </div>

                <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                  {!camposCompletos() && <p className="text-sm text-amber-600 mb-3 text-center">⚠️ Completá todos los campos obligatorios para cerrar</p>}
                  <div className="flex gap-3">
                    <button type="button" onClick={onClose} className="flex-1 py-3 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-700 dark:text-gray-300 font-medium">Cancelar</button>
                    <button onClick={cerrar} disabled={cargando || !camposCompletos()} className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold disabled:opacity-50">{cargando ? '🔄 Cerrando...' : '🔒 Confirmar cierre'}</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {contar && <ModalContarBilletes onCerrar={() => setContar(false)} onConfirmar={(t) => { set('efectivoRetirado', String(t)); setContar(false) }} />}
    </>
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
