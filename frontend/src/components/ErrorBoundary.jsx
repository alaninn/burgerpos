// Red de seguridad: si un error de render rompe la app, en vez de quedar
// la pantalla en blanco muestra el error, lo reporta al servidor y ofrece
// opciones de recuperacion.
import React from 'react'
import { reportarErrorFrontend } from '../utils/reporteErrores'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('Error de render capturado:', error, info?.componentStack)
    reportarErrorFrontend(
      String(error?.message || error),
      String(info?.componentStack || error?.stack || '')
    )
  }

  recargar = () => {
    window.location.reload()
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 text-center space-y-4">
            <div className="text-5xl">😵</div>
            <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">Algo salió mal</h1>
            <p className="text-sm text-gray-500">
              Ocurrió un error inesperado en la pantalla. El error ya fue reportado
              automáticamente. Probá recargar la página.
            </p>
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-left">
              <p className="text-xs font-mono text-red-700 break-all">
                {String(this.state.error?.message || this.state.error)}
              </p>
            </div>
            <button onClick={this.recargar}
              className="w-full py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-lg font-semibold transition-colors">
              🔄 Recargar
            </button>
            <p className="text-xs text-gray-400">
              Si el problema persiste, avisá por soporte indicando qué estabas haciendo.
            </p>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

export default ErrorBoundary
