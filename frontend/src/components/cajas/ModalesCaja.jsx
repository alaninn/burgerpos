// Modales de apertura y cierre de caja, compartidos entre la pagina de
// Cajas del panel administrativo y el Punto de Venta.
import { useState } from 'react'
import api from '../../api/axios'
import toast from 'react-hot-toast'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'

const fmt = (n) => Number(n || 0).toLocaleString('es-AR')
const $fmt = (n) => '$' + Number(n || 0).toLocaleString('es-AR')

export function ModalAbrirCaja({ negocioId, cajasFijas, onClose, onOpened }) {
  const [saldoInicial, setSaldoInicial] = useState('')
  const [cajaDefinidaId, setCajaDefinidaId] = useState('')
  const [nombre, setNombre] = useState('')
  const [loading, setLoading] = useState(false)
  const disponibles = (cajasFijas || []).filter(c => !c.turnoAbiertoId)

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
export function ModalContarBilletes({ onCerrar, onConfirmar }) {
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

export function ModalCerrarCaja({ negocioId, caja, onClose, onClosed }) {
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
