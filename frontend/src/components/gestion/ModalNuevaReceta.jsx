import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import api from '../../api/axios'
import toast from 'react-hot-toast'
import { costoDeIngredientes, unidadesCompatibles, convertir } from '../../utils/unidades'

export default function ModalNuevaReceta({ productosMenu, ingredientes, onClose, onSave }) {
  const { getNegocioId } = useAuth()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    nombre: '',
    productoMenuId: '',
    recetasPorVariante: {},
    ingredientes: [],
    notas: ''
  })
  const [productoSeleccionado, setProductoSeleccionado] = useState(null)
  const [varianteActiva, setVarianteActiva] = useState(null)

  useEffect(() => {
    if (form.productoMenuId) {
      const producto = productosMenu.find(p => p.id === form.productoMenuId)
      setProductoSeleccionado(producto)

      if (producto?.variantes?.length > 0) {
        // Inicializar recetas vacías para cada variante
        const inicial = {}
        producto.variantes.forEach(v => {
          inicial[v.id] = { ingredientes: [], notas: '' }
        })
        setForm(prev => ({ ...prev, recetasPorVariante: inicial, ingredientes: [] }))
        setVarianteActiva(producto.variantes[0].id)
      } else {
        // Sin variantes: usar sistema actual
        setForm(prev => ({ ...prev, recetasPorVariante: {}, ingredientes: [] }))
        setVarianteActiva(null)
      }
    } else {
      setProductoSeleccionado(null)
      setVarianteActiva(null)
    }
  }, [form.productoMenuId, productosMenu])

  const agregarIngrediente = () => {
    if (varianteActiva) {
      // Con variantes: agregar a la variante activa
      setForm({
        ...form,
        recetasPorVariante: {
          ...form.recetasPorVariante,
          [varianteActiva]: {
            ...form.recetasPorVariante[varianteActiva],
            ingredientes: [
              ...(form.recetasPorVariante[varianteActiva]?.ingredientes || []),
              { ingredienteId: '', cantidad: '', unidad: '' }
            ]
          }
        }
      })
    } else {
      // Sin variantes: sistema actual
      setForm({
        ...form,
        ingredientes: [...form.ingredientes, { ingredienteId: '', cantidad: '', unidad: '' }]
      })
    }
  }

  const actualizarIngrediente = (index, field, value) => {
    if (varianteActiva) {
      // Con variantes
      const nuevos = [...(form.recetasPorVariante[varianteActiva]?.ingredientes || [])]
      nuevos[index][field] = value

      // Auto-completar unidad basada en el ingrediente seleccionado
      if (field === 'ingredienteId') {
        const ing = ingredientes.find(i => i.id === value)
        nuevos[index].unidad = ing?.unidadBase || ''
      }

      setForm({
        ...form,
        recetasPorVariante: {
          ...form.recetasPorVariante,
          [varianteActiva]: {
            ...form.recetasPorVariante[varianteActiva],
            ingredientes: nuevos
          }
        }
      })
    } else {
      // Sin variantes
      const nuevos = [...form.ingredientes]
      nuevos[index][field] = value

      // Auto-completar unidad basada en el ingrediente seleccionado
      if (field === 'ingredienteId') {
        const ing = ingredientes.find(i => i.id === value)
        nuevos[index].unidad = ing?.unidadBase || ''
      }

      setForm({ ...form, ingredientes: nuevos })
    }
  }

  const eliminarIngrediente = (index) => {
    if (varianteActiva) {
      // Con variantes
      const nuevos = (form.recetasPorVariante[varianteActiva]?.ingredientes || []).filter((_, i) => i !== index)
      setForm({
        ...form,
        recetasPorVariante: {
          ...form.recetasPorVariante,
          [varianteActiva]: {
            ...form.recetasPorVariante[varianteActiva],
            ingredientes: nuevos
          }
        }
      })
    } else {
      // Sin variantes
      const nuevos = form.ingredientes.filter((_, i) => i !== index)
      setForm({ ...form, ingredientes: nuevos })
    }
  }

  // Costo estimado: convierte la unidad elegida (ej. kg) a la base del ingrediente
  const calcularCostoEstimado = () => {
    const ingredientesActivos = varianteActiva
      ? (form.recetasPorVariante[varianteActiva]?.ingredientes || [])
      : form.ingredientes

    return costoDeIngredientes(
      ingredientesActivos
        .filter(ing => ing.ingredienteId && ing.cantidad)
        .map(ing => ({
          cantidad: ing.cantidad,
          unidad: ing.unidad,
          ingrediente: ingredientes.find(i => i.id === ing.ingredienteId)
        }))
    )
  }

  const handleSubmit = async () => {
    if (!form.nombre.trim()) {
      return toast.error('Ingresá el nombre de la receta')
    }

    setLoading(true)
    try {
      const negocioId = getNegocioId()

      if (productoSeleccionado?.variantes?.length > 0) {
        // Crear múltiples recetas (una por variante)
        const promesas = []

        for (const variante of productoSeleccionado.variantes) {
          const recetaVariante = form.recetasPorVariante[variante.id]

          if (!recetaVariante?.ingredientes?.length) {
            setLoading(false)
            return toast.error(`Falta agregar ingredientes para ${variante.nombre}`)
          }

          // Validar ingredientes
          for (let i = 0; i < recetaVariante.ingredientes.length; i++) {
            const ing = recetaVariante.ingredientes[i]
            if (!ing.ingredienteId) {
              setLoading(false)
              return toast.error(`${variante.nombre}: Seleccioná un ingrediente en la fila ${i + 1}`)
            }
            if (!ing.cantidad || parseFloat(ing.cantidad) <= 0) {
              setLoading(false)
              return toast.error(`${variante.nombre}: La cantidad debe ser mayor a 0 en la fila ${i + 1}`)
            }
          }

          promesas.push(
            api.post(`/negocios/${negocioId}/recetas`, {
              nombre: `${form.nombre} - ${variante.nombre}`,
              productoMenuId: form.productoMenuId,
              varianteId: variante.id,
              ingredientes: recetaVariante.ingredientes.map(ing => ({
                ingredienteId: ing.ingredienteId,
                cantidad: parseFloat(ing.cantidad),
                unidad: ing.unidad
              })),
              notas: recetaVariante.notas || form.notas || null
            })
          )
        }

        await Promise.all(promesas)
        toast.success(`${promesas.length} recetas creadas correctamente`)
      } else {
        // Receta simple sin variantes (sistema actual)
        if (!form.ingredientes.length) {
          setLoading(false)
          return toast.error('Agregá al menos un ingrediente')
        }

        // Validar ingredientes
        for (let i = 0; i < form.ingredientes.length; i++) {
          const ing = form.ingredientes[i]
          if (!ing.ingredienteId) {
            setLoading(false)
            return toast.error(`Seleccioná un ingrediente en la fila ${i + 1}`)
          }
          if (!ing.cantidad || parseFloat(ing.cantidad) <= 0) {
            setLoading(false)
            return toast.error(`La cantidad debe ser mayor a 0 en la fila ${i + 1}`)
          }
        }

        await api.post(`/negocios/${negocioId}/recetas`, {
          nombre: form.nombre.trim(),
          productoMenuId: form.productoMenuId || null,
          varianteId: null,
          ingredientes: form.ingredientes.map(ing => ({
            ingredienteId: ing.ingredienteId,
            cantidad: parseFloat(ing.cantidad),
            unidad: ing.unidad
          })),
          notas: form.notas.trim() || null
        })

        toast.success('Receta creada correctamente')
      }

      onSave()
    } catch (error) {
      console.error('Error:', error)
      toast.error(error.response?.data?.error || error.message || 'Error al crear receta(s)')
    } finally {
      setLoading(false)
    }
  }

  const costoEstimado = calcularCostoEstimado()

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">Nueva Receta</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
            <svg className="w-4 h-4 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Nombre */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Nombre de la Receta <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.nombre}
              onChange={e => setForm({ ...form, nombre: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 dark:bg-gray-700 dark:text-white"
              placeholder="Ej: Hamburguesa Completa"
              autoFocus
            />
          </div>

          {/* Producto del menú */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Vincular a Producto del Menú
            </label>
            <select
              value={form.productoMenuId}
              onChange={e => setForm({ ...form, productoMenuId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="">Sin vincular (opcional)</option>
              {productosMenu.length === 0 ? (
                <option disabled>⚠️ No hay productos del menú. Andá a Menú y creá productos de venta.</option>
              ) : (
                productosMenu.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.nombre} - {p.categoria?.nombre || 'Sin categoría'}
                  </option>
                ))
              )}
            </select>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {productosMenu.length === 0 ? (
                <span className="text-orange-600 dark:text-orange-400">
                  ⚠️ Todavía no tenés productos del menú. Andá a <strong>Menú</strong> y creá productos (hamburguesas, pizzas, bebidas, etc.)
                </span>
              ) : (
                'Vinculá esta receta a un producto del menú. Al venderlo, se descontarán los ingredientes automáticamente.'
              )}
            </p>
          </div>

          {/* Tabs para variantes */}
          {productoSeleccionado?.variantes?.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Variantes del Producto
              </label>
              <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
                {productoSeleccionado.variantes.map(variante => {
                  const receta = form.recetasPorVariante[variante.id]
                  const tieneIngredientes = receta?.ingredientes?.length > 0

                  return (
                    <button
                      key={variante.id}
                      type="button"
                      onClick={() => setVarianteActiva(variante.id)}
                      className={`px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap ${
                        varianteActiva === variante.id
                          ? 'border-b-2 border-violet-600 text-violet-600 dark:text-violet-400'
                          : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                      }`}
                    >
                      {variante.nombre}
                      {tieneIngredientes && (
                        <span className="ml-2 text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-2 py-0.5 rounded-full">
                          ✓ {receta.ingredientes.length}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                Definí los ingredientes específicos para cada variante del producto
              </p>
            </div>
          )}

          {/* Ingredientes */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                Ingredientes <span className="text-red-500">*</span>
                {varianteActiva && productoSeleccionado && (
                  <span className="ml-2 text-violet-600 dark:text-violet-400 font-normal">
                    para {productoSeleccionado.variantes.find(v => v.id === varianteActiva)?.nombre}
                  </span>
                )}
              </h4>
              <button
                onClick={agregarIngrediente}
                className="flex items-center gap-1 px-3 py-1.5 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition text-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Agregar
              </button>
            </div>

            {((varianteActiva ? form.recetasPorVariante[varianteActiva]?.ingredientes : form.ingredientes) || []).length === 0 ? (
              <p className="text-sm text-gray-600 dark:text-gray-400 text-center py-4">
                No hay ingredientes agregados. Hacé clic en "Agregar" para comenzar.
              </p>
            ) : (
              <div className="space-y-2">
                {(varianteActiva ? form.recetasPorVariante[varianteActiva]?.ingredientes : form.ingredientes).map((ing, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-end bg-white dark:bg-gray-800 p-2 rounded-lg">
                    <div className="col-span-6">
                      <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Ingrediente</label>
                      <select
                        value={ing.ingredienteId}
                        onChange={e => actualizarIngrediente(idx, 'ingredienteId', e.target.value)}
                        className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 dark:bg-gray-700 dark:text-white"
                      >
                        <option value="">Seleccionar ingrediente...</option>
                        {ingredientes.length === 0 ? (
                          <option disabled>⚠️ No hay ingredientes. Andá a Stock y creá ingredientes (pan, carne, etc.)</option>
                        ) : (
                          ingredientes.map(i => (
                            <option key={i.id} value={i.id}>
                              {i.nombre} - Stock: {i.stock} {i.unidadBase}
                            </option>
                          ))
                        )}
                      </select>
                    </div>

                    <div className="col-span-3">
                      <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                        Cantidad {ing.unidad && `(en ${ing.unidad}${ing.unidad === 'unidad' ? 'es' : ''})`}
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={ing.cantidad}
                        onChange={e => actualizarIngrediente(idx, 'cantidad', e.target.value)}
                        className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 dark:bg-gray-700 dark:text-white"
                        placeholder={ing.unidad ? `Ej: ${ing.unidad === 'gramo' ? '250' : ing.unidad === 'litro' ? '0.5' : '2'} ${ing.unidad}${ing.unidad === 'unidad' ? 'es' : ''}` : "Seleccionar ingrediente primero"}
                        disabled={!ing.ingredienteId}
                      />
                    </div>

                    <div className="col-span-2">
                      <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Unidad</label>
                      {(() => {
                        const ingObj = ingredientes.find(i => i.id === ing.ingredienteId)
                        const opciones = ingObj ? unidadesCompatibles(ingObj.unidadBase) : []
                        const equivale = ingObj && ing.cantidad && ing.unidad && ing.unidad !== ingObj.unidadBase
                          ? convertir(ing.cantidad, ing.unidad, ingObj.unidadBase) : null
                        return (
                          <>
                            <select
                              value={ing.unidad}
                              onChange={e => actualizarIngrediente(idx, 'unidad', e.target.value)}
                              disabled={!ing.ingredienteId}
                              className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 dark:bg-gray-700 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-900"
                            >
                              {opciones.length === 0 && <option value="">—</option>}
                              {opciones.map(u => <option key={u} value={u}>{u}</option>)}
                            </select>
                            {equivale !== null && (
                              <p className="text-[10px] text-violet-600 dark:text-violet-400 mt-0.5">= {equivale} {ingObj.unidadBase}</p>
                            )}
                          </>
                        )
                      })()}
                    </div>

                    <div className="col-span-1 flex justify-center">
                      <button
                        onClick={() => eliminarIngrediente(idx)}
                        className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition"
                        title="Eliminar"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Costo estimado + margen contra el precio de venta */}
          {((varianteActiva ? form.recetasPorVariante[varianteActiva]?.ingredientes : form.ingredientes) || []).length > 0 && (() => {
            const varianteObj = varianteActiva ? productoSeleccionado?.variantes?.find(v => v.id === varianteActiva) : null
            const precioVenta = parseFloat(varianteObj?.precioVenta ?? productoSeleccionado?.precioVenta) || 0
            const margen = precioVenta - costoEstimado
            return (
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    💰 Costo Estimado:
                  </span>
                  <span className="text-2xl font-bold text-green-700 dark:text-green-400">
                    ${costoEstimado.toFixed(2)}
                  </span>
                </div>
                {precioVenta > 0 && (
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-green-200 dark:border-green-800 text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Precio de venta: ${precioVenta.toFixed(2)}</span>
                    <span className={`font-bold ${margen >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-600'}`}>
                      Ganancia: ${margen.toFixed(2)} ({precioVenta > 0 ? Math.round((margen / precioVenta) * 100) : 0}%)
                    </span>
                  </div>
                )}
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  Basado en los precios de costo actuales de los ingredientes
                </p>
              </div>
            )
          })()}

          {/* Notas */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Notas
            </label>
            <textarea
              value={form.notas}
              onChange={e => setForm({ ...form, notas: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 dark:bg-gray-700 dark:text-white"
              placeholder="Instrucciones, observaciones..."
            />
          </div>
        </div>

        <div className="flex gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700 sticky bottom-0 bg-white dark:bg-gray-800">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition disabled:opacity-50"
          >
            {loading ? 'Creando...' : 'Crear Receta'}
          </button>
        </div>
      </div>
    </div>
  )
}
