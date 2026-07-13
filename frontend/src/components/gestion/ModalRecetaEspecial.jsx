import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import api from '../../api/axios'
import toast from 'react-hot-toast'
import { costoDeIngredientes, unidadesCompatibles, convertir } from '../../utils/unidades'

const UNIDADES_PRODUCIDA = [
  { value: 'gramo', label: 'Gramos' },
  { value: 'kg', label: 'Kilogramos' },
  { value: 'ml', label: 'Mililitros' },
  { value: 'litro', label: 'Litros' },
  { value: 'unidad', label: 'Unidades' }
]

// Receta especial: combina productos de stock para crear un nuevo producto
// intermedio (ej: una salsa alioli hecha con mayonesa + ajo) que rinde una
// cantidad declarada y que despues puede elegirse como ingrediente de
// cualquier otra receta, igual que un ingrediente comprado. `receta` presente
// = edición; ausente = alta nueva.
export default function ModalRecetaEspecial({ receta, ingredientes, onClose, onSave }) {
  const { getNegocioId } = useAuth()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    nombre: receta?.productoMenu?.nombre || receta?.nombre || '',
    unidadProducida: receta?.productoMenu?.unidadBase || 'gramo',
    cantidadProducida: receta?.cantidadProducida != null ? parseFloat(receta.cantidadProducida) : '',
    ingredientes: (receta?.ingredientes || []).map(ing => ({
      ingredienteId: ing.ingredienteId,
      cantidad: parseFloat(ing.cantidad),
      unidad: ing.unidad
    })),
    extraCosto: receta?.extraCosto ? parseFloat(receta.extraCosto) : '',
    notas: receta?.notas || ''
  })

  // No se puede elegir el propio producto (si estamos editando) como
  // ingrediente de si mismo.
  const opcionesIngrediente = ingredientes.filter(i => i.id !== receta?.productoMenuId)

  const agregarIngrediente = () => setForm(f => ({ ...f, ingredientes: [...f.ingredientes, { ingredienteId: '', cantidad: '', unidad: '' }] }))

  const actualizarIngrediente = (idx, campo, valor) => {
    setForm(f => ({
      ...f,
      ingredientes: f.ingredientes.map((ing, i) => {
        if (i !== idx) return ing
        const nueva = { ...ing, [campo]: valor }
        if (campo === 'ingredienteId') {
          const ref = opcionesIngrediente.find(x => x.id === valor)
          nueva.unidad = ref ? (ref.unidadBase || 'unidad') : ''
        }
        return nueva
      })
    }))
  }

  const eliminarIngrediente = (idx) => setForm(f => ({ ...f, ingredientes: f.ingredientes.filter((_, i) => i !== idx) }))

  const costoTotalEstimado = () => costoDeIngredientes(
    form.ingredientes
      .filter(ing => ing.ingredienteId && ing.cantidad)
      .map(ing => ({ cantidad: ing.cantidad, unidad: ing.unidad, ingrediente: opcionesIngrediente.find(i => i.id === ing.ingredienteId) })),
    form.extraCosto
  )
  const costoPorUnidad = () => {
    const rinde = Number(form.cantidadProducida) || 0
    return rinde > 0 ? costoTotalEstimado() / rinde : 0
  }

  const handleSubmit = async () => {
    if (!form.nombre.trim()) return toast.error('Ingresá el nombre del producto a preparar')
    if (!form.cantidadProducida || Number(form.cantidadProducida) <= 0) return toast.error('Indicá cuánto rinde la receta')
    if (form.ingredientes.length === 0) return toast.error('Agregá al menos un ingrediente')
    for (let i = 0; i < form.ingredientes.length; i++) {
      const ing = form.ingredientes[i]
      if (!ing.ingredienteId) return toast.error(`Seleccioná un ingrediente en la fila ${i + 1}`)
      if (!ing.cantidad || parseFloat(ing.cantidad) <= 0) return toast.error(`La cantidad debe ser mayor a 0 en la fila ${i + 1}`)
    }

    setLoading(true)
    try {
      const negocioId = getNegocioId()
      const payload = {
        nombre: form.nombre.trim(),
        unidadProducida: form.unidadProducida,
        cantidadProducida: Number(form.cantidadProducida),
        ingredientes: form.ingredientes.map(ing => ({ ingredienteId: ing.ingredienteId, cantidad: parseFloat(ing.cantidad), unidad: ing.unidad })),
        extraCosto: Number(form.extraCosto) || 0,
        notas: form.notas.trim() || null
      }
      if (receta) {
        await api.put(`/negocios/${negocioId}/recetas/especiales/${receta.id}`, payload)
        toast.success('Receta especial actualizada')
      } else {
        await api.post(`/negocios/${negocioId}/recetas/especiales`, payload)
        toast.success('Receta especial creada')
      }
      onSave()
    } catch (error) {
      console.error('Error:', error)
      toast.error(error.response?.data?.error || 'Error al guardar la receta especial')
    } finally {
      setLoading(false)
    }
  }

  const inputBase = 'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 dark:bg-gray-700 dark:text-white'

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800">
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">{receta ? 'Editar receta especial' : 'Nueva receta especial'}</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Combiná ingredientes para crear un nuevo producto (ej: una salsa) que después podés usar en otras recetas.</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
            <svg className="w-4 h-4 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Nombre del producto a preparar <span className="text-red-500">*</span>
            </label>
            <input type="text" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })}
              className={inputBase} placeholder="Ej: Salsa Alioli" autoFocus />
          </div>

          {/* Cuanto rinde la receta */}
          <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 bg-gray-50 dark:bg-gray-900/40">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">⚖️ ¿Cuánto rinde esta receta?</h4>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500 dark:text-gray-400">Con esta receta se preparan</span>
              <input type="number" step="0.001" min="0.001" value={form.cantidadProducida}
                onChange={e => setForm({ ...form, cantidadProducida: e.target.value })}
                className="w-24 px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-white" placeholder="500" />
              <select value={form.unidadProducida} onChange={e => setForm({ ...form, unidadProducida: e.target.value })}
                className="px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-white">
                {UNIDADES_PRODUCIDA.map(u => <option key={u.value} value={u.value}>{u.label.toLowerCase()}</option>)}
              </select>
            </div>
            <p className="text-[10px] text-gray-400 mt-2">
              💡 Ej: "con esta receta se preparan 500 gramos" de alioli. El stock de {form.nombre || 'este producto'} se va a contar en {form.unidadProducida}.
            </p>
          </div>

          {/* Ingredientes */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                Ingredientes para {form.cantidadProducida || '?'} {form.unidadProducida} <span className="text-red-500">*</span>
              </h4>
              <button onClick={agregarIngrediente} className="flex items-center gap-1 px-3 py-1.5 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition text-sm">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                Agregar
              </button>
            </div>

            {form.ingredientes.length === 0 ? (
              <p className="text-sm text-gray-600 dark:text-gray-400 text-center py-4">No hay ingredientes agregados. Hacé clic en "Agregar" para comenzar.</p>
            ) : (
              <div className="space-y-2">
                {form.ingredientes.map((ing, idx) => {
                  const ref = opcionesIngrediente.find(i => i.id === ing.ingredienteId)
                  const opciones = ref ? unidadesCompatibles(ref.unidadBase) : []
                  const equivale = ref && ing.cantidad && ing.unidad && ing.unidad !== ref.unidadBase
                    ? convertir(ing.cantidad, ing.unidad, ref.unidadBase) : null
                  return (
                    <div key={idx} className="grid grid-cols-12 gap-2 items-end bg-white dark:bg-gray-800 p-2 rounded-lg">
                      <div className="col-span-6">
                        <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Ingrediente</label>
                        <select value={ing.ingredienteId} onChange={e => actualizarIngrediente(idx, 'ingredienteId', e.target.value)}
                          className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-sm dark:bg-gray-700 dark:text-white">
                          <option value="">Seleccionar ingrediente...</option>
                          {Object.entries(
                            opcionesIngrediente.reduce((acc, i) => { const cat = i.categoria?.nombre || 'Sin categoría'; (acc[cat] = acc[cat] || []).push(i); return acc }, {})
                          ).map(([cat, items]) => (
                            <optgroup key={cat} label={cat}>
                              {items.map(i => <option key={i.id} value={i.id}>{i.nombre} - Stock: {parseFloat(i.stock ?? 0)} {i.unidadBase}</option>)}
                            </optgroup>
                          ))}
                        </select>
                      </div>
                      <div className="col-span-3">
                        <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Cantidad</label>
                        <input type="number" step="0.01" min="0" value={ing.cantidad} disabled={!ing.ingredienteId}
                          onChange={e => actualizarIngrediente(idx, 'cantidad', e.target.value)}
                          className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-sm dark:bg-gray-700 dark:text-white" placeholder="0" />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Unidad</label>
                        <select value={ing.unidad} disabled={!ing.ingredienteId} onChange={e => actualizarIngrediente(idx, 'unidad', e.target.value)}
                          className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-sm dark:bg-gray-700 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-900">
                          {opciones.length === 0 && <option value="">—</option>}
                          {opciones.map(u => <option key={u} value={u}>{u}</option>)}
                        </select>
                        {equivale !== null && <p className="text-[10px] text-violet-600 dark:text-violet-400 mt-0.5">= {equivale} {ref.unidadBase}</p>}
                      </div>
                      <div className="col-span-1 flex justify-center">
                        <button onClick={() => eliminarIngrediente(idx)} className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Extra de costo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Extra por merma/preparación <span className="text-gray-400 font-normal">(opcional)</span>
            </label>
            <div className="relative max-w-xs">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
              <input type="number" step="0.01" min="0" value={form.extraCosto} onChange={e => setForm({ ...form, extraCosto: e.target.value })}
                placeholder="0" className="w-full pl-7 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-white" />
            </div>
          </div>

          {/* Costo estimado */}
          {form.ingredientes.length > 0 && Number(form.cantidadProducida) > 0 && (
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">💰 Costo total del lote:</span>
                <span className="text-xl font-bold text-green-700 dark:text-green-400">${costoTotalEstimado().toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between mt-1 pt-1 border-t border-green-200 dark:border-green-800">
                <span className="text-sm text-gray-600 dark:text-gray-400">Costo por {form.unidadProducida}:</span>
                <span className="text-sm font-semibold text-green-700 dark:text-green-400">${costoPorUnidad().toFixed(2)}</span>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Es lo que va a costar usar este producto como ingrediente en otras recetas.</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notas</label>
            <textarea value={form.notas} onChange={e => setForm({ ...form, notas: e.target.value })} rows={2}
              className={inputBase + ' resize-none'} placeholder="Instrucciones, observaciones..." />
          </div>
        </div>

        <div className="flex gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700 sticky bottom-0 bg-white dark:bg-gray-800">
          <button onClick={onClose} className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition">Cancelar</button>
          <button onClick={handleSubmit} disabled={loading} className="flex-1 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition disabled:opacity-50">
            {loading ? 'Guardando...' : receta ? 'Guardar Cambios' : 'Crear Receta Especial'}
          </button>
        </div>
      </div>
    </div>
  )
}
