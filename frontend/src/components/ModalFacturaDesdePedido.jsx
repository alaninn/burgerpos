import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

function ModalFacturaDesdePedido({ pedido, onClose, onSuccess }) {
  const { getNegocioId } = useAuth();
  const negocioId = getNegocioId();

  const [tiposComprobante, setTiposComprobante] = useState([]);
  const [loading, setLoading] = useState(true);
  const [emitiendo, setEmitiendo] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    tipoComprobante: '',
    tipoDocumento: 99, // Consumidor Final por defecto
    numeroDocumento: '',
    denominacion: pedido.nombreCliente || 'Consumidor Final'
  });

  useEffect(() => {
    cargarTiposComprobante();
  }, []);

  const cargarTiposComprobante = async () => {
    try {
      setLoading(true);
      // Obtener régimen fiscal del negocio
      const configRes = await api.get(`/negocios/${negocioId}`);
      const regimenFiscal = configRes.data.negocio.configuracion?.regimen_fiscal || 'responsable_inscripto';

      const res = await api.get(`/api/negocios/${negocioId}/arca/tipos-comprobante/${regimenFiscal}`);
      setTiposComprobante(res.data);

      // Preseleccionar Factura B por defecto
      const facturaB = res.data.find(t => t.codigo === 6);
      if (facturaB) {
        setFormData(prev => ({ ...prev, tipoComprobante: 6 }));
      }
    } catch (err) {
      setError('Error cargando tipos de comprobante');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.tipoComprobante) {
      setError('Debe seleccionar un tipo de comprobante');
      return;
    }

    // Validar CUIT para Factura A
    if (formData.tipoComprobante === 1 && (!formData.numeroDocumento || formData.tipoDocumento !== 80)) {
      setError('Factura A requiere CUIT del cliente');
      return;
    }

    try {
      setEmitiendo(true);

      const res = await api.post(
        `/api/negocios/${negocioId}/pedidos/${pedido.id}/emitir-factura`,
        formData
      );

      if (res.data.exito) {
        onSuccess(res.data.comprobante);
        onClose();
      } else {
        setError(res.data.error || 'Error al emitir comprobante');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Error al emitir comprobante');
      console.error(err);
    } finally {
      setEmitiendo(false);
    }
  };

  const handleTipoComprobanteChange = (tipo) => {
    setFormData(prev => ({
      ...prev,
      tipoComprobante: parseInt(tipo),
      // Si es Factura A, cambiar a CUIT
      tipoDocumento: tipo === 1 ? 80 : 99,
      numeroDocumento: tipo === 1 ? prev.numeroDocumento : ''
    }));
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-md w-full">
          <p className="text-center">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-violet-600 text-white p-4 rounded-t-lg flex justify-between items-center">
          <h3 className="text-lg font-semibold">Emitir Factura Electrónica</h3>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-200 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Datos del pedido */}
          <div className="bg-gray-50 p-3 rounded-lg">
            <p className="text-sm text-gray-600">Pedido #{pedido.numeroOrden || pedido.id?.slice(0, 8)}</p>
            <p className="text-xl font-bold text-gray-800">Total: ${parseFloat(pedido.total).toFixed(2)}</p>
          </div>

          {/* Tipo de comprobante */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tipo de Comprobante *
            </label>
            <select
              value={formData.tipoComprobante}
              onChange={(e) => handleTipoComprobanteChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              required
            >
              <option value="">Seleccionar...</option>
              {tiposComprobante.map(tipo => (
                <option key={tipo.codigo} value={tipo.codigo}>
                  {tipo.nombre}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              {formData.tipoComprobante === 1 && '⚠️ Factura A requiere CUIT del cliente'}
              {formData.tipoComprobante === 6 && 'ℹ️ Factura B - No discrimina IVA'}
              {formData.tipoComprobante === 11 && 'ℹ️ Factura C - Consumidor Final'}
            </p>
          </div>

          {/* Cliente */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Cliente *
            </label>
            <input
              type="text"
              value={formData.denominacion}
              onChange={(e) => setFormData(prev => ({ ...prev, denominacion: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              required
            />
          </div>

          {/* CUIT (solo si es Factura A) */}
          {formData.tipoComprobante === 1 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                CUIT del Cliente *
              </label>
              <input
                type="text"
                value={formData.numeroDocumento}
                onChange={(e) => setFormData(prev => ({ ...prev, numeroDocumento: e.target.value }))}
                placeholder="20-12345678-9"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                required
              />
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              disabled={emitiendo}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors disabled:opacity-50"
              disabled={emitiendo}
            >
              {emitiendo ? 'Emitiendo...' : 'Emitir Factura'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ModalFacturaDesdePedido;
