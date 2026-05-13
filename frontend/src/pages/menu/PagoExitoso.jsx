import { useEffect } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'

export default function PagoExitoso() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const pedidoId = searchParams.get('external_reference')
  const paymentId = searchParams.get('payment_id')

  useEffect(() => {
    // Redirigir al menú después de 5 segundos
    const timer = setTimeout(() => {
      navigate(`/menu/${slug}`)
    }, 5000)
    return () => clearTimeout(timer)
  }, [slug, navigate])

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: '#0a0a0a' }}>
      <div className="max-w-md w-full text-center">
        {/* Checkmark animado */}
        <div className="mb-6 inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-500 animate-bounce">
          <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <h1 className="text-2xl font-black text-white mb-3">¡Pago exitoso!</h1>
        <p className="text-gray-400 mb-6">
          Tu pedido ha sido confirmado y está siendo preparado.
        </p>

        {pedidoId && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-6">
            <p className="text-xs text-gray-500 mb-1">Número de pedido</p>
            <p className="text-lg font-bold text-white">#{pedidoId}</p>
          </div>
        )}

        {paymentId && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-6">
            <p className="text-xs text-gray-500 mb-1">ID de transacción</p>
            <p className="text-sm font-mono text-gray-300">{paymentId}</p>
          </div>
        )}

        <p className="text-sm text-gray-500 mb-6">
          Serás redirigido al menú en unos segundos...
        </p>

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
