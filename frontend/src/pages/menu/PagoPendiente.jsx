import { useEffect } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'

export default function PagoPendiente() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const pedidoId = searchParams.get('external_reference')

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate(`/menu/${slug}`)
    }, 7000)
    return () => clearTimeout(timer)
  }, [slug, navigate])

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: '#0a0a0a' }}>
      <div className="max-w-md w-full text-center">
        {/* Reloj animado */}
        <div className="mb-6 inline-flex items-center justify-center w-20 h-20 rounded-full bg-yellow-500">
          <svg className="w-12 h-12 text-white animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>

        <h1 className="text-2xl font-black text-white mb-3">Pago pendiente</h1>
        <p className="text-gray-400 mb-6">
          Tu pago está siendo procesado. Te notificaremos cuando se confirme.
        </p>

        {pedidoId && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-6">
            <p className="text-xs text-gray-500 mb-1">Número de pedido</p>
            <p className="text-lg font-bold text-white">#{pedidoId}</p>
          </div>
        )}

        <div className="bg-yellow-900/20 border border-yellow-800 rounded-xl p-4 mb-6">
          <p className="text-sm text-yellow-300">
            Este tipo de pago puede demorar hasta 48 horas en procesarse.
            Recibirás una notificación cuando se confirme.
          </p>
        </div>

        <button
          onClick={() => navigate(`/menu/${slug}`)}
          className="w-full py-3 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-xl transition-colors"
        >
          Volver al menú
        </button>
      </div>
    </div>
  )
}
