// Superadmin > Soporte: tickets enviados por los negocios, con respuesta
// y cambio de estado.
import { useState, useEffect, useCallback } from 'react'
import api from '../../api/axios'
import toast from 'react-hot-toast'

const ESTADO_LABEL = { abierto: 'Abierto', en_proceso: 'En proceso', resuelto: 'Resuelto' }
const ESTADO_COLOR = {
  abierto: 'bg-red-100 text-red-700',
  en_proceso: 'bg-amber-100 text-amber-700',
  resuelto: 'bg-green-100 text-green-700',
}

export default function Soporte() {
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState('todos')
  const [abierto, setAbierto] = useState(null)
  const [respuesta, setRespuesta] = useState('')
  const [guardando, setGuardando] = useState(false)

  const cargar = useCallback(() => {
    setLoading(true)
    const q = filtro === 'todos' ? '' : `?estado=${filtro}`
    api.get(`/superadmin/tickets${q}`)
      .then(({ data }) => setTickets(data.tickets || []))
      .catch(() => toast.error('Error al cargar tickets'))
      .finally(() => setLoading(false))
  }, [filtro])

  useEffect(() => { cargar() }, [cargar])

  const responder = async (ticket, estado) => {
    setGuardando(true)
    try {
      await api.put(`/superadmin/tickets/${ticket.id}`, {
        estado,
        ...(respuesta.trim() ? { respuesta: respuesta.trim() } : {}),
      })
      toast.success(estado === 'resuelto' ? 'Ticket resuelto' : 'Ticket actualizado')
      setAbierto(null)
      setRespuesta('')
      cargar()
    } catch { toast.error('Error al actualizar el ticket') }
    finally { setGuardando(false) }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Soporte</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">Tickets enviados por los negocios</p>
        </div>
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 p-1 rounded-xl">
          {['todos', 'abierto', 'en_proceso', 'resuelto'].map(f => (
            <button key={f} onClick={() => setFiltro(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filtro === f ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-100'}`}>
              {f === 'todos' ? 'Todos' : ESTADO_LABEL[f]}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : tickets.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
          <p className="text-3xl mb-2">🎉</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">No hay tickets {filtro !== 'todos' ? `en estado "${ESTADO_LABEL[filtro]}"` : ''}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tickets.map(t => (
            <div key={t.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="px-5 py-3.5 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50"
                onClick={() => { setAbierto(abierto === t.id ? null : t.id); setRespuesta(t.respuesta || '') }}>
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{t.asunto}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ESTADO_COLOR[t.estado]}`}>{ESTADO_LABEL[t.estado]}</span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {t.negocio?.nombre || 'Negocio'} · {t.usuario?.nombre || 'usuario'} · {new Date(t.createdAt).toLocaleString('es-AR')}
                    </p>
                  </div>
                  <svg className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform ${abierto === t.id ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>

              {abierto === t.id && (
                <div className="px-5 pb-4 border-t border-gray-100 dark:border-gray-700 pt-3">
                  <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap mb-3">{t.mensaje}</p>
                  {t.respuesta && t.estado === 'resuelto' && (
                    <div className="mb-3 p-3 bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded-lg">
                      <p className="text-xs font-semibold text-green-800 dark:text-green-300 mb-1">Respuesta enviada</p>
                      <p className="text-sm text-green-900 dark:text-green-200 whitespace-pre-wrap">{t.respuesta}</p>
                    </div>
                  )}
                  <textarea value={respuesta} onChange={e => setRespuesta(e.target.value)}
                    rows={3} placeholder="Escribí la respuesta para el negocio…"
                    className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none mb-2" />
                  <div className="flex justify-end gap-2">
                    <button onClick={() => responder(t, 'en_proceso')} disabled={guardando}
                      className="px-4 py-2 border border-amber-300 text-amber-700 rounded-lg text-sm hover:bg-amber-50 disabled:opacity-50">
                      Marcar en proceso
                    </button>
                    <button onClick={() => responder(t, 'resuelto')} disabled={guardando}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50">
                      {guardando ? 'Guardando…' : 'Responder y resolver'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
