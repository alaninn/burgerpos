import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import api from '../../api/axios'
import toast from 'react-hot-toast'
import { unidadesCompatibles, cantidadBaseDeUnaUnidadCompra } from '../../utils/unidades'

// Fecha de HOY en la zona horaria local (no UTC): new Date().toISOString()
// siempre da la fecha en UTC, que despues de las 21hs en Argentina (UTC-3)
// ya es "mañana" y hacia que la compra quedara fechada al dia siguiente.
function hoyISO() {
  const d = new Date()
  return new Date(d - d.getTimezoneOffset() * 60000).toISOString().split('T')[0]
}

const PLURAL_UNIDAD = { caja: 'cajas', kg: 'kg', gramo: 'gramos', litro: 'litros', ml: 'ml', unidad: 'unidades' }
const pluralizarUnidad = (unidad, n) => (n === 1 ? unidad : (PLURAL_UNIDAD[unidad] || `${unidad}s`))

// Cuanto suma al stock una compra de este item, en la unidad base del
// producto. Cada item puede elegir su propia unidad de compra "en el
// momento" (ej: el producto se compra habitualmente por caja, pero esta vez
// se compro suelto por kg): si no especifica contenido propio, usa el del
// producto como default.
function equivalenciaCompra(item, producto) {
  const n = Number(item.cantidadCompra) || 0
  if (!producto) return { texto: '', enBase: 0 }
  const unidadCompra = item.unidadCompra || producto.unidadCompra
  const cantidadPorUnidad = item.cantidadPorUnidadCompra !== '' && item.cantidadPorUnidadCompra != null ? item.cantidadPorUnidadCompra : producto.cantidadPorUnidadCompra
  const unidadContenido = item.unidadContenido || producto.unidadContenidoCaja
  const enBase = n * cantidadBaseDeUnaUnidadCompra(unidadCompra, cantidadPorUnidad, unidadContenido, producto.unidadBase)
  if (!esUnidadDirecta(unidadCompra, producto.unidadBase)) {
    const enContenido = n * (Number(cantidadPorUnidad) || 1)
    return { texto: `${n} ${pluralizarUnidad(unidadCompra, n)} = ${enContenido} ${unidadContenido || producto.unidadBase} = ${enBase} ${producto.unidadBase}`, enBase }
  }
  return { texto: `${n} ${unidadCompra} = ${enBase} ${producto.unidadBase}`, enBase }
}

// Si la unidad elegida ya es del mismo grupo que la base del producto (ej:
// comprar en kg con base gramo), la conversion es directa y no hace falta
// declarar un "contenido" (caja/bulto).
const esUnidadDirecta = (unidad, unidadBase) => unidadesCompatibles(unidadBase).includes(unidad)

// Compra avanzada (boleta completa): carga items que actualizan el stock de
// ingredientes y, opcionalmente, deja deuda con el proveedor. Se abre desde Gastos.
const UNIDADES_COMPRA_ITEM = ['caja', 'kg', 'gramo', 'litro', 'unidad']
const UNIDADES = ['caja', 'kg', 'gramos', 'unidad', 'litro', 'ml']
const METODOS_PAGO = ['efectivo', 'transferencia', 'tarjeta', 'mercadopago']

