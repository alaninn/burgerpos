import { useState, useEffect } from 'react'
import { useAuth } from '../../../context/AuthContext'
import api from '../../../api/axios'
import toast from 'react-hot-toast'

const formatearPeso = (n) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(Number(n) || 0)
const formatearFecha = (f) => f ? new Date(f).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '-'
const inputBase = 'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 dark:bg-gray-700 dark:text-white'

// ---- Modal crear/editar proveedor ----
function ModalProveedor({ proveedor, onClose, onSave }) {
  const [form, setForm] = useState({ nombre: '', contacto: '', telefono: '', email: '', direccion: '', notas: '', activo: true, ...proveedor })
  const [loading, setLoading] = useState(false)

  const submit = async () => {
    if (!form.nombre.trim()) return toast.error('El nombre es requerido')
    setLoading(true)
    try {
      await onSave({
        nombre: form.nombre.trim(),
        contacto: form.contacto?.trim() || null,
        telefono: form.telefono?.trim() || null,
        email: form.email?.trim() || null,
        direccion: form.direccion?.trim() || null,
        notas: form.notas?.trim() || null,
        activo: form.activo
      })
      onClose()
    } catch { /* manejado arriba */ } finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">{proveedor ? 'Editar proveedor' : 'Nuevo proveedor'}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>
        <div className="p-6 grid grid-cols-2 gap-4 max-h-[70vh] overflow-y-auto">
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nombre <span className="text-red-500">*</span></label>
            <input value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} className={inputBase} placeholder="Ej: Distribuidor ABC" autoFocus />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Contacto</label>
            <input value={form.contacto || ''} onChange={e => setForm({ ...form, contacto: e.target.value })} className={inputBase} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Teléfono</label>
            <input value={form.telefono || ''} onChange={e => setForm({ ...form, telefono: e.target.value })} className={inputBase} placeholder="+54 11 1234-5678" />
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
            <input type="email" value={form.email || ''} onChange={e => setForm({ ...form, email: e.target.value })} className={inputBase} />
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Dirección</label>
            <input value={form.direccion || ''} onChange={e => setForm({ ...form, direccion: e.target.value })} className={inputBase} />
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notas</label>
            <textarea value={form.notas || ''} onChange={e => setForm({ ...form, notas: e.target.value })} rows={2} className={inputBase + ' resize-none'} />
          </div>
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
          <button onClick={onClose} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300">Cancelar</button>
          <button onClick={submit} disabled={loading} className="px-6 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg font-medium disabled:opacity-50">{loading ? 'Guardando...' : 'Guardar'}</button>
        </div>
      </div>
    </div>
  )
}

// ---- Modal registrar pago / cobro ----
function ModalPago({ proveedor, tipoPago, onClose, onSave }) {
  const esCobro = tipoPago === 'cobro_deuda'
  const saldo = esCobro ? Number(proveedor.saldo_deuda || proveedor.saldoDeuda || 0) : Number(proveedor.saldo_a_favor || proveedor.saldoAFavor || 0)
  const [form, setForm] = useState({ monto: '', metodoPago: 'efectivo', descripcion: '', origenDinero: 'local', tipoComprobante: '' })
  const [loading, setLoading] = useState(false)

  const submit = async () => {
    const monto = Number(form.monto)
    if (!monto || monto <= 0) return toast.error('El monto debe ser mayor a 0')
    if (monto > saldo) return toast.error(`No puede superar el saldo de ${formatearPeso(saldo)}`)
    setLoading(true)
    try {
      await onSave({ ...form, tipoPago })
      onClose()
    } catch { /* manejado */ } finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="bg-slate-800 text-white px-5 py-4 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold">{esCobro ? '📥 Registrar cobro' : '💵 Registrar pago'}</h3>
            <p className="text-slate-300 text-xs">{proveedor.nombre} · saldo {formatearPeso(saldo)}</p>
          </div>
          <button onClick={onClose} className="text-slate-300 hover:text-white text-2xl leading-none">×</button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Monto *</label>
            <input type="number" value={form.monto} min="0" step="0.01" onChange={e => setForm({ ...form, monto: e.target.value })} className={inputBase + ' text-lg'} placeholder="$0,00" />
            <button type="button" onClick={() => setForm({ ...form, monto: saldo })} className="mt-1 text-xs text-violet-600 hover:underline">Usar total ({formatearPeso(saldo)})</button>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Método de pago</label>
            <select value={form.metodoPago} onChange={e => setForm({ ...form, metodoPago: e.target.value })} className={inputBase}>
              <option value="efectivo">💵 Efectivo</option>
              <option value="tarjeta">💳 Tarjeta</option>
              <option value="transferencia">🏦 Transferencia</option>
              <option value="mercadopago">📱 Mercado Pago</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nota (opcional)</label>
            <input value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })} className={inputBase} />
          </div>
        </div>
        <div className="flex justify-end gap-3 px-5 py-4 border-t border-gray-200 dark:border-gray-700">
          <button onClick={onClose} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300">Cancelar</button>
          <button onClick={submit} disabled={loading} className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-medium disabled:opacity-50">{loading ? 'Registrando...' : 'Registrar'}</button>
        </div>
      </div>
    </div>
  )
}

