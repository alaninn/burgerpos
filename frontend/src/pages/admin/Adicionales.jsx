import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../context/AuthContext'
import api from '../../api/axios'
import toast from 'react-hot-toast'

// ─── Margen ───────────────────────────────────────────────
function margenPct(pv, pc) {
  const v = parseFloat(pv) || 0
  const c = parseFloat(pc) || 0
  if (!v) return 0
  return Math.round(((v - c) / v) * 100)
}

function MargenBadge({ pv, pc }) {
  const m = margenPct(pv, pc)
  const color = m >= 50 ? 'bg-green-100 text-green-700' : m >= 30 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-600'
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${color}`}>{m}%</span>
}

// ─── Modal grupo de adicionales ───────────────────────────
function ModalGrupo({ negocioId, grupo, onClose, onSaved }) {
  const esNuevo = !grupo?.id
  const [form, setForm] = useState({
    titulo: '',
    obligatorio: false,
    minSeleccion: 0,
    maxSeleccion: 1,
    activo: true,
    ...grupo
  })
  const [items, setItems] = useState(grupo?.items || [{ nombre: '', precioVenta: '', precioCosto: '', maxSeleccion: 1, visible: true, activo: true }])
  const [productos, setProductos] = useState([])
  const [productosSeleccionados, setProductosSeleccionados] = useState([])
  const [loading, setLoading] = useState(false)
  const [showProductos, setShowProductos] = useState(false)

  // Cargar todos los productos del negocio
  useEffect(() => {
    api.get(`/negocios/${negocioId}/productos/categorias`)
      .then(({ data }) => {
        const cats = data.categorias || []
        return Promise.all(
          cats.map(cat =>
            api.get(`/negocios/${negocioId}/productos?categoriaId=${cat.id}`)
              .then(res => (res.data.productos || []).map(p => ({ ...p, categoriaNombre: cat.nombre })))
              .catch(() => [])
          )
        )
      })
      .then(results => setProductos(results.flat()))
      .catch(() => {})

    // Si estamos editando, cargar productos asignados
    if (grupo?.id) {
      // No hay endpoint directo para productos del grupo, usamos la info del grupo ya cargado
      // Si el grupo vino con `productos` asignados, los usamos
      setProductosSeleccionados(grupo.productos?.map(p => p.id) || [])
    }
  }, [negocioId, grupo?.id])

  const agregarItem = () => {
    setItems(prev => [...prev, { nombre: '', precioVenta: '', precioCosto: '', maxSeleccion: 1, visible: true, activo: true }])
  }

  const cambiarItem = (idx, campo, valor) => {
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, [campo]: valor } : it))
  }

  const quitarItem = (idx) => {
    setItems(prev => prev.filter((_, i) => i !== idx))
  }

  const toggleProducto = (id) => {
    setProductosSeleccionados(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  const seleccionarCategoria = (prods) => {
    const ids = prods.map(p => p.id)
    const todosSeleccionados = ids.every(id => productosSeleccionados.includes(id))
    if (todosSeleccionados) {
      setProductosSeleccionados(prev => prev.filter(id => !ids.includes(id)))
    } else {
      setProductosSeleccionados(prev => [...new Set([...prev, ...ids])])
    }
  }

  const guardar = async () => {
    if (!form.titulo.trim()) return toast.error('El título es obligatorio')
    const itemsLimpios = items
      .filter(it => it.nombre?.trim())
      .map((it, i) => ({
        nombre: it.nombre.trim(),
        precioVenta: parseFloat(it.precioVenta) || 0,
        precioCosto: parseFloat(it.precioCosto) || 0,
        maxSeleccion: parseInt(it.maxSeleccion) || 1,
        visible: it.visible !== false,
        activo: it.activo !== false,
        orden: i
      }))

    setLoading(true)
    try {
      const payload = {
        titulo: form.titulo,
        obligatorio: form.obligatorio,
        minSeleccion: parseInt(form.minSeleccion) || 0,
        maxSeleccion: parseInt(form.maxSeleccion) || 1,
        activo: form.activo,
        items: itemsLimpios,
        productoIds: productosSeleccionados
      }
      if (esNuevo) {
        await api.post(`/negocios/${negocioId}/adicionales`, payload)
      } else {
        await api.put(`/negocios/${negocioId}/adicionales/${grupo.id}`, payload)
      }
      toast.success(esNuevo ? 'Grupo creado' : 'Grupo actualizado')
      onSaved()
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al guardar')
    } finally { setLoading(false) }
  }

  // Agrupar productos por categoría
  const porCategoria = productos.reduce((acc, p) => {
    const cat = p.categoriaNombre || 'Sin categoría'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(p)
    return acc
  }, {})

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">{esNuevo ? 'Nuevo grupo de adicionales' : 'Editar grupo de adicionales'}</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
            <svg className="w-4 h-4 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Opciones del grupo */}
          <div className="flex items-center gap-6 flex-wrap">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.obligatorio} onChange={e => setForm(f => ({ ...f, obligatorio: e.target.checked }))} className="w-4 h-4 accent-violet-600" />
              <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">Selección obligatoria</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.activo} onChange={e => setForm(f => ({ ...f, activo: e.target.checked }))} className="w-4 h-4 accent-violet-600" />
              <span className="text-sm text-gray-700 dark:text-gray-300">Activo</span>
            </label>
          </div>

          {/* Título */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Título del grupo *</label>
            <input value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))}
              placeholder="Ej: Salsas, Ingredientes extras, Tamaño..."
              className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
          </div>

          {/* Límites */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Selección mínima</label>
              <input type="number" min="0" value={form.minSeleccion}
                onChange={e => setForm(f => ({ ...f, minSeleccion: e.target.value }))}
                className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Selección máxima</label>
              <input type="number" min="1" value={form.maxSeleccion}
                onChange={e => setForm(f => ({ ...f, maxSeleccion: e.target.value }))}
                className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
            </div>
          </div>

          {/* Listado de adicionales */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Listado de Adicionales</label>
              <button onClick={() => {
                const sorted = [...items].sort((a, b) => a.nombre.localeCompare(b.nombre))
                setItems(sorted)
              }} className="text-xs text-violet-600 dark:text-violet-400 hover:underline">Ordenar A-Z</button>
            </div>

            <div className="space-y-3">
              {/* Header de columnas */}
              <div className="grid grid-cols-12 gap-2 px-1">
                <div className="col-span-4 text-xs text-gray-600 dark:text-gray-400 font-medium">Nombre</div>
                <div className="col-span-2 text-xs text-gray-600 dark:text-gray-400 font-medium">P. venta</div>
                <div className="col-span-2 text-xs text-gray-600 dark:text-gray-400 font-medium">P. costo</div>
                <div className="col-span-2 text-xs text-gray-600 dark:text-gray-400 font-medium">Sel. máx.</div>
                <div className="col-span-2"></div>
              </div>

              {items.map((it, idx) => (
                <div key={idx} className="border border-gray-300 dark:border-gray-700 rounded-xl p-3 bg-gray-50/50">
                  <div className="grid grid-cols-12 gap-2 mb-2">
                    <div className="col-span-4">
                      <input value={it.nombre || ''} onChange={e => cambiarItem(idx, 'nombre', e.target.value)}
                        placeholder="Nombre"
                        className="w-full px-2.5 py-1.5 border border-gray-300 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-violet-500 bg-white dark:bg-gray-800" />
                    </div>
                    <div className="col-span-2">
                      <div className="relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-600 dark:text-gray-400 text-xs">$</span>
                        <input type="number" value={it.precioVenta || ''} onChange={e => cambiarItem(idx, 'precioVenta', e.target.value)}
                          placeholder="0"
                          className="w-full pl-5 pr-2 py-1.5 border border-gray-300 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-violet-500 bg-white dark:bg-gray-800" />
                      </div>
                    </div>
                    <div className="col-span-2">
                      <div className="relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-600 dark:text-gray-400 text-xs">$</span>
                        <input type="number" value={it.precioCosto || ''} onChange={e => cambiarItem(idx, 'precioCosto', e.target.value)}
                          placeholder="0"
                          className="w-full pl-5 pr-2 py-1.5 border border-gray-300 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-violet-500 bg-white dark:bg-gray-800" />
                      </div>
                    </div>
                    <div className="col-span-2">
                      <input type="number" min="1" value={it.maxSeleccion ?? 1} onChange={e => cambiarItem(idx, 'maxSeleccion', e.target.value)}
                        placeholder="1"
                        className="w-full px-2.5 py-1.5 border border-gray-300 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-violet-500 bg-white dark:bg-gray-800" />
                    </div>
                    <div className="col-span-2 flex items-center justify-end">
                      <button onClick={() => quitarItem(idx)} className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded text-red-400 hover:text-red-600">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <MargenBadge pv={it.precioVenta} pc={it.precioCosto} />
                    <span className="text-xs text-gray-600 dark:text-gray-400">margen</span>
                    <label className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-300 cursor-pointer ml-2">
                      <input type="checkbox" checked={it.visible !== false} onChange={e => cambiarItem(idx, 'visible', e.target.checked)} className="w-3 h-3 accent-violet-600" />
                      Visible
                    </label>
                    <label className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-300 cursor-pointer">
                      <input type="checkbox" checked={it.activo !== false} onChange={e => cambiarItem(idx, 'activo', e.target.checked)} className="w-3 h-3 accent-violet-600" />
                      Activo
                    </label>
                  </div>
                </div>
              ))}
            </div>

            <button onClick={agregarItem}
              className="w-full mt-3 py-2.5 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl text-sm text-violet-600 dark:text-violet-400 hover:border-violet-300 hover:bg-violet-50 dark:hover:bg-violet-900/30 transition-colors font-medium">
              + Agregar nuevo adicional
            </button>
          </div>

          {/* Disponible en productos */}
          <div>
            <button
              onClick={() => setShowProductos(!showProductos)}
              className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors text-left">
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Disponible en productos</p>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                  {productosSeleccionados.length === 0
                    ? 'Ningún producto seleccionado'
                    : `${productosSeleccionados.length} producto${productosSeleccionados.length !== 1 ? 's' : ''} seleccionado${productosSeleccionados.length !== 1 ? 's' : ''}`
                  }
                </p>
              </div>
              <svg className={`w-5 h-5 text-gray-600 dark:text-gray-400 transition-transform ${showProductos ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </button>

            {showProductos && (
              <div className="mt-2 border border-gray-300 dark:border-gray-700 rounded-xl overflow-hidden max-h-64 overflow-y-auto">
                {Object.entries(porCategoria).map(([cat, prods]) => (
                  <div key={cat}>
                    {/* Header de categoría */}
                    <button
                      onClick={() => seleccionarCategoria(prods)}
                      className="w-full flex items-center gap-3 px-4 py-2 bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left border-b border-gray-200 dark:border-gray-700">
                      <input type="checkbox"
                        checked={prods.every(p => productosSeleccionados.includes(p.id))}
                        onChange={() => seleccionarCategoria(prods)}
                        className="w-4 h-4 accent-violet-600"
                        onClick={e => e.stopPropagation()} />
                      <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                        Seleccionar todos: {cat} (Delivery, Take away)
                      </span>
                    </button>
                    {/* Productos */}
                    {prods.map(p => (
                      <label key={p.id}
                        className="flex items-center gap-3 px-6 py-2.5 hover:bg-violet-50 dark:hover:bg-violet-900/30 cursor-pointer border-b border-gray-50 transition-colors">
                        <input type="checkbox"
                          checked={productosSeleccionados.includes(p.id)}
                          onChange={() => toggleProducto(p.id)}
                          className="w-4 h-4 accent-violet-600" />
                        <span className="text-sm text-gray-700 dark:text-gray-300">{p.nombre}</span>
                      </label>
                    ))}
                  </div>
                ))}
                {productos.length === 0 && (
                  <div className="text-center py-6 text-sm text-gray-600 dark:text-gray-400">No hay productos creados</div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
          <button onClick={onClose} className="text-sm text-gray-700 dark:text-gray-300 hover:text-gray-700 font-medium">Cancelar</button>
          <button onClick={guardar} disabled={loading}
            className="px-6 py-2.5 bg-violet-600 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-50">
            {loading ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────
export default function Adicionales() {
  const { usuario } = useAuth()
  const negocioId = usuario?.negocioId
  const [grupos, setGrupos] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editGrupo, setEditGrupo] = useState(null)
  // Paginación
  const POR_PAGINA = 7
  const [pagina, setPagina] = useState(1)

  const cargar = useCallback(() => {
    if (!negocioId) return
    setLoading(true)
    api.get(`/negocios/${negocioId}/adicionales`)
      .then(({ data }) => setGrupos(data.grupos || []))
      .catch(() => setGrupos([]))
      .finally(() => setLoading(false))
  }, [negocioId])

  useEffect(() => { cargar() }, [cargar])

  const eliminarGrupo = async (id) => {
    if (!confirm('¿Eliminar este grupo de adicionales?')) return
    try {
      await api.delete(`/negocios/${negocioId}/adicionales/${id}`)
      toast.success('Grupo eliminado')
      cargar()
    } catch { toast.error('Error al eliminar') }
  }

  const duplicarGrupo = async (grupo) => {
    try {
      const payload = {
        titulo: `${grupo.titulo} (copia)`,
        obligatorio: grupo.obligatorio,
        minSeleccion: grupo.minSeleccion,
        maxSeleccion: grupo.maxSeleccion,
        items: (grupo.items || []).map(({ nombre, precioVenta, precioCosto, maxSeleccion, visible, activo }) => ({
          nombre, precioVenta, precioCosto, maxSeleccion, visible, activo
        })),
        productoIds: (grupo.productos || []).map(p => p.id)
      }
      await api.post(`/negocios/${negocioId}/adicionales`, payload)
      toast.success('Grupo duplicado')
      cargar()
    } catch { toast.error('Error al duplicar') }
  }

  const toggleActivo = async (grupo) => {
    try {
      await api.put(`/negocios/${negocioId}/adicionales/${grupo.id}`, { activo: !grupo.activo })
      setGrupos(prev => prev.map(g => g.id === grupo.id ? { ...g, activo: !g.activo } : g))
    } catch { toast.error('Error al actualizar') }
  }

  const totalPaginas = Math.ceil(grupos.length / POR_PAGINA)
  const gruposPagina = grupos.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA)

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Adicionales</h1>
          <p className="text-sm text-gray-700 dark:text-gray-300 mt-0.5">Grupos de ingredientes extras, salsas, variaciones...</p>
        </div>
        <button onClick={() => { setEditGrupo(null); setShowModal(true) }}
          className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 text-white rounded-xl text-sm font-medium hover:bg-gray-800 transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          Crear
        </button>
      </div>

      {/* Tabla */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Cabecera */}
        <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
          <div className="col-span-1">Visible</div>
          <div className="col-span-5">Título</div>
          <div className="col-span-2 text-center">Adicionales</div>
          <div className="col-span-2 text-center">Máx. selección</div>
          <div className="col-span-2 text-right">Acciones</div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-7 h-7 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : grupos.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-14 h-14 bg-gray-100 dark:bg-gray-700 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <svg className="w-7 h-7 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" /></svg>
            </div>
            <p className="text-gray-700 dark:text-gray-300 font-medium">Sin grupos de adicionales</p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Creá grupos de salsas, ingredientes, tamaños...</p>
          </div>
        ) : (
          gruposPagina.map((g, i) => (
            <div key={g.id}
              className={`grid grid-cols-12 gap-4 px-6 py-4 items-center ${i < gruposPagina.length - 1 ? 'border-b border-gray-100' : ''} hover:bg-gray-50/50 transition-colors`}>
              {/* Toggle activo */}
              <div className="col-span-1">
                <button onClick={() => toggleActivo(g)}
                  className={`relative w-10 h-5.5 rounded-full transition-colors flex-shrink-0 ${g.activo ? 'bg-violet-600' : 'bg-gray-200'}`}
                  style={{ height: '22px' }}>
                  <span className={`absolute top-0.5 w-4 h-4 bg-white dark:bg-gray-800 rounded-full shadow transition-transform ${g.activo ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </button>
              </div>
              {/* Título */}
              <div className="col-span-5">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{g.titulo}</p>
                {g.obligatorio && (
                  <span className="text-xs text-violet-600 dark:text-violet-400 font-medium">Obligatorio</span>
                )}
              </div>
              {/* Cantidad de items */}
              <div className="col-span-2 text-center">
                <span className="text-sm text-gray-700 dark:text-gray-300">{g.items?.length || 0} adicionales</span>
              </div>
              {/* Selección máxima */}
              <div className="col-span-2 text-center">
                <span className="text-sm text-gray-700 dark:text-gray-300">Máx. {g.maxSeleccion || 1}</span>
              </div>
              {/* Acciones */}
              <div className="col-span-2 flex items-center justify-end gap-2">
                <button onClick={() => { setEditGrupo(g); setShowModal(true) }}
                  className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-600 dark:text-gray-400 hover:text-gray-600 transition-colors"
                  title="Editar">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                </button>
                <button onClick={() => duplicarGrupo(g)}
                  className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-600 dark:text-gray-400 hover:text-gray-600 transition-colors"
                  title="Duplicar">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                </button>
                <button onClick={() => eliminarGrupo(g.id)}
                  className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-gray-600 dark:text-gray-400 hover:text-red-500 transition-colors"
                  title="Eliminar">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Paginación */}
      {totalPaginas > 1 && (
        <div className="flex items-center justify-between mt-4">
          <span className="text-sm text-gray-700 dark:text-gray-300">
            {(pagina - 1) * POR_PAGINA + 1} - {Math.min(pagina * POR_PAGINA, grupos.length)} de {grupos.length}
          </span>
          <div className="flex items-center gap-2">
            <select value={POR_PAGINA} className="text-sm border border-gray-300 dark:border-gray-700 rounded-lg px-2 py-1">
              <option value={7}>{POR_PAGINA}</option>
            </select>
            <button disabled={pagina === 1} onClick={() => setPagina(p => p - 1)}
              className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg disabled:opacity-40">
              <svg className="w-4 h-4 text-gray-700 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
            <button disabled={pagina === totalPaginas} onClick={() => setPagina(p => p + 1)}
              className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg disabled:opacity-40">
              <svg className="w-4 h-4 text-gray-700 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>
        </div>
      )}

      {showModal && (
        <ModalGrupo
          negocioId={negocioId}
          grupo={editGrupo}
          onClose={() => { setShowModal(false); setEditGrupo(null) }}
          onSaved={cargar}
        />
      )}
    </div>
  )
}
