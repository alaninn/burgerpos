import { useParams, useNavigate } from 'react-router-dom'

export default function PagoFallido() {
  const { slug } = useParams()
  const navigate = useNavigate()

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: '#0a0a0a' }}>
      <div className="max-w-md w-full text-center">
        {/* X animada */}
        <div className="mb-6 inline-flex items-center justify-center w-20 h-20 rounded-full bg-red-500">
          <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>

        <h1 className="text-2xl font-black text-white mb-3">Pago rechazado</h1>
        <p className="text-gray-400 mb-6">
          Hubo un problema al procesar tu pago. Por favor, intentá nuevamente.
        </p>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-6 text-left">
          <p className="text-xs font-semibold text-gray-400 mb-2">Posibles causas:</p>
          <ul className="text-sm text-gray-300 space-y-1 list-disc list-inside">
            <li>Fondos insuficientes</li>
            <li>Tarjeta rechazada por el banco</li>
            <li>Datos incorrectos</li>
            <li>Límite de compra excedido</li>
          </ul>
        </div>

        <div className="space-y-3">
          <button
            onClick={() => navigate(`/menu/${slug}`)}
            className="w-full py-3 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-xl transition-colors"
          >
            Intentar con otro método
          </button>

          <button
            onClick={() => window.location.reload()}
            className="w-full py-3 bg-gray-800 hover:bg-gray-700 text-white font-bold rounded-xl transition-colors"
          >
            Reintentar pago
          </button>
        </div>

        <p className="text-xs text-gray-500 mt-6">
          Si el problema persiste, contactá con el local directamente.
        </p>
      </div>
    </div>
  )
}
