// Soporte del negocio: enviar consultas al equipo de la plataforma y ver
// las respuestas.
import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../context/AuthContext'
import api from '../../api/axios'
import toast from 'react-hot-toast'

const ESTADO_LABEL = { abierto: 'Enviado', en_proceso: 'En proceso', resuelto: 'Respondido' }
const ESTADO_COLOR = {
  abierto: 'bg-blue-100 text-blue-700',
  en_proceso: 'bg-amber-100 text-amber-700',
  resuelto: 'bg-green-100 text-green-700',
}

export default function Soporte() {
  const { getNegocioId } = useAuth()
  const [tickets, setTickets] = useState([])
  const [form, setForm] = useState({ asunto: '', mensaje: '' })
  const [enviando, setEnviando] = useState(false)
  const [loading, setLoading] = useState(true)

  const cargar = useCallback(() => {
    const negocioId = getNegocioId()
    api.get(`/negocios/${negocioId}/soporte`)
      .then(({ data }) => setTickets(data.tickets || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [getNegocioId])

  useEffect(() => { cargar() }, [cargar])

  const enviar = async () => {
    if (!form.asunto.trim()) return toast.error('Escribí un asunto')
    if (!form.mensaje.trim()) return toast.error('Contanos qué necesitás')
    setEnviando(true)
    try {
      const negocioId = getNegocioId()
      await api.post(`/negocios/${negocioId}/soporte`, form)
      toast.success('Consulta enviada, te respondemos a la brevedad')
      setForm({ asunto: '', mensaje: '' })
      cargar()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al enviar la consulta')
    } finally { setEnviando(false) }
  }

  return (
    <div className="p-4 md:p-6 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Soporte</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          ¿Tenés un problema o una consulta? Escribinos y te respondemos acá mismo.
        </p>
      </div>

      {/* Nueva consulta */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 mb-6">
        <div className="space-y-3">
          <input value={form.asunto} onChange={e => setForm(f => ({ ...f, asunto: e.target.value }))}
            placeholder="Asunto (ej: no puedo cargar productos)"
            className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
          <textarea value={form.mensaje} onChange={e => setForm(f => ({ ...f, mensaje: e.target.value }))}
            rows={4} placeholder="Contanos el problema con el mayor detalle posible…"
            className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none" />
          <div className="flex justify-end">
            <button onClick={enviar} disabled={enviando}
              className="px-6 py-2.5 bg-violet-600 text-white rounded-lg text-sm font-medium hover:bg-violet-700 disabled:opacity-50">
              {enviando ? 'Enviando…' : 'Enviar consulta'}
            </button>
          </div>
        </div>
      </div>

      {/* Historial */}
      <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Tus consultas</h2>
      {loading ? (
        <div className="flex items-center justify-center py-10">
          <div className="w-6 h-6 border-4 border-violet-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : tickets.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">Todavía no enviaste ninguna consulta.</p>
      ) : (
        <div className="space-y-3">
          {tickets.map(t => (
            <div key={t.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
              <div className="flex items-center justify-between gap-3 mb-1">
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{t.asunto}</p>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${ESTADO_COLOR[t.estado]}`}>
                  {ESTADO_LABEL[t.estado] || t.estado}
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">{new Date(t.createdAt).toLocaleString('es-AR')}</p>
              <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{t.mensaje}</p>
              {t.respuesta && (
                <div className="mt-3 p-3 bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded-lg">
                  <p className="text-xs font-semibold text-green-800 dark:text-green-300 mb-1">Respuesta del equipo</p>
                  <p className="text-sm text-green-900 dark:text-green-200 whitespace-pre-wrap">{t.respuesta}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
