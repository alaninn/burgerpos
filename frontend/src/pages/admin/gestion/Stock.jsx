import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../../context/AuthContext'
import api from '../../../api/axios'
import toast from 'react-hot-toast'
import ModalNuevoProducto from '../../../components/gestion/ModalNuevoProducto'
import ModalEditarProducto from '../../../components/gestion/ModalEditarProducto'
import ModalNuevaCategoria from '../../../components/gestion/ModalNuevaCategoria'
import ModalGestionarCategorias from '../../../components/gestion/ModalGestionarCategorias'

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
  const [showModal, setShowModal] = useState(false)
  const [showModalCategoria, setShowModalCategoria] = useState(false)
  const [showModalGestionar, setShowModalGestionar] = useState(false)
  const [showModalEditar, setShowModalEditar] = useState(false)
  const [productoEditar, setProductoEditar] = useState(null)

  // Función para calcular factor de conversión
  const calcularFactorConversion = (unidadOrigen, unidadDestino) => {
    const conversiones = {
      'kg_gramo': 1000,
      'litro_litro': 1,
      'kg_kg': 1,
      'gramo_gramo': 1,
      'unidad_unidad': 1
    }
    const key = `${unidadOrigen}_${unidadDestino}`
    return conversiones[key] || 1
  }

  // Función para formatear el stock según la unidad de compra
  const formatearStock = (prod) => {
    const stockNum = prod.stock

    if (stockNum === null || stockNum === undefined) {
      return { texto: '—', color: 'text-gray-400' }
    }

    // Si es caja con unidadContenidoCaja, mostrar en cajas
    if (prod.unidadCompra === 'caja' && prod.unidadContenidoCaja && prod.cantidadPorUnidadCompra) {
      const factor = calcularFactorConversion(prod.unidadContenidoCaja, prod.unidadBase)
      const cantidadPorCaja = (parseFloat(prod.cantidadPorUnidadCompra) || 1) * factor
      const cajas = stockNum / cantidadPorCaja

      const color = stockNum === 0 ? 'text-red-500 font-semibold' :
                   cajas < 1 ? 'text-yellow-600 font-semibold' :
                   'text-green-600 font-semibold'

      return {
        texto: `${cajas.toFixed(2)} ${cajas === 1 ? 'caja' : 'cajas'}`,
        color
      }
    }

    // Para otros casos, mostrar en unidad base
    const color = stockNum === 0 ? 'text-red-500 font-semibold' :
                 stockNum < 5 ? 'text-yellow-600 font-semibold' :
                 'text-green-600 font-semibold'

    const unidad = prod.unidadBase === 'unidad' ? 'unidades' :
                  prod.unidadBase === 'gramo' ? 'gramos' :
                  prod.unidadBase === 'kg' ? 'kilogramos' :
                  prod.unidadBase === 'litro' ? 'litros' : 'ud.'

    return {
      texto: `${stockNum} ${unidad}`,
      color
    }
  }

  const cargar = useCallback(() => {
    if (!negocioId) return
    setLoading(true)
    Promise.all([
      api.get(`/negocios/${negocioId}/productos`),
      api.get(`/negocios/${negocioId}/productos/categorias`)
    ])
      .then(([p, c]) => {
        const todasCategorias = c.data?.categorias || []
        // Categorías de stock: ingredientes y productos finales (ambos se gestionan en stock)
        const categoriasStock = todasCategorias.filter(cat =>
          cat.tipo === 'ingrediente' || cat.tipo === 'producto'
        )
        const categoriasStockIds = new Set(categoriasStock.map(cat => cat.id))

        // Filtrar solo productos de categorías de stock (ingredientes + productos finales)
        const productosStock = (p.data?.productos || []).filter(prod =>
          prod.categoriaId && categoriasStockIds.has(prod.categoriaId)
        )

        setProductos(productosStock)
        setCategorias(categoriasStock)
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

  const handleEliminar = async (prod) => {
    if (!confirm(`¿Eliminar el producto "${prod.nombre}"?\n\nEsta acción no se puede deshacer.`)) {
      return
    }

    try {
      await api.delete(`/negocios/${negocioId}/productos/${prod.id}`)
      setProductos(ps => ps.filter(p => p.id !== prod.id))
      toast.success('Producto eliminado')
    } catch (error) {
      console.error('Error:', error)
      toast.error(error.response?.data?.message || 'Error al eliminar producto')
    }
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
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">Gestioná el inventario de ingredientes e insumos</p>
        </div>
        <div className="flex items-center gap-3">
          {(sinStock > 0 || stockBajo > 0) && (
            <>
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
            </>
          )}
          <div className="flex gap-2">
            <button
              onClick={() => setShowModalGestionar(true)}
              className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition text-sm font-medium"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Gestionar
            </button>
            <button
              onClick={() => setShowModalCategoria(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition text-sm font-medium"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
              Nueva Categoría
            </button>
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition text-sm font-medium"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Nuevo Producto
            </button>
          </div>
        </div>
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
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-700 dark:text-gray-300">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtrados.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-600 dark:text-gray-400 text-sm">No hay productos</td>
                </tr>
              ) : filtrados.map(prod => {
                const stockVal = editando[prod.id] !== undefined ? editando[prod.id] : (prod.stock ?? '')
                const stockInfo = formatearStock(prod)
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
                      <span className={`text-sm ${stockInfo.color}`}>
                        {stockInfo.texto}
                      </span>
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
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => {
                            setProductoEditar(prod)
                            setShowModalEditar(true)
                          }}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                          title="Editar"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleEliminar(prod)}
                          className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          title="Eliminar"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <div className="px-6 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-sm text-gray-600 dark:text-gray-400">
            {filtrados.length} producto{filtrados.length !== 1 ? 's' : ''} de stock
            {productos.length === 0 && (
              <span className="ml-2 text-amber-600 dark:text-amber-400">
                • Creá productos en la categoría "Ingredientes" o categorías tipo stock
              </span>
            )}
          </div>
        </div>
      )}

      {showModal && (
        <ModalNuevoProducto
          onClose={() => setShowModal(false)}
          onSave={(nuevoProducto) => {
            setProductos(prods => [...prods, nuevoProducto])
            setShowModal(false)
          }}
        />
      )}

      {showModalCategoria && (
        <ModalNuevaCategoria
          onClose={() => setShowModalCategoria(false)}
          onSave={(nuevaCategoria) => {
            setCategorias(cats => [...cats, nuevaCategoria])
            setShowModalCategoria(false)
          }}
        />
      )}

      {showModalGestionar && (
        <ModalGestionarCategorias
          categorias={categorias}
          onClose={() => setShowModalGestionar(false)}
          onUpdate={() => {
            cargar()
          }}
        />
      )}

      {showModalEditar && productoEditar && (
        <ModalEditarProducto
          producto={productoEditar}
          onClose={() => {
            setShowModalEditar(false)
            setProductoEditar(null)
          }}
          onSave={(productoActualizado) => {
            setProductos(prods => prods.map(p =>
              p.id === productoActualizado.id ? productoActualizado : p
            ))
            setShowModalEditar(false)
            setProductoEditar(null)
          }}
        />
      )}
    </div>
  )
}
