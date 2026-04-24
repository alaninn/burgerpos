import { useState, useRef, useCallback, useEffect } from 'react'

export default function DireccionAutocomplete({ value, onChange, ciudad = '', placeholder = 'Ej: Av. Corrientes 1234', rows = 2 }) {
  const [sugerencias, setSugerencias] = useState([])
  const [abierto, setAbierto] = useState(false)
  const [buscando, setBuscando] = useState(false)
  const timeoutRef = useRef(null)
  const wrapRef = useRef(null)

  useEffect(() => {
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setAbierto(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const buscar = useCallback((texto) => {
    clearTimeout(timeoutRef.current)
    if (!texto || texto.length < 3) { setSugerencias([]); setAbierto(false); return }
    timeoutRef.current = setTimeout(async () => {
      setBuscando(true)
      try {
        const params = new URLSearchParams({ input: texto })
        if (ciudad) params.set('ciudad', ciudad)
        const res = await fetch(`/api/maps/autocomplete?${params}`)
        const data = await res.json()
        const items = data.predictions || []
        setSugerencias(items)
        setAbierto(items.length > 0)
      } catch { }
      finally { setBuscando(false) }
    }, 400)
  }, [ciudad])

  const handleChange = (e) => {
    onChange(e.target.value)
    buscar(e.target.value)
  }

  const seleccionar = (item) => {
    const texto = item.structured_formatting?.main_text || item.description?.split(',')[0] || ''
    onChange(texto)
    setSugerencias([])
    setAbierto(false)
  }

  return (
    <div ref={wrapRef} className="relative">
      <div className="relative">
        {rows === 1 ? (
          <input
            value={value}
            onChange={handleChange}
            onFocus={() => sugerencias.length > 0 && setAbierto(true)}
            placeholder={placeholder}
            className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
        ) : (
          <textarea
            value={value}
            onChange={handleChange}
            onFocus={() => sugerencias.length > 0 && setAbierto(true)}
            placeholder={placeholder}
            rows={rows}
            className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none leading-snug"
          />
        )}
        {buscando && (
          <div className="absolute right-3 top-3">
            <div className="w-3.5 h-3.5 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>
      {abierto && sugerencias.length > 0 && (
        <ul className="absolute z-50 left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl shadow-xl overflow-hidden">
          {sugerencias.map((s, i) => {
            const linea1 = s.structured_formatting?.main_text || s.description?.split(',')[0] || ''
            const lugar = s.structured_formatting?.secondary_text || ''
            return (
              <li key={i}>
                <button
                  type="button"
                  onMouseDown={() => seleccionar(s)}
                  className="w-full text-left px-3 py-2.5 text-xs text-gray-700 dark:text-gray-300 hover:bg-violet-50 dark:hover:bg-violet-900/30 hover:text-violet-800 dark:hover:text-white border-b border-gray-50 dark:border-gray-700 last:border-0 transition-colors flex items-start gap-2"
                >
                  <svg className="w-3.5 h-3.5 text-violet-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span>
                    {linea1}
                    {lugar && <span className="text-gray-400 font-normal"> — {lugar}</span>}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
