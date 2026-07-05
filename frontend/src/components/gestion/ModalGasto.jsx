import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import api from '../../api/axios'
import toast from 'react-hot-toast'

// Modal unificado para registrar un gasto comun o un pago a proveedor.
// Portado y adaptado de gestionQ24 (mismos flujos: dato fiscal, origen del
// dinero, alta rapida de proveedor y cuenta corriente).
export default function ModalGasto({ onCerrar, onGuardado, cajaAbierta = false, gastoExistente = null }) {
  const { getNegocioId } = useAuth()
  const negocioId = getNegocioId()

  const esEdicion = !!gastoExistente
  const fechaHoy = new Date().toLocaleDateString('en-CA')
  const fechaExistente = gastoExistente?.fecha ? String(gastoExistente.fecha).split('T')[0] : fechaHoy

  const [tabActiva, setTabActiva] = useState(
    gastoExistente?.tipo === 'pago_proveedor' ? 'proveedor' : 'gasto'
  )
  const [form, setForm] = useState({
    descripcion: gastoExistente?.descripcion || '',
    monto: gastoExistente?.monto != null ? String(gastoExistente.monto) : '',
    metodoPago: gastoExistente?.metodoPago || 'efectivo',
    origenDinero: gastoExistente?.origenDinero || (cajaAbierta ? 'caja' : 'local'),
    proveedorId: gastoExistente?.proveedorId ? String(gastoExistente.proveedorId) : '',
    tipoComprobante: gastoExistente?.tipoComprobante === 'factura_a' ? 'factura_a' : '',
    registrarFactura: false,
    totalFactura: gastoExistente?.totalFactura || '',
    fecha: fechaExistente
  })
  const [proveedores, setProveedores] = useState([])
  const [guardando, setGuardando] = useState(false)

  const [mostrarNuevoProveedor, setMostrarNuevoProveedor] = useState(false)
  const [nuevoProveedor, setNuevoProveedor] = useState({ nombre: '', telefono: '' })
  const [creandoProveedor, setCreandoProveedor] = useState(false)

  useEffect(() => { cargarProveedores() }, [])

  const cargarProveedores = async () => {
    try {
      const { data } = await api.get(`/negocios/${negocioId}/proveedores?activo=true`)
      setProveedores(data.proveedores || [])
    } catch (err) {
      console.error('Error al cargar proveedores:', err)
    }
  }

  const crearProveedorRapido = async () => {
    if (!nuevoProveedor.nombre.trim()) return
    try {
      setCreandoProveedor(true)
      const { data } = await api.post(`/negocios/${negocioId}/proveedores`, {
        nombre: nuevoProveedor.nombre.trim(),
        telefono: nuevoProveedor.telefono.trim() || null
      })
      await cargarProveedores()
      setForm(p => ({ ...p, proveedorId: String(data.proveedor.id) }))
      setNuevoProveedor({ nombre: '', telefono: '' })
      setMostrarNuevoProveedor(false)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al crear el proveedor')
    } finally {
      setCreandoProveedor(false)
    }
  }

  const proveedorSeleccionado = proveedores.find(p => String(p.id) === String(form.proveedorId))
  const esFacturaA = form.tipoComprobante === 'factura_a'
  const ivaContenido = esFacturaA ? Number(((Number(form.monto) || 0) * 21 / 121).toFixed(2)) : 0

  const guardar = async (e) => {
    e.preventDefault()
    const esPagoProveedor = tabActiva === 'proveedor'
    const monto = Number(form.monto || 0)

    if (esPagoProveedor) {
      if (!form.proveedorId) return toast.error('Elegí el proveedor')
      if (monto <= 0 && !(form.registrarFactura && Number(form.totalFactura) > 0)) {
        return toast.error('Cargá el monto a pagar (o registrá la factura recibida)')
      }
    } else {
      if (monto <= 0) return toast.error('El monto debe ser mayor a 0')
      if (!form.descripcion.trim()) return toast.error('Contá brevemente qué se pagó')
    }

    setGuardando(true)
    try {
      let descripcion = form.descripcion
      if (esPagoProveedor && !descripcion) {
        const totalFactura = Number(form.totalFactura || 0)
        if (form.registrarFactura && totalFactura > 0) {
          descripcion = monto >= totalFactura ? 'Pago total de factura'
            : monto > 0 ? 'Pago parcial de factura' : 'Registro de factura (sin pago)'
        } else {
          descripcion = 'Pago a cuenta de deuda'
        }
      }

      const body = {
        descripcion,
        monto: form.monto || 0,
        categoria: esPagoProveedor ? 'proveedores' : 'otro',
        tipo: esPagoProveedor ? 'pago_proveedor' : 'variable',
        metodoPago: form.metodoPago,
        origenDinero: form.origenDinero,
        proveedorId: esPagoProveedor ? form.proveedorId : null,
        tipoPagoProveedor: esPagoProveedor ? 'a_cuenta' : null,
        fecha: form.fecha || null,
        tipoComprobante: esFacturaA ? 'factura_a' : null,
        registrarNuevaFactura: esPagoProveedor && form.registrarFactura && Number(form.totalFactura) > 0,
        totalFactura: esPagoProveedor && form.registrarFactura ? (form.totalFactura || null) : null
      }

      if (esEdicion) {
        await api.put(`/negocios/${negocioId}/gastos/${gastoExistente.id}`, body)
      } else {
        await api.post(`/negocios/${negocioId}/gastos`, body)
      }
      toast.success(esEdicion ? 'Gasto actualizado' : 'Gasto registrado')
      onGuardado?.()
      onCerrar()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al guardar el gasto')
    } finally {
      setGuardando(false)
    }
  }

  const origenes = [
    { id: 'caja', label: '🧰 Caja del turno', desc: 'Descuenta del cierre', soloConCaja: true },
    { id: 'local', label: '🏪 Dinero del local', desc: 'Baja el disponible' },
    { id: 'otro', label: '📱 MP del local', desc: 'Baja el disponible' }
  ]

  const inputBase = 'w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500 dark:bg-gray-700 dark:text-white'

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onCerrar}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md max-h-[95vh] overflow-y-auto" onClick={e => e.stopPropagation()}>

        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">{esEdicion ? 'Editar gasto' : 'Nuevo gasto'}</h3>
          <button onClick={onCerrar} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-2xl leading-none">×</button>
        </div>

        {/* Pestañas */}
        <div className={`flex border-b border-gray-200 dark:border-gray-700 ${esEdicion ? 'hidden' : ''}`}>
          <button type="button" onClick={() => setTabActiva('gasto')}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${tabActiva === 'gasto'
              ? 'text-violet-700 dark:text-violet-300 border-b-2 border-violet-600'
              : 'text-gray-500 dark:text-gray-400'}`}>
            💸 Gasto
          </button>
          <button type="button" onClick={() => setTabActiva('proveedor')}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${tabActiva === 'proveedor'
              ? 'text-violet-700 dark:text-violet-300 border-b-2 border-violet-600'
              : 'text-gray-500 dark:text-gray-400'}`}>
            🧾 Pago a proveedor
          </button>
        </div>

        <form onSubmit={guardar} className="p-4 space-y-4">

          {tabActiva === 'gasto' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Monto *</label>
                  <input type="number" value={form.monto} min="0" step="0.01" required
                    onChange={e => setForm(p => ({ ...p, monto: e.target.value }))}
                    className={inputBase + ' text-lg'} placeholder="$0,00" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fecha</label>
                  <input type="date" value={form.fecha}
                    onChange={e => setForm(p => ({ ...p, fecha: e.target.value }))} className={inputBase} />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Descripción *</label>
                <textarea value={form.descripcion} rows={2} required
                  onChange={e => setForm(p => ({ ...p, descripcion: e.target.value }))}
                  className={inputBase + ' resize-none'} placeholder="¿Qué se pagó? Ej: hielo, sodas, flete, luz..." />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Método de pago</label>
                <select value={form.metodoPago} onChange={e => setForm(p => ({ ...p, metodoPago: e.target.value }))} className={inputBase}>
                  <option value="efectivo">💵 Efectivo</option>
                  <option value="tarjeta">💳 Tarjeta</option>
                  <option value="transferencia">🏦 Transferencia</option>
                  <option value="mercadopago">📱 Mercado Pago</option>
                </select>
              </div>
            </>
          )}

          {tabActiva === 'proveedor' && (
            <>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Proveedor *</label>
                  <button type="button" onClick={() => setMostrarNuevoProveedor(v => !v)}
                    className="text-xs font-semibold text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-700 hover:bg-violet-50 dark:hover:bg-violet-900/30 px-2.5 py-1 rounded-lg">
                    {mostrarNuevoProveedor ? '← Elegir existente' : '➕ Nuevo proveedor'}
                  </button>
                </div>

                {!mostrarNuevoProveedor ? (
                  <select value={form.proveedorId} onChange={e => setForm(p => ({ ...p, proveedorId: e.target.value, monto: '' }))} className={inputBase}>
                    <option value="">Buscar proveedor...</option>
                    {proveedores.map(prov => (
                      <option key={prov.id} value={prov.id}>
                        {prov.nombre}{Number(prov.saldoAFavor) > 0 ? ` (le debemos: $${Number(prov.saldoAFavor).toLocaleString('es-AR')})` : Number(prov.saldoDeuda) > 0 ? ` (nos debe: $${Number(prov.saldoDeuda).toLocaleString('es-AR')})` : ''}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800 rounded-xl p-3 space-y-2">
                    <input type="text" value={nuevoProveedor.nombre} autoFocus
                      onChange={e => setNuevoProveedor(p => ({ ...p, nombre: e.target.value }))}
                      className={inputBase} placeholder="Nombre del proveedor *" />
                    <input type="tel" value={nuevoProveedor.telefono}
                      onChange={e => setNuevoProveedor(p => ({ ...p, telefono: e.target.value }))}
                      className={inputBase} placeholder="Teléfono (opcional)" />
                    <button type="button" disabled={!nuevoProveedor.nombre.trim() || creandoProveedor} onClick={crearProveedorRapido}
                      className="w-full py-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-40 text-white rounded-lg text-sm font-semibold">
                      {creandoProveedor ? 'Creando...' : '✅ Crear y seleccionar'}
                    </button>
                  </div>
                )}
              </div>

              {proveedorSeleccionado && (Number(proveedorSeleccionado.saldoAFavor) > 0 || Number(proveedorSeleccionado.saldoDeuda) > 0) && (
                <div className="p-3 rounded-lg border bg-amber-50 dark:bg-amber-900/20 border-amber-300 dark:border-amber-700 flex items-center justify-between">
                  <div className="text-sm">
                    {Number(proveedorSeleccionado.saldoAFavor) > 0
                      ? <p className="font-medium text-amber-800 dark:text-amber-300">Le debemos: ${Number(proveedorSeleccionado.saldoAFavor).toLocaleString('es-AR')}</p>
                      : <p className="font-medium text-emerald-700 dark:text-emerald-300">Nos debe: ${Number(proveedorSeleccionado.saldoDeuda).toLocaleString('es-AR')}</p>}
                  </div>
                  {Number(proveedorSeleccionado.saldoAFavor) > 0 && (
                    <button type="button" onClick={() => setForm(p => ({ ...p, monto: Number(proveedorSeleccionado.saldoAFavor) }))}
                      className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-medium">Usar total →</button>
                  )}
                </div>
              )}

              {/* Registrar nueva factura */}
              <div className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer ${form.registrarFactura ? 'bg-violet-50 dark:bg-violet-900/20 border-violet-300 dark:border-violet-700' : 'bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600'}`}
                onClick={() => setForm(p => ({ ...p, registrarFactura: !p.registrarFactura }))}>
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-200">📦 Registrar nueva factura</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Agrega el total de la factura recibida</p>
                </div>
                <div className={`w-12 h-6 rounded-full flex items-center px-1 transition-colors ${form.registrarFactura ? 'bg-violet-500' : 'bg-gray-300 dark:bg-gray-600'}`}>
                  <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${form.registrarFactura ? 'translate-x-6' : ''}`} />
                </div>
              </div>

              {form.registrarFactura && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Total de la factura *</label>
                  <input type="number" value={form.totalFactura} min="0" step="0.01"
                    onChange={e => setForm(p => ({ ...p, totalFactura: e.target.value }))}
                    className={inputBase} placeholder="$0,00" />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Pagás ahora *</label>
                  <input type="number" value={form.monto} min="0" step="0.01"
                    onChange={e => setForm(p => ({ ...p, monto: e.target.value }))}
                    className={inputBase + ' text-lg'} placeholder="$0,00 (puede ser $0)" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Método</label>
                  <select value={form.metodoPago} onChange={e => setForm(p => ({ ...p, metodoPago: e.target.value }))} className={inputBase}>
                    <option value="efectivo">💵 Efectivo</option>
                    <option value="tarjeta">💳 Tarjeta</option>
                    <option value="transferencia">🏦 Transferencia</option>
                    <option value="mercadopago">📱 Mercado Pago</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nota (opcional)</label>
                <textarea value={form.descripcion} rows={2}
                  onChange={e => setForm(p => ({ ...p, descripcion: e.target.value }))}
                  className={inputBase + ' resize-none'} placeholder="Ej: pago parcial compra #001..." />
              </div>
            </>
          )}

          {/* ¿De dónde sale el dinero? */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">¿De dónde sale el dinero?</label>
            <div className="grid grid-cols-3 gap-2">
              {origenes.map(o => {
                const deshabilitado = o.soloConCaja && !cajaAbierta
                return (
                  <button key={o.id} type="button" disabled={deshabilitado}
                    onClick={() => setForm(p => ({ ...p, origenDinero: o.id }))}
                    title={deshabilitado ? 'Necesitás una caja abierta' : o.desc}
                    className={`p-2 rounded-lg border-2 text-left transition-all disabled:opacity-40 disabled:cursor-not-allowed ${form.origenDinero === o.id ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/20' : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'}`}>
                    <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 leading-tight">{o.label}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{o.desc}</p>
                  </button>
                )
              })}
            </div>
            {form.origenDinero === 'caja' && cajaAbierta && (
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">⚠️ Este gasto se descuenta del efectivo esperado al cerrar la caja.</p>
            )}
          </div>

          {/* Dato fiscal */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Dato fiscal</label>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setForm(p => ({ ...p, tipoComprobante: '' }))}
                className={`p-2.5 rounded-xl border-2 text-left transition-all ${!esFacturaA ? 'border-slate-700 dark:border-slate-400 bg-slate-50 dark:bg-slate-700/40' : 'border-gray-200 dark:border-gray-600'}`}>
                <p className="text-sm font-bold text-gray-800 dark:text-gray-100">Gasto X</p>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">Sin comprobante fiscal</p>
              </button>
              <button type="button" onClick={() => setForm(p => ({ ...p, tipoComprobante: 'factura_a' }))}
                className={`p-2.5 rounded-xl border-2 text-left transition-all ${esFacturaA ? 'border-violet-600 bg-violet-50 dark:bg-violet-900/20' : 'border-gray-200 dark:border-gray-600'}`}>
                <p className="text-sm font-bold text-gray-800 dark:text-gray-100">🧾 Factura A</p>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">En blanco · IVA crédito</p>
              </button>
            </div>
            {esFacturaA && (
              <p className="text-xs text-violet-700 dark:text-violet-300 mt-1.5 bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800 rounded-lg px-3 py-2">
                El monto se toma con IVA incluido. IVA contenido: <b>${ivaContenido.toLocaleString('es-AR')}</b>.
              </p>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t border-gray-200 dark:border-gray-700 mt-2">
            <button type="button" onClick={onCerrar} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">Cancelar</button>
            <button type="submit" disabled={guardando} className="px-6 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg font-medium disabled:opacity-50">
              {guardando ? 'Guardando...' : (esEdicion ? 'Guardar cambios' : 'Registrar')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
