import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../context/AuthContext'
import api from '../../api/axios'
import toast from 'react-hot-toast'

const CATEGORIAS = [
  { id: 'cupon', label: 'Cupones', icon: '🏷️', desc: 'Códigos que los clientes ingresan al pedir' },
  { id: 'modalidad', label: 'Por modalidad', icon: '🛵', desc: 'Descuento automático en Delivery, Take Away o Salón' },
  { id: 'metodo_pago', label: 'Por método de pago', icon: '💳', desc: 'Descuento al pagar con efectivo, tarjeta o transferencia' },
  { id: 'global', label: 'Global', icon: '🌐', desc: 'Aplica a todos los pedidos automáticamente' },
]

function ModalDescuento({ negocioId, descuento, categoria: catInicial, onClose, onSaved }) {
  const [form, setForm] = useState({
    codigo: '', tipo: 'porcentaje', valor: '', activo: true,
    descripcion: '', usosMax: '', minimoCompra: '', fechaVencimiento: '',
    categoria: catInicial || 'cupon',
    modalidad: '', metodoPagoDesc: '',
    acumulable: true, usoUnicoCliente: false, aplicaAutomatico: false,
    ...descuento
  })
  const [loading, setLoading] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const esCupon = form.categoria === 'cupon'
  const esAuto = ['modalidad', 'metodo_pago', 'global'].includes(form.categoria)

  const guardar = async () => {
    if (esCupon && !form.codigo.trim()) return toast.error('El código es obligatorio')
    if (!form.valor) return toast.error('El valor es obligatorio')
    if (form.categoria === 'modalidad' && !form.modalidad) return toast.error('Seleccioná una modalidad')
    if (form.categoria === 'metodo_pago' && !form.metodoPagoDesc) return toast.error('Seleccioná un método de pago')
    setLoading(true)
    try {
      const payload = {
        ...form,
        codigo: esCupon ? form.codigo.toUpperCase().trim() : (form.categoria.toUpperCase() + '_AUTO'),
        valor: Number(form.valor),
        usosMax: form.usosMax ? Number(form.usosMax) : null,
        minimoCompra: form.minimoCompra ? Number(form.minimoCompra) : 0,
        fechaVencimiento: form.fechaVencimiento || null,
        aplicaAutomatico: esAuto,
      }
      if (descuento?.id) await api.put(`/negocios/${negocioId}/descuentos/${descuento.id}`, payload)
      else await api.post(`/negocios/${negocioId}/descuentos`, payload)
      toast.success(descuento?.id ? 'Descuento actualizado' : 'Descuento creado')
      onSaved(); onClose()
    } catch (err) { toast.error(err.response?.data?.message || 'Error') }
    finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="font-bold text-gray-900 dark:text-gray-100 text-lg">
            {descuento?.id ? 'Editar descuento' : 'Nuevo descuento'}
          </h3>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
            <svg className="w-4 h-4 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Tipo de descuento */}
          {!descuento?.id && (
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Tipo de descuento</label>
              <div className="grid grid-cols-2 gap-2">
                {CATEGORIAS.map(c => (
                  <button key={c.id} type="button" onClick={() => set('categoria', c.id)}
                    className={`p-3 rounded-xl border-2 text-left transition-all ${form.categoria === c.id ? 'border-violet-600 bg-violet-50 dark:bg-violet-900/20' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'}`}>
                    <span className="text-lg">{c.icon}</span>
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mt-1">{c.label}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">{c.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Código (solo cupones) */}
          {esCupon && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Código del cupón *</label>
              <input value={form.codigo} onChange={e => set('codigo', e.target.value.toUpperCase())}
                placeholder="VERANO20"
                className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
          )}

          {/* Modalidad target */}
          {form.categoria === 'modalidad' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Aplicar en *</label>
              <div className="flex gap-2">
                {[{id:'delivery',label:'Delivery',icon:'🛵'},{id:'takeaway',label:'Take Away',icon:'🥡'},{id:'salon',label:'Salón',icon:'🪑'}].map(m => (
                  <button key={m.id} type="button" onClick={() => set('modalidad', m.id)}
                    className={`flex-1 py-2.5 rounded-lg border-2 text-sm font-semibold transition-colors ${form.modalidad === m.id ? 'border-violet-600 bg-violet-600 text-white' : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300'}`}>
                    {m.icon} {m.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Método de pago target */}
          {form.categoria === 'metodo_pago' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Aplicar en *</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  {id:'efectivo',label:'Efectivo',icon:'💵'},
                  {id:'tarjeta',label:'Tarjeta',icon:'💳'},
                  {id:'transferencia',label:'Transferencia',icon:'📲'},
                  {id:'efectivo_sin_descuento',label:'Salón efectivo',icon:'🏪'},
                ].map(m => (
                  <button key={m.id} type="button" onClick={() => set('metodoPagoDesc', m.id)}
                    className={`py-2.5 px-3 rounded-lg border-2 text-sm font-semibold text-left transition-colors flex items-center gap-2 ${form.metodoPagoDesc === m.id ? 'border-violet-600 bg-violet-600 text-white' : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300'}`}>
                    <span>{m.icon}</span>{m.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Valor */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tipo de valor</label>
              <select value={form.tipo} onChange={e => set('tipo', e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500">
                <option value="porcentaje">Porcentaje (%)</option>
                <option value="fijo">Monto fijo ($)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Valor *</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 dark:text-gray-400 text-sm">{form.tipo === 'porcentaje' ? '%' : '$'}</span>
                <input type="number" value={form.valor} onChange={e => set('valor', e.target.value)}
                  placeholder={form.tipo === 'porcentaje' ? '20' : '500'} min="0"
                  className="w-full pl-8 pr-3 py-2.5 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
            </div>
          </div>

          {/* Descripción */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Descripción</label>
            <input value={form.descripcion} onChange={e => set('descripcion', e.target.value)}
              placeholder="Ej: 20% off en delivery con efectivo"
              className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>

          {/* Condiciones */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Compra mínima ($)</label>
              <input type="number" value={form.minimoCompra} onChange={e => set('minimoCompra', e.target.value)}
                placeholder="Sin mínimo"
                className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
            {esCupon && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Máximo de usos</label>
                <input type="number" value={form.usosMax} onChange={e => set('usosMax', e.target.value)}
                  placeholder="Ilimitado"
                  className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
            )}
            {esCupon && (
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fecha de vencimiento</label>
                <input type="date" value={form.fechaVencimiento || ''} onChange={e => set('fechaVencimiento', e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
            )}
          </div>

          {/* Opciones avanzadas */}
          <div className="space-y-2.5 pt-2 border-t border-gray-100 dark:border-gray-700">
            <p className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Opciones</p>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={form.activo} onChange={e => set('activo', e.target.checked)} className="w-4 h-4 accent-violet-600" />
              <span className="text-sm text-gray-700 dark:text-gray-300">Descuento activo</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={!form.acumulable} onChange={e => set('acumulable', !e.target.checked)} className="w-4 h-4 accent-violet-600" />
              <div>
                <span className="text-sm text-gray-700 dark:text-gray-300">No acumulable</span>
                <p className="text-xs text-gray-600 dark:text-gray-400">No se puede combinar con otros descuentos</p>
              </div>
            </label>
            {esCupon && (
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={form.usoUnicoCliente} onChange={e => set('usoUnicoCliente', e.target.checked)} className="w-4 h-4 accent-violet-600" />
                <span className="text-sm text-gray-700 dark:text-gray-300">Un solo uso por cliente</span>
              </label>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-700">
          <button onClick={onClose} className="text-sm text-red-500 hover:underline">Cancelar</button>
          <button onClick={guardar} disabled={loading}
            className="px-6 py-2.5 bg-violet-600 text-white rounded-lg text-sm font-semibold hover:bg-violet-700 transition-colors disabled:opacity-50">
            {loading ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  )
}

function DescuentoCard({ d, onToggle, onEdit, onEliminar }) {
  const vencido = d.fechaVencimiento && new Date(d.fechaVencimiento) < new Date()
  const agotado = d.usosMax && d.usosActuales >= d.usosMax
  const inactivo = !d.activo || vencido || agotado
  const cat = CATEGORIAS.find(c => c.id === d.categoria) || CATEGORIAS[0]

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl border-2 p-4 transition-all ${inactivo ? 'border-gray-200 dark:border-gray-700 opacity-60' : 'border-violet-200 dark:border-violet-800 hover:border-violet-300'}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-base">{cat.icon}</span>
            <span className="font-mono text-base font-bold text-gray-900 dark:text-gray-100 tracking-wider">{d.codigo}</span>
            {vencido && <span className="text-xs bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-2 py-0.5 rounded-full">Vencido</span>}
            {agotado && <span className="text-xs bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 px-2 py-0.5 rounded-full">Agotado</span>}
            {!inactivo && <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 px-2 py-0.5 rounded-full">Activo</span>}
            {d.aplicaAutomatico && <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full">Auto</span>}
            {!d.acumulable && <span className="text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-full">No acumulable</span>}
          </div>
          {d.descripcion && <p className="text-xs text-gray-600 dark:text-gray-400">{d.descripcion}</p>}
          {d.modalidad && <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">📍 {d.modalidad}</p>}
          {d.metodoPagoDesc && <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">💳 {d.metodoPagoDesc}</p>}
        </div>
        <div className="text-right flex-shrink-0 ml-3">
          <p className="text-2xl font-black text-violet-700 dark:text-violet-400">
            {d.tipo === 'porcentaje' ? `${d.valor}%` : `$${Number(d.valor).toLocaleString('es-AR')}`}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 text-xs text-gray-600 dark:text-gray-400 mb-3">
        {d.categoria === 'cupon' && (
          <span>Usos: <strong className="text-gray-900 dark:text-gray-100">{d.usosActuales}{d.usosMax ? `/${d.usosMax}` : '/∞'}</strong></span>
        )}
        {d.minimoCompra > 0 && (
          <span>Mín: <strong className="text-gray-900 dark:text-gray-100">${Number(d.minimoCompra).toLocaleString('es-AR')}</strong></span>
        )}
        {d.fechaVencimiento && (
          <span>Vence: <strong className="text-gray-900 dark:text-gray-100">{new Date(d.fechaVencimiento + 'T12:00').toLocaleDateString('es-AR')}</strong></span>
        )}
      </div>

      <div className="flex items-center gap-2 pt-2.5 border-t border-gray-100 dark:border-gray-700">
        <button onClick={() => onToggle(d)}
          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${d.activo ? 'bg-violet-600' : 'bg-gray-200 dark:bg-gray-600'}`}>
          <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${d.activo ? 'translate-x-4' : 'translate-x-1'}`} />
        </button>
        <span className="text-xs text-gray-600 dark:text-gray-400 flex-1">{d.activo ? 'Activo' : 'Inactivo'}</span>
        <button onClick={() => onEdit(d)} className="p-1.5 hover:bg-violet-50 dark:hover:bg-violet-900/30 rounded-lg text-gray-600 dark:text-gray-400 hover:text-violet-600 transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
        </button>
        <button onClick={() => onEliminar(d)} className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-gray-600 dark:text-gray-400 hover:text-red-500 transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
        </button>
      </div>
    </div>
  )
}

export default function Descuentos() {
  const { usuario } = useAuth()
  const negocioId = usuario?.negocioId
  const [descuentos, setDescuentos] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editDesc, setEditDesc] = useState(null)
  const [catModal, setCatModal] = useState('cupon')
  const [tabActiva, setTabActiva] = useState('todos')

  const cargar = useCallback(() => {
    if (!negocioId) return
    setLoading(true)
    api.get(`/negocios/${negocioId}/descuentos`)
      .then(({ data }) => setDescuentos(data.descuentos || []))
      .catch(() => setDescuentos([]))
      .finally(() => setLoading(false))
  }, [negocioId])

  useEffect(() => { cargar() }, [cargar])

  const toggleActivo = async (d) => {
    try {
      await api.put(`/negocios/${negocioId}/descuentos/${d.id}`, { activo: !d.activo })
      setDescuentos(ds => ds.map(x => x.id === d.id ? { ...x, activo: !d.activo } : x))
      toast.success(d.activo ? 'Desactivado' : 'Activado')
    } catch { toast.error('Error') }
  }

  const eliminar = async (d) => {
    if (!confirm(`¿Eliminar "${d.codigo}"?`)) return
    try {
      await api.delete(`/negocios/${negocioId}/descuentos/${d.id}`)
      toast.success('Eliminado')
      cargar()
    } catch { toast.error('Error') }
  }

  const abrirNuevo = (cat) => { setCatModal(cat); setEditDesc(null); setShowModal(true) }
  const abrirEditar = (d) => { setEditDesc(d); setCatModal(d.categoria || 'cupon'); setShowModal(true) }

  const filtrados = tabActiva === 'todos'
    ? descuentos
    : descuentos.filter(d => (d.categoria || 'cupon') === tabActiva)

  const tabs = [
    { id: 'todos', label: 'Todos', count: descuentos.length },
    ...CATEGORIAS.map(c => ({ id: c.id, label: c.label, count: descuentos.filter(d => (d.categoria || 'cupon') === c.id).length }))
  ]

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Descuentos y Cupones</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">Gestioná todos tus descuentos</p>
        </div>
        <button onClick={() => abrirNuevo('cupon')}
          className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg text-sm font-semibold hover:bg-violet-700 transition-colors">
          + Nuevo descuento
        </button>
      </div>

      {/* Accesos rápidos por tipo */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {CATEGORIAS.map(c => (
          <button key={c.id} onClick={() => abrirNuevo(c.id)}
            className="bg-white dark:bg-gray-800 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-4 text-left hover:border-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-all group">
            <span className="text-2xl">{c.icon}</span>
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mt-2 group-hover:text-violet-700 dark:group-hover:text-violet-400">+ {c.label}</p>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">{c.desc}</p>
          </button>
        ))}
      </div>

      {/* Tabs filtro */}
      <div className="flex gap-1 mb-4 border-b border-gray-200 dark:border-gray-700">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTabActiva(t.id)}
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors ${tabActiva === t.id ? 'border-violet-600 text-violet-700 dark:text-violet-400' : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'}`}>
            {t.label}
            {t.count > 0 && <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${tabActiva === t.id ? 'bg-violet-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}>{t.count}</span>}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16"><div className="w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full animate-spin" /></div>
      ) : filtrados.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-16 text-center">
          <div className="text-5xl mb-3">🏷️</div>
          <p className="text-gray-700 dark:text-gray-300 font-medium">No hay descuentos en esta categoría</p>
          <button onClick={() => abrirNuevo(tabActiva === 'todos' ? 'cupon' : tabActiva)}
            className="mt-4 px-4 py-2 bg-violet-600 text-white rounded-lg text-sm font-semibold hover:bg-violet-700 transition-colors">
            Crear uno
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {filtrados.map(d => (
            <DescuentoCard key={d.id} d={d} onToggle={toggleActivo} onEdit={abrirEditar} onEliminar={eliminar} />
          ))}
        </div>
      )}

      {showModal && (
        <ModalDescuento negocioId={negocioId} descuento={editDesc} categoria={catModal}
          onClose={() => { setShowModal(false); setEditDesc(null) }}
          onSaved={cargar}
        />
      )}
    </div>
  )
}
