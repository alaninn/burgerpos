import { useState, useEffect } from 'react'
import api from '../api/axios'
import toast from 'react-hot-toast'

export default function MercadoPagoOAuthSection({ metodoActivo, onStatusChange }) {
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState(null)

  useEffect(() => {
    if (metodoActivo) {
      loadStatus()
    }

    // Escuchar mensajes del popup OAuth
    const handleMessage = (event) => {
      if (event.data.type === 'mp_oauth_success') {
        toast.success('¡Cuenta vinculada exitosamente!')
        loadStatus()
        onStatusChange?.(true)
      } else if (event.data.type === 'mp_oauth_error') {
        toast.error('Error vinculando cuenta: ' + (event.data.error || 'Desconocido'))
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [metodoActivo])

  const loadStatus = async () => {
    try {
      const { data } = await api.get('/mercadopago/oauth/status')
      setStatus(data)
    } catch (error) {
      console.error('Error cargando estado:', error)
    }
  }

  const handleVincular = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/mercadopago/oauth/authorize')

      // Abrir popup centrado
      const width = 600
      const height = 700
      const left = (window.screen.width / 2) - (width / 2)
      const top = (window.screen.height / 2) - (height / 2)

      const popup = window.open(
        data.authUrl,
        'MercadoPago OAuth',
        `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no,scrollbars=yes,resizable=yes`
      )

      if (!popup) {
        toast.error('Popup bloqueado. Permitir popups para este sitio.')
        setLoading(false)
        return
      }

      // Polling para detectar cierre del popup
      const checkClosed = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkClosed)
          loadStatus()
          setLoading(false)
        }
      }, 500)
    } catch (error) {
      toast.error(error.response?.data?.error || 'Error iniciando vinculación')
      setLoading(false)
    }
  }

  const handleDesvincular = async () => {
    if (!confirm('¿Seguro que querés desvincular tu cuenta de MercadoPago?\n\nTus clientes no podrán pagar con MercadoPago hasta que vuelvas a vincular.')) {
      return
    }

    try {
      await api.post('/mercadopago/oauth/unlink')
      toast.success('Cuenta desvinculada')
      setStatus({ vinculado: false, credential: null })
      onStatusChange?.(false)
    } catch (error) {
      toast.error('Error desvinculando cuenta')
    }
  }

  if (!metodoActivo) {
    return (
      <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg text-sm text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700">
        ⚠️ Activá el método de pago MercadoPago para configurar la vinculación
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <h4 className="font-semibold text-sm text-blue-900 dark:text-blue-200 mb-3 flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
          Vinculación con MercadoPago
        </h4>

        {status?.vinculado ? (
          <div className="space-y-3">
            {/* Estado vinculado */}
            <div className="flex items-center gap-2 text-green-700 dark:text-green-400 mb-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="font-semibold">✅ Cuenta vinculada correctamente</span>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg p-3 text-xs space-y-1.5 border border-gray-200 dark:border-gray-700">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Public Key:</span>
                <span className="font-mono text-gray-900 dark:text-white">{status.credential.publicKey}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Usuario MP:</span>
                <span className="font-semibold text-gray-900 dark:text-white">{status.credential.userId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Ambiente:</span>
                <span className={`font-semibold ${status.credential.entornoProduccion ? 'text-green-600' : 'text-orange-600'}`}>
                  {status.credential.entornoProduccion ? '🟢 Producción' : '🟠 Sandbox'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Vinculado el:</span>
                <span className="text-gray-900 dark:text-white">{new Date(status.credential.createdAt).toLocaleDateString('es-AR')}</span>
              </div>
            </div>

            <button
              onClick={handleDesvincular}
              className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Desvincular cuenta
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {/* No vinculado */}
            <p className="text-sm text-blue-700 dark:text-blue-300">
              Hacé clic en el botón para vincular tu cuenta de MercadoPago de forma segura.
              <strong> No necesitás ingresar credenciales manualmente.</strong>
            </p>

            <button
              onClick={handleVincular}
              disabled={loading}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white text-sm font-bold rounded-lg transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Abriendo vinculación...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                  Vincular cuenta de MercadoPago
                </>
              )}
            </button>

            <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded text-xs text-yellow-800 dark:text-yellow-300">
              <div className="flex gap-2">
                <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <div>
                  <strong>Seguridad:</strong> Nunca guardamos tu contraseña de MercadoPago.
                  La vinculación se realiza mediante OAuth, el mismo estándar de seguridad utilizado por Google, Facebook y otros servicios.
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
