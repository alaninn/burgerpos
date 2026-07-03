import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../api/axios'
import toast from 'react-hot-toast'
import { useAuth } from '../../context/AuthContext'

// ─── Modal de detalles y estadísticas del negocio ────────
function ModalDetallesNegocio({ negocio, onClose, onUpdate, onEliminar }) {
  const navigate = useNavigate()
  const { gestionarNegocio } = useAuth()
  const [stats, setStats] = useState(null)
  const [salud, setSalud] = useState(null)
  const [pagos, setPagos] = useState([])
  const [loading, setLoading] = useState(true)
  const [pago, setPago] = useState({ dias: 30, monto: '', metodoPago: 'transferencia', observaciones: '' })
  const [registrando, setRegistrando] = useState(false)

  const cargarDetalles = useCallback(() => {
    Promise.allSettled([
      api.get(`/negocios/${negocio.id}/reportes/resumen`),
      api.get(`/negocios/${negocio.id}/pedidos?limit=100`),
      api.get(`/negocios/${negocio.id}/salud`),
      api.get(`/negocios/${negocio.id}/historial-pagos`),
    ])
      .then(([resumenRes, pedidosRes, saludRes, pagosRes]) => {
        if (resumenRes.status === 'fulfilled' || pedidosRes.status === 'fulfilled') {
          setStats({
            resumen: resumenRes.value?.data?.resumen || {},
            totalPedidos: pedidosRes.value?.data?.total || 0,
          })
        }
        if (saludRes.status === 'fulfilled') setSalud(saludRes.value.data.salud)
        if (pagosRes.status === 'fulfilled') setPagos(pagosRes.value.data.pagos || [])
      })
      .finally(() => setLoading(false))
  }, [negocio.id])

  useEffect(() => { cargarDetalles() }, [cargarDetalles])

  const registrarPago = async () => {
    setRegistrando(true)
    try {
      await api.post(`/negocios/${negocio.id}/renovar`, {
        dias: pago.dias,
        monto: parseFloat(pago.monto) || 0,
        metodoPago: pago.metodoPago,
        observaciones: pago.observaciones || null,
      })
      toast.success(`Pago registrado: +${pago.dias} días`)
      setPago(p => ({ ...p, monto: '', observaciones: '' }))
      cargarDetalles()
      onUpdate()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al registrar el pago')
    } finally {
      setRegistrando(false)
    }
  }

  const accederComoNegocio = () => {
    gestionarNegocio(negocio)
    toast.success(`Modo Superadmin: gestionando ${negocio.nombre}`)
    navigate('/admin/dashboard')
    onClose()
  }

  const diasRestantes = negocio.vencimiento
    ? Math.ceil((new Date(negocio.vencimiento) - new Date()) / (1000 * 60 * 60 * 24))
    : null

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl flex items-center justify-center text-white font-bold text-xl">
              {negocio.nombre?.charAt(0).toUpperCase()}
            </div>
            <div>
              <h3 className="font-bold text-xl text-gray-900 dark:text-gray-100">{negocio.nombre}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">/{negocio.slug}</p>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${negocio.plan === 'premium' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'}`}>
              {negocio.plan === 'premium' ? '⭐ Premium' : 'Estándar'}
            </span>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Información básica */}
          <div className="grid grid-cols-2 gap-6 mb-6">
            <div>
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Información</h4>
              <div className="space-y-2 text-sm">
                <div><span className="text-gray-600 dark:text-gray-400">Teléfono:</span> <span className="font-medium">{negocio.telefono || '—'}</span></div>
                <div><span className="text-gray-600 dark:text-gray-400">Ciudad:</span> <span className="font-medium">{negocio.ciudad || '—'}</span></div>
                <div><span className="text-gray-600 dark:text-gray-400">Dirección:</span> <span className="font-medium">{negocio.direccion || '—'}</span></div>
                <div><span className="text-gray-600 dark:text-gray-400">Estado:</span> <span className={`font-medium ${negocio.activo ? 'text-green-600' : 'text-red-600'}`}>{negocio.activo ? 'Activo' : 'Inactivo'}</span></div>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Suscripción</h4>
              <div className="space-y-2 text-sm">
                <div><span className="text-gray-600 dark:text-gray-400">Vencimiento:</span> <span className="font-medium">{negocio.vencimiento ? new Date(negocio.vencimiento).toLocaleDateString('es-AR') : 'Sin vencimiento'}</span></div>
                {diasRestantes !== null && (
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Días restantes:</span>{' '}
                    <span className={`font-bold ${diasRestantes < 7 ? 'text-red-600' : diasRestantes < 30 ? 'text-yellow-600' : 'text-green-600'}`}>
                      {diasRestantes > 0 ? diasRestantes : 'Vencido'}
                    </span>
                  </div>
                )}
              </div>

              {/* Registrar pago / renovación */}
              <div className="mt-3 p-3 bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded-xl">
                <p className="text-xs font-semibold text-green-800 dark:text-green-300 mb-2">Registrar pago / renovación</p>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <select value={pago.dias} onChange={e => setPago(p => ({ ...p, dias: parseInt(e.target.value) }))}
                    className="px-2.5 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800">
                    <option value={7}>7 días</option>
                    <option value={15}>15 días</option>
                    <option value={30}>30 días (1 mes)</option>
                    <option value={90}>90 días (3 meses)</option>
                    <option value={180}>180 días (6 meses)</option>
                    <option value={365}>365 días (1 año)</option>
                  </select>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
                    <input type="number" value={pago.monto} placeholder="Monto"
                      onChange={e => setPago(p => ({ ...p, monto: e.target.value }))}
                      className="w-full pl-6 pr-2 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <select value={pago.metodoPago} onChange={e => setPago(p => ({ ...p, metodoPago: e.target.value }))}
                    className="flex-1 px-2.5 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800">
                    <option value="transferencia">Transferencia</option>
                    <option value="efectivo">Efectivo</option>
                    <option value="mercadopago">MercadoPago</option>
                    <option value="otro">Otro</option>
                  </select>
                  <button onClick={registrarPago} disabled={registrando}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50">
                    {registrando ? '...' : 'Registrar'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Salud del negocio */}
          {salud && (
            <div className="mb-6">
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                Salud del negocio{' '}
                <span className={`ml-1 text-xs px-2 py-0.5 rounded-full font-medium ${
                  salud.estado === 'activo' ? 'bg-green-100 text-green-700' :
                  salud.estado === 'inactivo' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'
                }`}>
                  {salud.estado === 'activo' ? '🟢 Activo' : salud.estado === 'inactivo' ? '🟡 Inactivo' : 'Nunca usado'}
                </span>
              </h4>
              <div className="grid grid-cols-4 gap-3 text-center">
                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
                  <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{salud.pedidosHoy}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Pedidos hoy</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
                  <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{salud.usuariosActivos24h}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Usuarios activos 24h</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
                  <p className={`text-lg font-bold ${salud.errores24h > 0 ? 'text-red-600' : 'text-gray-900 dark:text-gray-100'}`}>{salud.errores24h}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Errores 24h</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
                  <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                    {salud.diasSinActividad === null ? '—' : salud.diasSinActividad === 0 ? 'Hoy' : `${salud.diasSinActividad}d`}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Última actividad</p>
                </div>
              </div>
            </div>
          )}

          {/* Historial de pagos */}
          {pagos.length > 0 && (
            <div className="mb-6">
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Historial de pagos</h4>
              <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                {pagos.map(p => (
                  <div key={p.id} className="flex items-center justify-between px-4 py-2 border-b border-gray-50 dark:border-gray-700 last:border-0 text-sm">
                    <span className="text-xs text-gray-500">{new Date(p.createdAt).toLocaleDateString('es-AR')}</span>
                    <span className="text-gray-700 dark:text-gray-300">+{p.dias} días</span>
                    <span className="text-xs text-gray-500">{p.metodoPago || '-'}</span>
                    <span className="font-semibold text-green-600">${Number(p.monto).toLocaleString('es-AR')}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Estadísticas */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-3 border-violet-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : stats && (
            <>
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Estadísticas</h4>
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-4 text-white">
                  <div className="text-xs opacity-90 mb-1">Total Pedidos</div>
                  <div className="text-2xl font-bold">{stats.totalPedidos}</div>
                </div>
                <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-4 text-white">
                  <div className="text-xs opacity-90 mb-1">Facturación Total</div>
                  <div className="text-2xl font-bold">${Number(stats.resumen.totalFacturado || 0).toLocaleString('es-AR')}</div>
                </div>
                <div className="bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl p-4 text-white">
                  <div className="text-xs opacity-90 mb-1">Ticket Promedio</div>
                  <div className="text-2xl font-bold">${Number(stats.resumen.ticketPromedio || 0).toLocaleString('es-AR')}</div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
                  <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Delivery</div>
                  <div className="font-bold text-gray-900 dark:text-gray-100">{stats.resumen.delivery || 0}</div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
                  <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Efectivo</div>
                  <div className="font-bold text-gray-900 dark:text-gray-100">${Number(stats.resumen.efectivo || 0).toLocaleString('es-AR')}</div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
                  <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Propinas</div>
                  <div className="font-bold text-gray-900 dark:text-gray-100">${Number(stats.resumen.propinas || 0).toLocaleString('es-AR')}</div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex justify-between gap-3">
          <button onClick={() => onEliminar(negocio)}
            className="flex items-center gap-2 px-4 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-sm font-medium transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            Eliminar negocio
          </button>
          <button onClick={accederComoNegocio}
            className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg font-medium hover:bg-violet-700 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" /></svg>
            Acceder al panel
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Modal crear/editar negocio ───────────────────────────
function ModalNegocio({ negocio, onClose, onSaved }) {
  const [form, setForm] = useState({
    nombre: '', slug: '', telefono: '', direccion: '', ciudad: '',
    plan: 'estandar', activo: true,
    adminNombre: '', adminUsername: '', adminEmail: '', adminPassword: '',
    ...negocio
  })
  const [loading, setLoading] = useState(false)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const guardar = async () => {
    if (!form.nombre.trim()) return toast.error('El nombre es obligatorio')
    if (!negocio?.id && (!form.adminUsername.trim() || !form.adminPassword)) return toast.error('El usuario y contraseña del admin son obligatorios')
    setLoading(true)
    try {
      if (negocio?.id) {
        await api.put(`/negocios/${negocio.id}`, form)
      } else {
        await api.post('/negocios', form)
      }
      toast.success(negocio?.id ? 'Negocio actualizado' : 'Negocio creado')
      onSaved(); onClose()
    } catch (err) { toast.error(err.response?.data?.message || 'Error al guardar') }
    finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">{negocio?.id ? 'Editar negocio' : 'Nuevo negocio'}</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
            <svg className="w-4 h-4 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div>
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 pb-2 border-b border-gray-200 dark:border-gray-700">Datos del negocio</h4>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nombre *</label>
                <input value={form.nombre} onChange={e => set('nombre', e.target.value)}
                  placeholder="Ej: Mi Hamburguesería"
                  className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Slug (URL)</label>
                <input value={form.slug} onChange={e => set('slug', e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                  placeholder="mi-hamburgueseria"
                  className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Teléfono</label>
                  <input value={form.telefono} onChange={e => set('telefono', e.target.value)}
                    placeholder="+54 9 11 0000-0000"
                    className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ciudad</label>
                  <input value={form.ciudad} onChange={e => set('ciudad', e.target.value)}
                    placeholder="Buenos Aires"
                    className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Dirección</label>
                <input value={form.direccion} onChange={e => set('direccion', e.target.value)}
                  placeholder="Av. Corrientes 1234, CABA"
                  className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Plan</label>
                  <select value={form.plan} onChange={e => set('plan', e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500">
                    <option value="estandar">Estándar</option>
                    <option value="premium">Premium</option>
                  </select>
                </div>
                <div className="flex items-end pb-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={form.activo} onChange={e => set('activo', e.target.checked)} className="w-4 h-4 accent-violet-600" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Activo</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {!negocio?.id && (
            <div>
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 pb-2 border-b border-gray-200 dark:border-gray-700">Administrador del negocio</h4>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nombre del admin *</label>
                  <input value={form.adminNombre} onChange={e => set('adminNombre', e.target.value)}
                    placeholder="Nombre completo"
                    className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Usuario (para iniciar sesión) *</label>
                  <input type="text" value={form.adminUsername} onChange={e => set('adminUsername', e.target.value.toLowerCase())}
                    placeholder="usuario"
                    className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                  <input type="email" value={form.adminEmail} onChange={e => set('adminEmail', e.target.value)}
                    placeholder="admin@negocio.com (opcional)"
                    className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Contraseña *</label>
                  <input type="password" value={form.adminPassword} onChange={e => set('adminPassword', e.target.value)}
                    placeholder="Contraseña segura"
                    className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-700 sticky bottom-0 bg-white dark:bg-gray-800">
          <button onClick={onClose} className="text-sm text-red-500 hover:underline">Cancelar</button>
          <button onClick={guardar} disabled={loading}
            className="px-6 py-2.5 bg-violet-600 text-white rounded-lg text-sm font-medium hover:bg-violet-700 transition-colors disabled:opacity-50">
            {loading ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function SANegocios() {
  const { usuario } = useAuth()
  const [negocios, setNegocios] = useState([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editNeg, setEditNeg] = useState(null)
  const [detallesNeg, setDetallesNeg] = useState(null)

  const cargar = useCallback(() => {
    setLoading(true)
    api.get('/negocios')
      .then(({ data }) => setNegocios(data.negocios || []))
      .catch(() => setNegocios([]))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { cargar() }, [cargar])

  const toggleActivo = async (neg) => {
    try {
      await api.put(`/negocios/${neg.id}`, { activo: !neg.activo })
      toast.success(neg.activo ? 'Negocio desactivado' : 'Negocio activado')
      cargar()
    } catch { toast.error('Error') }
  }

  const eliminarNegocio = async (neg) => {
    const confirmacion = prompt(
      `⚠️ Esto elimina DEFINITIVAMENTE el negocio "${neg.nombre}" con todos sus pedidos, productos, usuarios e historial. No se puede deshacer.\n\nPara confirmar, escribí el nombre exacto del negocio:`
    )
    if (confirmacion === null) return
    if (confirmacion.trim() !== neg.nombre) {
      return toast.error('El nombre no coincide, no se eliminó nada')
    }
    try {
      await api.delete(`/negocios/${neg.id}`)
      toast.success(`Negocio "${neg.nombre}" eliminado`)
      setDetallesNeg(null)
      cargar()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al eliminar el negocio')
    }
  }

  const filtrados = negocios.filter(n =>
    busqueda ? n.nombre?.toLowerCase().includes(busqueda.toLowerCase()) || n.ciudad?.toLowerCase().includes(busqueda.toLowerCase()) : true
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Negocios</h1>
          {usuario && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Sesión: <span className="font-semibold">{usuario.email}</span>
              <span className={`ml-2 px-2 py-0.5 rounded text-xs font-semibold ${usuario.rol === 'superadmin' ? 'bg-purple-100 text-purple-700' : 'bg-red-100 text-red-700'}`}>
                {usuario.rol}
              </span>
            </p>
          )}
        </div>
        <button onClick={() => { setEditNeg(null); setShowModal(true) }}
          className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 text-white rounded-lg text-sm font-medium hover:bg-violet-700 transition-colors">
          + Crear negocio
        </button>
      </div>

      <div className="relative mb-4">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
        <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
          placeholder="Buscar negocio..."
          className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16"><div className="w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-700 dark:text-gray-300">Negocio</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-700 dark:text-gray-300">Ciudad</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-700 dark:text-gray-300">Plan</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-700 dark:text-gray-300">Vencimiento</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-700 dark:text-gray-300">Estado</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-700 dark:text-gray-300">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtrados.map(neg => (
                <tr key={neg.id}
                  onClick={() => setDetallesNeg(neg)}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-violet-100 dark:bg-violet-900/30 rounded-xl flex items-center justify-center flex-shrink-0">
                        {neg.logo ? (
                          <img src={neg.logo} alt={neg.nombre} className="w-9 h-9 rounded-xl object-cover" />
                        ) : (
                          <span className="text-sm font-bold text-violet-700 dark:text-violet-400">{neg.nombre?.[0]?.toUpperCase()}</span>
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{neg.nombre}</p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">{neg.slug}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-600 dark:text-gray-300">{neg.ciudad || '—'}</td>
                  <td className="px-4 py-4">
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${neg.plan === 'premium' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'}`}>
                      {neg.plan === 'premium' ? '⭐ Premium' : 'Estándar'}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-700 dark:text-gray-300">
                    {neg.vencimiento ? new Date(neg.vencimiento).toLocaleDateString('es-AR') : '—'}
                  </td>
                  <td className="px-4 py-4" onClick={e => e.stopPropagation()}>
                    <button onClick={() => toggleActivo(neg)}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${neg.activo ? 'bg-violet-600' : 'bg-gray-200'}`}>
                      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white dark:bg-gray-800 transition-transform ${neg.activo ? 'translate-x-4.5' : 'translate-x-0.5'}`} />
                    </button>
                  </td>
                  <td className="px-4 py-4" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={() => { setEditNeg(neg); setShowModal(true) }}
                        className="p-1.5 hover:bg-violet-50 dark:hover:bg-violet-900/30 rounded-lg text-gray-600 dark:text-gray-400 hover:text-violet-600 transition-colors"
                        title="Editar">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtrados.length === 0 && (
                <tr><td colSpan={6} className="text-center py-12 text-gray-600 dark:text-gray-400">No hay negocios</td></tr>
              )}
            </tbody>
          </table>
          <div className="px-6 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-sm text-gray-600 dark:text-gray-400">{filtrados.length} negocios</div>
        </div>
      )}

      {showModal && (
        <ModalNegocio negocio={editNeg}
          onClose={() => { setShowModal(false); setEditNeg(null) }}
          onSaved={cargar}
        />
      )}

      {detallesNeg && (
        <ModalDetallesNegocio
          negocio={detallesNeg}
          onClose={() => setDetallesNeg(null)}
          onUpdate={cargar}
          onEliminar={eliminarNegocio}
        />
      )}
    </div>
  )
}
