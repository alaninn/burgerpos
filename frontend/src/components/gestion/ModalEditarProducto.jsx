import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import api from '../../api/axios'
import toast from 'react-hot-toast'
import { factorConversion, unidadesCompatibles, unidadBaseCompatible } from '../../utils/unidades'

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

export default function ModalEditarProducto({ producto, onClose, onSave }) {
  const { getNegocioId } = useAuth()
  const [categorias, setCategorias] = useState([])
  const [proveedores, setProveedores] = useState([])
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    nombre: producto.nombre || '',
    categoriaId: producto.categoriaId || '',
    proveedorId: producto.proveedorId || '',
    unidadCompra: producto.unidadCompra || 'caja',
    unidadContenidoCaja: producto.unidadContenidoCaja || (producto.unidadCompra && producto.unidadCompra !== 'caja' ? producto.unidadCompra : 'kg'),
    cantidadPorUnidadCompra: Number(producto.cantidadPorUnidadCompra) || 1,
    unidadBase: producto.unidadBase || 'unidad',
    precioCosto: producto.precioCosto || '',
    stock: producto.stock != null ? parseFloat(producto.stock) : 0,
    stockMinimo: producto.stockMinimo != null ? parseFloat(producto.stockMinimo) : ''
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
      const { data } = await api.put(`/negocios/${negocioId}/productos/${producto.id}`, {
        nombre: form.nombre.trim(),
        categoriaId: form.categoriaId,
        proveedorId: form.proveedorId || null,
        unidadCompra: form.unidadCompra,
        unidadContenidoCaja: form.unidadContenidoCaja,
        unidadBase: form.unidadBase,
        cantidadPorUnidadCompra: Number(form.cantidadPorUnidadCompra),
        precioCosto: Number(form.precioCosto) || 0,
        stock: Number(form.stock) || 0,
        stockMinimo: form.stockMinimo !== '' ? Number(form.stockMinimo) : null
      })

      toast.success('Producto actualizado correctamente')
      onSave(data.producto)
      onClose()
    } catch (error) {
      console.error('Error:', error)
      toast.error(error.response?.data?.message || 'Error al actualizar producto')
    } finally {
      setLoading(false)
    }
  }

  // Cuanto suma al stock (en unidadBase) comprar 1 unidad de compra, segun
  // el contenido declarado (ej: 1 caja = 15 kg, o 1 unidad = 500 gramo).
  const cantidadFinalPorUnidadCompra = () => {
    const cantidad = Number(form.cantidadPorUnidadCompra) || 1
    return cantidad * calcularFactorConversion(form.unidadContenidoCaja, form.unidadBase)
  }

  // Calcular cuántas unidades base habrá al comprar
  const calcularStockPorCompra = () => {
    const cantidad = Number(form.cantidadPorUnidadCompra) || 1
    const cantidadFinal = cantidadFinalPorUnidadCompra()
    return `1 ${form.unidadCompra} = ${cantidad} ${form.unidadContenidoCaja} = ${cantidadFinal} ${form.unidadBase}`
  }

  // Calcular factor de conversión entre unidades
  // Conversion de unidades: fuente unica en utils/unidades.js
  const calcularFactorConversion = (unidadOrigen, unidadDestino) => factorConversion(unidadOrigen, unidadDestino)

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">Editar Producto de Stock</h3>
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

          {/* Configuración de Stock: mismo diseño que los items de "Compra
              avanzada" (unidad + contenido + equivalencia calculada) para
              que se pueda ajustar igual desde los dos lados. */}
          <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 bg-gray-50 dark:bg-gray-900/40">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">📦 Configuración de Stock</h4>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Unidad de compra <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.unidadCompra}
                  onChange={e => {
                    const unidadCompra = e.target.value
                    // Por defecto se sugiere que el contenido sea la misma
                    // unidad (caso simple, ej "1 kg = 1 kg"), salvo caja que
                    // por defecto trae kg. Siempre se puede cambiar despues
                    // (ej: "1 unidad" de mayonesa contiene "500 gramo").
                    const unidadContenidoCaja = unidadCompra === 'caja' ? 'kg' : unidadCompra
                    setForm({ ...form, unidadCompra, unidadContenidoCaja, unidadBase: unidadBaseCompatible(unidadContenidoCaja, form.unidadBase) })
                  }}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-white"
                >
                  {UNIDADES_COMPRA.map(u => (
                    <option key={u.value} value={u.value}>{u.label}</option>
                  ))}
                </select>
                <p className="text-[10px] text-gray-400 mt-1">¿Cómo comprás este producto?</p>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Unidad base (stock) <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.unidadBase}
                  onChange={e => setForm({ ...form, unidadBase: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-white"
                >
                  {UNIDADES_BASE.filter(u => unidadesCompatibles(form.unidadContenidoCaja).includes(u.value)).map(u => (
                    <option key={u.value} value={u.value}>{u.label}</option>
                  ))}
                </select>
                <p className="text-[10px] text-gray-400 mt-1">Unidad en la que se cuenta el stock</p>
              </div>
            </div>

            {/* Contenido de 1 unidad de compra: aplica siempre, no solo para
                caja, para poder combinar cualquier unidad con cualquier otra
                (ej: 1 unidad de mayonesa = 500 gramo, 1 caja de papas = 15 kg) */}
            <div className="flex items-center gap-2 mt-3 text-sm">
              <span className="text-gray-500 dark:text-gray-400">1 {form.unidadCompra} equivale a</span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={form.cantidadPorUnidadCompra}
                onChange={e => setForm({ ...form, cantidadPorUnidadCompra: e.target.value })}
                className="w-20 px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-white"
                placeholder="15"
              />
              <select
                value={form.unidadContenidoCaja}
                onChange={e => {
                  const unidadContenidoCaja = e.target.value
                  setForm({ ...form, unidadContenidoCaja, unidadBase: unidadBaseCompatible(unidadContenidoCaja, form.unidadBase) })
                }}
                className="px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-white"
              >
                <option value="kg">Kilogramo</option>
                <option value="litro">Litro</option>
                <option value="gramo">Gramo</option>
                <option value="unidad">Unidad</option>
              </select>
            </div>
            <p className="text-xs text-violet-600 dark:text-violet-400 mt-2">{calcularStockPorCompra()}</p>
            <p className="text-[10px] text-gray-400 mt-2">
              💡 Ej: 1 caja de papas trae 15 kg · 1 unidad de mayonesa trae 500 gramos · 1 unidad de aceite trae 1 litro. Las cantidades que usás en recetas se restan del stock automáticamente.
            </p>
          </div>

          {/* Precio y stock actual */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Precio de Costo{producto?.receta ? ' (automático)' : ''}
              </label>
              <input
                type="number"
                step="0.01"
                value={form.precioCosto}
                onChange={e => setForm({ ...form, precioCosto: e.target.value })}
                disabled={!!producto?.receta}
                className={`w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 dark:bg-gray-700 dark:text-white ${producto?.receta ? 'opacity-60 cursor-not-allowed' : ''}`}
                placeholder="0.00"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {producto?.receta
                  ? 'Se calcula solo desde los ingredientes de su receta'
                  : 'Se actualiza automáticamente al comprar'}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Stock Actual
              </label>
              <input
                type="number"
                step="0.001"
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

          {/* Alerta de stock bajo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Stock mínimo (alerta)
            </label>
            <input
              type="number"
              step="0.001"
              min="0"
              value={form.stockMinimo}
              onChange={e => setForm({ ...form, stockMinimo: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 dark:bg-gray-700 dark:text-white"
              placeholder={`Ej: 5000 (${form.unidadBase}s)`}
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Cuando el stock baje de este valor, aparece la alerta de stock bajo. Vacío = sin alerta personalizada.
            </p>
          </div>

          <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3 border border-red-200 dark:border-red-800">
            <p className="text-xs text-red-800 dark:text-red-400">
              ⚠️ <strong>Cuidado:</strong> Cambiar la unidad base puede afectar el stock existente y las recetas que usan este ingrediente.
            </p>
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
            {loading ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </div>
      </div>
    </div>
  )
}
