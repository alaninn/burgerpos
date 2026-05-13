import { useState } from 'react';
import api from '../api/axios';

export default function VincularARCAAutomatico({ negocioId, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [progreso, setProgreso] = useState([]);
  const [error, setError] = useState('');
  const [exito, setExito] = useState('');
  const [testingConexion, setTestingConexion] = useState(false);
  const [estadoConexion, setEstadoConexion] = useState(null);
  const [vinculacionCompletada, setVinculacionCompletada] = useState(false);

  const [formData, setFormData] = useState({
    cuit: '',
    claveFiscal: '',
    puntoVenta: '1',
    razonSocial: '',
    regimenFiscal: 'responsable_inscripto',
    esHomologacion: true // Por defecto en modo prueba
  });

  const [mostrarClave, setMostrarClave] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setExito('');
    setProgreso([]);
    setEstadoConexion(null);
    setLoading(true);

    try {
      // Agregar mensaje inicial
      setProgreso(prev => [...prev, {
        paso: 'Iniciando vinculación automática...',
        estado: 'procesando',
        timestamp: new Date().toLocaleTimeString()
      }]);

      const response = await api.post(`/negocios/${negocioId}/arca/vincular-automatico`, formData);

      if (response.data.exito) {
        setExito('✅ ' + response.data.mensaje);
        setProgreso(response.data.pasos.map(p => ({
          ...p,
          timestamp: new Date(p.timestamp).toLocaleTimeString()
        })));
        setVinculacionCompletada(true);

        // Notificar éxito al componente padre
        if (onSuccess) {
          setTimeout(() => onSuccess(), 2000);
        }
      } else {
        setError('❌ ' + response.data.mensaje);
        setProgreso(response.data.pasos || []);
      }
    } catch (err) {
      console.error('Error en vinculación automática:', err);
      setError('❌ Error: ' + (err.response?.data?.error || err.message));

      if (err.response?.data?.pasos) {
        setProgreso(err.response.data.pasos);
      }
    } finally {
      setLoading(false);
    }
  };

  const testConexion = async () => {
    setTestingConexion(true);
    setEstadoConexion(null);
    setError('');

    try {
      const response = await api.post(`/negocios/${negocioId}/arca/test-conexion`);

      if (response.data.exito) {
        setEstadoConexion({
          exito: true,
          mensaje: response.data.mensaje,
          detalles: response.data.ticket
        });
      } else {
        setEstadoConexion({
          exito: false,
          mensaje: 'No se pudo conectar con WSAA'
        });
      }
    } catch (err) {
      console.error('Error en test de conexión:', err);
      setEstadoConexion({
        exito: false,
        mensaje: err.response?.data?.error || 'Error al probar conexión'
      });
    } finally {
      setTestingConexion(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-500 to-indigo-600 rounded-lg p-6 mb-6 text-white">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-white/20 rounded-lg">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold mb-2">Vinculación Automática con ARCA</h2>
            <p className="text-purple-100">
              Ingresa tus credenciales de ARCA y el sistema configurará todo automáticamente.
              Sin necesidad de gestionar certificados manualmente.
            </p>
          </div>
        </div>
      </div>

      {/* Alert informativo */}
      <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6">
        <div className="flex">
          <svg className="w-5 h-5 text-blue-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          <div>
            <h3 className="text-sm font-medium text-blue-800">Modo Experimental</h3>
            <p className="text-sm text-blue-700 mt-1">
              Este método automatiza la vinculación usando web scraping del portal de ARCA.
              Por defecto está en modo <strong>Homologación</strong> (pruebas). Para producción,
              desactiva el checkbox "Modo Homologación".
            </p>
          </div>
        </div>
      </div>

      {/* Formulario */}
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="space-y-4">
          {/* CUIT */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              CUIT *
            </label>
            <input
              type="text"
              required
              value={formData.cuit}
              onChange={(e) => setFormData({ ...formData, cuit: e.target.value })}
              placeholder="20-12345678-9"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              disabled={loading}
            />
          </div>

          {/* Clave Fiscal */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Clave Fiscal de AFIP *
            </label>
            <div className="relative">
              <input
                type={mostrarClave ? 'text' : 'password'}
                required
                value={formData.claveFiscal}
                onChange={(e) => setFormData({ ...formData, claveFiscal: e.target.value })}
                placeholder="Tu contraseña de AFIP"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent pr-10"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setMostrarClave(!mostrarClave)}
                className="absolute right-2 top-2.5 text-gray-500 hover:text-gray-700"
              >
                {mostrarClave ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              ⚠️ Tu clave NO se guarda, solo se usa temporalmente para la vinculación
            </p>
          </div>

          {/* Razón Social */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Razón Social
            </label>
            <input
              type="text"
              value={formData.razonSocial}
              onChange={(e) => setFormData({ ...formData, razonSocial: e.target.value })}
              placeholder="Nombre de tu negocio (opcional)"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              disabled={loading}
            />
          </div>

          {/* Punto de Venta */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Punto de Venta *
            </label>
            <input
              type="number"
              required
              min="1"
              max="9999"
              value={formData.puntoVenta}
              onChange={(e) => setFormData({ ...formData, puntoVenta: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              disabled={loading}
            />
          </div>

          {/* Régimen Fiscal */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Régimen Fiscal *
            </label>
            <select
              required
              value={formData.regimenFiscal}
              onChange={(e) => setFormData({ ...formData, regimenFiscal: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              disabled={loading}
            >
              <option value="responsable_inscripto">Responsable Inscripto</option>
              <option value="monotributista">Monotributista</option>
            </select>
          </div>

          {/* Entorno - Radio Buttons */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Entorno de Conexión *
            </label>
            <div className="space-y-3">
              {/* Homologación */}
              <div
                onClick={() => !loading && setFormData({ ...formData, esHomologacion: true })}
                className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                  formData.esHomologacion
                    ? 'border-orange-500 bg-orange-50'
                    : 'border-gray-300 hover:border-orange-300'
                } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div className="flex items-start">
                  <input
                    type="radio"
                    id="homologacion"
                    name="entorno"
                    checked={formData.esHomologacion}
                    onChange={() => setFormData({ ...formData, esHomologacion: true })}
                    className="mt-1 w-4 h-4 text-orange-600 focus:ring-orange-500"
                    disabled={loading}
                  />
                  <div className="ml-3 flex-1">
                    <label htmlFor="homologacion" className="font-medium text-gray-900 cursor-pointer">
                      🧪 Homologación (Pruebas)
                    </label>
                    <p className="text-sm text-gray-600 mt-1">
                      Entorno de testing de AFIP. Certificados y comprobantes NO son fiscalmente válidos.
                      <span className="block mt-1 text-orange-600 font-medium">✅ Recomendado para primeras pruebas</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Producción */}
              <div
                onClick={() => !loading && setFormData({ ...formData, esHomologacion: false })}
                className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                  !formData.esHomologacion
                    ? 'border-red-500 bg-red-50'
                    : 'border-gray-300 hover:border-red-300'
                } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div className="flex items-start">
                  <input
                    type="radio"
                    id="produccion"
                    name="entorno"
                    checked={!formData.esHomologacion}
                    onChange={() => setFormData({ ...formData, esHomologacion: false })}
                    className="mt-1 w-4 h-4 text-red-600 focus:ring-red-500"
                    disabled={loading}
                  />
                  <div className="ml-3 flex-1">
                    <label htmlFor="produccion" className="font-medium text-gray-900 cursor-pointer">
                      🚀 Producción (Real)
                    </label>
                    <p className="text-sm text-gray-600 mt-1">
                      Entorno oficial de AFIP. Certificados y comprobantes SON fiscalmente válidos.
                      <span className="block mt-1 text-red-600 font-medium">⚠️ Solo usar después de validar en homologación</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Botones */}
        <div className="mt-6 flex gap-3">
          <button
            type="submit"
            disabled={loading || testingConexion}
            className={`flex-1 px-6 py-3 rounded-lg font-medium text-white transition-colors ${
              loading || testingConexion
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700'
            }`}
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Vinculando... Por favor espera
              </span>
            ) : (
              '🚀 Vincular Automáticamente'
            )}
          </button>

          {vinculacionCompletada && (
            <button
              type="button"
              onClick={testConexion}
              disabled={loading || testingConexion}
              className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                testingConexion
                  ? 'bg-gray-400 text-white cursor-not-allowed'
                  : 'bg-white text-blue-600 border-2 border-blue-600 hover:bg-blue-50'
              }`}
            >
              {testingConexion ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Probando...
                </span>
              ) : (
                <span className="flex items-center justify-center">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Test Conexión
                </span>
              )}
            </button>
          )}
        </div>
      </form>

      {/* Estado de Conexión */}
      {estadoConexion && (
        <div className={`mb-4 border-l-4 p-4 ${
          estadoConexion.exito
            ? 'bg-green-50 border-green-500'
            : 'bg-red-50 border-red-500'
        }`}>
          <div className="flex items-start">
            <div className="flex-shrink-0">
              {estadoConexion.exito ? (
                <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-6 h-6 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              )}
            </div>
            <div className="ml-3 flex-1">
              <h3 className={`text-sm font-medium ${
                estadoConexion.exito ? 'text-green-800' : 'text-red-800'
              }`}>
                {estadoConexion.exito ? '✅ Conexión Exitosa' : '❌ Error de Conexión'}
              </h3>
              <p className={`text-sm mt-1 ${
                estadoConexion.exito ? 'text-green-700' : 'text-red-700'
              }`}>
                {estadoConexion.mensaje}
              </p>
              {estadoConexion.detalles && (
                <div className="mt-2 text-xs text-green-600 font-mono bg-white rounded p-2">
                  <div>Token: {estadoConexion.detalles.tokenPreview}</div>
                  {estadoConexion.detalles.expiracion && (
                    <div>Expira: {new Date(estadoConexion.detalles.expiracion).toLocaleString()}</div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Mensajes de éxito/error */}
      {exito && (
        <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-4">
          <p className="text-green-800 font-medium">{exito}</p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
          <p className="text-red-800 font-medium">{error}</p>
        </div>
      )}

      {/* Progreso */}
      {progreso.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <svg className="w-5 h-5 mr-2 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            Progreso de la Vinculación
          </h3>
          <div className="space-y-3">
            {progreso.map((item, idx) => (
              <div
                key={idx}
                className={`flex items-start p-3 rounded-lg ${
                  item.estado === 'ok'
                    ? 'bg-green-50'
                    : item.estado === 'error'
                    ? 'bg-red-50'
                    : 'bg-blue-50'
                }`}
              >
                <div className="flex-shrink-0 mr-3">
                  {item.estado === 'ok' ? (
                    <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  ) : item.estado === 'error' ? (
                    <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 text-blue-600 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  )}
                </div>
                <div className="flex-1">
                  <p className={`text-sm font-medium ${
                    item.estado === 'ok' ? 'text-green-800' :
                    item.estado === 'error' ? 'text-red-800' :
                    'text-blue-800'
                  }`}>
                    {item.paso}
                  </p>
                  {item.mensaje && (
                    <p className="text-xs text-gray-600 mt-1">{item.mensaje}</p>
                  )}
                  {item.timestamp && (
                    <p className="text-xs text-gray-500 mt-1">{item.timestamp}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Información adicional */}
      <div className="mt-6 bg-gray-50 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-gray-700 mb-2">ℹ️ ¿Cómo funciona?</h4>
        <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
          <li>El sistema genera automáticamente los certificados RSA</li>
          <li>Se conecta a ARCA con tus credenciales (simulación de navegador)</li>
          <li>Sube el CSR (solicitud de certificado)</li>
          <li>Descarga el certificado firmado por AFIP</li>
          <li>Lo guarda encriptado en la base de datos</li>
          <li>Realiza un test de conexión con WSAA</li>
          <li>¡Listo! Ya puedes emitir facturas</li>
        </ol>
      </div>
    </div>
  );
}