// ---- Ficha del proveedor ----
function FichaProveedor({ proveedorId, negocioId, onClose, onCambio, onEditar, onPago }) {
  const [prov, setProv] = useState(null)
  const [productosStock, setProductosStock] = useState([])
  const [aAsignar, setAAsignar] = useState('')

  const cargar = async () => {
    try {
      const { data } = await api.get(`/negocios/${negocioId}/proveedores/${proveedorId}`)
      setProv(data)
    } catch { toast.error('Error al cargar la ficha') }
  }
  // Trae los productos de stock del negocio para poder asignarlos al proveedor
  const cargarProductos = async () => {
    try {
      const [prodRes, catRes] = await Promise.all([
        api.get(`/negocios/${negocioId}/productos`),
        api.get(`/negocios/${negocioId}/productos/categorias`)
      ])
      const stockCats = new Set((catRes.data?.categorias || [])
        .filter(c => c.tipo === 'ingrediente' || c.tipo === 'producto').map(c => c.id))
      setProductosStock((prodRes.data?.productos || []).filter(p => p.categoriaId && stockCats.has(p.categoriaId)))
    } catch { /* opcional */ }
  }
  useEffect(() => { cargar(); cargarProductos() }, [proveedorId])

  const asignarProducto = async () => {
    if (!aAsignar) return
    try {
      await api.post(`/negocios/${negocioId}/proveedores/${proveedorId}/productos`, { productoId: aAsignar })
      toast.success('Producto asignado')
      setAAsignar('')
      cargar(); cargarProductos()
    } catch (e) { toast.error(e.response?.data?.message || 'Error al asignar') }
  }
  const quitarProducto = async (productoId) => {
    try {
      await api.delete(`/negocios/${negocioId}/proveedores/${proveedorId}/productos/${productoId}`)
      toast.success('Producto quitado')
      cargar(); cargarProductos()
    } catch (e) { toast.error(e.response?.data?.message || 'Error al quitar') }
  }

  if (!prov) return null
  const asignados = prov.productos || []
  const asignadosIds = new Set(asignados.map(p => p.id))
  const disponibles = productosStock.filter(p => !asignadosIds.has(p.id))
  const deuda = Number(prov.saldo_deuda || 0)
  const aFavor = Number(prov.saldo_a_favor || 0)
  const stats = prov.estadisticas || {}

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-3" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="bg-slate-800 text-white px-5 py-4 flex items-center justify-between">
          <div className="min-w-0">
            <h3 className="text-lg font-bold truncate">{prov.nombre}</h3>
            <p className="text-slate-300 text-xs truncate">{[prov.telefono, prov.email, prov.direccion].filter(Boolean).join(' · ') || 'Sin datos de contacto'}</p>
          </div>
          <button onClick={onClose} className="text-slate-300 hover:text-white text-3xl leading-none">×</button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-3.5">
              <p className="text-[11px] text-gray-400 uppercase font-semibold">Nos debe</p>
              <p className={`text-2xl font-bold tabular-nums ${deuda > 0 ? 'text-emerald-600' : 'text-gray-300'}`}>{formatearPeso(deuda)}</p>
              {deuda > 0 && <button onClick={() => onPago(prov, 'cobro_deuda')} className="mt-2 text-xs font-semibold text-emerald-700 border border-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 px-3 py-1.5 rounded-lg">Registrar cobro</button>}
            </div>
            <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-3.5">
              <p className="text-[11px] text-gray-400 uppercase font-semibold">Le debemos</p>
              <p className={`text-2xl font-bold tabular-nums ${aFavor > 0 ? 'text-red-600' : 'text-gray-300'}`}>{formatearPeso(aFavor)}</p>
              {aFavor > 0 && <button onClick={() => onPago(prov, 'pago_a_cuenta')} className="mt-2 text-xs font-semibold text-red-700 border border-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 px-3 py-1.5 rounded-lg">Registrar pago</button>}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            <div className="bg-gray-50 dark:bg-gray-900/40 rounded-xl p-3">
              <p className="text-[10px] text-gray-400 uppercase font-semibold">Movimientos</p>
              <p className="text-lg font-bold text-gray-800 dark:text-gray-100 tabular-nums">{stats.total_gastos || 0}</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-900/40 rounded-xl p-3">
              <p className="text-[10px] text-gray-400 uppercase font-semibold">Total histórico</p>
              <p className="text-lg font-bold text-gray-800 dark:text-gray-100 tabular-nums">{formatearPeso(stats.total_monto)}</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-900/40 rounded-xl p-3">
              <p className="text-[10px] text-gray-400 uppercase font-semibold">Promedio</p>
              <p className="text-lg font-bold text-gray-800 dark:text-gray-100 tabular-nums">{formatearPeso(stats.promedio_gasto)}</p>
            </div>
          </div>

          <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
            <div className="px-3.5 py-2.5 bg-gray-50 dark:bg-gray-900/40 border-b border-gray-100 dark:border-gray-700">
              <p className="text-[11px] text-gray-400 uppercase font-semibold">Movimientos recientes</p>
            </div>
            {(prov.movimientos || []).length === 0 ? (
              <p className="text-center text-gray-400 text-sm py-6">Sin movimientos. Las compras y pagos de este proveedor aparecen acá.</p>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-700 max-h-64 overflow-y-auto">
                {prov.movimientos.map(mov => (
                  <div key={mov.id} className="flex items-center gap-3 px-3.5 py-2.5">
                    <span className="text-base">{mov.tipo === 'pago_proveedor' ? '💸' : mov.es_compra ? '🛒' : '📄'}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-800 dark:text-gray-100 truncate">{mov.descripcion || (mov.es_compra ? 'Compra' : 'Gasto')}</p>
                      <p className="text-[11px] text-gray-400">{formatearFecha(mov.fecha)} · {(mov.metodo_pago || '').replace('_', ' ')}{mov.es_compra ? (mov.pagado ? ' · pagada' : ' · deuda') : ''}</p>
                    </div>
                    <span className="font-semibold text-gray-800 dark:text-gray-100 text-sm tabular-nums">{formatearPeso(mov.monto)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Productos del proveedor: al comprarle, estos cargan su stock */}
          <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
            <div className="px-3.5 py-2.5 bg-gray-50 dark:bg-gray-900/40 border-b border-gray-100 dark:border-gray-700">
              <p className="text-[11px] text-gray-400 uppercase font-semibold">Productos que le compramos</p>
              <p className="text-[11px] text-gray-400">Al registrar una compra a este proveedor, estos productos cargan su stock</p>
            </div>
            <div className="p-3 space-y-2">
              {asignados.length === 0 ? (
                <p className="text-center text-gray-400 text-sm py-2">Sin productos asignados todavía.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {asignados.map(p => (
                    <div key={p.id} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-900/40">
                      <span className="text-sm text-gray-800 dark:text-gray-200">{p.nombre}</span>
                      <span className="text-[11px] text-gray-400">stock {Number(p.stock) || 0}{p.unidadBase ? ' ' + p.unidadBase : ''}</span>
                      <button onClick={() => quitarProducto(p.id)} title="Quitar" className="text-red-400 hover:text-red-600 text-xs">✕</button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-2 pt-1">
                <select value={aAsignar} onChange={e => setAAsignar(e.target.value)} className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 dark:bg-gray-700 dark:text-white">
                  <option value="">Agregar un producto...</option>
                  {disponibles.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                </select>
                <button onClick={asignarProducto} disabled={!aAsignar} className="px-4 py-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-40 text-white rounded-lg text-sm font-medium">Agregar</button>
              </div>
            </div>
          </div>

          {prov.notas && (
            <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-3.5">
              <p className="text-[11px] text-gray-400 uppercase font-semibold mb-1">Notas</p>
              <p className="text-sm text-gray-700 dark:text-gray-300">{prov.notas}</p>
            </div>
          )}
        </div>

        <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 flex items-center justify-between gap-2">
          <div className="flex gap-1">
            {prov.activo
              ? <button onClick={() => onCambio('archivar', prov)} className="text-xs text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 px-3 py-2 rounded-lg">📦 Archivar</button>
              : <button onClick={() => onCambio('reactivar', prov)} className="text-xs text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 px-3 py-2 rounded-lg">♻️ Reactivar</button>}
            <button onClick={() => onCambio('eliminar', prov)} className="text-xs text-red-400 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 px-3 py-2 rounded-lg">🗑️ Eliminar</button>
          </div>
          <button onClick={() => onEditar(prov)} className="text-sm font-semibold text-slate-700 dark:text-slate-200 border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 px-4 py-2 rounded-xl">✏️ Editar</button>
        </div>
      </div>
    </div>
  )
}

export default function Proveedores() {
  const { getNegocioId } = useAuth()
  const negocioId = getNegocioId()
  const [proveedores, setProveedores] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('activos')
  const [busqueda, setBusqueda] = useState('')
  const [vista, setVista] = useState(() => localStorage.getItem('proveedores_vista') || 'grilla')
  const cambiarVista = (v) => { setVista(v); localStorage.setItem('proveedores_vista', v) }
  const [modalProv, setModalProv] = useState(false)
  const [provEdit, setProvEdit] = useState(null)
  const [fichaId, setFichaId] = useState(null)
  const [fichaRefresh, setFichaRefresh] = useState(0)
  const [pagoCtx, setPagoCtx] = useState(null) // { proveedor, tipoPago }

  const cargar = async () => {
    try {
      setLoading(true)
      const activo = tab === 'archivados' ? 'false' : 'true'
      const { data } = await api.get(`/negocios/${negocioId}/proveedores`, { params: { activo, buscar: busqueda || undefined } })
      setProveedores(data.proveedores || [])
    } catch { toast.error('Error al cargar proveedores') } finally { setLoading(false) }
  }
  useEffect(() => { cargar() }, [tab])
  useEffect(() => { const t = setTimeout(cargar, 350); return () => clearTimeout(t) }, [busqueda])

  const guardarProveedor = async (form) => {
    try {
      if (provEdit) { await api.put(`/negocios/${negocioId}/proveedores/${provEdit.id}`, form); toast.success('Proveedor actualizado') }
      else { await api.post(`/negocios/${negocioId}/proveedores`, form); toast.success('Proveedor creado') }
      setProvEdit(null); cargar()
    } catch (e) { toast.error(e.response?.data?.message || 'Error al guardar'); throw e }
  }

  const registrarPago = async (proveedorId, body) => {
    try {
      await api.post(`/negocios/${negocioId}/proveedores/${proveedorId}/pago`, {
        monto: Number(body.monto),
        metodoPago: body.metodoPago,
        tipoPago: body.tipoPago === 'cobro_deuda' ? 'cobro_deuda' : 'pago_deuda',
        descripcion: body.descripcion || null,
        origenDinero: body.origenDinero,
        tipoComprobante: body.tipoComprobante || null
      })
      toast.success('Movimiento registrado')
      cargar()
      setFichaRefresh(n => n + 1) // fuerza recarga de la ficha abierta
    } catch (e) { toast.error(e.response?.data?.message || 'Error al registrar'); throw e }
  }

  const cambioEstado = async (accion, prov) => {
    try {
      if (accion === 'archivar') { await api.delete(`/negocios/${negocioId}/proveedores/${prov.id}`); toast.success('Proveedor archivado') }
      else if (accion === 'reactivar') { await api.patch(`/negocios/${negocioId}/proveedores/${prov.id}/reactivar`); toast.success('Proveedor reactivado') }
      else if (accion === 'eliminar') {
        if (!confirm(`¿Eliminar definitivamente "${prov.nombre}"? No se puede deshacer.`)) return
        await api.delete(`/negocios/${negocioId}/proveedores/${prov.id}/definitivo`); toast.success('Proveedor eliminado')
      }
      setFichaId(null); cargar()
    } catch (e) { toast.error(e.response?.data?.message || 'Error') }
  }

  const totales = proveedores.reduce((acc, p) => {
    acc.deuda += Number(p.saldoDeuda) || 0
    acc.favor += Number(p.saldoAFavor) || 0
    return acc
  }, { deuda: 0, favor: 0 })

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Proveedores</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">Gestión de proveedores y cuenta corriente</p>
        </div>
        <button onClick={() => { setProvEdit(null); setModalProv(true) }} className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg font-medium">+ Nuevo proveedor</button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-3.5 border-l-4 border-slate-500 border border-gray-200 dark:border-gray-700">
          <p className="text-[11px] uppercase text-gray-400 font-semibold">Proveedores</p>
          <p className="text-xl font-bold text-gray-800 dark:text-gray-100 tabular-nums">{proveedores.length}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-3.5 border-l-4 border-red-400 border border-gray-200 dark:border-gray-700">
          <p className="text-[11px] uppercase text-gray-400 font-semibold">Les debemos</p>
          <p className="text-xl font-bold text-red-600 tabular-nums">{formatearPeso(totales.favor)}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-3.5 border-l-4 border-emerald-400 border border-gray-200 dark:border-gray-700">
          <p className="text-[11px] uppercase text-gray-400 font-semibold">Nos deben</p>
          <p className="text-xl font-bold text-emerald-600 tabular-nums">{formatearPeso(totales.deuda)}</p>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex gap-2">
          <button onClick={() => setTab('activos')} className={`px-4 py-2 rounded-lg text-sm font-semibold ${tab === 'activos' ? 'bg-violet-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}>Activos</button>
          <button onClick={() => setTab('archivados')} className={`px-4 py-2 rounded-lg text-sm font-semibold ${tab === 'archivados' ? 'bg-amber-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}>Archivados</button>
        </div>
        <input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="🔍 Buscar por nombre, teléfono o email..." className={inputBase + ' flex-1 min-w-[200px]'} />
        <div className="flex rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden">
          <button onClick={() => cambiarVista('grilla')} title="Vista en grilla"
            className={`p-2 transition-colors ${vista === 'grilla' ? 'bg-violet-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
          </button>
          <button onClick={() => cambiarVista('lista')} title="Vista en lista"
            className={`p-2 transition-colors ${vista === 'lista' ? 'bg-violet-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Cargando...</div>
      ) : proveedores.length === 0 ? (
        <div className="text-center py-12 text-gray-500">No hay proveedores</div>
      ) : vista === 'lista' ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  {['Proveedor', 'Teléfono', 'Le debemos', 'Nos debe', ''].map((h, i) => (
                    <th key={i} className={`px-4 py-2.5 text-xs font-semibold text-gray-600 dark:text-gray-400 ${i >= 2 ? 'text-right' : 'text-left'}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {proveedores.map(prov => {
                  const leDebemos = Number(prov.saldoAFavor) > 0
                  const nosDebe = Number(prov.saldoDeuda) > 0
                  return (
                    <tr key={prov.id} onClick={() => setFichaId(prov.id)} className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 bg-violet-600 text-white rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0">{prov.nombre.charAt(0).toUpperCase()}</div>
                          <span className="font-medium text-gray-900 dark:text-gray-100">{prov.nombre}</span>
                          {!prov.activo && <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">Archivado</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{prov.telefono || '—'}</td>
                      <td className={`px-4 py-3 text-right font-medium tabular-nums ${leDebemos ? 'text-red-600' : 'text-gray-300'}`}>{formatearPeso(prov.saldoAFavor)}</td>
                      <td className={`px-4 py-3 text-right font-medium tabular-nums ${nosDebe ? 'text-emerald-600' : 'text-gray-300'}`}>{formatearPeso(prov.saldoDeuda)}</td>
                      <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                        <button onClick={() => { setProvEdit(prov); setModalProv(true) }} className="px-2 py-1 text-xs text-gray-500 border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg">✏️</button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {proveedores.map(prov => {
            const leDebemos = Number(prov.saldoAFavor) > 0
            const nosDebe = Number(prov.saldoDeuda) > 0
            return (
              <div key={prov.id} onClick={() => setFichaId(prov.id)}
                className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md hover:border-violet-300 transition-all cursor-pointer p-3.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 bg-violet-600 text-white rounded-lg flex items-center justify-center font-bold flex-shrink-0">{prov.nombre.charAt(0).toUpperCase()}</div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-gray-800 dark:text-gray-100 truncate">{prov.nombre}</p>
                    <p className="text-[11px] text-gray-400 truncate">{prov.telefono || 'Sin teléfono'}</p>
                  </div>
                  {!prov.activo && <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">Archivado</span>}
                </div>
                <div className="flex gap-2 mt-3">
                  <div className={`flex-1 rounded-lg px-2.5 py-1.5 border ${leDebemos ? 'border-red-200 bg-red-50 dark:bg-red-900/20' : 'border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40'}`}>
                    <p className="text-[10px] text-gray-400 uppercase font-semibold">Le debemos</p>
                    <p className={`text-sm font-bold tabular-nums ${leDebemos ? 'text-red-600' : 'text-gray-300'}`}>{formatearPeso(prov.saldoAFavor)}</p>
                  </div>
                  <div className={`flex-1 rounded-lg px-2.5 py-1.5 border ${nosDebe ? 'border-emerald-200 bg-emerald-50 dark:bg-emerald-900/20' : 'border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40'}`}>
                    <p className="text-[10px] text-gray-400 uppercase font-semibold">Nos debe</p>
                    <p className={`text-sm font-bold tabular-nums ${nosDebe ? 'text-emerald-600' : 'text-gray-300'}`}>{formatearPeso(prov.saldoDeuda)}</p>
                  </div>
                </div>
                <div className="flex gap-1.5 mt-2.5" onClick={e => e.stopPropagation()}>
                  <button onClick={() => setFichaId(prov.id)} className="flex-1 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg">Ver ficha</button>
                  <button onClick={() => { setProvEdit(prov); setModalProv(true) }} className="px-3 py-1.5 text-xs font-semibold text-gray-500 border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg">✏️</button>
                  {(leDebemos || nosDebe) && (
                    <button onClick={() => setPagoCtx({ proveedor: { ...prov, saldo_deuda: prov.saldoDeuda, saldo_a_favor: prov.saldoAFavor }, tipoPago: leDebemos ? 'pago_a_cuenta' : 'cobro_deuda' })}
                      className="px-3 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white rounded-lg">💵</button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {modalProv && <ModalProveedor proveedor={provEdit} onClose={() => { setModalProv(false); setProvEdit(null) }} onSave={guardarProveedor} />}

      {fichaId && (
        <FichaProveedor
          key={`${fichaId}-${fichaRefresh}`}
          proveedorId={fichaId} negocioId={negocioId}
          onClose={() => setFichaId(null)}
          onCambio={cambioEstado}
          onEditar={(p) => { setFichaId(null); setProvEdit(p); setModalProv(true) }}
          onPago={(p, tipo) => setPagoCtx({ proveedor: p, tipoPago: tipo })}
        />
      )}

      {pagoCtx && (
        <ModalPago
          proveedor={pagoCtx.proveedor}
          tipoPago={pagoCtx.tipoPago === 'cobro_deuda' ? 'cobro_deuda' : 'pago_deuda'}
          onClose={() => setPagoCtx(null)}
          onSave={async (body) => { await registrarPago(pagoCtx.proveedor.id, body) }}
        />
      )}
    </div>
  )
}
