import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import api from '../../api/axios'
import toast from 'react-hot-toast'

const UNIDADES_COMPRA = [
  { value: 'caja', label: 'Caja' },
  { value: 'kg', label: 'Kilogramo' },
  { value: 'litro', label: 'Litro' },
  { value: 'gramo', label: 'Gramo' },
  { value: 'unidad', label: 'Unidad' }
]

const UNIDADES_BASE = [
  { value: 'unidad', label: 'Unidad' },
  { value: 'kg', label: 'Kilogramo' },
  { value: 'gramo', label: 'Gramo' },
  { value: 'litro', label: 'Litro' }
]

export default function ModalNuevoProducto({ onClose, onSave }) {
  const { getNegocioId } = useAuth()
  const [categorias, setCategorias] = useState([])
  const [proveedores, setProveedores] = useState([])
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    nombre: '',
    categoriaId: '',
    proveedorId: '',
    unidadCompra: 'caja',
    unidadContenidoCaja: 'kg',
    cantidadPorUnidadCompra: 1,
    unidadBase: 'unidad',
    precioCosto: '',
    stock: 0
  })

  useEffect(() => {
    cargarDatos()
  }, [])

  const cargarDatos = async () => {
    try {
      const negocioId = getNegocioId()
      const [catRes, provRes] = await Promise.all([
        api.get(`/negocios/${negocioId}/productos/categorias`),
        api.get(`/negocios/${negocioId}/proveedores?activo=true`)
      ])

      const categoriasStock = catRes.data.categorias?.filter(c =>
        c.tipo === 'ingrediente' || c.tipo === 'producto'
      ) || []
      setCategorias(categoriasStock)
      setProveedores(provRes.data.proveedores || [])

      // Auto-seleccionar la categoría "Ingredientes" si existe
      const ingredientes = categoriasStock.find(c => c.nombre === 'Ingredientes')
      if (ingredientes && !form.categoriaId) {
        setForm(f => ({ ...f, categoriaId: ingredientes.id }))
      }
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const handleSubmit = async () => {
    if (!form.nombre.trim()) {
      return toast.error('Ingresá el nombre del producto')
    }

    if (!form.categoriaId) {
      return toast.error('Seleccioná una categoría')
    }

    if (Number(form.cantidadPorUnidadCompra) <= 0) {
      return toast.error('La cantidad debe ser mayor a 0')
    }

    setLoading(true)
    try {
      const negocioId = getNegocioId()
      const { data } = await api.post(`/negocios/${negocioId}/productos`, {
        nombre: form.nombre.trim(),
        categoriaId: form.categoriaId,
        proveedorId: form.proveedorId || null,
        unidadCompra: form.unidadCompra,
        unidadContenidoCaja: form.unidadCompra === 'caja' ? form.unidadContenidoCaja : null,
        unidadBase: form.unidadBase,
        cantidadPorUnidadCompra: Number(form.cantidadPorUnidadCompra),
        precioCosto: Number(form.precioCosto) || 0,
        precioVenta: 0,
        stock: Number(form.stock) || 0,
        activo: true
      })

      toast.success('Producto creado correctamente')
      onSave(data.producto)
      onClose()
    } catch (error) {
      console.error('Error:', error)
      toast.error(error.response?.data?.message || 'Error al crear producto')
    } finally {
      setLoading(false)
    }
  }

  // Calcular cuántas unidades base habrá al comprar
  const calcularStockPorCompra = () => {
    const cantidad = Number(form.cantidadPorUnidadCompra) || 1

    if (form.unidadCompra === 'caja' && form.unidadContenidoCaja) {
      // Calcular conversión cuando hay caja
      const factorConversion = calcularFactorConversion(form.unidadContenidoCaja, form.unidadBase)
      const cantidadFinal = cantidad * factorConversion
      return `1 caja = ${cantidad} ${form.unidadContenidoCaja} = ${cantidadFinal} ${form.unidadBase}`
    }

    return `1 ${form.unidadCompra} = ${cantidad} ${form.unidadBase}${cantidad !== 1 ? 's' : ''}`
  }

  // Calcular factor de conversión entre unidades
  const calcularFactorConversion = (unidadOrigen, unidadDestino) => {
    const conversiones = {
      'kg_gramo': 1000,
      'litro_litro': 1,
      'kg_kg': 1,
      'gramo_gramo': 1,
      'unidad_unidad': 1
    }
    const key = `${unidadOrigen}_${unidadDestino}`
    return conversiones[key] || 1
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">Nuevo Producto de Stock</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
            <svg className="w-4 h-4 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Nombre */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Nombre del Producto <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.nombre}
              onChange={e => setForm({ ...form, nombre: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 dark:bg-gray-700 dark:text-white"
              placeholder="Ej: Pan, Cheddar Fetas, Papas"
              autoFocus
            />
          </div>

          {/* Categoría y Proveedor */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Categoría <span className="text-red-500">*</span>
              </label>
              <select
                value={form.categoriaId}
                onChange={e => setForm({ ...form, categoriaId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="">Seleccionar...</option>
                {categorias.map(c => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Proveedor
              </label>
              <select
                value={form.proveedorId}
                onChange={e => setForm({ ...form, proveedorId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="">Sin asignar</option>
                {proveedores.map(p => (
                  <option key={p.id} value={p.id}>{p.nombre}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Unidades de compra y stock */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">📦 Configuración de Stock</h4>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Unidad de Compra <span className="text-red-500">*</span>
              </label>
              <select
                value={form.unidadCompra}
                onChange={e => setForm({ ...form, unidadCompra: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 dark:bg-gray-700 dark:text-white text-sm"
              >
                {UNIDADES_COMPRA.map(u => (
                  <option key={u.value} value={u.value}>{u.label}</option>
                ))}
              </select>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">¿Cómo comprás este producto?</p>
            </div>

            {/* Campos condicionales para CAJA */}
            {form.unidadCompra === 'caja' && (
              <div className="mt-3 p-3 bg-violet-50 dark:bg-violet-900/20 rounded border border-violet-200 dark:border-violet-800">
                <h5 className="text-xs font-semibold text-gray-900 dark:text-gray-100 mb-2">📦 Contenido de la Caja</h5>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Cantidad <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={form.cantidadPorUnidadCompra}
                      onChange={e => setForm({ ...form, cantidadPorUnidadCompra: e.target.value })}
                      className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 dark:bg-gray-700 dark:text-white"
                      placeholder="15"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      En unidad <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={form.unidadContenidoCaja}
                      onChange={e => setForm({ ...form, unidadContenidoCaja: e.target.value })}
                      className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 dark:bg-gray-700 dark:text-white"
                    >
                      <option value="kg">Kilogramo</option>
                      <option value="litro">Litro</option>
                      <option value="gramo">Gramo</option>
                      <option value="unidad">Unidad</option>
                    </select>
                  </div>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  💡 Ej: Caja de papas trae 15 kg, caja de aceite trae 20 litros
                </p>
              </div>
            )}

            {/* Campos para otras unidades de compra */}
            {form.unidadCompra !== 'caja' && (
              <div className="mt-3">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Cantidad por {form.unidadCompra} <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={form.cantidadPorUnidadCompra}
                  onChange={e => setForm({ ...form, cantidadPorUnidadCompra: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 dark:bg-gray-700 dark:text-white text-sm"
                  placeholder="1"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Unidad Base (para stock) <span className="text-red-500">*</span>
              </label>
              <select
                value={form.unidadBase}
                onChange={e => setForm({ ...form, unidadBase: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 dark:bg-gray-700 dark:text-white text-sm"
              >
                {UNIDADES_BASE.map(u => (
                  <option key={u.value} value={u.value}>{u.label}</option>
                ))}
              </select>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Unidad en la que se contará el stock
              </p>
            </div>

            <div className="mt-3 p-3 bg-white dark:bg-gray-800 rounded border border-blue-300 dark:border-blue-700">
              <p className="text-xs text-gray-700 dark:text-gray-300">
                <strong>Al comprar:</strong> {calcularStockPorCompra()}
              </p>
            </div>
          </div>

          {/* Ejemplo práctico */}
          <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3 border border-amber-200 dark:border-amber-800">
            <p className="text-xs text-amber-800 dark:text-amber-400">
              <strong>💡 Ejemplo:</strong> Si comprás <strong>1 {form.unidadCompra}</strong> de este producto,
              el stock aumentará en <strong>{form.cantidadPorUnidadCompra} {form.unidadBase}{Number(form.cantidadPorUnidadCompra) !== 1 ? 's' : ''}</strong>.
              <br/>
              Las cantidades que usás en recetas se restarán del stock automáticamente.
            </p>
          </div>

          {/* Precio y stock inicial */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Precio de Costo
              </label>
              <input
                type="number"
                step="0.01"
                value={form.precioCosto}
                onChange={e => setForm({ ...form, precioCosto: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 dark:bg-gray-700 dark:text-white"
                placeholder="0.00"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Opcional - se actualiza al comprar
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Stock Inicial
              </label>
              <input
                type="number"
                step="1"
                value={form.stock}
                onChange={e => setForm({ ...form, stock: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 dark:bg-gray-700 dark:text-white"
                placeholder="0"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                En {form.unidadBase}s
              </p>
            </div>
          </div>
        </div>

        <div className="flex gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700 sticky bottom-0 bg-white dark:bg-gray-800">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition disabled:opacity-50"
          >
            {loading ? 'Creando...' : 'Crear Producto'}
          </button>
        </div>
      </div>
    </div>
  )
}
