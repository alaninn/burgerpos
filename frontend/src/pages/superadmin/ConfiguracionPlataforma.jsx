import { useState, useEffect } from 'react'
import api from '../../api/axios'
import toast from 'react-hot-toast'

export default function ConfiguracionPlataforma() {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [config, setConfig] = useState({
    clientId: '',
    clientSecret: '',
    redirectUri: 'http://localhost:3001/api/mercadopago/oauth/callback'
  })

  useEffect(() => {
    loadConfig()
  }, [])

  const loadConfig = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/platform-config/mercadopago')
      setConfig({
        clientId: data.clientId || '',
        clientSecret: '', // No devolver el secret por seguridad
        redirectUri: data.redirectUri || 'http://localhost:3001/api/mercadopago/oauth/callback'
      })
    } catch (error) {
      console.error('Error cargando configuración:', error)
      toast.error('Error cargando configuración')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!config.clientId || !config.redirectUri) {
      toast.error('Client ID y Redirect URI son requeridos')
      return
    }

    setSaving(true)
    try {
      await api.post('/platform-config/mercadopago', config)
      toast.success('Configuración guardada exitosamente')

      // Limpiar el campo de Client Secret después de guardar
      setConfig(prev => ({ ...prev, clientSecret: '' }))
    } catch (error) {
      console.error('Error guardando:', error)
      toast.error(error.response?.data?.error || 'Error guardando configuración')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">Configuración de Plataforma</h1>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
        Configuración global de servicios de pago para todos los negocios
      </p>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 max-w-2xl border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
            <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">MercadoPago OAuth</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">Aplicación OAuth para vinculación automática</p>
          </div>
        </div>

        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Client ID
            </label>
            <input
              type="text"
              value={config.clientId}
              onChange={(e) => setConfig({ ...config, clientId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-violet-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
              placeholder="123456789"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Client Secret
            </label>
            <input
              type="password"
              value={config.clientSecret}
              onChange={(e) => setConfig({ ...config, clientSecret: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-violet-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
              placeholder="••••••••••••••••"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Dejá vacío para mantener el secret actual
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Redirect URI
            </label>
            <input
              type="text"
              value={config.redirectUri}
              onChange={(e) => setConfig({ ...config, redirectUri: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-violet-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-white font-mono text-sm"
              placeholder="https://tudominio.com/api/mercadopago/oauth/callback"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Esta URL debe estar configurada en tu aplicación de MercadoPago
            </p>
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-violet-600 hover:bg-violet-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Guardar Configuración
              </>
            )}
          </button>
        </div>

        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <h3 className="font-semibold text-sm text-blue-900 dark:text-blue-200 mb-2 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Instrucciones
          </h3>
          <ol className="text-sm text-blue-800 dark:text-blue-300 space-y-2 list-decimal list-inside">
            <li>Ingresá a <a href="https://www.mercadopago.com.ar/developers/panel/app" target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-600">MercadoPago Developers</a></li>
            <li>Creá una nueva aplicación OAuth</li>
            <li>Copiá el <strong>Client ID</strong> y <strong>Client Secret</strong></li>
            <li>Configurá la <strong>Redirect URI</strong> en MercadoPago con la URL de arriba</li>
            <li>Guardá la configuración aquí</li>
          </ol>
          <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded text-xs text-yellow-800 dark:text-yellow-300">
            <strong>⚠️ Importante:</strong> La Redirect URI debe coincidir exactamente con la configurada en MercadoPago (incluyendo http/https y puerto).
          </div>
        </div>
      </div>
    </div>
  )
}