export default function ModalCompra({ compraId, onClose, onGuardado }) {
  const { getNegocioId } = useAuth()
  const [proveedores, setProveedores] = useState([])
  const [productos, setProductos] = useState([])
  const [todosProductos, setTodosProductos] = useState([])
  const [loading, setLoading] = useState(false)
  const [cargandoCompra, setCargandoCompra] = useState(!!compraId)
  const [form, setForm] = useState({
    proveedorId: '',
    numeroFactura: '',
    tipoFactura: '',
    fecha: hoyISO(),
    pagado: false,
    fechaPago: '',
    metodoPago: 'efectivo',
    notas: '',
    items: []
  })

  useEffect(() => { cargarDatos() }, [])

  useEffect(() => {
    if (!compraId) return
    (async () => {
      try {
        const negocioId = getNegocioId()
        const { data } = await api.get(`/negocios/${negocioId}/compras/${compraId}`)
        const c = data.compra
        setForm({
          proveedorId: c.proveedorId || '',
          numeroFactura: c.numeroFactura || '',
          tipoFactura: c.tipoFactura || '',
          fecha: c.fecha ? String(c.fecha).split('T')[0] : hoyISO(),
          pagado: !!c.pagado,
          fechaPago: c.fechaPago ? String(c.fechaPago).split('T')[0] : '',
          metodoPago: c.metodoPago || 'efectivo',
          notas: c.notas || '',
          items: (c.items || []).map(i => ({
            productoId: i.productoId || '',
            descripcion: i.descripcion || '',
            cantidadCompra: i.cantidadCompra != null ? parseFloat(i.cantidadCompra) : '',
            unidadCompra: i.unidadCompra || 'unidad',
            cantidadPorUnidadCompra: i.cantidadPorUnidadCompra != null ? parseFloat(i.cantidadPorUnidadCompra) : '',
            unidadContenido: i.unidadContenido || '',
            precioUnitario: i.precioUnitario != null ? parseFloat(i.precioUnitario) : '',
            actualizaStock: i.actualizaStock !== false
          }))
        })
      } catch (error) {
        console.error('Error:', error)
        toast.error('No se pudo cargar la compra')
      } finally {
        setCargandoCompra(false)
      }
    })()
  }, [compraId])

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
    items: [...form.items, { productoId: '', descripcion: '', cantidadCompra: '', unidadCompra: 'unidad', cantidadPorUnidadCompra: '', unidadContenido: '', precioUnitario: '', actualizaStock: true }]
  })

  const actualizarItem = (index, campo, valor) => {
    const nuevosItems = [...form.items]
    nuevosItems[index][campo] = valor
    if (campo === 'productoId' && valor) {
      const producto = productos.find(p => p.id === valor)
      if (producto) {
        nuevosItems[index].descripcion = producto.nombre
        // Por defecto se sugiere la unidad habitual del producto, pero se
        // puede cambiar libremente por item (ver cambiarUnidadItem). Se
        // guarda el fraccionamiento del producto TAL COMO ESTA AHORA en el
        // item (no se deja en blanco): si despues cambia la config del
        // producto, esta compra vieja se sigue revirtiendo con el numero
        // que realmente se uso al comprar.
        nuevosItems[index].unidadCompra = producto.unidadCompra || 'unidad'
        nuevosItems[index].cantidadPorUnidadCompra = producto.cantidadPorUnidadCompra
        nuevosItems[index].unidadContenido = producto.unidadContenidoCaja || ''
      }
    }
    setForm({ ...form, items: nuevosItems })
  }

  // Cambiar la unidad de compra de un item "en el momento" (ej: esta vez se
  // compro suelto por kg en vez de por caja). Si coincide con la unidad
  // habitual del producto, se recupera su fraccionamiento configurado; si es
  // directamente compatible con la base (mismo grupo) no hace falta declarar
  // contenido; si no, se sugiere un contenido de partida para completar.
  const cambiarUnidadItem = (index, nuevaUnidad) => {
    const nuevosItems = [...form.items]
    const item = nuevosItems[index]
    const producto = item.productoId ? todosProductos.find(p => p.id === item.productoId) : null
    item.unidadCompra = nuevaUnidad
    if (producto && nuevaUnidad === producto.unidadCompra) {
      item.cantidadPorUnidadCompra = producto.cantidadPorUnidadCompra
      item.unidadContenido = producto.unidadContenidoCaja || ''
    } else if (producto && esUnidadDirecta(nuevaUnidad, producto.unidadBase)) {
      item.cantidadPorUnidadCompra = ''
      item.unidadContenido = ''
    } else if (producto) {
      item.cantidadPorUnidadCompra = item.cantidadPorUnidadCompra || 1
      item.unidadContenido = item.unidadContenido || unidadesCompatibles(producto.unidadBase)[0]
    }
    setForm({ ...form, items: nuevosItems })
  }

  const eliminarItem = (index) => setForm({ ...form, items: form.items.filter((_, i) => i !== index) })
  const calcularSubtotal = (item) => (Number(item.cantidadCompra) || 0) * (Number(item.precioUnitario) || 0)
  const calcularTotal = () => form.items.reduce((sum, item) => sum + calcularSubtotal(item), 0)

  // El precio unitario y el subtotal (precio final del item, como figura en la
  // boleta) estan sincronizados: editar uno recalcula el otro.
  const actualizarSubtotal = (index, valor) => {
    const nuevosItems = [...form.items]
    const cantidad = Number(nuevosItems[index].cantidadCompra) || 0
    nuevosItems[index].precioUnitario = cantidad > 0 ? (Number(valor) || 0) / cantidad : ''
    setForm({ ...form, items: nuevosItems })
  }

  const handleSubmit = async () => {
    if (!form.proveedorId) return toast.error('Seleccioná un proveedor')
    if (form.items.length === 0) return toast.error('Agregá al menos un item')
    const invalidos = form.items.filter(i => !i.descripcion || !i.cantidadCompra || !i.precioUnitario)
    if (invalidos.length > 0) return toast.error('Completá todos los campos de los items')

    setLoading(true)
    try {
      const negocioId = getNegocioId()
      const payload = { ...form, fechaPago: form.pagado && form.fechaPago ? form.fechaPago : null }
      if (compraId) {
        await api.put(`/negocios/${negocioId}/compras/${compraId}`, payload)
        toast.success('Compra actualizada y stock corregido')
      } else {
        await api.post(`/negocios/${negocioId}/compras`, payload)
        toast.success(form.pagado ? 'Compra registrada y stock actualizado' : 'Compra registrada (queda como deuda) y stock actualizado')
      }
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
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">{compraId ? 'Editar compra' : 'Compra avanzada'}</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">Boleta completa con items que actualizan el stock</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-500 text-xl leading-none">✕</button>
        </div>

        {cargandoCompra ? (
          <div className="flex-1 flex items-center justify-center p-12 text-sm text-gray-500 dark:text-gray-400">Cargando compra...</div>
        ) : (
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
                            const eq = equivalenciaCompra(item, prod)
                            const directa = esUnidadDirecta(item.unidadCompra, prod.unidadBase)
                            return (
                              <div className="w-40">
                                <select value={item.unidadCompra} onChange={e => cambiarUnidadItem(idx, e.target.value)}
                                  className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-sm dark:bg-gray-700 dark:text-white capitalize">
                                  {UNIDADES_COMPRA_ITEM.map(u => (
                                    <option key={u} value={u}>{u}{u === prod.unidadCompra ? ' (habitual)' : ''}</option>
                                  ))}
                                </select>
                                {!directa && (
                                  <div className="flex items-center gap-1 mt-1">
                                    <span className="text-[10px] text-gray-400">1 {item.unidadCompra} =</span>
                                    <input type="number" min="0.001" step="0.001" value={item.cantidadPorUnidadCompra}
                                      onChange={e => actualizarItem(idx, 'cantidadPorUnidadCompra', e.target.value)}
                                      className="w-14 px-1 py-0.5 border border-gray-300 dark:border-gray-600 rounded text-xs dark:bg-gray-700 dark:text-white" />
                                    <select value={item.unidadContenido || unidadesCompatibles(prod.unidadBase)[0]}
                                      onChange={e => actualizarItem(idx, 'unidadContenido', e.target.value)}
                                      className="px-1 py-0.5 border border-gray-300 dark:border-gray-600 rounded text-xs dark:bg-gray-700 dark:text-white">
                                      {unidadesCompatibles(prod.unidadBase).map(u => <option key={u} value={u}>{u}</option>)}
                                    </select>
                                  </div>
                                )}
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
                      <td className="px-3 py-2">
                        <input type="number" value={item.precioUnitario} min="0" step="0.01" onChange={e => actualizarItem(idx, 'precioUnitario', e.target.value)} className="w-28 px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-sm dark:bg-gray-700 dark:text-white" placeholder="0.00" />
                        <p className="text-[10px] text-gray-400 mt-0.5">por {item.unidadCompra}</p>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <input type="number" value={calcularSubtotal(item) ? Number(calcularSubtotal(item).toFixed(2)) : ''} min="0" step="0.01"
                          onChange={e => actualizarSubtotal(idx, e.target.value)}
                          className="w-28 px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-sm text-right font-medium dark:bg-gray-700 dark:text-white" placeholder="0.00" />
                        <p className="text-[10px] text-gray-400 mt-0.5">precio final</p>
                      </td>
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
        )}

        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-700">
          <button onClick={onClose} className="text-sm text-gray-600 dark:text-gray-400 hover:underline">Cancelar</button>
          <button onClick={handleSubmit} disabled={loading || cargandoCompra} className="px-6 py-2 bg-violet-600 text-white rounded-lg text-sm font-medium hover:bg-violet-700 disabled:opacity-50">{loading ? 'Guardando...' : 'Guardar compra'}</button>
        </div>
      </div>
    </div>
  )
}
