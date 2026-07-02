// Reporte automatico de errores de pantalla al servidor.
// Con dedupe simple para no inundar el backend si un error se repite en loop.

const reportados = new Set()

export function reportarErrorFrontend(mensaje, stack) {
  try {
    if (!mensaje) return
    // No reportar el mismo mensaje mas de una vez por sesion de pagina
    const clave = String(mensaje).slice(0, 200)
    if (reportados.has(clave)) return
    if (reportados.size > 20) return // tope por sesion
    reportados.add(clave)

    const token = localStorage.getItem('token')
    fetch('/api/salud/error-frontend', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        mensaje: String(mensaje).slice(0, 1000),
        stack: String(stack || '').slice(0, 4000),
        url: window.location.href,
      }),
    }).catch(() => {})
  } catch { /* nunca romper por el propio reporte */ }
}

/** Captura global: errores JS no manejados y promesas rechazadas */
export function instalarCapturaGlobal() {
  window.addEventListener('error', (ev) => {
    reportarErrorFrontend(ev.message || String(ev.error), ev.error?.stack)
  })
  window.addEventListener('unhandledrejection', (ev) => {
    const razon = ev.reason
    // Ignorar errores de red/HTTP de axios (ya se manejan con toasts en la UI)
    if (razon?.isAxiosError) return
    reportarErrorFrontend(
      razon?.message || String(razon),
      razon?.stack
    )
  })
}
