import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import api from '../../api/axios'
import toast from 'react-hot-toast'

export default function ModalNuevaCategoria({ onClose, onSave }) {
  const { getNegocioId } = useAuth()
  const [loading, setLoading] = useState(false)
  const [nombre, setNombre] = useState('')
  const [tipo, setTipo] = useState('ingrediente')

  const handleSubmit = async () => {
    if (!nombre.trim()) {
      return toast.error('Ingresá el nombre de la categoría')
    }

    setLoading(true)
    try {
      const negocioId = getNegocioId()
      const { data } = await api.post(`/negocios/${negocioId}/productos/categorias`, {
        nombre: nombre.trim(),
        tipo: tipo,
        activo: true,
        orden: 999,
        descripcion: tipo === 'ingrediente' ? `Ingredientes: ${nombre.trim()}` : `Productos finales: ${nombre.trim()}`
      })

      toast.success('Categoría creada correctamente')
      onSave(data.categoria)
      onClose()
    } catch (error) {
      console.error('Error:', error)
      toast.error(error.response?.data?.message || 'Error al crear categoría')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">Nueva Categoría de Stock</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
            <svg className="w-4 h-4 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Tipo de Categoría <span className="text-red-500">*</span>
              </label>
              <select
                value={tipo}
                onChange={e => setTipo(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="ingrediente">📦 Ingrediente (pan, carne, queso)</option>
                <option value="producto">🥤 Producto Final (bebidas)</option>
              </select>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {tipo === 'ingrediente'
                  ? 'Se usará en recetas. Solo aparece en Stock.'
                  : 'Se vende tal cual. Aparece en Stock Y en Menú.'}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Nombre de la Categoría <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={nombre}
                onChange={e => setNombre(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 dark:bg-gray-700 dark:text-white"
                placeholder={tipo === 'ingrediente' ? 'Ej: Carnes, Verduras, Panes...' : 'Ej: Bebidas, Postres...'}
                autoFocus
              />
            </div>
          </div>
        </div>

        <div className="flex gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !nombre.trim()}
            className="flex-1 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition disabled:opacity-50"
          >
            {loading ? 'Creando...' : 'Crear Categoría'}
          </button>
        </div>
      </div>
    </div>
  )
}
