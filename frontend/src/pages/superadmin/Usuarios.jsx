import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../context/AuthContext'
import api from '../../api/axios'
import toast from 'react-hot-toast'

const ROL_LABEL = { superadmin: 'SuperAdmin', admin: 'Admin', operador: 'Operador', repartidor: 'Repartidor' }
const ROL_COLOR = {
  superadmin: 'bg-red-100 text-red-700',
  admin: 'bg-violet-100 text-violet-700',
  operador: 'bg-gray-100 text-gray-600',
  repartidor: 'bg-blue-100 text-blue-700'
}

function ModalUsuario({ usuario, onClose, onSaved }) {
  const [form, setForm] = useState({
    nombre: '', username: '', email: '', password: '', rol: 'admin', negocioId: '', activo: true, telefono: '', ...usuario
  })
  const [loading, setLoading] = useState(false)
  const [negocios, setNegocios] = useState([])

  useEffect(() => {
    api.get('/superadmin/negocios')
      .then(({ data }) => setNegocios(data.negocios || []))
      .catch(() => setNegocios([]))
  }, [])

  const guardar = async () => {
    if (!form.nombre.trim()) return toast.error('El nombre es obligatorio')
    if (!form.username.trim()) return toast.error('El usuario es obligatorio')
    if (!usuario?.id && !form.password) return toast.error('La contraseña es obligatoria')
    setLoading(true)
    try {
      if (usuario?.id) {
        await api.put(`/usuarios/${usuario.id}`, form)
      } else {
        await api.post('/usuarios', form)
      }
      toast.success(usuario?.id ? 'Usuario actualizado' : 'Usuario creado')
      onSaved(); onClose()
    } catch (err) { toast.error(err.response?.data?.message || 'Error al guardar') }
    finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">{usuario?.id ? 'Editar usuario' : 'Nuevo usuario'}</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
            <svg className="w-4 h-4 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nombre *</label>
            <input value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
              placeholder="Nombre completo"
              className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Usuario *</label>
            <input type="text" value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value.toLowerCase() }))}
              placeholder="usuario"
              className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
            <input type="email" value={form.email || ''} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              placeholder="email@ejemplo.com (opcional)"
              className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{usuario?.id ? 'Nueva contraseña (dejar vacío para no cambiar)' : 'Contraseña *'}</label>
            <input type="password" value={form.password || ''} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              placeholder="••••••••"
              className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Rol *</label>
            <select value={form.rol} onChange={e => setForm(f => ({ ...f, rol: e.target.value }))}
              className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500">
              <option value="operador">Operador</option>
              <option value="admin">Admin</option>
              <option value="repartidor">Repartidor</option>
              <option value="superadmin">SuperAdmin</option>
            </select>
          </div>
          {form.rol !== 'superadmin' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Negocio</label>
              <select value={form.negocioId || ''} onChange={e => setForm(f => ({ ...f, negocioId: e.target.value || null }))}
                className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500">
                <option value="">Sin negocio</option>
                {negocios.map(n => (
                  <option key={n.id} value={n.id}>{n.nombre}</option>
                ))}
              </select>
            </div>
          )}
          {form.rol === 'repartidor' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Teléfono</label>
              <input type="text" value={form.telefono || ''} onChange={e => setForm(f => ({ ...f, telefono: e.target.value }))}
                placeholder="Teléfono del repartidor"
                className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
          )}
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.activo} onChange={e => setForm(f => ({ ...f, activo: e.target.checked }))} className="w-4 h-4 accent-violet-600" />
            <span className="text-sm text-gray-700 dark:text-gray-300">Usuario activo</span>
          </label>
        </div>
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-700 sticky bottom-0 bg-white dark:bg-gray-800">
          <button onClick={onClose} className="text-sm text-red-500 hover:underline">Cancelar</button>
          <button onClick={guardar} disabled={loading}
            className="px-6 py-2 bg-violet-600 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-50">
            {loading ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Usuarios() {
  const { usuario: me } = useAuth()
  const [usuarios, setUsuarios] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editUsuario, setEditUsuario] = useState(null)
  const [filtroRol, setFiltroRol] = useState('todos')

  const cargar = useCallback(() => {
    setLoading(true)
    api.get('/usuarios')
      .then(({ data }) => setUsuarios(data.data || []))
      .catch(() => setUsuarios([]))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { cargar() }, [cargar])

  const eliminar = async (u) => {
    if (u.id === me?.id) return toast.error('No podés eliminarte a vos mismo')
    if (!confirm(`¿Eliminar a ${u.nombre}?`)) return
    try {
      await api.delete(`/usuarios/${u.id}`)
      toast.success('Usuario eliminado')
      cargar()
    } catch { toast.error('Error al eliminar') }
  }

  const usuariosFiltrados = filtroRol === 'todos'
    ? usuarios
    : usuarios.filter(u => u.rol === filtroRol)

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Usuarios</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">Gestión global de usuarios</p>
        </div>
        <button onClick={() => { setEditUsuario(null); setShowModal(true) }}
          className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg text-sm font-medium hover:bg-violet-700 transition-colors">
          + Nuevo usuario
        </button>
      </div>

      {/* Filtros */}
      <div className="mb-4 flex gap-2">
        {['todos', 'superadmin', 'admin', 'operador', 'repartidor'].map(rol => (
          <button
            key={rol}
            onClick={() => setFiltroRol(rol)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              filtroRol === rol
                ? 'bg-violet-600 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}>
            {rol === 'todos' ? 'Todos' : ROL_LABEL[rol]}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-700 dark:text-gray-300">Nombre</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-700 dark:text-gray-300">Usuario</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-700 dark:text-gray-300">Rol</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-700 dark:text-gray-300">Negocio</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-700 dark:text-gray-300">Estado</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-700 dark:text-gray-300">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {usuariosFiltrados.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-600 dark:text-gray-400 text-sm">No hay usuarios</td></tr>
              ) : usuariosFiltrados.map(u => (
                <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-violet-100 dark:bg-violet-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-bold text-violet-700 dark:text-violet-400">{u.nombre?.[0]?.toUpperCase()}</span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-800 dark:text-gray-200">{u.nombre}</p>
                        {u.id === me?.id && <p className="text-xs text-gray-600 dark:text-gray-400">Vos</p>}
                        {u.rol === 'repartidor' && u.telefono && <p className="text-xs text-gray-500 dark:text-gray-400">{u.telefono}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{u.username}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${ROL_COLOR[u.rol] || 'bg-gray-100 text-gray-600'}`}>
                      {ROL_LABEL[u.rol] || u.rol}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300 text-xs">
                    {u.negocio?.nombre || '-'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className={`inline-block w-2 h-2 rounded-full ${u.activo ? 'bg-green-400' : 'bg-gray-300'}`} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 justify-center">
                      <button onClick={() => { setEditUsuario(u); setShowModal(true) }}
                        className="p-1.5 hover:bg-violet-50 dark:hover:bg-violet-900/30 rounded-lg text-gray-600 dark:text-gray-400 hover:text-violet-600 transition-colors">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                      </button>
                      {u.id !== me?.id && (
                        <button onClick={() => eliminar(u)}
                          className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-gray-600 dark:text-gray-400 hover:text-red-500 transition-colors">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-6 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-sm text-gray-600 dark:text-gray-400">
            {usuariosFiltrados.length} usuarios {filtroRol !== 'todos' && `(${ROL_LABEL[filtroRol]})`}
          </div>
        </div>
      )}

      {showModal && (
        <ModalUsuario usuario={editUsuario}
          onClose={() => { setShowModal(false); setEditUsuario(null) }}
          onSaved={cargar}
        />
      )}
    </div>
  )
}
