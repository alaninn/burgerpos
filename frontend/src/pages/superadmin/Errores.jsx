// Panel de errores del superadmin: errores de pantalla reportados por los
// usuarios, visor de logs del servidor (en vivo y archivo de pm2) y reporte
// .md descargable o subible a GitHub para que la IA lo diagnostique.
import { useState, useEffect, useRef, useCallback } from 'react'
import api from '../../api/axios'
import toast from 'react-hot-toast'

const NIVEL_COLOR = {
  error: 'text-red-400',
  warn: 'text-yellow-400',
  info: 'text-gray-300',
}

export default function Errores() {
  const [erroresFront, setErroresFront] = useState([])
  const [errorAbierto, setErrorAbierto] = useState(null)
  const [subiendo, setSubiendo] = useState(false)
  const [ultimaSubida, setUltimaSubida] = useState(null)

  // Visor de logs
  const [modoLog, setModoLog] = useState(null) // null | 'vivo' | 'out' | 'error'
  const [lineasVivo, setLineasVivo] = useState([])
  const [archivoLog, setArchivoLog] = useState(null)
  const ultimoIdRef = useRef(0)
  const scrollRef = useRef(null)

  const cargarErrores = useCallback(() => {
    api.get('/superadmin/errores-frontend')
      .then(({ data }) => setErroresFront(data || []))
      .catch(() => toast.error('Error al cargar los errores de pantalla'))
  }, [])

  useEffect(() => { cargarErrores() }, [cargarErrores])

  // Polling del log en vivo
  useEffect(() => {
    if (modoLog !== 'vivo') return
    let activo = true
    const tick = async () => {
      try {
        const { data } = await api.get(`/superadmin/logs/en-vivo?desde=${ultimoIdRef.current}`)
        if (!activo) return
        if (data.lineas?.length) {
          setLineasVivo(prev => [...prev, ...data.lineas].slice(-400))
          ultimoIdRef.current = data.ultimoId
        }
      } catch { /* reintenta en el proximo tick */ }
    }
    tick()
    const intervalo = setInterval(tick, 2000)
    return () => { activo = false; clearInterval(intervalo) }
  }, [modoLog])

  // Autoscroll del visor
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [lineasVivo, archivoLog])

  const verArchivo = async (tipo) => {
    setModoLog(tipo)
    setArchivoLog(null)
    try {
      const { data } = await api.get(`/superadmin/logs/archivo?tipo=${tipo}`)
      setArchivoLog(data)
    } catch {
      toast.error('Error al leer el archivo de log')
    }
  }

  const iniciarVivo = () => {
    setLineasVivo([])
    ultimoIdRef.current = 0
    setModoLog('vivo')
  }

  const descargarReporte = async () => {
    try {
      const res = await api.get('/superadmin/errores/reporte', { responseType: 'blob' })
      const url = URL.createObjectURL(res.data)
      const a = document.createElement('a')
      a.href = url
      a.download = `errores-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.md`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      toast.error('Error al generar el reporte')
    }
  }

  const subirAGithub = async () => {
    setSubiendo(true)
    try {
      const { data } = await api.post('/superadmin/errores/subir-git')
      if (data.vacio) {
        toast.success(data.mensaje)
      } else {
        toast.success(`Reporte subido: ${data.archivo}`)
        setUltimaSubida(data)
        cargarErrores() // las fuentes se limpiaron
        setLineasVivo([])
        ultimoIdRef.current = 0
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al subir el reporte')
    } finally {
      setSubiendo(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header + acciones de reporte */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">🐞 Errores del sistema</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Errores de pantalla reportados por los usuarios y logs del servidor
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={descargarReporte}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition">
            ⬇ Descargar .md
          </button>
          <button onClick={subirAGithub} disabled={subiendo}
            className="px-4 py-2 bg-violet-600 text-white rounded-lg text-sm hover:bg-violet-700 transition disabled:opacity-50">
            {subiendo ? 'Subiendo…' : '⬆ Subir a GitHub'}
          </button>
        </div>
      </div>

      {ultimaSubida && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3 text-sm text-green-800 dark:text-green-300">
          Reporte subido a la rama <b>{ultimaSubida.rama}</b> como <b>{ultimaSubida.archivo}</b>.
          Avisale a la IA: «revisá {ultimaSubida.archivo}».
          {ultimaSubida.url && (
            <a href={ultimaSubida.url} target="_blank" rel="noreferrer" className="ml-2 underline">Ver en GitHub</a>
          )}
        </div>
      )}

      {/* Errores de pantalla */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
            Errores de pantalla ({erroresFront.length})
          </h3>
          <button onClick={cargarErrores} className="text-xs text-violet-600 hover:underline">Actualizar</button>
        </div>
        {erroresFront.length === 0 ? (
          <p className="p-4 text-sm text-gray-500 dark:text-gray-400">Sin errores de pantalla registrados 🎉</p>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-700 max-h-80 overflow-y-auto">
            {erroresFront.map(e => (
              <div key={e.id} className="px-4 py-2.5 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50"
                onClick={() => setErrorAbierto(errorAbierto === e.id ? null : e.id)}>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm text-red-600 dark:text-red-400 font-mono truncate">{e.mensaje}</p>
                  <span className="text-xs text-gray-400 whitespace-nowrap">
                    {new Date(e.createdAt).toLocaleString('es-AR')}
                  </span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {e.negocio?.nombre || 'sin negocio'} · {e.usuario?.nombre || 'anónimo'} · {e.url}
                </p>
                {errorAbierto === e.id && e.stack && (
                  <pre className="mt-2 p-2 bg-gray-900 text-gray-300 rounded text-xs overflow-x-auto whitespace-pre-wrap max-h-48 overflow-y-auto">
                    {e.stack}
                  </pre>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Visor de logs del servidor */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex flex-wrap items-center gap-2">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm mr-auto">Logs del servidor</h3>
          <button onClick={iniciarVivo}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${modoLog === 'vivo' ? 'bg-green-600 text-white' : 'border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
            {modoLog === 'vivo' ? '● En vivo' : 'Iniciar en vivo'}
          </button>
          <button onClick={() => verArchivo('out')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${modoLog === 'out' ? 'bg-violet-600 text-white' : 'border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
            Archivo (salida)
          </button>
          <button onClick={() => verArchivo('error')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${modoLog === 'error' ? 'bg-red-600 text-white' : 'border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
            Archivo (errores)
          </button>
          {modoLog && (
            <button onClick={() => { setModoLog(null); setArchivoLog(null) }}
              className="px-3 py-1.5 rounded-lg text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
              Cerrar
            </button>
          )}
        </div>

        {modoLog && (
          <div ref={scrollRef} className="bg-gray-950 rounded-b-xl p-3 font-mono text-xs max-h-96 overflow-y-auto">
            {modoLog === 'vivo' ? (
              lineasVivo.length === 0 ? (
                <p className="text-gray-500">Esperando actividad del servidor…</p>
              ) : (
                lineasVivo.map(l => (
                  <div key={l.id} className={NIVEL_COLOR[l.nivel] || 'text-gray-300'}>
                    <span className="text-gray-600">[{l.fecha.slice(11, 19)}]</span> {l.mensaje}
                  </div>
                ))
              )
            ) : archivoLog === null ? (
              <p className="text-gray-500">Cargando…</p>
            ) : !archivoLog.disponible ? (
              <p className="text-yellow-500">{archivoLog.mensaje}</p>
            ) : (
              <pre className="text-gray-300 whitespace-pre-wrap">{archivoLog.contenido || '(vacío)'}</pre>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
