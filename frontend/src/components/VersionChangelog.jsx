// Boton de version + modal de novedades. Cuando hay una version nueva sin leer,
// las novedades se abren solas centradas en la pantalla (no en la barra del menu).
import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { VERSION_ACTUAL, CHANGELOG } from '../changelog'

const STORAGE_KEY = 'version_vista'

export default function VersionChangelog({ esSuperadmin = false }) {
  const [abierto, setAbierto] = useState(false)
  const [hayNueva, setHayNueva] = useState(false)

  // Filtrar lo que es solo-superadmin cuando lo ve un negocio
  const visibles = (arr) => (arr || []).filter(x => esSuperadmin || !x.super)
  const entradas = CHANGELOG
    .map(e => ({ ...e, destacados: visibles(e.destacados), cambios: visibles(e.cambios) }))
    .filter(e => e.destacados.length > 0 || e.cambios.length > 0)

  useEffect(() => {
    const vista = localStorage.getItem(STORAGE_KEY)
    if (vista !== VERSION_ACTUAL) {
      setHayNueva(true)
      // Se abre sola una vez para que el usuario vea las novedades en pantalla
      if (entradas[0]?.destacados.length > 0 || entradas[0]?.cambios.length > 0) {
        setAbierto(true)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const cerrar = () => {
    setAbierto(false)
    localStorage.setItem(STORAGE_KEY, VERSION_ACTUAL)
    setHayNueva(false)
  }

  return (
    <>
      <button onClick={() => setAbierto(true)}
        className="relative w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-gray-400 hover:text-gray-200 hover:bg-gray-800 transition-colors">
        v{VERSION_ACTUAL} 📋
        {hayNueva && <span className="absolute top-1 right-2 w-2 h-2 bg-green-400 rounded-full animate-pulse" />}
      </button>

      {abierto && createPortal(
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4" onClick={cerrar}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-5 bg-gradient-to-r from-violet-600 to-purple-600 text-white flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold">🎉 Novedades</h3>
                <p className="text-white/80 text-sm">Versión actual: v{VERSION_ACTUAL}</p>
              </div>
              <button onClick={cerrar} className="text-white/80 hover:text-white text-2xl leading-none">×</button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              {entradas.map((e, idx) => (
                <div key={e.version}>
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${idx === 0 ? 'bg-violet-100 text-violet-700' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'}`}>v{e.version}</span>
                    <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">{e.titulo}</span>
                    <span className="text-xs text-gray-400 ml-auto">{e.fecha}</span>
                  </div>

                  {e.destacados.length > 0 && (
                    <div className="space-y-2 mb-3">
                      {e.destacados.map((d, i) => (
                        <div key={i} className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-3">
                          <p className="font-semibold text-amber-900 dark:text-amber-300 text-sm">{d.titulo}{d.super && <span className="ml-1 text-[10px] text-amber-600 font-semibold">SUPERADMIN</span>}</p>
                          <p className="text-amber-800 dark:text-amber-200 text-xs mt-1 leading-relaxed">{d.detalle}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  <ul className="space-y-1.5">
                    {e.cambios.map((c, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-300">
                        <span className="text-violet-500 mt-0.5">✓</span>
                        <span>{c.t}{c.super && <span className="ml-1 text-[10px] text-amber-600 font-semibold">SUPERADMIN</span>}</span>
                      </li>
                    ))}
                  </ul>

                  {idx < entradas.length - 1 && <div className="border-t border-gray-100 dark:border-gray-700 mt-4" />}
                </div>
              ))}
            </div>

            <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40">
              <button onClick={cerrar} className="w-full py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-lg font-semibold transition-colors">Entendido</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
