import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import api from '../../api/axios'
import toast from 'react-hot-toast'
import { factorConversion } from '../../utils/unidades'

// Cuanto suma al stock una compra de N unidades de compra del producto,
// en su unidad base (ej: 2 cajas de 15 kg, base gramo -> 30000 gramo).
function equivalenciaCompra(producto, cantidad) {
  const n = Number(cantidad) || 0
  const porUnidad = Number(producto?.cantidadPorUnidadCompra) || 1
  if (producto?.unidadCompra === 'caja' && producto?.unidadContenidoCaja) {
    const enContenido = n * porUnidad
    const enBase = enContenido * factorConversion(producto.unidadContenidoCaja, producto.unidadBase)
    return { texto: `${n} caja${n !== 1 ? 's' : ''} = ${enContenido} ${producto.unidadContenidoCaja} = ${enBase} ${producto.unidadBase}`, enBase }
  }
  const enBase = n * porUnidad
  return { texto: `${n} ${producto?.unidadCompra || 'unidad'} = ${enBase} ${producto?.unidadBase || 'unidad'}`, enBase }
}

// Compra avanzada (boleta completa): carga items que actualizan el stock de
// ingredientes y, opcionalmente, deja deuda con el proveedor. Se abre desde Gastos.
const UNIDADES = ['caja', 'kg', 'gramos', 'unidad', 'litro', 'ml']
const METODOS_PAGO = ['efectivo', 'transferencia', 'tarjeta', 'mercadopago']

