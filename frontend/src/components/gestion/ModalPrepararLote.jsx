import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import api from '../../api/axios'
import toast from 'react-hot-toast'
import { convertir } from '../../utils/unidades'

// Preparar un lote de una receta especial: consume el stock de los
// ingredientes (escalados a la cantidad pedida) y suma esa cantidad al
// stock del producto resultante. Ej: la receta rinde 500g, pido 1000g -> se
// usa el doble de cada ingrediente.
export default function ModalPrepararLote({ receta, onClose, onSave }) {
  const { getNegocioId } = useAuth()
  const [cantidad, setCantidad] = useState(receta.cantidadProducida ? parseFloat(receta.cantidadProducida) : '')
  const [guardando, setGuardando] = useState(false)

  const producto = receta.productoMenu
  const rinde = parseFloat(receta.cantidadProducida) || 1
  const multiplicador = (Number(cantidad) || 0) / rinde

  const guardar = async () => {
    const n = Number(cantidad)
    if (!n || n <= 0) return toast.error('Indicá una cantidad válida')
    setGuardando(true)
    try {
      const negocioId = getNegocioId()
      const { data } = await api.post(`/negocios/${negocioId}/recetas/${receta.id}/preparar`, { cantidad: n })
      toast.success(data.message || 'Lote preparado')
      onSave()
    } catch (error) {
      toast.error(error.response?.data?.error || 'Error al preparar el lote')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">🧪 Preparar lote</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{producto?.nombre}</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
            <svg className="w-4 h-4 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            La receta rinde <strong>{rinde} {producto?.unidadBase}</strong>. Indicá cuánto querés preparar (podés hacer más o menos de un lote).
          </p>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Cantidad a preparar</label>
            <div className="flex items-center gap-2">
              <input type="number" step="0.001" min="0.001" value={cantidad} onFocus={e => e.target.select()}
                onChange={e => setCantidad(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-lg dark:bg-gray-700 dark:text-white" />
              <span className="text-sm text-gray-500 dark:text-gray-400">{producto?.unidadBase}</span>
            </div>
            {multiplicador > 0 && multiplicador !== 1 && (
              <p className="text-xs text-violet-600 dark:text-violet-400 mt-1">= {multiplicador.toFixed(2)}x la receta base</p>
            )}
          </div>

          {multiplicador > 0 && (
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3">
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">Se va a consumir del stock:</p>
              <div className="space-y-1">
                {(receta.ingredientes || []).map(item => {
                  const ing = item.ingrediente
                  if (!ing) return null
                  const cantidadEnBase = convertir(item.cantidad, item.unidad, ing.unidadBase) * multiplicador
                  const quedaria = (Number(ing.stock) || 0) - cantidadEnBase
                  return (
                    <div key={item.id} className="flex items-center justify-between text-sm">
                      <span className="text-gray-700 dark:text-gray-300">{ing.nombre}</span>
                      <span className={quedaria < 0 ? 'text-red-600 font-medium' : 'text-gray-500 dark:text-gray-400'}>
                        -{cantidadEnBase.toFixed(2)} {ing.unidadBase} {quedaria < 0 && '⚠️ sin stock suficiente'}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
          <button onClick={onClose} className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition">Cancelar</button>
          <button onClick={guardar} disabled={guardando} className="flex-1 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition disabled:opacity-50">
            {guardando ? 'Preparando...' : 'Preparar'}
          </button>
        </div>
      </div>
    </div>
  )
}
