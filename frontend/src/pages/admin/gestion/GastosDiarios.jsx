import { useState, useEffect } from 'react'
import { useAuth } from '../../../context/AuthContext'
import api from '../../../api/axios'
import toast from 'react-hot-toast'
import ModalConvertirCompra from '../../../components/gestion/ModalConvertirCompra'
import ModalEditarGasto from '../../../components/gestion/ModalEditarGasto'

const CATEGORIAS = [
  { value: 'proveedores', label: 'Proveedores', icon: '🏢' },
  { value: 'servicios', label: 'Servicios', icon: '🔧' },
  { value: 'salarios', label: 'Salarios', icon: '👥' },
  { value: 'alquiler', label: 'Alquiler', icon: '🏠' },
  { value: 'servicios_publicos', label: 'Servicios públicos', icon: '💡' },
  { value: 'otro', label: 'Otro', icon: '📋' }
]

const METODOS_PAGO = [
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'transferencia', label: 'Transferencia' },
  { value: 'tarjeta', label: 'Tarjeta' }
]

export default function GastosDiarios() {
  const { getNegocioId } = useAuth()
  const [gastos, setGastos] = useState([])
  const [proveedores, setProveedores] = useState([])
  const [loading, setLoading] = useState(true)
  const [fechaFiltro, setFechaFiltro] = useState(new Date().toISOString().split('T')[0])
  const [showConvertirModal, setShowConvertirModal] = useState(false)
  const [showEditarModal, setShowEditarModal] = useState(false)
  const [gastoSeleccionado, setGastoSeleccionado] = useState(null)
  const [nuevoGasto, setNuevoGasto] = useState({
    descripcion: '',
    monto: '',
    categoria: 'otro',
    metodoPago: 'efectivo',
    proveedorId: '',
    notas: ''
  })

  useEffect(() => {
    cargarProveedores()
  }, [])

  useEffect(() => {
    cargarGastos()
  }, [fechaFiltro])

  const cargarProveedores = async () => {
    try {
      const negocioId = getNegocioId()
      const { data } = await api.get(`/negocios/${negocioId}/proveedores?activo=true`)
      setProveedores(data.proveedores || [])
    } catch (error) {
      console.error('Error al cargar proveedores:', error)
    }
  }

  const cargarGastos = async () => {
    try {
      const negocioId = getNegocioId()
      const { data } = await api.get(`/negocios/${negocioId}/gastos`, {
        params: { fechaDesde: fechaFiltro, fechaHasta: fechaFiltro }
      })
      setGastos(data.gastos || [])
    } catch (error) {
      console.error('Error al cargar gastos:', error)
      toast.error('Error al cargar gastos')
    } finally {
      setLoading(false)
    }
  }

  const handleAgregarGasto = async () => {
    if (!nuevoGasto.descripcion || !nuevoGasto.monto) {
      return toast.error('Completá descripción y monto')
    }

    if (Number(nuevoGasto.monto) <= 0) {
      return toast.error('El monto debe ser mayor a 0')
    }

    try {
      const negocioId = getNegocioId()
      await api.post(`/negocios/${negocioId}/gastos`, {
        ...nuevoGasto,
        fecha: fechaFiltro,
        monto: Number(nuevoGasto.monto),
        proveedorId: nuevoGasto.proveedorId || null
      })
      toast.success('Gasto registrado')
      setNuevoGasto({
        descripcion: '',
        monto: '',
        categoria: 'otro',
        metodoPago: 'efectivo',
        proveedorId: '',
        notas: ''
      })
      cargarGastos()
    } catch (error) {
      console.error('Error:', error)
      toast.error(error.response?.data?.message || 'Error al guardar gasto')
    }
  }

  const handleEliminar = async (gasto) => {
    if (!confirm(`¿Eliminar el gasto "${gasto.descripcion}"?`)) return

    try {
      const negocioId = getNegocioId()
      await api.delete(`/negocios/${negocioId}/gastos/${gasto.id}`)
      toast.success('Gasto eliminado')
      cargarGastos()
    } catch (error) {
      console.error('Error:', error)
      toast.error(error.response?.data?.message || 'Error al eliminar gasto')
    }
  }

  const totalDia = gastos.reduce((sum, g) => sum + Number(g.monto), 0)

  const getCategoriaInfo = (categoria) => CATEGORIAS.find(c => c.value === categoria) || CATEGORIAS[CATEGORIAS.length - 1]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Cargando gastos...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Gastos Diarios</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Registrá y gestioná los gastos operativos del día
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-sm text-gray-600 dark:text-gray-400">Total del día</p>
            <p className="text-2xl font-bold text-violet-600">
              ${totalDia.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>
      </div>

      {/* Filtro de fecha */}
      <div className="flex items-center gap-4">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Fecha:</label>
        <input
          type="date"
          value={fechaFiltro}
          onChange={e => setFechaFiltro(e.target.value)}
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 dark:bg-gray-700 dark:text-white"
        />
        <button
          onClick={() => setFechaFiltro(new Date().toISOString().split('T')[0])}
          className="px-3 py-2 text-sm text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-900/20 rounded-lg"
        >
          Hoy
        </button>
      </div>

      {/* Formulario de entrada rápida */}
      <div className="bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20 rounded-lg p-4 border border-violet-200 dark:border-violet-800">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">➕ Agregar Gasto Rápido</h3>
        <div className="grid grid-cols-12 gap-3">
          <div className="col-span-12 md:col-span-3">
            <input
              type="text"
              placeholder="Descripción"
              value={nuevoGasto.descripcion}
              onChange={e => setNuevoGasto({ ...nuevoGasto, descripcion: e.target.value })}
              onKeyDown={e => e.key === 'Enter' && handleAgregarGasto()}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 dark:bg-gray-700 dark:text-white"
            />
          </div>

          <div className="col-span-6 md:col-span-2">
            <input
              type="number"
              placeholder="Monto"
              value={nuevoGasto.monto}
              onChange={e => setNuevoGasto({ ...nuevoGasto, monto: e.target.value })}
              onKeyDown={e => e.key === 'Enter' && handleAgregarGasto()}
              min="0"
              step="0.01"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 dark:bg-gray-700 dark:text-white"
            />
          </div>

          <div className="col-span-6 md:col-span-2">
            <select
              value={nuevoGasto.categoria}
              onChange={e => setNuevoGasto({ ...nuevoGasto, categoria: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 dark:bg-gray-700 dark:text-white"
            >
              {CATEGORIAS.map(cat => (
                <option key={cat.value} value={cat.value}>
                  {cat.icon} {cat.label}
                </option>
              ))}
            </select>
          </div>

          <div className="col-span-6 md:col-span-2">
            <select
              value={nuevoGasto.metodoPago}
              onChange={e => setNuevoGasto({ ...nuevoGasto, metodoPago: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 dark:bg-gray-700 dark:text-white"
            >
              {METODOS_PAGO.map(mp => (
                <option key={mp.value} value={mp.value}>{mp.label}</option>
              ))}
            </select>
          </div>

          <div className="col-span-6 md:col-span-2">
            <select
              value={nuevoGasto.proveedorId}
              onChange={e => setNuevoGasto({ ...nuevoGasto, proveedorId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="">Sin proveedor</option>
              {proveedores.map(prov => (
                <option key={prov.id} value={prov.id}>{prov.nombre}</option>
              ))}
            </select>
          </div>

          <div className="col-span-12 md:col-span-1">
            <button
              onClick={handleAgregarGasto}
              className="w-full h-full px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors font-medium text-sm"
            >
              ✓
            </button>
          </div>
        </div>
      </div>

      {/* Tabla de gastos */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Descripción
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Monto
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Categoría
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Método Pago
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Proveedor
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Compra
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {gastos.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-500 dark:text-gray-400">
                    No hay gastos registrados para esta fecha
                  </td>
                </tr>
              ) : (
                gastos.map(gasto => {
                  const catInfo = getCategoriaInfo(gasto.categoria)
                  return (
                    <tr key={gasto.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {gasto.descripcion}
                        </div>
                        {gasto.notas && (
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            {gasto.notas}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                          ${Number(gasto.monto).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                          <span>{catInfo.icon}</span>
                          <span>{catInfo.label}</span>
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-700 dark:text-gray-300 capitalize">
                          {gasto.metodoPago}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          {gasto.proveedor?.nombre || '-'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {gasto.compraId ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Vinculado
                          </span>
                        ) : gasto.categoria === 'proveedores' && gasto.proveedorId ? (
                          <button
                            onClick={() => {
                              setGastoSeleccionado(gasto)
                              setShowConvertirModal(true)
                            }}
                            className="text-xs px-2 py-1 bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400 rounded hover:bg-violet-200 dark:hover:bg-violet-900/50 transition"
                          >
                            Convertir
                          </button>
                        ) : (
                          <span className="text-xs text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {!gasto.compraId && (
                            <>
                              <button
                                onClick={() => {
                                  setGastoSeleccionado(gasto)
                                  setShowEditarModal(true)
                                }}
                                className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                title="Editar"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                              <button
                                onClick={() => handleEliminar(gasto)}
                                className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                title="Eliminar"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
            {gastos.length > 0 && (
              <tfoot className="bg-gray-50 dark:bg-gray-900/50 border-t-2 border-gray-300 dark:border-gray-600">
                <tr>
                  <td className="px-4 py-3 font-semibold text-gray-900 dark:text-gray-100">Total</td>
                  <td className="px-4 py-3 text-right font-bold text-violet-600 text-lg">
                    ${totalDia.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                  </td>
                  <td colSpan={5}></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {showConvertirModal && gastoSeleccionado && (
        <ModalConvertirCompra
          gasto={gastoSeleccionado}
          onClose={() => {
            setShowConvertirModal(false)
            setGastoSeleccionado(null)
          }}
          onSave={() => {
            cargarGastos()
            setShowConvertirModal(false)
            setGastoSeleccionado(null)
          }}
        />
      )}

      {showEditarModal && gastoSeleccionado && (
        <ModalEditarGasto
          gasto={gastoSeleccionado}
          proveedores={proveedores}
          onClose={() => {
            setShowEditarModal(false)
            setGastoSeleccionado(null)
          }}
          onSave={() => {
            cargarGastos()
            setShowEditarModal(false)
            setGastoSeleccionado(null)
          }}
        />
      )}
    </div>
  )
}
