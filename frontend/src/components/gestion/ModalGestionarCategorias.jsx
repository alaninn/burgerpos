import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import api from '../../api/axios'
import toast from 'react-hot-toast'

export default function ModalGestionarCategorias({ categorias, onClose, onUpdate }) {
  const { getNegocioId } = useAuth()
  const [editando, setEditando] = useState(null)
  const [nombreEdit, setNombreEdit] = useState('')

  const handleEditar = (cat) => {
    setEditando(cat.id)
    setNombreEdit(cat.nombre)
  }

  const handleGuardar = async (cat) => {
    if (!nombreEdit.trim()) {
      return toast.error('El nombre no puede estar vacío')
    }

    try {
      const negocioId = getNegocioId()
      await api.put(`/negocios/${negocioId}/productos/categorias/${cat.id}`, {
        nombre: nombreEdit.trim()
      })
      toast.success('Categoría actualizada')
      onUpdate()
      setEditando(null)
    } catch (error) {
      console.error('Error:', error)
      toast.error(error.response?.data?.message || 'Error al actualizar categoría')
    }
  }

  const handleEliminar = async (cat) => {
    if (!confirm(`¿Eliminar la categoría "${cat.nombre}"?\n\nLos productos de esta categoría quedarán sin categoría.`)) {
      return
    }

    try {
      const negocioId = getNegocioId()
      await api.delete(`/negocios/${negocioId}/productos/categorias/${cat.id}`)
      toast.success('Categoría eliminada')
      onUpdate()
    } catch (error) {
      console.error('Error:', error)
      toast.error(error.response?.data?.message || 'Error al eliminar categoría')
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">Gestionar Categorías de Stock</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
            <svg className="w-4 h-4 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {categorias.length === 0 ? (
            <div className="text-center py-12">
              <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
              <p className="text-gray-600 dark:text-gray-400">No hay categorías de stock</p>
              <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">Creá una categoría para comenzar</p>
            </div>
          ) : (
            <div className="space-y-2">
              {categorias.map(cat => (
                <div
                  key={cat.id}
                  className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700"
                >
                  {editando === cat.id ? (
                    <>
                      <input
                        type="text"
                        value={nombreEdit}
                        onChange={e => setNombreEdit(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') handleGuardar(cat)
                          if (e.key === 'Escape') setEditando(null)
                        }}
                        className="flex-1 px-3 py-1.5 border border-violet-300 dark:border-violet-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 dark:bg-gray-700 dark:text-white"
                        autoFocus
                      />
                      <button
                        onClick={() => handleGuardar(cat)}
                        className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg"
                        title="Guardar"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </button>
                      <button
                        onClick={() => setEditando(null)}
                        className="p-2 text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                        title="Cancelar"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 dark:text-gray-100">{cat.nombre}</p>
                        {cat.descripcion && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{cat.descripcion}</p>
                        )}
                      </div>
                      <button
                        onClick={() => handleEditar(cat)}
                        className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg"
                        title="Editar"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleEliminar(cat)}
                        className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                        title="Eliminar"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}