export default function ModalCompra({ onClose, onGuardado }) {
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

  useEffect(() => { cargarDatos() }, [])

  const cargarDatos = async () => {
    try {
      const negocioId = getNegocioId()
      const [provRes, prodRes, catRes] = await Promise.all([
        api.get(`/negocios/${negocioId}/proveedores?activo=true`),
        api.get(`/negocios/${negocioId}/productos`),
        api.get(`/negocios/${negocioId}/productos/categorias`)
      ])
      setProveedores(provRes.data.proveedores || [])
      const todasCategorias = catRes.data?.categorias || []
      const categoriasStockIds = new Set(
        todasCategorias.filter(c => c.tipo === 'ingrediente' || c.tipo === 'producto').map(c => c.id)
      )
      const productosStock = (prodRes.data?.productos || []).filter(p => p.categoriaId && categoriasStockIds.has(p.categoriaId))
      setTodosProductos(productosStock)
      setProductos(productosStock)
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const handleProveedorChange = (proveedorId) => {
    setForm({ ...form, proveedorId })
    setProductos(proveedorId ? todosProductos.filter(p => p.proveedorId === proveedorId) : todosProductos)
  }

  const agregarItem = () => setForm({
    ...form,
    items: [...form.items, { productoId: '', descripcion: '', cantidadCompra: '', unidadCompra: 'unidad', precioUnitario: '', actualizaStock: true }]
  })

  const actualizarItem = (index, campo, valor) => {
    const nuevosItems = [...form.items]
    nuevosItems[index][campo] = valor
    if (campo === 'productoId' && valor) {
      const producto = productos.find(p => p.id === valor)
      if (producto) {
        nuevosItems[index].descripcion = producto.nombre
        // La unidad la define el fraccionamiento configurado en el producto
        nuevosItems[index].unidadCompra = producto.unidadCompra || 'unidad'
      }
    }
    setForm({ ...form, items: nuevosItems })
  }

  const eliminarItem = (index) => setForm({ ...form, items: form.items.filter((_, i) => i !== index) })
  const calcularSubtotal = (item) => (Number(item.cantidadCompra) || 0) * (Number(item.precioUnitario) || 0)
  const calcularTotal = () => form.items.reduce((sum, item) => sum + calcularSubtotal(item), 0)

  const handleSubmit = async () => {
    if (!form.proveedorId) return toast.error('Seleccioná un proveedor')
    if (form.items.length === 0) return toast.error('Agregá al menos un item')
    const invalidos = form.items.filter(i => !i.descripcion || !i.cantidadCompra || !i.precioUnitario)
    if (invalidos.length > 0) return toast.error('Completá todos los campos de los items')

    setLoading(true)
    try {
      const negocioId = getNegocioId()
      await api.post(`/negocios/${negocioId}/compras`, {
        ...form,
        fechaPago: form.pagado && form.fechaPago ? form.fechaPago : null
      })
      toast.success(form.pagado ? 'Compra registrada y stock actualizado' : 'Compra registrada (queda como deuda) y stock actualizado')
      onGuardado?.()
      onClose()
    } catch (error) {
      console.error('Error:', error)
      toast.error(error.response?.data?.message || 'Error al guardar compra')
    } finally {
      setLoading(false)
    }
  }

  const inputBase = 'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 dark:bg-gray-700 dark:text-white'

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">Compra avanzada</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">Boleta completa con items que actualizan el stock</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-500 text-xl leading-none">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Proveedor <span className="text-red-500">*</span></label>
              <select value={form.proveedorId} onChange={e => handleProveedorChange(e.target.value)} className={inputBase}>
                <option value="">Seleccionar...</option>
                {proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">N° Factura</label>
              <input type="text" value={form.numeroFactura} onChange={e => setForm({ ...form, numeroFactura: e.target.value })} className={inputBase} placeholder="001-00001234" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tipo</label>
              <select value={form.tipoFactura} onChange={e => setForm({ ...form, tipoFactura: e.target.value })} className={inputBase}>
                <option value="">Sin especificar</option>
                <option value="A">Factura A</option>
                <option value="B">Factura B</option>
                <option value="X">Factura X</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fecha</label>
              <input type="date" value={form.fecha} onChange={e => setForm({ ...form, fecha: e.target.value })} className={inputBase} />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Items de compra <span className="text-red-500">*</span></label>
              <button onClick={agregarItem} className="flex items-center gap-1 px-3 py-1.5 text-sm bg-violet-600 text-white rounded-lg hover:bg-violet-700">+ Agregar item</button>
            </div>
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-900/50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Producto</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Descripción</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Cantidad</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Unidad</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Precio/Unidad</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400">Subtotal</th>
                    <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400">Stock</th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {form.items.length === 0 ? (
                    <tr><td colSpan={8} className="px-3 py-8 text-center text-gray-500 dark:text-gray-400">No hay items. Tocá "Agregar item" para comenzar.</td></tr>
                  ) : form.items.map((item, idx) => (
                    <tr key={idx}>
                      <td className="px-3 py-2">
                        <select value={item.productoId} onChange={e => actualizarItem(idx, 'productoId', e.target.value)} className="w-40 px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-sm dark:bg-gray-700 dark:text-white">
                          <option value="">Sin producto</option>
                          {productos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                        </select>
                      </td>
                      <td className="px-3 py-2"><input type="text" value={item.descripcion} onChange={e => actualizarItem(idx, 'descripcion', e.target.value)} className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-sm dark:bg-gray-700 dark:text-white" placeholder="Descripción" /></td>
                      <td className="px-3 py-2"><input type="number" value={item.cantidadCompra} min="0" step="0.001" onChange={e => actualizarItem(idx, 'cantidadCompra', e.target.value)} className="w-24 px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-sm dark:bg-gray-700 dark:text-white" placeholder="0" /></td>
                      <td className="px-3 py-2">
                        {(() => {
                          const prod = item.productoId ? todosProductos.find(p => p.id === item.productoId) : null
                          if (prod) {
                            const eq = equivalenciaCompra(prod, item.cantidadCompra)
                            return (
                              <div className="w-36">
                                <span className="inline-block px-2 py-1.5 bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded text-sm text-gray-700 dark:text-gray-300 capitalize">{prod.unidadCompra}</span>
                                {Number(item.cantidadCompra) > 0 && (
                                  <p className="text-[10px] text-violet-600 dark:text-violet-400 mt-0.5 leading-tight">{eq.texto}</p>
                                )}
                              </div>
                            )
                          }
                          return (
                            <select value={item.unidadCompra} onChange={e => actualizarItem(idx, 'unidadCompra', e.target.value)} className="w-28 px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-sm dark:bg-gray-700 dark:text-white">
                              {UNIDADES.map(u => <option key={u} value={u}>{u}</option>)}
                            </select>
                          )
                        })()}
                      </td>
                      <td className="px-3 py-2"><input type="number" value={item.precioUnitario} min="0" step="0.01" onChange={e => actualizarItem(idx, 'precioUnitario', e.target.value)} className="w-28 px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-sm dark:bg-gray-700 dark:text-white" placeholder="0.00" /></td>
                      <td className="px-3 py-2 text-right font-medium text-gray-900 dark:text-gray-100">${calcularSubtotal(item).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
                      <td className="px-3 py-2 text-center"><input type="checkbox" checked={item.actualizaStock} onChange={e => actualizarItem(idx, 'actualizaStock', e.target.checked)} className="w-4 h-4 text-violet-600 rounded" title="Actualizar stock" /></td>
                      <td className="px-3 py-2"><button onClick={() => eliminarItem(idx)} className="p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded">✕</button></td>
                    </tr>
                  ))}
                </tbody>
                {form.items.length > 0 && (
                  <tfoot className="bg-gray-50 dark:bg-gray-900/50 border-t-2 border-gray-300 dark:border-gray-600">
                    <tr>
                      <td colSpan={5} className="px-3 py-2 font-semibold text-right text-gray-700 dark:text-gray-200">Total:</td>
                      <td className="px-3 py-2 text-right font-bold text-violet-600 text-base">${calcularTotal().toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
                      <td colSpan={2}></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>

          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <label className="flex items-center gap-2 cursor-pointer mb-3">
              <input type="checkbox" checked={form.pagado} onChange={e => setForm({ ...form, pagado: e.target.checked, fechaPago: e.target.checked ? (form.fechaPago || form.fecha) : '' })} className="w-4 h-4 text-violet-600 rounded" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Marcar como pagada (si no, queda como deuda con el proveedor)</span>
            </label>
            {form.pagado && (
              <div className="grid grid-cols-2 gap-4 ml-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fecha de pago</label>
                  <input type="date" value={form.fechaPago || form.fecha} onChange={e => setForm({ ...form, fechaPago: e.target.value })} className={inputBase} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Método de pago</label>
                  <select value={form.metodoPago} onChange={e => setForm({ ...form, metodoPago: e.target.value })} className={inputBase + ' capitalize'}>
                    {METODOS_PAGO.map(mp => <option key={mp} value={mp}>{mp}</option>)}
                  </select>
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notas</label>
            <textarea value={form.notas} onChange={e => setForm({ ...form, notas: e.target.value })} rows={2} className={inputBase + ' resize-none'} placeholder="Notas adicionales..." />
          </div>
        </div>

        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-700">
          <button onClick={onClose} className="text-sm text-gray-600 dark:text-gray-400 hover:underline">Cancelar</button>
          <button onClick={handleSubmit} disabled={loading} className="px-6 py-2 bg-violet-600 text-white rounded-lg text-sm font-medium hover:bg-violet-700 disabled:opacity-50">{loading ? 'Guardando...' : 'Guardar compra'}</button>
        </div>
      </div>
    </div>
  )
}
