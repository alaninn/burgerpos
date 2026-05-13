import { useState } from 'react'
import api from '../api/axios'
import toast from 'react-hot-toast'

export default function ARCAConfigSection({ negocioId }) {
  const [loading, setLoading] = useState(false)
  const [resultado, setResultado] = useState(null)
  const [form, setForm] = useState({
    cuit: '',
    claveFiscal: '',
    puntoVenta: '1',
    razonSocial: '',
    regimenFiscal: 'responsable_inscripto',
    esHomologacion: true
  })

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!form.cuit || !form.claveFiscal || !form.puntoVenta) {
      toast.error('Completa todos los campos requeridos')
      return
    }

    setLoading(true)
    setResultado(null)

    try {
      const res = await api.post(`/negocios/${negocioId}/arca/vincular-automatico`, form)

      if (res.data.exito) {
        setResultado(res.data)
        toast.success('Certificados generados correctamente')
      } else {
        toast.error(res.data.mensaje || 'Error al generar certificados')
        setResultado(res.data)
      }
    } catch (error) {
      console.error('Error en vinculación ARCA:', error)
      toast.error(error.response?.data?.error || error.message || 'Error al generar certificados')
      setResultado({
        exito: false,
        mensaje: error.response?.data?.error || error.message,
        pasos: error.response?.data?.pasos || []
      })
    } finally {
      setLoading(false)
    }
  }

  const descargarArchivo = (url, filename) => {
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.click()
  }

  return (
    <div className="space-y-6">
      {/* Formulario */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center">
            <span className="text-xl">📄</span>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Configurar ARCA - Facturación Electrónica</h3>
            <p className="text-sm text-gray-500">Genera certificados para emitir facturas electrónicas</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                CUIT <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.cuit}
                onChange={(e) => setForm({ ...form, cuit: e.target.value })}
                placeholder="20-12345678-9"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Clave Fiscal <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                value={form.claveFiscal}
                onChange={(e) => setForm({ ...form, claveFiscal: e.target.value })}
                placeholder="Tu clave fiscal de AFIP"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                disabled={loading}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Punto de Venta <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={form.puntoVenta}
                onChange={(e) => setForm({ ...form, puntoVenta: e.target.value })}
                placeholder="1"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Régimen Fiscal
              </label>
              <select
                value={form.regimenFiscal}
                onChange={(e) => setForm({ ...form, regimenFiscal: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                disabled={loading}
              >
                <option value="responsable_inscripto">Responsable Inscripto</option>
                <option value="monotributista">Monotributista</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Razón Social (opcional)
            </label>
            <input
              type="text"
              value={form.razonSocial}
              onChange={(e) => setForm({ ...form, razonSocial: e.target.value })}
              placeholder="Ej: Mi Negocio SRL"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              disabled={loading}
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="esHomologacion"
              checked={form.esHomologacion}
              onChange={(e) => setForm({ ...form, esHomologacion: e.target.checked })}
              className="w-4 h-4 text-violet-600 border-gray-300 rounded focus:ring-violet-500"
              disabled={loading}
            />
            <label htmlFor="esHomologacion" className="text-sm text-gray-700">
              Modo Homologación (recomendado para pruebas)
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full px-4 py-3 bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-semibold text-base"
          >
            {loading ? '⏳ Vinculando automáticamente...' : '🚀 Vincular Automáticamente con ARCA'}
          </button>
        </form>
      </div>

      {/* Resultado */}
      {resultado && (
        <div className={`p-6 rounded-lg border ${resultado.exito ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
          <h4 className="font-semibold mb-3 flex items-center gap-2">
            <span>{resultado.exito ? '✅' : '❌'}</span>
            {resultado.mensaje}
          </h4>

          {/* Pasos */}
          {resultado.pasos && resultado.pasos.length > 0 && (
            <div className="space-y-2 mb-4">
              {resultado.pasos.map((paso, i) => (
                <div key={i} className="flex items-start gap-2 text-sm">
                  <span>
                    {paso.estado === 'ok' ? '✅' : paso.estado === 'error' ? '❌' : 'ℹ️'}
                  </span>
                  <div className="flex-1">
                    <span className="font-medium">{paso.paso}</span>
                    {paso.mensaje && (
                      <pre className="mt-1 text-xs bg-white p-2 rounded border whitespace-pre-wrap">
                        {paso.mensaje}
                      </pre>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Información del certificado */}
          {resultado.exito && resultado.certificadoPath && (
            <div className="mt-4 p-4 bg-violet-50 border border-violet-200 rounded-lg">
              <h5 className="font-semibold text-violet-900 mb-2">✅ Certificados instalados</h5>
              <p className="text-sm text-violet-700">
                Certificado ARCA: <code className="bg-violet-100 px-2 py-1 rounded text-xs">{resultado.certificadoPath}</code>
              </p>
              <p className="text-sm text-violet-700 mt-2">
                ¡Ya puedes emitir facturas electrónicas! Ve a la sección de <strong>Facturación ARCA</strong> para comenzar.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Información */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
          <span>🤖</span>
          <span>Vinculación Automática</span>
        </h4>
        <p className="text-sm text-blue-800 mb-3">
          El sistema hará todo automáticamente:
        </p>
        <ol className="text-sm text-blue-800 space-y-1.5 list-decimal list-inside">
          <li>Genera certificados RSA y CSR localmente</li>
          <li>Se conecta al portal de AFIP con tus credenciales</li>
          <li>Sube el CSR al sistema de AFIP</li>
          <li>Descarga el certificado firmado automáticamente</li>
          <li>Guarda todo en la base de datos encriptado</li>
          <li>Verifica la conexión con WSAA</li>
        </ol>
        <div className="mt-3 pt-3 border-t border-blue-200">
          <p className="text-xs text-blue-700">
            <strong>🔒 Seguridad:</strong> Tu Clave Fiscal NO se guarda, solo se usa temporalmente para la vinculación.
          </p>
        </div>
      </div>

      {/* Advertencia sobre modo homologación */}
      {form.esHomologacion && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h4 className="font-semibold text-yellow-900 mb-1 flex items-center gap-2">
            <span>⚠️</span>
            <span>Modo Homologación</span>
          </h4>
          <p className="text-sm text-yellow-800">
            Los certificados y facturas generados en este modo son solo para <strong>pruebas</strong>.
            Para emitir facturas oficiales, desmarca esta opción.
          </p>
        </div>
      )}
    </div>
  )
}
