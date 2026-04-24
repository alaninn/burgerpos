import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../context/AuthContext'
import api from '../../api/axios'
import toast from 'react-hot-toast'

export default function Stock() {
  const { usuario } = useAuth()
  const negocioId = usuario?.negocioId
  const [productos, setProductos] = useState([])
  const [categorias, setCategorias] = useState([])
  const [loading, setLoading] = useState(true)
  const [catFiltro, setCatFiltro] = useState('')
  const [filtro, setFiltro] = useState('todos') // todos | bajo | sinstock
  const [editando, setEditando] = useState({}) // { [id]: valor }
  const [guardando, setGuardando] = useState({})

  const cargar = useCallback(() => {
    if (!negocioId) return
    setLoading(true)
    Promise.all([
      api.get(`/negocios/${negocioId}/productos`),
      api.get(`/negocios/${negocioId}/productos/categorias`)
    ])
      .then(([p, c]) => {
        setProductos(p.data?.productos || [])
        setCategorias(c.data?.categorias || [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [negocioId])

  useEffect(() => { cargar() }, [cargar])

  const guardarStock = async (prod) => {
    const nuevoStock = editando[prod.id]
    if (nuevoStock === undefined) return
    setGuardando(g => ({ ...g, [prod.id]: true }))
    try {
      await api.put(`/negocios/${negocioId}/productos/${prod.id}`, { stock: Number(nuevoStock) })
      toast.success(`Stock de "${prod.nombre}" actualizado`)
      setProductos(ps => ps.map(p => p.id === prod.id ? { ...p, stock: Number(nuevoStock) } : p))
      setEditando(e => { const n = { ...e }; delete n[prod.id]; return n })
    } catch { toast.error('Error al guardar') }
    finally { setGuardando(g => ({ ...g, [prod.id]: false })) }
  }

  const toggleActivo = async (prod) => {
    try {
      await api.put(`/negocios/${negocioId}/productos/${prod.id}`, { activo: !prod.activo })
      setProductos(ps => ps.map(p => p.id === prod.id ? { ...p, activo: !prod.activo } : p))
      toast.success(prod.activo ? 'Producto desactivado' : 'Producto activado')
    } catch { toast.error('Error') }
  }

  const filtrados = productos.filter(p => {
    if (catFiltro && p.categoriaId !== catFiltro) return false
    if (filtro === 'bajo') return p.stock !== null && p.stock < 5 && p.stock > 0
    if (filtro === 'sinstock') return p.stock !== null && p.stock === 0
    return true
  })

  const sinStock = productos.filter(p => p.stock !== null && p.stock === 0).length
  const stockBajo = productos.filter(p => p.stock !== null && p.stock > 0 && p.stock < 5).length

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Stock</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">Gestioná el inventario de tus productos</p>
        </div>
        {(sinStock > 0 || stockBajo > 0) && (
          <div className="flex gap-3">
            {sinStock > 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-xs font-medium text-red-600 dark:text-red-400">
                <div className="w-2 h-2 bg-red-500 rounded-full" />
                {sinStock} sin stock
              </div>
            )}
            {stockBajo > 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 rounded-lg text-xs font-medium text-yellow-700">
                <div className="w-2 h-2 bg-yellow-400 rounded-full" />
                {stockBajo} stock bajo
              </div>
            )}
          </div>
        )}
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="flex gap-2">
          {[
            { id: 'todos', label: 'Todos' },
            { id: 'bajo', label: 'Stock bajo (<5)' },
            { id: 'sinstock', label: 'Sin stock' },
          ].map(f => (
            <button key={f.id} onClick={() => setFiltro(f.id)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${filtro === f.id ? 'bg-violet-600 text-white border-violet-600' : 'bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-violet-400'}`}>
              {f.label}
            </button>
          ))}
        </div>
        <select value={catFiltro} onChange={e => setCatFiltro(e.target.value)}
          className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm text-gray-600 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-violet-500">
          <option value="">Todas las categorías</option>
          {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
        </select>
      </div>

      {/* Tabla */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-700 dark:text-gray-300">Producto</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-700 dark:text-gray-300">Categoría</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-700 dark:text-gray-300">Precio</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-700 dark:text-gray-300">Estado</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-700 dark:text-gray-300 w-48">Stock actual</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-700 dark:text-gray-300">Disponible</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtrados.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-600 dark:text-gray-400 text-sm">No hay productos</td>
                </tr>
              ) : filtrados.map(prod => {
                const stockVal = editando[prod.id] !== undefined ? editando[prod.id] : (prod.stock ?? '')
                const stockNum = prod.stock
                const stockColor = stockNum === null ? 'text-gray-400' : stockNum === 0 ? 'text-red-500 font-semibold' : stockNum < 5 ? 'text-yellow-600 font-semibold' : 'text-green-600 font-semibold'
                return (
                  <tr key={prod.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-3">
                        {prod.imagen ? (
                          <img src={prod.imagen} alt={prod.nombre} className="w-8 h-8 rounded-lg object-cover flex-shrink-0" />
                        ) : (
                          <div className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center flex-shrink-0 text-sm">🍔</div>
                        )}
                        <span className="font-medium text-gray-800 dark:text-gray-200">{prod.nombre}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{prod.categoria?.nombre || '—'}</td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900 dark:text-gray-100">${Number(prod.precioVenta).toLocaleString('es-AR')}</td>
                    <td className="px-4 py-3 text-center">
                      {stockNum === null ? (
                        <span className="text-xs text-gray-600 dark:text-gray-400">Sin control</span>
                      ) : (
                        <span className={`text-sm ${stockColor}`}>{stockNum} ud.</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 justify-center">
                        <input
                          type="number"
                          min="0"
                          value={stockVal}
                          placeholder="—"
                          onChange={e => setEditando(ed => ({ ...ed, [prod.id]: e.target.value }))}
                          onKeyDown={e => e.key === 'Enter' && guardarStock(prod)}
                          className="w-20 px-2 py-1.5 border border-gray-300 dark:border-gray-700 rounded-lg text-sm text-center focus:outline-none focus:ring-2 focus:ring-violet-500"
                        />
                        {editando[prod.id] !== undefined && (
                          <button onClick={() => guardarStock(prod)} disabled={guardando[prod.id]}
                            className="px-2 py-1.5 bg-violet-600 text-white text-xs rounded-lg hover:bg-violet-700 transition-colors disabled:opacity-50">
                            {guardando[prod.id] ? '...' : 'Ok'}
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => toggleActivo(prod)}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${prod.activo ? 'bg-violet-600' : 'bg-gray-200'}`}>
                        <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white dark:bg-gray-800 transition-transform ${prod.activo ? 'translate-x-4' : 'translate-x-1'}`} />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <div className="px-6 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-sm text-gray-600 dark:text-gray-400">{filtrados.length} productos</div>
        </div>
      )}
    </div>
  )
}
