// Boton de version con modal de novedades. Muestra un punto verde cuando hay
// una version nueva sin leer (comparada contra localStorage).
import { useState } from 'react'
import { VERSION_ACTUAL, CHANGELOG } from '../changelog'

export default function VersionChangelog({ esSuperadmin = false }) {
  const [abierto, setAbierto] = useState(false)
  const [vista, setVista] = useState(() => localStorage.getItem('version_vista') || '')

  const hayNueva = vista !== VERSION_ACTUAL

  const abrir = () => {
    setAbierto(true)
    localStorage.setItem('version_vista', VERSION_ACTUAL)
    setVista(VERSION_ACTUAL)
  }

  // Filtrar cambios solo-superadmin para los negocios
  const entradas = CHANGELOG.map(e => ({
    ...e,
    cambios: e.cambios.filter(c => esSuperadmin || !c.super),
  })).filter(e => e.cambios.length > 0)

  return (
    <>
      <button onClick={abrir}
        className="relative w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-gray-400 hover:text-gray-200 hover:bg-gray-800 transition-colors">
        v{VERSION_ACTUAL} 📋
        {hayNueva && (
          <span className="absolute top-1 right-2 w-2 h-2 bg-green-400 rounded-full animate-pulse" />
        )}
      </button>

      {abierto && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4" onClick={() => setAbierto(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">Novedades</h3>
              <button onClick={() => setAbierto(false)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-500">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {entradas.map(e => (
                <div key={e.version}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-bold bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full">v{e.version}</span>
                    <span className="text-xs text-gray-500">{e.fecha}</span>
                  </div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1.5">{e.titulo}</p>
                  <ul className="space-y-1">
                    {e.cambios.map((c, i) => (
                      <li key={i} className="text-sm text-gray-600 dark:text-gray-300 flex gap-2">
                        <span className="text-violet-500 flex-shrink-0">•</span>
                        <span>{c.t}{c.super && <span className="ml-1 text-[10px] text-amber-600 font-semibold">SUPERADMIN</span>}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
