import { useState, useEffect } from 'react'
import { useAuth } from '../../../context/AuthContext'
import api from '../../../api/axios'
import toast from 'react-hot-toast'

const UNIDADES = ['caja', 'kg', 'gramos', 'unidad', 'litro', 'ml']
const METODOS_PAGO = ['efectivo', 'transferencia', 'tarjeta']

function ModalNuevaCompra({ onClose, onSave }) {
  const { getNegocioId } = useAuth()
  const [proveedores, setProveedores] = useState([])
  const [productos, setProductos] = useState([])
  const [todosProductos, setTodosProductos] = useState([])
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    proveedorId: '',
    numeroFactura: '',
    tipoFactura: '',
    fecha: new Date().toISOString().split('T')[0],
    pagado: false,
    fechaPago: '',
    metodoPago: 'efectivo',
    notas: '',
    items: []
  })

  useEffect(() => {
    cargarDatos()
  }, [])

  const cargarDatos = async () => {
    try {
      const negocioId = getNegocioId()
      const [provRes, prodRes, catRes] = await Promise.all([
        api.get(`/negocios/${negocioId}/proveedores?activo=true`),
        api.get(`/negocios/${negocioId}/productos`),
        api.get(`/negocios/${negocioId}/productos/categorias`)
      ])

      setProveedores(provRes.data.proveedores || [])

      // Filtrar solo productos de categorías tipo='ingrediente' o 'producto'
      const todasCategorias = catRes.data?.categorias || []
      const categoriasStock = todasCategorias.filter(cat =>
        cat.tipo === 'ingrediente' || cat.tipo === 'producto'
      )
      const categoriasStockIds = new Set(categoriasStock.map(cat => cat.id))

      const productosStock = (prodRes.data?.productos || []).filter(prod =>
        prod.categoriaId && categoriasStockIds.has(prod.categoriaId)
      )

      setTodosProductos(productosStock)
      setProductos(productosStock) // Inicialmente mostrar todos
    } catch (error) {
      console.error('Error:', error)
    }
  }

  // Filtrar productos cuando cambia el proveedor
  const handleProveedorChange = (proveedorId) => {
    setForm({ ...form, proveedorId })

    if (proveedorId) {
      // Filtrar productos por proveedor
      const productosFiltrados = todosProductos.filter(p => p.proveedorId === proveedorId)
      setProductos(productosFiltrados)
    } else {
      // Si no hay proveedor seleccionado, mostrar todos
      setProductos(todosProductos)
    }
  }

  const agregarItem = () => {
    setForm({
      ...form,
      items: [
        ...form.items,
        {
          productoId: '',
          descripcion: '',
          cantidadCompra: '',
          unidadCompra: 'unidad',
          precioUnitario: '',
          actualizaStock: true
        }
      ]
    })
  }

  const actualizarItem = (index, campo, valor) => {
    const nuevosItems = [...form.items]
    nuevosItems[index][campo] = valor

    // Auto-completar descripción si selecciona un producto
    if (campo === 'productoId' && valor) {
      const producto = productos.find(p => p.id === valor)
      if (producto) {
        nuevosItems[index].descripcion = producto.nombre
      }
    }

    setForm({ ...form, items: nuevosItems })
  }

  const eliminarItem = (index) => {
    setForm({
      ...form,
      items: form.items.filter((_, i) => i !== index)
    })
  }

  const calcularSubtotal = (item) => {
    const cantidad = Number(item.cantidadCompra) || 0
    const precio = Number(item.precioUnitario) || 0
    return cantidad * precio
  }

  const calcularTotal = () => {
    return form.items.reduce((sum, item) => sum + calcularSubtotal(item), 0)
  }

  const handleSubmit = async () => {
    if (!form.proveedorId) {
      return toast.error('Seleccioná un proveedor')
    }

    if (form.items.length === 0) {
      return toast.error('Agregá al menos un item')
    }

    const itemsInvalidos = form.items.filter(
      item => !item.descripcion || !item.cantidadCompra || !item.precioUnitario
    )

    if (itemsInvalidos.length > 0) {
      return toast.error('Completá todos los campos de los items')
    }

    setLoading(true)
    try {
      // Limpiar fechaPago antes de enviar
      const compraData = {
        ...form,
        fechaPago: form.pagado && form.fechaPago ? form.fechaPago : null
      }
      await onSave(compraData)
      onClose()
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">Nueva Compra</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
            <svg className="w-4 h-4 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Header fields */}
          <div className="grid grid-cols-5 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Proveedor <span className="text-red-500">*</span>
              </label>
              <select
                value={form.proveedorId}
                onChange={e => handleProveedorChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="">Seleccionar...</option>
                {proveedores.map(p => (
                  <option key={p.id} value={p.id}>{p.nombre}</option>
                ))}
              </select>
              {form.proveedorId && productos.length === 0 && (
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                  Este proveedor no tiene productos asignados. Podés crear items sin producto.
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">N° Factura</label>
              <input
                type="text"
                value={form.numeroFactura}
                onChange={e => setForm({ ...form, numeroFactura: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 dark:bg-gray-700 dark:text-white"
                placeholder="001-00001234"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tipo Factura</label>
              <select
                value={form.tipoFactura}
                onChange={e => setForm({ ...form, tipoFactura: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="">Sin especificar</option>
                <option value="A">Factura A</option>
                <option value="B">Factura B</option>
                <option value="X">Factura X</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fecha</label>
              <input
                type="date"
                value={form.fecha}
                onChange={e => setForm({ ...form, fecha: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>

          {/* Items table */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Items de Compra <span className="text-red-500">*</span>
              </label>
              <button
                onClick={agregarItem}
                className="flex items-center gap-1 px-3 py-1.5 text-sm bg-violet-600 text-white rounded-lg hover:bg-violet-700"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Agregar Item
              </button>
            </div>

            <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-900/50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Producto</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Descripción</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Cantidad</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Unidad</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">
                        Precio/Unidad
                        <span className="block text-xs font-normal text-gray-400 dark:text-gray-500 mt-0.5">($/kg, $/L, etc.)</span>
                      </th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400">Subtotal</th>
                      <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400">Stock</th>
                      <th className="px-3 py-2"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {form.items.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-3 py-8 text-center text-gray-500 dark:text-gray-400">
                          No hay items. Hacé clic en "Agregar Item" para comenzar.
                        </td>
                      </tr>
                    ) : (
                      form.items.map((item, idx) => (
                        <tr key={idx}>
                          <td className="px-3 py-2">
                            <select
                              value={item.productoId}
                              onChange={e => actualizarItem(idx, 'productoId', e.target.value)}
                              className="w-40 px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-sm dark:bg-gray-700 dark:text-white"
                            >
                              <option value="">Sin producto</option>
                              {productos.map(p => (
                                <option key={p.id} value={p.id}>{p.nombre}</option>
                              ))}
                            </select>
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="text"
                              value={item.descripcion}
                              onChange={e => actualizarItem(idx, 'descripcion', e.target.value)}
                              className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-sm dark:bg-gray-700 dark:text-white"
                              placeholder="Descripción"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              value={item.cantidadCompra}
                              onChange={e => actualizarItem(idx, 'cantidadCompra', e.target.value)}
                              className="w-24 px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-sm dark:bg-gray-700 dark:text-white"
                              placeholder="0"
                              min="0"
                              step="0.001"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <select
                              value={item.unidadCompra}
                              onChange={e => actualizarItem(idx, 'unidadCompra', e.target.value)}
                              className="w-28 px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-sm dark:bg-gray-700 dark:text-white"
                            >
                              {UNIDADES.map(u => (
                                <option key={u} value={u}>{u}</option>
                              ))}
                            </select>
                          </td>
                          <td className="px-3 py-2">
                            <div>
                              <input
                                type="number"
                                value={item.precioUnitario}
                                onChange={e => actualizarItem(idx, 'precioUnitario', e.target.value)}
                                className="w-28 px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-sm dark:bg-gray-700 dark:text-white"
                                placeholder="0.00"
                                min="0"
                                step="0.01"
                              />
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                $/{item.unidadCompra}
                              </p>
                            </div>
                          </td>
                          <td className="px-3 py-2 text-right font-medium">
                            ${calcularSubtotal(item).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-3 py-2 text-center">
                            <input
                              type="checkbox"
                              checked={item.actualizaStock}
                              onChange={e => actualizarItem(idx, 'actualizaStock', e.target.checked)}
                              className="w-4 h-4 text-violet-600 rounded"
                              title="Actualizar stock automáticamente"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <button
                              onClick={() => eliminarItem(idx)}
                              className="p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  {form.items.length > 0 && (
                    <tfoot className="bg-gray-50 dark:bg-gray-900/50 border-t-2 border-gray-300 dark:border-gray-600">
                      <tr>
                        <td colSpan={5} className="px-3 py-2 font-semibold text-right">Total:</td>
                        <td className="px-3 py-2 text-right font-bold text-violet-600 text-base">
                          ${calcularTotal().toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                        </td>
                        <td colSpan={2}></td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          </div>

          {/* Payment section */}
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <label className="flex items-center gap-2 cursor-pointer mb-3">
              <input
                type="checkbox"
                checked={form.pagado}
                onChange={e => setForm({
                  ...form,
                  pagado: e.target.checked,
                  fechaPago: e.target.checked ? (form.fechaPago || form.fecha) : ''
                })}
                className="w-4 h-4 text-violet-600 rounded"
              />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Marcar como pagado</span>
            </label>

            {form.pagado && (
              <div className="grid grid-cols-2 gap-4 ml-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fecha de Pago</label>
                  <input
                    type="date"
                    value={form.fechaPago || form.fecha}
                    onChange={e => setForm({ ...form, fechaPago: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Método de Pago</label>
                  <select
                    value={form.metodoPago}
                    onChange={e => setForm({ ...form, metodoPago: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 dark:bg-gray-700 dark:text-white"
                  >
                    {METODOS_PAGO.map(mp => (
                      <option key={mp} value={mp} className="capitalize">{mp}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notas</label>
            <textarea
              value={form.notas}
              onChange={e => setForm({ ...form, notas: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 dark:bg-gray-700 dark:text-white resize-none"
              placeholder="Notas adicionales..."
            />
          </div>
        </div>

        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-700">
          <button onClick={onClose} className="text-sm text-gray-600 dark:text-gray-400 hover:underline">
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-6 py-2 bg-violet-600 text-white rounded-lg text-sm font-medium hover:bg-violet-700 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Guardando...' : 'Guardar Compra'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Compras() {
  const { getNegocioId } = useAuth()
  const [compras, setCompras] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [expandedCompra, setExpandedCompra] = useState(null)

  useEffect(() => {
    cargarCompras()
  }, [])

  const cargarCompras = async () => {
    try {
      const negocioId = getNegocioId()
      const { data } = await api.get(`/negocios/${negocioId}/compras`)
      setCompras(data.compras || [])
    } catch (error) {
      console.error('Error:', error)
      toast.error('Error al cargar compras')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (form) => {
    try {
      const negocioId = getNegocioId()
      await api.post(`/negocios/${negocioId}/compras`, form)
      toast.success('Compra registrada y stock actualizado')
      cargarCompras()
    } catch (error) {
      console.error('Error:', error)
      toast.error(error.response?.data?.message || 'Error al guardar compra')
      throw error
    }
  }

  const handleEliminar = async (compra) => {
    if (!confirm(`¿Eliminar la compra del ${new Date(compra.fecha).toLocaleDateString()}? Esto revertirá la actualización de stock.`)) return

    try {
      const negocioId = getNegocioId()
      await api.delete(`/negocios/${negocioId}/compras/${compra.id}`)
      toast.success('Compra eliminada y stock revertido')
      cargarCompras()
    } catch (error) {
      console.error('Error:', error)
      toast.error(error.response?.data?.message || 'Error al eliminar compra')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Cargando compras...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Compras</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {compras.length} compra{compras.length !== 1 ? 's' : ''} registrada{compras.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nueva Compra
        </button>
      </div>

      {/* List */}
      <div className="space-y-4">
        {compras.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
            <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
            <p className="text-gray-600 dark:text-gray-400 mb-4">No hay compras registradas</p>
            <button
              onClick={() => setModalOpen(true)}
              className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700"
            >
              Registrar Primera Compra
            </button>
          </div>
        ) : (
          compras.map(compra => (
            <div key={compra.id} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div
                className="px-6 py-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50"
                onClick={() => setExpandedCompra(expandedCompra === compra.id ? null : compra.id)}
              >
                <div className="flex-1 grid grid-cols-5 gap-4">
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Proveedor</p>
                    <p className="font-medium text-gray-900 dark:text-gray-100">{compra.proveedor.nombre}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Fecha</p>
                    <p className="text-sm text-gray-900 dark:text-gray-100">
                      {new Date(compra.fecha).toLocaleDateString('es-AR')}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">N° Factura</p>
                    <div className="flex items-center gap-2">
                      <p className="text-sm text-gray-900 dark:text-gray-100">{compra.numeroFactura || '-'}</p>
                      {compra.tipoFactura && (
                        <span className="inline-flex px-1.5 py-0.5 text-xs font-medium rounded bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                          {compra.tipoFactura}
                        </span>
                      )}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Total</p>
                    <p className="font-semibold text-violet-600">
                      ${Number(compra.total).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Estado</p>
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                      compra.pagado
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                    }`}>
                      {compra.pagado ? '✓ Pagado' : 'Pendiente'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleEliminar(compra)
                    }}
                    className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                  <svg
                    className={`w-5 h-5 text-gray-400 transition-transform ${expandedCompra === compra.id ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>

              {expandedCompra === compra.id && (
                <div className="border-t border-gray-200 dark:border-gray-700 px-6 py-4 bg-gray-50 dark:bg-gray-900/50">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-700">
                        <th className="py-2 text-left font-medium text-gray-700 dark:text-gray-300">Descripción</th>
                        <th className="py-2 text-right font-medium text-gray-700 dark:text-gray-300">Cantidad</th>
                        <th className="py-2 text-right font-medium text-gray-700 dark:text-gray-300">Precio Unit.</th>
                        <th className="py-2 text-right font-medium text-gray-700 dark:text-gray-300">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {compra.items.map(item => (
                        <tr key={item.id} className="border-b border-gray-100 dark:border-gray-800">
                          <td className="py-2 text-gray-900 dark:text-gray-100">
                            {item.descripcion}
                            {item.actualizaStock && (
                              <span className="ml-2 text-xs text-violet-600">↑ Stock</span>
                            )}
                          </td>
                          <td className="py-2 text-right text-gray-900 dark:text-gray-100">
                            {Number(item.cantidadCompra)} {item.unidadCompra}
                          </td>
                          <td className="py-2 text-right text-gray-900 dark:text-gray-100">
                            ${Number(item.precioUnitario).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-2 text-right font-medium text-gray-900 dark:text-gray-100">
                            ${Number(item.subtotal).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {modalOpen && (
        <ModalNuevaCompra
          onClose={() => setModalOpen(false)}
          onSave={handleSave}
        />
      )}
    </div>
  )
}
