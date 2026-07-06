import { useState, useEffect } from 'react'
import { useAuth } from '../../../context/AuthContext'
import api from '../../../api/axios'
import toast from 'react-hot-toast'
import ModalNuevaReceta from '../../../components/gestion/ModalNuevaReceta'
import ModalEditarReceta from '../../../components/gestion/ModalEditarReceta'
import ModalDetalleRecetas from '../../../components/gestion/ModalDetalleRecetas'
import { costoDeIngredientes } from '../../../utils/unidades'

export default function Recetas() {
  const { getNegocioId } = useAuth()
  const [recetas, setRecetas] = useState([])
  const [productosMenu, setProductosMenu] = useState([])
  const [ingredientes, setIngredientes] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalNueva, setModalNueva] = useState(false)
  const [modalEditar, setModalEditar] = useState(false)
  const [modalDetalle, setModalDetalle] = useState(false)
  const [recetaSeleccionada, setRecetaSeleccionada] = useState(null)
  const [grupoSeleccionado, setGrupoSeleccionado] = useState(null)
  const [busqueda, setBusqueda] = useState('')

  useEffect(() => {
    cargarDatos()
  }, [])

  const cargarDatos = async () => {
    setLoading(true)
    try {
      const negocioId = getNegocioId()
      const [recetasRes, productosRes] = await Promise.all([
        api.get(`/negocios/${negocioId}/recetas`),
        api.get(`/negocios/${negocioId}/productos`)
      ])

      setRecetas(recetasRes.data || [])

      const productos = productosRes.data.productos || []

      // Productos del menú: elaborados (hamburguesas, pizzas) + productos finales (bebidas)
      const menu = productos.filter(p =>
        p.categoria?.tipo === 'elaborado' || p.categoria?.tipo === 'producto'
      )
      // Ingredientes: solo los de tipo 'ingrediente' (pan, carne, etc.)
      const ingredientesStock = productos.filter(p => p.categoria?.tipo === 'ingrediente')

      setProductosMenu(menu)
      setIngredientes(ingredientesStock)
    } catch (error) {
      console.error('Error:', error)
      toast.error('Error al cargar datos')
    } finally {
      setLoading(false)
    }
  }

  const handleEliminar = async (recetaId) => {
    if (!confirm('¿Eliminar esta receta?')) return

    try {
      const negocioId = getNegocioId()
      await api.delete(`/negocios/${negocioId}/recetas/${recetaId}`)
      toast.success('Receta eliminada')
      cargarDatos()
    } catch (error) {
      console.error('Error:', error)
      toast.error('Error al eliminar receta')
    }
  }

  // Costo de la receta (convierte la unidad elegida, ej. kg, a la base del ingrediente)
  const calcularCosto = (receta) => costoDeIngredientes(receta.ingredientes)

  const recetasFiltradas = recetas.filter(r =>
    r.nombre.toLowerCase().includes(busqueda.toLowerCase())
  )

  // Agrupar recetas por producto
  const recetasAgrupadas = recetasFiltradas.reduce((acc, receta) => {
    const key = receta.productoMenuId || `sin-producto-${receta.id}`
    if (!acc[key]) {
      acc[key] = {
        producto: receta.productoMenu,
        productoId: receta.productoMenuId,
        recetas: []
      }
    }
    acc[key].recetas.push(receta)
    return acc
  }, {})

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600"></div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Recetas</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Creá recetas para productos elaborados y el stock se descuenta automáticamente al vender
            </p>
          </div>
          <button
            onClick={() => setModalNueva(true)}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nueva Receta
          </button>
        </div>

        {/* Buscador */}
        <div className="mt-4">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              placeholder="Buscar receta..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 dark:bg-gray-700 dark:text-white"
            />
          </div>
        </div>
      </div>

      {/* Lista de recetas */}
      {recetasFiltradas.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
            {busqueda ? 'No se encontraron recetas' : 'No hay recetas creadas'}
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {busqueda
              ? 'Intentá con otro término de búsqueda'
              : 'Creá tu primera receta para productos elaborados'}
          </p>
          {!busqueda && (
            <button
              onClick={() => setModalNueva(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Crear Receta
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.values(recetasAgrupadas).map(grupo => {
            const tieneVariantes = grupo.recetas.length > 1 && grupo.recetas.some(r => r.variante)
            // Costo real: si hay variantes con costos distintos se muestra el rango
            const costos = grupo.recetas.map(r => calcularCosto(r))
            const costoMin = Math.min(...costos)
            const costoMax = Math.max(...costos)
            const costoTexto = costoMax - costoMin < 0.01
              ? `$${costoMin.toFixed(2)}`
              : `$${costoMin.toFixed(0)}–$${costoMax.toFixed(0)}`

            return (
              <div
                key={grupo.productoId || grupo.recetas[0].id}
                onClick={() => {
                  setGrupoSeleccionado(grupo)
                  setModalDetalle(true)
                }}
                className="group bg-white dark:bg-gray-800 rounded-xl border-2 border-gray-200 dark:border-gray-700 p-5 hover:border-violet-400 dark:hover:border-violet-600 hover:shadow-xl transition-all cursor-pointer"
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition">
                      {grupo.producto?.nombre || grupo.recetas[0].nombre}
                    </h3>
                    <div className="flex items-center gap-2 flex-wrap">
                      {grupo.producto && (
                        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-400 rounded-lg text-xs font-medium">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                          </svg>
                          {tieneVariantes ? `${grupo.recetas.length} variantes` : 'Receta única'}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="p-2 bg-violet-100 dark:bg-violet-900/30 rounded-lg group-hover:bg-violet-200 dark:group-hover:bg-violet-900/50 transition">
                    <svg className="w-6 h-6 text-violet-600 dark:text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </div>
                </div>

                {/* Preview de variantes */}
                {tieneVariantes && (
                  <div className="mb-4 flex flex-wrap gap-1.5">
                    {grupo.recetas.map(receta => (
                      <div
                        key={receta.id}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 rounded text-xs"
                      >
                        📦 {receta.variante?.nombre}
                      </div>
                    ))}
                  </div>
                )}

                {/* Stats rápidos */}
                <div className="grid grid-cols-2 gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="text-center p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Ingredientes</p>
                    <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
                      {grupo.recetas[0].ingredientes?.length || 0}
                    </p>
                  </div>
                  <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <p className="text-xs text-green-700 dark:text-green-400 mb-1">Costo</p>
                    <p className="text-xl font-bold text-green-700 dark:text-green-400">
                      {costoTexto}
                    </p>
                  </div>
                </div>

                {/* Indicador de click */}
                <div className="mt-4 text-center">
                  <p className="text-xs text-gray-500 dark:text-gray-400 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition">
                    Click para ver detalles →
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modales */}
      {modalNueva && (
        <ModalNuevaReceta
          productosMenu={productosMenu}
          ingredientes={ingredientes}
          onClose={() => setModalNueva(false)}
          onSave={() => {
            cargarDatos()
            setModalNueva(false)
          }}
        />
      )}

      {modalEditar && recetaSeleccionada && (
        <ModalEditarReceta
          receta={recetaSeleccionada}
          productosMenu={productosMenu}
          ingredientes={ingredientes}
          onClose={() => {
            setModalEditar(false)
            setRecetaSeleccionada(null)
          }}
          onSave={() => {
            cargarDatos()
            setModalEditar(false)
            setRecetaSeleccionada(null)
          }}
        />
      )}

      {modalDetalle && grupoSeleccionado && (
        <ModalDetalleRecetas
          grupo={grupoSeleccionado}
          calcularCosto={calcularCosto}
          onClose={() => {
            setModalDetalle(false)
            setGrupoSeleccionado(null)
          }}
          onEditar={(receta) => {
            setRecetaSeleccionada(receta)
            setModalDetalle(false)
            setModalEditar(true)
          }}
          onEliminar={async (recetaId) => {
            // handleEliminar ya pide confirmación (evita el doble confirm)
            await handleEliminar(recetaId)
            setModalDetalle(false)
            setGrupoSeleccionado(null)
          }}
        />
      )}
    </div>
  )
}
