import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import api from '../../api/axios'
import toast from 'react-hot-toast'

export default function ModalConvertirCompra({ gasto, onClose, onSave }) {
  const { getNegocioId } = useAuth()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    numeroFactura: '',
    tipoFactura: '',
    notas: gasto.notas || ''
  })

  const handleSubmit = async () => {
    setLoading(true)
    try {
      const negocioId = getNegocioId()

      // Crear compra vinculada al gasto
      const compraData = {
        proveedorId: gasto.proveedorId,
        numeroFactura: form.numeroFactura,
        tipoFactura: form.tipoFactura || null,
        fecha: gasto.fecha,
        pagado: true,
        fechaPago: gasto.fecha,
        metodoPago: gasto.metodoPago,
        notas: form.notas,
        gastoId: gasto.id, // Vincular el gasto existente
        items: [
          {
            productoId: null,
            descripcion: gasto.descripcion,
            cantidadCompra: 1,
            unidadCompra: 'unidad',
            precioUnitario: gasto.monto,
            actualizaStock: false
          }
        ]
      }

      await api.post(`/negocios/${negocioId}/compras`, compraData)
      toast.success('Gasto convertido a compra correctamente')
      onSave()
      onClose()
    } catch (error) {
      console.error('Error:', error)
      toast.error(error.response?.data?.message || 'Error al convertir a compra')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">Convertir a Compra</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
            <svg className="w-4 h-4 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Info del gasto */}
          <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Descripción:</span>
              <span className="font-medium text-gray-900 dark:text-gray-100">{gasto.descripcion}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Monto:</span>
              <span className="font-semibold text-violet-600">${Number(gasto.monto).toLocaleString('es-AR')}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Fecha:</span>
              <span className="text-gray-900 dark:text-gray-100">{new Date(gasto.fecha).toLocaleDateString('es-AR')}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Método de pago:</span>
              <span className="text-gray-900 dark:text-gray-100 capitalize">{gasto.metodoPago}</span>
            </div>
          </div>

          <p className="text-sm text-gray-600 dark:text-gray-400">
            Esta compra se creará automáticamente vinculada a este gasto. El gasto no se duplicará.
          </p>

          {/* Número de factura */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">N° Factura (opcional)</label>
            <input
              type="text"
              value={form.numeroFactura}
              onChange={e => setForm({ ...form, numeroFactura: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 dark:bg-gray-700 dark:text-white"
              placeholder="001-00001234"
            />
          </div>

          {/* Tipo de factura */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tipo de Factura</label>
            <select
              value={form.tipoFactura}
              onChange={e => setForm({ ...form, tipoFactura: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="">Sin especificar</option>
              <option value="A">Factura A</option>
              <option value="B">Factura B</option>
              <option value="X">Factura X (sin factura)</option>
            </select>
          </div>

          {/* Notas */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notas adicionales</label>
            <textarea
              value={form.notas}
              onChange={e => setForm({ ...form, notas: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 dark:bg-gray-700 dark:text-white resize-none"
              placeholder="Detalles de la compra..."
            />
          </div>
        </div>

        <div className="flex gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
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
            {loading ? 'Convirtiendo...' : 'Convertir a Compra'}
          </button>
        </div>
      </div>
    </div>
  )
}
