import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '../../context/AuthContext'
import Adicionales from './Adicionales'
import api from '../../api/axios'
import toast from 'react-hot-toast'
import * as XLSX from 'xlsx'

// ─── Utilidad: margen ─────────────────────────────────────
function margenPct(pv, pc) {
  const v = parseFloat(pv) || 0
  const c = parseFloat(pc) || 0
  if (!v) return 0
  return Math.round(((v - c) / v) * 100)
}

function MargenBadge({ pv, pc }) {
  const m = margenPct(pv, pc)
  const color = m >= 50 ? 'bg-green-100 text-green-700' : m >= 30 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-600'
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${color}`}>{m}% margen</span>
}

// ─── Exportar menú a Excel ────────────────────────────────
async function exportarMenuExcel(negocioId) {
  const { data: catData } = await api.get(`/negocios/${negocioId}/productos/categorias`)
  const categorias = catData.categorias || []
  const rows = []
  for (const cat of categorias) {
    const { data: prodData } = await api.get(`/negocios/${negocioId}/productos?categoriaId=${cat.id}&limit=9999`)
    const productos = prodData.productos || []
    for (const p of productos) {
      rows.push({
        'Categoría': cat.nombre,
        'Nombre': p.nombre,
        'Descripción': p.descripcion || '',
        'Precio Venta': Number(p.precioVenta) || 0,
        'Precio Costo': Number(p.precioCosto) || 0,
        'Stock': p.tieneStock ? (p.stock ?? '') : '',
        'Activo': p.activo ? 'SI' : 'NO',
      })
    }
  }
  const ws = XLSX.utils.json_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Menu')
  XLSX.writeFile(wb, 'menu_exportado.xlsx')
}

function descargarPlantilla() {
  const rows = [
    { 'Categoría': 'Hamburguesas', 'Nombre': 'Smash Burger', 'Descripción': 'Con queso cheddar', 'Precio Venta': 4500, 'Precio Costo': 1800, 'Stock': '', 'Activo': 'SI' },
    { 'Categoría': 'Bebidas', 'Nombre': 'Coca Cola 500ml', 'Descripción': '', 'Precio Venta': 1200, 'Precio Costo': 600, 'Stock': 50, 'Activo': 'SI' },
  ]
  const ws = XLSX.utils.json_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Menu')
  XLSX.writeFile(wb, 'plantilla_menu.xlsx')
}

// ─── Modal importar menú ──────────────────────────────────
function ModalImportarMenu({ negocioId, categorias, onClose, onSaved }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState([])
  const fileRef = useRef(null)

  const onFile = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const wb = XLSX.read(ev.target.result, { type: 'array' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const data = XLSX.utils.sheet_to_json(ws)
      setRows(data)
      setErrors([])
    }
    reader.readAsArrayBuffer(file)
  }

  const importar = async () => {
    if (rows.length === 0) return toast.error('Seleccioná un archivo primero')
    setLoading(true)
    setErrors([])
    const errs = []
    let creados = 0

    // Mapa de categorías existentes (nombre → id)
    const catMap = {}
    categorias.forEach(c => { catMap[c.nombre.toLowerCase().trim()] = c.id })

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const catNombre = (row['Categoría'] || '').trim()
      const nombre = (row['Nombre'] || '').trim()
      if (!nombre) { errs.push(`Fila ${i + 2}: nombre vacío`); continue }
      if (!catNombre) { errs.push(`Fila ${i + 2}: categoría vacía`); continue }

      // Crear categoría si no existe
      let catId = catMap[catNombre.toLowerCase()]
      if (!catId) {
        try {
          const { data } = await api.post(`/negocios/${negocioId}/productos/categorias`, { nombre: catNombre, activo: true })
          catId = data.categoria?.id
          catMap[catNombre.toLowerCase()] = catId
        } catch { errs.push(`Fila ${i + 2}: no se pudo crear la categoría "${catNombre}"`); continue }
      }

      const stock = row['Stock'] !== undefined && row['Stock'] !== '' ? Number(row['Stock']) : null
      try {
        await api.post(`/negocios/${negocioId}/productos`, {
          categoriaId: catId,
          nombre,
          descripcion: row['Descripción'] || '',
          precioVenta: Number(row['Precio Venta']) || 0,
          precioCosto: Number(row['Precio Costo']) || 0,
          tieneStock: stock !== null,
          stock: stock,
          activo: String(row['Activo']).toUpperCase() !== 'NO',
        })
        creados++
      } catch (err) {
        errs.push(`Fila ${i + 2} "${nombre}": ${err.response?.data?.message || 'error'}`)
      }
    }

    setErrors(errs)
    setLoading(false)
    if (creados > 0) {
      toast.success(`${creados} producto${creados > 1 ? 's' : ''} importado${creados > 1 ? 's' : ''}`)
      onSaved()
    }
    if (errs.length === 0) onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">Importar menú desde Excel</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
            <svg className="w-4 h-4 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-sm text-gray-700 dark:text-gray-300">El archivo debe tener las columnas: <span className="font-medium text-gray-700 dark:text-gray-300">Categoría, Nombre, Descripción, Precio Venta, Precio Costo, Stock, Activo</span>. Podés descargar la plantilla desde el menú.</p>
          <div
            className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-6 text-center cursor-pointer hover:border-violet-400 transition-colors"
            onClick={() => fileRef.current?.click()}>
            <svg className="w-8 h-8 text-gray-500 dark:text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            {rows.length > 0
              ? <p className="text-sm font-medium text-violet-600 dark:text-violet-400">{rows.length} filas cargadas</p>
              : <p className="text-sm text-gray-600 dark:text-gray-400">Hacé clic para seleccionar un archivo .xlsx</p>
            }
            <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={onFile} />
          </div>
          {errors.length > 0 && (
            <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3 max-h-40 overflow-y-auto">
              {errors.map((e, i) => <p key={i} className="text-xs text-red-600 dark:text-red-400">{e}</p>)}
            </div>
          )}
        </div>
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-700">
          <button onClick={onClose} className="text-sm text-red-500 hover:underline">Cancelar</button>
          <button onClick={importar} disabled={loading || rows.length === 0}
            className="px-6 py-2 bg-violet-600 text-white rounded-lg text-sm font-medium hover:bg-violet-700 disabled:opacity-50">
            {loading ? 'Importando...' : `Importar ${rows.length > 0 ? rows.length + ' filas' : ''}`}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Modal ajuste masivo de precios ──────────────────────
function ModalPrecios({ negocioId, categorias, onClose, onSaved }) {
  const [tipo, setTipo] = useState('porcentaje') // 'porcentaje' | 'fijo'
  const [direccion, setDireccion] = useState('subir') // 'subir' | 'bajar'
  const [valor, setValor] = useState('')
  const [scope, setScope] = useState('todas') // 'todas' | catId
  const [loading, setLoading] = useState(false)

  const aplicar = async () => {
    const v = parseFloat(valor)
    if (!v || v <= 0) return toast.error('Ingresá un valor mayor a 0')
    if (!confirm(`¿Confirmar ajuste de precios? Se aplicará a todos los productos ${scope === 'todas' ? 'del menú' : 'de la categoría seleccionada'}.`)) return
    setLoading(true)
    try {
      // Traer productos del scope
      const catIds = scope === 'todas'
        ? categorias.map(c => c.id)
        : [scope]

      let actualizados = 0
      for (const catId of catIds) {
        const { data } = await api.get(`/negocios/${negocioId}/productos?categoriaId=${catId}&limit=9999`)
        const productos = data.productos || []
        for (const prod of productos) {
          const precioActual = Number(prod.precioVenta) || 0
          if (!precioActual) continue
          let nuevoPrecio
          if (tipo === 'porcentaje') {
            nuevoPrecio = direccion === 'subir'
              ? precioActual * (1 + v / 100)
              : precioActual * (1 - v / 100)
          } else {
            nuevoPrecio = direccion === 'subir'
              ? precioActual + v
              : precioActual - v
          }
          nuevoPrecio = Math.max(0, Math.round(nuevoPrecio))
          await api.put(`/negocios/${negocioId}/productos/${prod.id}`, { precioVenta: nuevoPrecio })
          actualizados++
        }
      }
      toast.success(`${actualizados} producto${actualizados !== 1 ? 's' : ''} actualizados`)
      onSaved()
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al aplicar precios')
    } finally { setLoading(false) }
  }

  const factorPreview = tipo === 'porcentaje' && parseFloat(valor) > 0
    ? (direccion === 'subir' ? `+${valor}%` : `-${valor}%`)
    : tipo === 'fijo' && parseFloat(valor) > 0
    ? (direccion === 'subir' ? `+$${valor}` : `-$${valor}`)
    : null

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">Ajuste masivo de precios</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
            <svg className="w-4 h-4 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="p-6 space-y-5">
          {/* Tipo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Tipo de ajuste</label>
            <div className="flex gap-2">
              {[['porcentaje', 'Porcentaje (%)'], ['fijo', 'Monto fijo ($)']].map(([v, label]) => (
                <button key={v} onClick={() => setTipo(v)}
                  className={`flex-1 py-2 text-sm font-medium rounded-lg border transition-colors ${tipo === v ? 'bg-violet-600 text-white border-violet-600' : 'border-gray-200 text-gray-600 dark:text-gray-300 hover:bg-gray-50'}`}>
                  {label}
                </button>
              ))}
            </div>
          </div>
          {/* Dirección */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Dirección</label>
            <div className="flex gap-2">
              {[['subir', '↑ Subir precios'], ['bajar', '↓ Bajar precios']].map(([v, label]) => (
                <button key={v} onClick={() => setDireccion(v)}
                  className={`flex-1 py-2 text-sm font-medium rounded-lg border transition-colors ${direccion === v ? v === 'subir' ? 'bg-green-600 text-white border-green-600' : 'bg-red-600 text-white border-red-600' : 'border-gray-200 text-gray-600 dark:text-gray-300 hover:bg-gray-50'}`}>
                  {label}
                </button>
              ))}
            </div>
          </div>
          {/* Valor */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {tipo === 'porcentaje' ? 'Porcentaje (%)' : 'Monto ($)'}
            </label>
            <input
              type="number" min="0" step={tipo === 'porcentaje' ? '0.1' : '1'}
              value={valor} onChange={e => setValor(e.target.value)}
              placeholder={tipo === 'porcentaje' ? 'Ej: 15' : 'Ej: 500'}
              className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
          </div>
          {/* Scope */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Aplicar a</label>
            <select value={scope} onChange={e => setScope(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500">
              <option value="todas">Todas las categorías</option>
              {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </div>
          {/* Preview */}
          {factorPreview && (
            <div className={`rounded-lg px-4 py-3 text-sm font-medium ${direccion === 'subir' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
              Se aplicará {factorPreview} al precio de venta de todos los productos seleccionados
            </div>
          )}
        </div>
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-700">
          <button onClick={onClose} className="text-sm text-red-500 hover:underline">Cancelar</button>
          <button onClick={aplicar} disabled={loading || !valor}
            className="px-6 py-2 bg-violet-600 text-white rounded-lg text-sm font-medium hover:bg-violet-700 disabled:opacity-50">
            {loading ? 'Aplicando...' : 'Aplicar'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Modal categoría ──────────────────────────────────────
function ModalCategoria({ negocioId, categoria, onClose, onSaved }) {
  const [form, setForm] = useState({ nombre: '', descripcion: '', activo: true, ...categoria })
  const [loading, setLoading] = useState(false)

  const guardar = async () => {
    if (!form.nombre.trim()) return toast.error('El nombre es obligatorio')
    setLoading(true)
    try {
      if (categoria?.id) {
        await api.put(`/negocios/${negocioId}/productos/categorias/${categoria.id}`, form)
      } else {
        await api.post(`/negocios/${negocioId}/productos/categorias`, form)
      }
      toast.success(categoria?.id ? 'Categoría actualizada' : 'Categoría creada')
      onSaved()
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al guardar')
    } finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">{categoria?.id ? 'Editar categoría' : 'Crear categoría'}</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
            <svg className="w-4 h-4 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="p-6 space-y-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.activo} onChange={e => setForm(f => ({ ...f, activo: e.target.checked }))} className="w-4 h-4 accent-violet-600" />
            <span className="text-sm text-gray-700 dark:text-gray-300">Categoría activa</span>
          </label>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nombre *</label>
            <input value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
              placeholder="Nombre de la categoría"
              className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Descripción</label>
            <input value={form.descripcion || ''} onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
              placeholder="Descripción opcional"
              className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
          </div>
        </div>
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-700">
          <button onClick={onClose} className="text-sm text-red-500 hover:underline">Cancelar</button>
          <button onClick={guardar} disabled={loading}
            className="px-6 py-2 bg-violet-600 text-white rounded-lg text-sm font-medium hover:bg-violet-700 disabled:opacity-50">
            {loading ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Editor de imagen con modal de recorte ───────────────
// ─── Editor de imagen inline con selector de área ─────────
function ImagenEditor({ value, onUploaded, onRemove }) {
  const [localUrl, setLocalUrl] = useState(null)
  const [localFile, setLocalFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [naturalSize, setNaturalSize] = useState({ w: 0, h: 0 })
  const [displaySize, setDisplaySize] = useState({ w: 0, h: 0 })
  // crop en coordenadas relativas 0..1
  const [crop, setCrop] = useState({ x: 0.1, y: 0.1, w: 0.8, h: 0.8 })
  const [dragging, setDragging] = useState(null) // 'move' | 'nw'|'ne'|'sw'|'se'
  const [dragStart, setDragStart] = useState(null)
  const imgContainerRef = useRef(null)
  const imgRef = useRef(null)

  const onFileChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (localUrl) URL.revokeObjectURL(localUrl)
    setLocalFile(file)
    setLocalUrl(URL.createObjectURL(file))
    setCrop({ x: 0.1, y: 0.1, w: 0.8, h: 0.8 })
    setNaturalSize({ w: 0, h: 0 })
    e.target.value = ''
  }

  const onImgLoad = (e) => {
    setNaturalSize({ w: e.target.naturalWidth, h: e.target.naturalHeight })
    const rect = e.target.getBoundingClientRect()
    setDisplaySize({ w: rect.width, h: rect.height })
  }

  // Convertir evento a posición relativa dentro de la imagen
  const getRelPos = (clientX, clientY) => {
    if (!imgRef.current) return { x: 0, y: 0 }
    const rect = imgRef.current.getBoundingClientRect()
    return {
      x: Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)),
      y: Math.max(0, Math.min(1, (clientY - rect.top) / rect.height))
    }
  }

  const MIN = 0.1

  const onMouseDown = (e, type) => {
    e.preventDefault()
    e.stopPropagation()
    const pos = getRelPos(e.clientX, e.clientY)
    setDragging(type)
    setDragStart({ pos, crop: { ...crop } })
  }

  const onMouseMove = (e) => {
    if (!dragging || !dragStart) return
    const pos = getRelPos(e.clientX, e.clientY)
    const dx = pos.x - dragStart.pos.x
    const dy = pos.y - dragStart.pos.y
    const c = dragStart.crop
    let nx = c.x, ny = c.y, nw = c.w, nh = c.h

    /* SELECTOR LIBRE (sin proporción cuadrada) — descomentar para volver
    if (dragging === 'move') {
      nx = Math.max(0, Math.min(1 - c.w, c.x + dx))
      ny = Math.max(0, Math.min(1 - c.h, c.y + dy))
    } else if (dragging === 'nw') {
      nx = Math.max(0, Math.min(c.x + c.w - MIN, c.x + dx))
      ny = Math.max(0, Math.min(c.y + c.h - MIN, c.y + dy))
      nw = c.x + c.w - nx
      nh = c.y + c.h - ny
    } else if (dragging === 'ne') {
      ny = Math.max(0, Math.min(c.y + c.h - MIN, c.y + dy))
      nw = Math.max(MIN, Math.min(1 - c.x, c.w + dx))
      nh = c.y + c.h - ny
    } else if (dragging === 'sw') {
      nx = Math.max(0, Math.min(c.x + c.w - MIN, c.x + dx))
      nw = c.x + c.w - nx
      nh = Math.max(MIN, Math.min(1 - c.y, c.h + dy))
    } else if (dragging === 'se') {
      nw = Math.max(MIN, Math.min(1 - c.x, c.w + dx))
      nh = Math.max(MIN, Math.min(1 - c.y, c.h + dy))
    }
    */

    // SELECTOR CUADRADO (proporción fija)
    if (dragging === 'move') {
      nx = Math.max(0, Math.min(1 - c.w, c.x + dx))
      ny = Math.max(0, Math.min(1 - c.h, c.y + dy))
    } else if (dragging === 'nw') {
      const delta = Math.max(dx, dy)
      const size = Math.max(MIN, Math.min(c.w - delta, c.h - delta, c.x + c.w, c.y + c.h))
      nx = c.x + c.w - size
      ny = c.y + c.h - size
      nw = size
      nh = size
    } else if (dragging === 'ne') {
      const delta = Math.max(-dx, dy)
      const size = Math.max(MIN, Math.min(c.w - delta, c.h - delta, 1 - c.x, c.y + c.h))
      ny = c.y + c.h - size
      nw = size
      nh = size
    } else if (dragging === 'sw') {
      const delta = Math.max(dx, -dy)
      const size = Math.max(MIN, Math.min(c.w - delta, c.h - delta, c.x + c.w, 1 - c.y))
      nx = c.x + c.w - size
      nw = size
      nh = size
    } else if (dragging === 'se') {
      const size = Math.max(MIN, Math.min(c.w + dx, c.h + dy, 1 - c.x, 1 - c.y))
      nw = size
      nh = size
    }
    setCrop({ x: nx, y: ny, w: nw, h: nh })
  }

  const onMouseUp = () => { setDragging(null); setDragStart(null) }

  const uploadCropped = async () => {
    if (!localFile) return
    setUploading(true)
    try {
      const img = new Image()
      img.src = localUrl
      await new Promise((res, rej) => { img.onload = res; img.onerror = rej })
      const iW = img.naturalWidth
      const iH = img.naturalHeight
      const OUTPUT = 800
      const canvas = document.createElement('canvas')
      canvas.width = OUTPUT; canvas.height = OUTPUT
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img,
        crop.x * iW, crop.y * iH, crop.w * iW, crop.h * iH,
        0, 0, OUTPUT, OUTPUT
      )
      await new Promise((res) => {
        canvas.toBlob(async (blob) => {
          try {
            const fd = new FormData()
            fd.append('imagen', blob, 'producto.jpg')
            const { data } = await api.post('/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
            onUploaded(data.url)
            URL.revokeObjectURL(localUrl)
            setLocalFile(null); setLocalUrl(null)
            toast.success('Imagen subida')
          } catch { toast.error('Error al subir imagen') }
          finally { setUploading(false); res() }
        }, 'image/jpeg', 0.9)
      })
    } catch { toast.error('Error al procesar imagen'); setUploading(false) }
  }

  const eliminar = () => {
    if (localUrl) URL.revokeObjectURL(localUrl)
    setLocalFile(null); setLocalUrl(null)
    setNaturalSize({ w: 0, h: 0 })
    setCrop({ x: 0.1, y: 0.1, w: 0.8, h: 0.8 })
    onRemove()
  }

  const displayUrl = localUrl || value
  const handleStyle = 'w-3 h-3 bg-white border-2 border-gray-700 rounded-sm absolute'

  return (
    <div>
      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-1.5">Imagen</label>

      {!displayUrl ? (
        <label className="block cursor-pointer">
          <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-3 text-center hover:border-violet-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
            <div className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center mx-auto mb-1.5">
              <svg className="w-4 h-4 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400">Subir imagen</p>
          </div>
          <input type="file" accept="image/*" className="hidden" onChange={onFileChange} />
        </label>
      ) : (
        <div>
          {/* Imagen con selector de recorte inline */}
          <div
            ref={imgContainerRef}
            className="relative rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-700 select-none mb-3"
            style={{ cursor: dragging === 'move' ? 'grabbing' : 'default' }}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseUp}
          >
            <img
              ref={imgRef}
              src={displayUrl}
              alt="preview"
              draggable={false}
              onLoad={onImgLoad}
              className="w-full block"
              style={{ userSelect: 'none', pointerEvents: 'none', maxHeight: '768px', objectFit: 'cover' }}
            />

            {/* Overlay oscuro fuera del crop */}
            {localFile && (
              <>
                <div className="absolute inset-0 bg-black/40 pointer-events-none" style={{
                  clipPath: `polygon(
                    0% 0%, 100% 0%, 100% 100%, 0% 100%,
                    0% ${crop.y * 100}%,
                    ${crop.x * 100}% ${crop.y * 100}%,
                    ${crop.x * 100}% ${(crop.y + crop.h) * 100}%,
                    ${(crop.x + crop.w) * 100}% ${(crop.y + crop.h) * 100}%,
                    ${(crop.x + crop.w) * 100}% ${crop.y * 100}%,
                    0% ${crop.y * 100}%
                  )`
                }} />

                {/* Área de crop */}
                <div
                  className="absolute border border-white/80"
                  style={{
                    left: `${crop.x * 100}%`,
                    top: `${crop.y * 100}%`,
                    width: `${crop.w * 100}%`,
                    height: `${crop.h * 100}%`,
                    cursor: 'move',
                    boxShadow: '0 0 0 1px rgba(0,0,0,0.3)'
                  }}
                  onMouseDown={e => onMouseDown(e, 'move')}
                >
                  {/* Grilla de tercios */}
                  <div className="absolute inset-0 pointer-events-none" style={{
                    backgroundImage: 'linear-gradient(rgba(255,255,255,0.2) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.2) 1px,transparent 1px)',
                    backgroundSize: '33.33% 33.33%'
                  }} />

                  {/* Handles esquinas */}
                  <div className={`${handleStyle} -top-1.5 -left-1.5 cursor-nw-resize`} onMouseDown={e => onMouseDown(e, 'nw')} />
                  <div className={`${handleStyle} -top-1.5 -right-1.5 cursor-ne-resize`} onMouseDown={e => onMouseDown(e, 'ne')} />
                  <div className={`${handleStyle} -bottom-1.5 -left-1.5 cursor-sw-resize`} onMouseDown={e => onMouseDown(e, 'sw')} />
                  <div className={`${handleStyle} -bottom-1.5 -right-1.5 cursor-se-resize`} onMouseDown={e => onMouseDown(e, 'se')} />
                  {/* Handle central */}
                  <div className={`${handleStyle} top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 cursor-move`} onMouseDown={e => onMouseDown(e, 'move')} />
                </div>
              </>
            )}
          </div>

          {/* Botones */}
          {localFile && (
            <button type="button" onClick={uploadCropped} disabled={uploading}
              className="w-full py-2.5 bg-violet-600 text-white text-sm font-semibold rounded-xl hover:bg-violet-700 transition-colors disabled:opacity-50 mb-2">
              {uploading ? 'Subiendo...' : 'Subir imagen'}
            </button>
          )}
          <div className="flex justify-center gap-4">
            <label className="text-xs text-violet-600 dark:text-violet-400 hover:underline cursor-pointer">
              Cambiar imagen
              <input type="file" accept="image/*" className="hidden" onChange={onFileChange} />
            </label>
            <button type="button" onClick={eliminar} className="text-xs text-red-500 hover:underline">
              Eliminar imagen
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Panel edición producto (inline derecho) ──────────────

// ─── Panel edición producto (inline derecho) ──────────────
function PanelProducto({ negocioId, producto, categorias, onClose, onSaved }) {
  const esNuevo = !producto?.id
  const [form, setForm] = useState({
    nombre: '', descripcion: '', precioVenta: '', precioCosto: '',
    activo: true, sugerido: false, categoriaId: categorias[0]?.id || '',
    stock: null,
    descuentoId: null,
    ...producto
  })
  const [variantes, setVariantes] = useState([])
  const [gruposDisponibles, setGruposDisponibles] = useState([])
  const [gruposAsignados, setGruposAsignados] = useState([])
  const [descuentosDisponibles, setDescuentosDisponibles] = useState([])
  const [adicionalesAbierto, setAdicionalesAbierto] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadingExtra, setLoadingExtra] = useState(false)

  useEffect(() => {
    // Cargar grupos disponibles siempre
    api.get(`/negocios/${negocioId}/adicionales`)
      .then(({ data }) => setGruposDisponibles(data.grupos || []))
      .catch(() => {})

    // Cargar descuentos de categoría 'producto'
    api.get(`/negocios/${negocioId}/descuentos`)
      .then(({ data }) => {
        const descProductos = (data.descuentos || [])
          .filter(d => d.categoria === 'producto' && d.activo)
        setDescuentosDisponibles(descProductos)
      })
      .catch(() => {})

    if (!producto?.id) {
      setVariantes([])
      setGruposAsignados([])
      return
    }
    setLoadingExtra(true)
    Promise.all([
      api.get(`/negocios/${negocioId}/productos/${producto.id}/variantes`),
      api.get(`/negocios/${negocioId}/adicionales/producto/${producto.id}`),
    ]).then(([vRes, aRes]) => {
      setVariantes(vRes.data.variantes || [])
      setGruposAsignados((aRes.data.grupos || []).map(g => g.id))
    }).catch(() => {}).finally(() => setLoadingExtra(false))
  }, [producto?.id, negocioId])

  const agregarVariante = () => {
    setVariantes(v => [...v, { nombre: '', precioVenta: '', precioCosto: '', visible: true, activo: true }])
  }

  const cambiarVariante = (idx, campo, valor) => {
    setVariantes(v => v.map((vt, i) => i === idx ? { ...vt, [campo]: valor } : vt))
  }

  const quitarVariante = (idx) => {
    setVariantes(v => v.filter((_, i) => i !== idx))
  }

  const toggleGrupo = (id) => {
    setGruposAsignados(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  const guardar = async () => {
    if (!form.nombre.trim()) return toast.error('El nombre es obligatorio')
    if (!form.precioVenta && variantes.length === 0) return toast.error('Ingresá un precio de venta o al menos una variante')
    setLoading(true)
    try {
      let prodId = producto?.id
      if (prodId) {
        await api.put(`/negocios/${negocioId}/productos/${prodId}`, form)
      } else {
        const { data } = await api.post(`/negocios/${negocioId}/productos`, form)
        prodId = data.producto?.id || data.id
      }

      // Sincronizar variantes
      const variantesLimpias = variantes
        .filter(v => v.nombre?.trim())
        .map((v, i) => ({
          nombre: v.nombre.trim(),
          precioVenta: parseFloat(v.precioVenta) || 0,
          precioCosto: parseFloat(v.precioCosto) || 0,
          visible: v.visible !== false,
          activo: v.activo !== false,
          orden: i
        }))
      await api.put(`/negocios/${negocioId}/productos/${prodId}/variantes/sincronizar`, { variantes: variantesLimpias })

      // Asignar grupos de adicionales
      await api.put(`/negocios/${negocioId}/adicionales/producto/${prodId}/asignar`, { grupoIds: gruposAsignados })

      toast.success(esNuevo ? 'Producto creado' : 'Producto actualizado')
      onSaved()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al guardar')
    } finally { setLoading(false) }
  }

  return (
    <div className="flex-1 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden min-w-0">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
        <h3 className="font-semibold text-gray-900 dark:text-gray-100">{esNuevo ? 'Nuevo producto' : 'Editar producto'}</h3>
        <button onClick={onClose} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
          <svg className="w-4 h-4 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-6 space-y-5">

          {/* Categoría */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-1.5">Categoría</label>
            <select value={form.categoriaId} onChange={e => setForm(f => ({ ...f, categoriaId: e.target.value }))}
              className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white dark:bg-gray-800">
              {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </div>

          {/* Nombre */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-1.5">Nombre *</label>
            <input value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
              placeholder="Nombre del producto"
              className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
          </div>

          {/* Descripción */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Descripción</label>
              <span className="text-xs text-gray-600 dark:text-gray-400">{(form.descripcion || '').length} / 255</span>
            </div>
            <textarea value={form.descripcion || ''} onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
              rows={3} maxLength={255} placeholder="Descripción del producto"
              className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none" />
          </div>

          {/* Variantes del producto */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Variantes del producto</label>
              {loadingExtra && <div className="w-3.5 h-3.5 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />}
            </div>

            {variantes.length === 0 ? (
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-3 italic">Sin variantes — se usa el precio base del producto</p>
            ) : (
              <div className="space-y-3 mb-3">
                {variantes.map((v, idx) => (
                  <div key={idx} className="border border-gray-300 dark:border-gray-700 rounded-xl p-3.5 bg-gray-50/50">
                    <div className="grid grid-cols-3 gap-2 mb-2.5">
                      <div>
                        <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Variante</label>
                        <input value={v.nombre || ''} onChange={e => cambiarVariante(idx, 'nombre', e.target.value)}
                          placeholder="Ej: Simple"
                          className="w-full px-2.5 py-1.5 border border-gray-300 dark:border-gray-700 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-violet-500 bg-white dark:bg-gray-800" />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Precio venta</label>
                        <div className="relative">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-600 dark:text-gray-400 text-xs">$</span>
                          <input type="number" value={v.precioVenta || ''} onChange={e => cambiarVariante(idx, 'precioVenta', e.target.value)}
                            placeholder="0"
                            className="w-full pl-5 pr-2 py-1.5 border border-gray-300 dark:border-gray-700 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-violet-500 bg-white dark:bg-gray-800" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Precio costo</label>
                        <div className="relative">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-600 dark:text-gray-400 text-xs">$</span>
                          <input type="number" value={v.precioCosto || ''} onChange={e => cambiarVariante(idx, 'precioCosto', e.target.value)}
                            placeholder="0"
                            className="w-full pl-5 pr-2 py-1.5 border border-gray-300 dark:border-gray-700 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-violet-500 bg-white dark:bg-gray-800" />
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <MargenBadge pv={v.precioVenta} pc={v.precioCosto} />
                        <label className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-300 cursor-pointer">
                          <input type="checkbox" checked={v.visible !== false} onChange={e => cambiarVariante(idx, 'visible', e.target.checked)} className="w-3 h-3 accent-violet-600" />
                          Visible
                        </label>
                        <label className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-300 cursor-pointer">
                          <input type="checkbox" checked={v.activo !== false} onChange={e => cambiarVariante(idx, 'activo', e.target.checked)} className="w-3 h-3 accent-violet-600" />
                          Activo
                        </label>
                      </div>
                      <button onClick={() => quitarVariante(idx)} className="text-xs text-red-500 hover:text-red-700 font-medium">
                        Eliminar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <button onClick={agregarVariante}
              className="w-full py-2 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl text-xs text-violet-600 dark:text-violet-400 hover:border-violet-300 hover:bg-violet-50 dark:hover:bg-violet-900/30 transition-colors font-medium">
              + Agregar nueva variante
            </button>
          </div>

          {/* Precio base (solo sin variantes) */}
          {variantes.length === 0 && (
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-3">Precio base</label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Precio venta *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 dark:text-gray-400 text-sm">$</span>
                    <input type="number" value={form.precioVenta} onChange={e => setForm(f => ({ ...f, precioVenta: e.target.value }))}
                      placeholder="0"
                      className="w-full pl-7 pr-3 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Precio costo</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 dark:text-gray-400 text-sm">$</span>
                    <input type="number" value={form.precioCosto || ''} onChange={e => setForm(f => ({ ...f, precioCosto: e.target.value }))}
                      placeholder="0"
                      className="w-full pl-7 pr-3 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
                  </div>
                </div>
              </div>
              {form.precioVenta && (
                <div className="mt-2">
                  <MargenBadge pv={form.precioVenta} pc={form.precioCosto} />
                </div>
              )}
            </div>
          )}

          {/* Control de stock */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-2">Control de stock del producto</label>
            <div className="flex items-center gap-4 flex-wrap">
              <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700 dark:text-gray-300">
                <input type="checkbox"
                  checked={form.stock !== null && form.stock !== undefined}
                  onChange={e => setForm(f => ({ ...f, stock: e.target.checked ? (f.stock ?? 0) : null }))}
                  className="w-4 h-4 accent-violet-600" />
                Stock
              </label>
              {form.stock !== null && form.stock !== undefined && (
                <div className="flex items-center gap-2">
                  <label className="text-xs text-gray-700 dark:text-gray-300">Cantidad:</label>
                  <input type="number" value={form.stock}
                    onChange={e => setForm(f => ({ ...f, stock: parseInt(e.target.value) || 0 }))}
                    className="w-20 px-2 py-1.5 border border-gray-300 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-violet-500" />
                </div>
              )}
            </div>
          </div>

          {/* Grupos de adicionales — collapsible */}
          {gruposDisponibles.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-2">
                Adicionales
              </label>
              {esNuevo ? (
                <p className="text-xs text-gray-600 dark:text-gray-400 italic">Primero creá el producto, luego podés asignar grupos de adicionales.</p>
              ) : (
                <div className="border border-gray-300 dark:border-gray-700 rounded-xl overflow-hidden">
                  {/* Header clickeable */}
                  <button type="button"
                    onClick={() => setAdicionalesAbierto(o => !o)}
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left">
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {gruposAsignados.length === 0
                        ? 'Ningún grupo asignado'
                        : `${gruposAsignados.length} grupo${gruposAsignados.length !== 1 ? 's' : ''} asignado${gruposAsignados.length !== 1 ? 's' : ''}`}
                    </span>
                    <svg className={`w-4 h-4 text-gray-400 transition-transform ${adicionalesAbierto ? 'rotate-180' : ''}`}
                      fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {/* Lista desplegable */}
                  {adicionalesAbierto && (
                    <div className="border-t border-gray-200 dark:border-gray-700 max-h-56 overflow-y-auto">
                      {gruposDisponibles.map((g, i) => (
                        <label key={g.id}
                          className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${i < gruposDisponibles.length - 1 ? 'border-b border-gray-100 dark:border-gray-700' : ''}`}>
                          <input type="checkbox"
                            checked={gruposAsignados.includes(g.id)}
                            onChange={() => toggleGrupo(g.id)}
                            className="w-4 h-4 accent-violet-600 flex-shrink-0" />
                          <span className="flex-1 text-sm text-gray-700 dark:text-gray-300">{g.titulo}</span>
                          <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">{g.items?.length || 0} ítems · Máx. {g.seleccionMaxima || '∞'}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ──────────────────────────────────────────────────── */}
          {/* Descuento del producto */}
          {/* ──────────────────────────────────────────────────── */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-2">
              Descuento del producto
            </label>

            {esNuevo ? (
              <p className="text-xs text-gray-600 dark:text-gray-400 italic">
                Primero creá el producto, luego podés asignar un descuento.
              </p>
            ) : (
              <div>
                <select
                  value={form.descuentoId || ''}
                  onChange={e => setForm(f => ({ ...f, descuentoId: e.target.value || null }))}
                  className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
                  <option value="">Sin descuento</option>
                  {descuentosDisponibles.map(d => (
                    <option key={d.id} value={d.id}>
                      {d.codigo} — {d.tipo === 'porcentaje' ? `${d.valor}%` : `$${Number(d.valor).toLocaleString('es-AR')}`} OFF
                      {d.descripcion && ` — ${d.descripcion}`}
                    </option>
                  ))}
                </select>

                {descuentosDisponibles.length === 0 && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                    No hay descuentos de producto activos. Creá uno desde la sección Descuentos.
                  </p>
                )}

                {form.descuentoId && (
                  <div className="mt-2 p-2.5 bg-violet-50 dark:bg-violet-900/20 rounded-lg border border-violet-200 dark:border-violet-800">
                    <p className="text-xs text-violet-700 dark:text-violet-300 flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Este descuento se mostrará en el menú público y se aplicará automáticamente al precio
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Activo + Sugerido */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={!!form.activo} onChange={e => setForm(f => ({ ...f, activo: e.target.checked }))} className="w-4 h-4 accent-violet-600" />
              <span className="text-sm text-gray-700 dark:text-gray-300">Activo / Disponible en menú</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={!!form.sugerido} onChange={e => setForm(f => ({ ...f, sugerido: e.target.checked }))} className="w-4 h-4 accent-violet-600" />
              <div>
                <span className="text-sm text-gray-700 dark:text-gray-300">Producto sugerido</span>
                <p className="text-xs text-gray-500 dark:text-gray-400">Aparece como destacado al inicio del menú online con imagen grande</p>
              </div>
            </label>
          </div>

          {/* Imagen */}
          <ImagenEditor
            value={form.imagen || ''}
            onUploaded={url => setForm(f => ({ ...f, imagen: url }))}
            onRemove={() => setForm(f => ({ ...f, imagen: '' }))}
          />

        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex-shrink-0 bg-white dark:bg-gray-800">
        <button onClick={onClose} className="text-sm text-red-500 hover:underline">Cancelar</button>
        <button onClick={guardar} disabled={loading}
          className="px-6 py-2 bg-violet-600 text-white rounded-lg text-sm font-medium hover:bg-violet-700 transition-colors disabled:opacity-50">
          {loading ? 'Guardando...' : esNuevo ? 'Crear producto' : 'Actualizar'}
        </button>
      </div>
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────
export default function Menu() {
  const { usuario, getNegocioId } = useAuth()
  const negocioId = getNegocioId()
  const [modalidad, setModalidad] = useState('delivery')
  const [categorias, setCategorias] = useState([])
  const [productos, setProductos] = useState([])
  const [catSeleccionada, setCatSeleccionada] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showModalCat, setShowModalCat] = useState(false)
  const [editCat, setEditCat] = useState(null)
  const [showPanel, setShowPanel] = useState(false)
  const [editProd, setEditProd] = useState(null)
  const [showAdicionales, setShowAdicionales] = useState(false)
  const [showImportar, setShowImportar] = useState(false)
  const [showPrecios, setShowPrecios] = useState(false)

  const cargarCategorias = useCallback(() => {
    if (!negocioId) return
    api.get(`/negocios/${negocioId}/productos/categorias`)
      .then(({ data }) => {
        const cats = data.categorias || []
        setCategorias(cats)
        setCatSeleccionada(prev => {
          if (prev && cats.find(c => c.id === prev)) return prev
          return cats[0]?.id || null
        })
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [negocioId])

  const cargarProductos = useCallback(() => {
    if (!negocioId || !catSeleccionada) return
    api.get(`/negocios/${negocioId}/productos?categoriaId=${catSeleccionada}`)
      .then(({ data }) => setProductos(data.productos || []))
      .catch(() => setProductos([]))
  }, [negocioId, catSeleccionada])

  useEffect(() => { cargarCategorias() }, [cargarCategorias])
  useEffect(() => { cargarProductos() }, [cargarProductos])

  const eliminarCat = async (id) => {
    if (!confirm('¿Eliminar esta categoría?')) return
    try {
      await api.delete(`/negocios/${negocioId}/productos/categorias/${id}`)
      toast.success('Categoría eliminada')
      cargarCategorias()
    } catch { toast.error('Error al eliminar') }
  }

  const abrirPanel = (prod = null) => {
    setEditProd(prod)
    setShowPanel(true)
  }

  const cerrarPanel = () => {
    setShowPanel(false)
    setEditProd(null)
  }

  const handleSaved = () => {
    cargarCategorias()
    cargarProductos()
    cerrarPanel()
  }

  return (
    <div className="h-full flex flex-col">
      {/* Tabs y acciones */}
      <div className="flex items-center justify-between px-6 py-3 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="flex gap-4">
          {['delivery', 'takeaway'].map(m => (
            <button key={m} onClick={() => setModalidad(m)}
              className={`py-2 px-1 text-sm font-medium border-b-2 transition-colors -mb-3 ${modalidad === m ? 'border-violet-600 text-violet-700' : 'border-transparent text-gray-700 dark:text-gray-300 hover:text-gray-700'}`}>
              {m === 'delivery' ? 'Delivery' : 'Take Away'}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => { descargarPlantilla() }} className="text-sm text-violet-600 dark:text-violet-400 font-medium hover:underline">Plantilla</button>
          <button onClick={async () => { try { await exportarMenuExcel(negocioId); toast.success('Menú exportado') } catch { toast.error('Error al exportar') } }} className="text-sm text-violet-600 dark:text-violet-400 font-medium hover:underline">Exportar</button>
          <button onClick={() => setShowImportar(true)} className="text-sm text-violet-600 dark:text-violet-400 font-medium hover:underline">Importar</button>
          <button onClick={() => setShowPrecios(true)} className="text-sm text-violet-600 dark:text-violet-400 font-medium hover:underline">Precios</button>
          <button onClick={() => setShowAdicionales(true)}
            className="px-4 py-2 bg-violet-600 text-white rounded-lg text-sm font-medium hover:bg-violet-700 transition-colors">
            Adicionales
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden p-4 gap-4 min-h-0">

        {/* Columna Categorías */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden flex-shrink-0" style={{ width: 380 }}>
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">Categorías</span>
            <div className="flex gap-2">
              <button className="text-xs text-violet-600 dark:text-violet-400 hover:underline">Ordenar</button>
              <button onClick={() => { setEditCat(null); setShowModalCat(true) }}
                className="text-xs px-3 py-1 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors">
                Crear
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-5 h-5 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : categorias.length === 0 ? (
              <div className="text-center py-8 text-sm text-gray-600 dark:text-gray-400">No hay categorías</div>
            ) : categorias.map(cat => (
              <div key={cat.id}
                onClick={() => { setCatSeleccionada(cat.id); cerrarPanel() }}
                className={`group flex items-center gap-2 px-4 py-2.5 cursor-pointer transition-colors border-b border-gray-50 ${catSeleccionada === cat.id ? 'bg-violet-600 text-white' : 'hover:bg-gray-100 text-gray-700 dark:hover:bg-gray-700 dark:text-gray-300'}`}>
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${cat.activo ? 'bg-green-400' : 'bg-gray-300'}`} />
                <span className="flex-1 text-sm font-medium truncate">{cat.nombre}</span>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100" onClick={e => e.stopPropagation()}>
                  <button onClick={() => { setEditCat(cat); setShowModalCat(true) }}
                    className="p-1 hover:bg-white/20 rounded opacity-60 hover:opacity-100">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                  </button>
                  <button onClick={() => eliminarCat(cat.id)}
                    className="p-1 hover:bg-red-100 rounded text-red-400 hover:text-red-600 opacity-60 hover:opacity-100">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Columna Productos */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden flex-shrink-0" style={{ width: 440 }}>
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">Productos</span>
            <div className="flex gap-2">
              <button className="text-xs text-violet-600 dark:text-violet-400 hover:underline">Ordenar</button>
              <button onClick={() => abrirPanel(null)}
                className="text-xs px-3 py-1 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors">
                Crear
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {productos.length === 0 ? (
              <div className="text-center py-8 text-sm text-gray-600 dark:text-gray-400">No hay productos en esta categoría</div>
            ) : productos.map(prod => (
              <div key={prod.id} onClick={() => abrirPanel(prod)}
                className={`flex items-center gap-2 px-4 py-2.5 cursor-pointer transition-colors border-b border-gray-50 ${showPanel && editProd?.id === prod.id ? 'bg-violet-50 dark:bg-violet-900/20 border-l-2 border-l-violet-600' : 'hover:bg-gray-100 dark:hover:bg-gray-700' }`}>
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${prod.activo ? 'bg-green-400' : 'bg-red-400'}`} />
                <span className="flex-1 text-sm text-gray-700 dark:text-gray-300 truncate">{prod.nombre}</span>
                <span className="text-xs text-gray-600 dark:text-gray-400 flex-shrink-0">
  {prod.variantes?.length > 0 ? `${prod.variantes.length} variantes` : `$${Number(prod.precioVenta).toLocaleString('es-AR')}`}
</span>
              </div>
            ))}
          </div>
        </div>

        {/* Panel edición o placeholder */}
        {showPanel ? (
          <div className="flex overflow-hidden flex-1">
          <PanelProducto
            key={editProd?.id || 'nuevo'}
            negocioId={negocioId}
            producto={editProd}
            categorias={categorias}
            onClose={cerrarPanel}
            onSaved={handleSaved}
          />
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500 dark:text-gray-400">
            <div className="text-center">
              <svg className="w-14 h-14 mx-auto mb-3 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <p className="text-sm">Seleccioná un producto para editarlo</p>
              <p className="text-xs mt-1 opacity-70">o hacé clic en "Crear" para agregar uno nuevo</p>
            </div>
          </div>
        )}
      </div>

      {showModalCat && (
        <ModalCategoria negocioId={negocioId} categoria={editCat}
          onClose={() => { setShowModalCat(false); setEditCat(null) }}
          onSaved={cargarCategorias} />
      )}

      {showImportar && (
        <ModalImportarMenu negocioId={negocioId} categorias={categorias}
          onClose={() => setShowImportar(false)}
          onSaved={() => { cargarCategorias(); cargarProductos() }} />
      )}

      {showPrecios && (
        <ModalPrecios negocioId={negocioId} categorias={categorias}
          onClose={() => setShowPrecios(false)}
          onSaved={cargarProductos} />
      )}

      {/* Modal Adicionales centrado */}
      {showAdicionales && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(2px)' }}
          onClick={() => setShowAdicionales(false)}>
          <div className="bg-gray-50 dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[88vh] flex flex-col overflow-hidden"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
              <h2 className="font-semibold text-gray-900 dark:text-gray-100">Grupos de adicionales</h2>
              <button onClick={() => setShowAdicionales(false)}
                className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-auto">
              <Adicionales />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
