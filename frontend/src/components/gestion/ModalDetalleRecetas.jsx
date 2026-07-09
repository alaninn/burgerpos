import { useState } from 'react'

export default function ModalDetalleRecetas({ grupo, onClose, onEditar, onEliminar, calcularCosto }) {
  const [varianteActiva, setVarianteActiva] = useState(grupo.recetas[0].id)
  const recetaActiva = grupo.recetas.find(r => r.id === varianteActiva)
  const tieneVariantes = grupo.recetas.length > 1 && grupo.recetas.some(r => r.variante)

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-violet-600 to-purple-600 px-6 py-5 text-white">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h2 className="text-2xl font-bold mb-1">{grupo.producto?.nombre || grupo.recetas[0].nombre}</h2>
              <p className="text-violet-100 text-sm">
                {tieneVariantes ? `${grupo.recetas.length} variantes configuradas` : 'Receta única'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Tabs de variantes */}
        {tieneVariantes && (
          <div className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
            <div className="flex overflow-x-auto px-6">
              {grupo.recetas.map(receta => (
                <button
                  key={receta.id}
                  onClick={() => setVarianteActiva(receta.id)}
                  className={`px-6 py-4 text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${
                    varianteActiva === receta.id
                      ? 'border-violet-600 text-violet-600 dark:text-violet-400 bg-white dark:bg-gray-800'
                      : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                  }`}
                >
                  {receta.variante?.nombre || receta.nombre}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Contenido */}
        <div className="overflow-y-auto max-h-[calc(90vh-180px)]">
          <div className="p-6">
            {/* Info de la variante */}
            {recetaActiva.variante && (
              <div className="mb-4 flex items-center gap-2">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 rounded-lg">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                  <span className="font-medium">Variante: {recetaActiva.variante.nombre}</span>
                </div>
              </div>
            )}

            {/* Ingredientes */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                <svg className="w-5 h-5 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                Ingredientes
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {recetaActiva.ingredientes && recetaActiva.ingredientes.length > 0 ? (
                  recetaActiva.ingredientes.map(ing => (
                    <div
                      key={ing.id}
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700"
                    >
                      <span className="text-gray-700 dark:text-gray-300 font-medium">
                        {ing.ingrediente?.nombre || 'Ingrediente'}
                      </span>
                      <span className="text-gray-900 dark:text-gray-100 font-bold">
                        {parseFloat(ing.cantidad)} {ing.unidad}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 dark:text-gray-400 col-span-2">Sin ingredientes configurados</p>
                )}
              </div>
            </div>

            {/* Costo */}
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl p-5 border border-green-200 dark:border-green-800 mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-700 dark:text-green-400 font-medium mb-1">Costo de producción</p>
                  <p className="text-xs text-green-600 dark:text-green-500">Basado en precios actuales</p>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold text-green-700 dark:text-green-400">
                    ${calcularCosto(recetaActiva).toFixed(2)}
                  </p>
                </div>
              </div>
            </div>

            {/* Notas */}
            {recetaActiva.notas && (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4 border border-yellow-200 dark:border-yellow-800">
                <div className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-yellow-800 dark:text-yellow-300 mb-1">Notas</p>
                    <p className="text-sm text-yellow-700 dark:text-yellow-400">{recetaActiva.notas}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer con acciones */}
        <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 px-6 py-4 flex items-center justify-between">
          <button
            onClick={() => onEliminar(recetaActiva.id)}
            className="flex items-center gap-2 px-4 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Eliminar Receta
          </button>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
            >
              Cerrar
            </button>
            <button
              onClick={() => onEditar(recetaActiva)}
              className="flex items-center gap-2 px-6 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Editar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
