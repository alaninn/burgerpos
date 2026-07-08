import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import api from '../../api/axios'
import toast from 'react-hot-toast'

// Carga rapida de stock: setea la cantidad de cada producto en una sola pantalla
// y guarda de una. Ideal para hacer el inventario o reponer varios productos.
export default function ModalCargarStock({ productos, categorias, onClose, onSave }) {
  const { getNegocioId } = useAuth()
  const [valores, setValores] = useState(() => {
    const v = {}
    productos.forEach(p => { v[p.id] = p.stock ?? '' })
    return v
  })
  const [catFiltro, setCatFiltro] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [guardando, setGuardando] = useState(false)

  const lista = productos.filter(p => {
    if (catFiltro && p.categoriaId !== catFiltro) return false
    if (busqueda && !p.nombre.toLowerCase().includes(busqueda.toLowerCase())) return false
    return true
  })

  const set = (id, val) => setValores(v => ({ ...v, [id]: val }))

  const guardar = async () => {
    const negocioId = getNegocioId()
    // Solo los productos cuyo stock cambió respecto al original
    const cambios = productos.filter(p => {
      const nuevo = valores[p.id]
      return nuevo !== '' && nuevo != null && Number(nuevo) !== Number(p.stock ?? 0)
    })
    if (cambios.length === 0) { toast('No hay cambios para guardar'); return }
    setGuardando(true)
    let ok = 0, err = 0
    for (const p of cambios) {
      try {
        await api.put(`/negocios/${negocioId}/productos/${p.id}`, { stock: Number(valores[p.id]) })
        ok++
      } catch { err++ }
    }
    setGuardando(false)
    if (ok > 0) toast.success(`${ok} producto(s) actualizado(s)`)
    if (err > 0) toast.error(`${err} no se pudieron actualizar`)
    onSave()
    onClose()
  }

  const inputBase = 'w-full px-2.5 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 dark:bg-gray-700 dark:text-white'

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">Cargar stock</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Poné cuántas unidades hay de cada producto y guardá todo junto.</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
            <svg className="w-4 h-4 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-3 flex flex-col sm:flex-row gap-2 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar producto..."
            className={inputBase + ' sm:flex-1'} />
          <select value={catFiltro} onChange={e => setCatFiltro(e.target.value)} className={inputBase + ' sm:w-56'}>
            <option value="">Todas las categorías</option>
            {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-2">
          {lista.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">No hay productos para mostrar.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-white dark:bg-gray-800">
                <tr className="text-left text-xs text-gray-500 dark:text-gray-400">
                  <th className="py-2">Producto</th>
                  <th className="py-2 w-24 text-center">Actual</th>
                  <th className="py-2 w-32 text-right">Nueva cantidad</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {lista.map(p => (
                  <tr key={p.id}>
                    <td className="py-2 pr-2">
                      <p className="font-medium text-gray-900 dark:text-gray-100">{p.nombre}</p>
                      <p className="text-xs text-gray-400">{p.categoria?.nombre || '—'} · {p.unidadBase || 'unidad'}</p>
                    </td>
                    <td className="py-2 text-center text-gray-500 dark:text-gray-400">{Number(p.stock ?? 0)}</td>
                    <td className="py-2 text-right">
                      <input type="number" step="0.001" value={valores[p.id]}
                        onChange={e => set(p.id, e.target.value)}
                        className={inputBase + ' text-right'} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="flex gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
          <button onClick={onClose} className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition">Cancelar</button>
          <button onClick={guardar} disabled={guardando}
            className="flex-1 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition disabled:opacity-50">
            {guardando ? 'Guardando...' : 'Guardar stock'}
          </button>
        </div>
      </div>
    </div>
  )
}
