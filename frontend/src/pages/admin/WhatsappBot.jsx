// Asistente de WhatsApp: página dedicada para armar y entrenar el bot que
// responde a los clientes. Nombre propio, tono, reglas, preguntas frecuentes,
// datos extra, conocimiento del menú y un banco de pruebas en vivo.
import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '../../context/AuthContext'
import api from '../../api/axios'
import toast from 'react-hot-toast'

const TONOS = [
  { valor: 'amigable', label: 'Amigable', desc: 'Cercano, como un local de barrio' },
  { valor: 'formal', label: 'Formal', desc: 'Cordial y de usted' },
  { valor: 'breve', label: 'Breve', desc: 'Directo y al grano' },
  { valor: 'divertido', label: 'Divertido', desc: 'Relajado y con humor' },
]

const BOT_DEFAULT = {
  activo: false,
  nombre: '',
  tono: 'amigable',
  saludoInicial: '¡Hola! 👋 Gracias por escribirnos.\n\nMirá nuestro menú y hacé tu pedido acá 👉 {{link_menu}}\n\n_{{nombre_negocio}}_',
  enEspera: 'En breve te va a responder alguien de nuestro equipo. ¡Gracias por tu paciencia! 🙌',
  reglas: '',
  datosExtra: '',
  conocerMenu: false,
  faqs: [],
}

const inputCls = 'w-full px-3 py-2.5 text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-violet-500 resize-y'
const cardCls = 'bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5'

export default function WhatsappBot() {
  const { getNegocioId } = useAuth()
  const negocioId = getNegocioId()

  const [bot, setBot] = useState(BOT_DEFAULT)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Conexión WhatsApp
  const [waStatus, setWaStatus] = useState({ status: 'disconnected', ready: false })
  const [waQr, setWaQr] = useState(null)

  // Banco de pruebas
  const [chat, setChat] = useState([])
  const [chatInput, setChatInput] = useState('')
  const [probando, setProbando] = useState(false)
  const chatEndRef = useRef(null)

  const setCampo = (campo, valor) => setBot(b => ({ ...b, [campo]: valor }))

  // Cargar config del bot + estado de conexión
  useEffect(() => {
    if (!negocioId) return
    let vivo = true
    ;(async () => {
      try {
        const [resBot, resStatus] = await Promise.all([
          api.get(`/negocios/${negocioId}/whatsapp/bot-config`),
          api.get(`/negocios/${negocioId}/whatsapp/status`),
        ])
        if (!vivo) return
        if (resBot.data.bot) setBot({ ...BOT_DEFAULT, ...resBot.data.bot })
        setWaStatus(resStatus.data)
      } catch {
        // silencioso: la página igual funciona con defaults
      } finally {
        if (vivo) setLoading(false)
      }
    })()
    return () => { vivo = false }
  }, [negocioId])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chat])

  const vincularWhatsapp = async () => {
    try {
      toast.loading('Generando código QR...')
      const res = await api.get(`/negocios/${negocioId}/whatsapp/qr`)
      setWaQr(res.data.qr)
      toast.remove()
      // Polling temporal: hasta 60s esperando que se conecte
      let intentos = 0
      const interval = setInterval(async () => {
        intentos++
        if (intentos > 12) { clearInterval(interval); return }
        try {
          const statusRes = await api.get(`/negocios/${negocioId}/whatsapp/status`)
          setWaStatus(statusRes.data)
          if (statusRes.data.ready) {
            clearInterval(interval)
            setWaQr(null)
            toast.success('✅ WhatsApp conectado')
          }
        } catch { clearInterval(interval) }
      }, 5000)
    } catch {
      toast.remove()
      toast.error('Error al generar el código QR')
    }
  }

  const desconectarWhatsapp = async () => {
    try {
      await api.post(`/negocios/${negocioId}/whatsapp/disconnect`)
      setWaStatus({ status: 'disconnected', ready: false })
      setWaQr(null)
      toast.success('WhatsApp desconectado')
    } catch {
      toast.error('Error al desconectar')
    }
  }

  const guardar = async () => {
    setSaving(true)
    try {
      await api.put(`/negocios/${negocioId}/whatsapp/bot-config`, { bot })
      toast.success('Asistente guardado')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al guardar el asistente')
    } finally {
      setSaving(false)
    }
  }

  // FAQs
  const agregarFaq = () => setBot(b => ({ ...b, faqs: [...(b.faqs || []), { pregunta: '', respuesta: '' }] }))
  const cambiarFaq = (i, campo, valor) => setBot(b => {
    const faqs = [...b.faqs]
    faqs[i] = { ...faqs[i], [campo]: valor }
    return { ...b, faqs }
  })
  const quitarFaq = (i) => setBot(b => ({ ...b, faqs: b.faqs.filter((_, j) => j !== i) }))

  // Banco de pruebas: prueba la config ACTUAL del formulario, sin guardar
  const probar = async () => {
    const mensaje = chatInput.trim()
    if (!mensaje || probando) return
    setChat(c => [...c, { rol: 'cliente', texto: mensaje }])
    setChatInput('')
    setProbando(true)
    try {
      const { data } = await api.post(`/negocios/${negocioId}/whatsapp/bot-config/probar`, { mensaje, bot })
      setChat(c => [...c, { rol: 'bot', texto: data.respuesta, derivado: data.derivado, sinIA: data.sinIA }])
    } catch (err) {
      setChat(c => [...c, { rol: 'bot', texto: err.response?.data?.error || 'Error al probar el asistente', error: true }])
    } finally {
      setProbando(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-4 border-violet-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 max-w-3xl">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Asistente de WhatsApp</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Armá un asistente a medida que recibe a tus clientes, responde sus dudas y los deriva al menú.
            Nunca toma pedidos por mensaje, y se calla apenas alguien de tu equipo entra a atender.
          </p>
        </div>
        <button onClick={guardar} disabled={saving}
          className="hidden sm:block flex-shrink-0 px-6 py-2.5 bg-violet-600 text-white rounded-lg text-sm font-semibold hover:bg-violet-700 disabled:opacity-50">
          {saving ? 'Guardando…' : 'Guardar'}
        </button>
      </div>

      <div className="space-y-5">
        {/* Conexión */}
        <div className={cardCls}>
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Conexión de WhatsApp</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">El asistente necesita tu WhatsApp vinculado para responder.</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className={`w-2.5 h-2.5 rounded-full ${waStatus.ready ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
              <span className="text-xs font-medium text-gray-600 dark:text-gray-300">{waStatus.ready ? 'Conectado' : 'Desconectado'}</span>
            </div>
          </div>
          {waQr && !waStatus.ready && (
            <div className="text-center py-3">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">Escaneá este código con WhatsApp → Dispositivos vinculados</p>
              <img src={waQr} alt="QR WhatsApp" className="mx-auto w-44 h-44 rounded-xl border border-gray-300 dark:border-gray-600" />
            </div>
          )}
          {!waStatus.ready && !waQr && (
            <button onClick={vincularWhatsapp} className="w-full py-2.5 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 transition-colors">
              📱 Vincular dispositivo WhatsApp
            </button>
          )}
          {waStatus.ready && (
            <button onClick={desconectarWhatsapp} className="w-full py-2.5 rounded-lg text-sm font-semibold text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors">
              Desconectar WhatsApp
            </button>
          )}
        </div>

        {/* Activación */}
        <div className={cardCls}>
          <label className="flex items-start justify-between gap-4 cursor-pointer">
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Responder automáticamente</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Mientras esté activado, el asistente contesta los mensajes entrantes. Desactivalo para atender solo a mano.
              </p>
            </div>
            <span className="flex items-center gap-2 flex-shrink-0 pt-0.5">
              <input type="checkbox" checked={!!bot.activo} onChange={e => setCampo('activo', e.target.checked)} className="w-5 h-5 accent-violet-600" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{bot.activo ? 'Activado' : 'Apagado'}</span>
            </span>
          </label>
        </div>

        {/* Identidad */}
        <div className={cardCls}>
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">Identidad del asistente</p>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">Nombre <span className="text-gray-400 font-normal">— cómo se presenta ante el cliente</span></label>
              <input value={bot.nombre} onChange={e => setCampo('nombre', e.target.value)} maxLength={40}
                placeholder="Ej: Facu (dejalo vacío para no usar nombre)" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">Tono</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {TONOS.map(t => (
                  <button key={t.valor} type="button" onClick={() => setCampo('tono', t.valor)}
                    className={`text-left px-3 py-2 rounded-lg border text-xs transition-colors ${bot.tono === t.valor ? 'border-violet-500 bg-violet-50 dark:bg-violet-950 ring-1 ring-violet-500' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'}`}>
                    <span className="block font-semibold text-gray-900 dark:text-gray-100">{t.label}</span>
                    <span className="block text-gray-500 dark:text-gray-400 mt-0.5">{t.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Mensajes fijos */}
        <div className={cardCls}>
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">Mensajes fijos</p>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">Saludo inicial <span className="text-gray-400 font-normal">— al primer mensaje del cliente</span></label>
              <textarea value={bot.saludoInicial} onChange={e => setCampo('saludoInicial', e.target.value)} rows={4} className={inputCls} />
              <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1.5">
                Variables: <code className="px-1 py-0.5 rounded bg-gray-100 dark:bg-gray-700">{'{{link_menu}}'}</code> y <code className="px-1 py-0.5 rounded bg-gray-100 dark:bg-gray-700">{'{{nombre_negocio}}'}</code>
              </p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">Mensaje de espera <span className="text-gray-400 font-normal">— cuando no puede resolver la consulta</span></label>
              <textarea value={bot.enEspera} onChange={e => setCampo('enEspera', e.target.value)} rows={3} className={inputCls} />
            </div>
          </div>
        </div>

        {/* Entrenamiento */}
        <div className={cardCls}>
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">Entrenamiento</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
            El asistente ya conoce tus horarios, dirección y formas de pago (los datos de Configuraciones).
            Acá le sumás lo que quieras que sepa y cómo tiene que comportarse.
          </p>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">Reglas de comportamiento</label>
              <textarea value={bot.reglas} onChange={e => setCampo('reglas', e.target.value)} rows={3} maxLength={2000}
                placeholder="Ej: Si preguntan por promos, aclará que son solo en efectivo. Nunca prometas tiempos de entrega exactos." className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">Datos extra del negocio</label>
              <textarea value={bot.datosExtra} onChange={e => setCampo('datosExtra', e.target.value)} rows={3} maxLength={2000}
                placeholder="Ej: Hacemos envíos hasta 3km. Tenemos estacionamiento. Opciones sin TACC bajo pedido." className={inputCls} />
            </div>
            <label className="flex items-start justify-between gap-4 cursor-pointer pt-1">
              <div>
                <p className="text-xs font-medium text-gray-700 dark:text-gray-300">El asistente conoce mi menú</p>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                  Puede decir qué productos tenés, pero para los precios siempre deriva al menú web. Consume un poco más de cuota.
                </p>
              </div>
              <input type="checkbox" checked={!!bot.conocerMenu} onChange={e => setCampo('conocerMenu', e.target.checked)} className="w-5 h-5 accent-violet-600 flex-shrink-0 mt-0.5" />
            </label>
          </div>
        </div>

        {/* Preguntas frecuentes */}
        <div className={cardCls}>
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Preguntas frecuentes</p>
            <span className="text-xs text-gray-400">{bot.faqs?.length || 0}/30</span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
            Cargá las dudas típicas con su respuesta. El asistente las usa como fuente prioritaria.
          </p>
          <div className="space-y-3">
            {(bot.faqs || []).map((faq, i) => (
              <div key={i} className="rounded-lg border border-gray-200 dark:border-gray-700 p-3 bg-gray-50 dark:bg-gray-900/30">
                <div className="flex items-start gap-2">
                  <div className="flex-1 space-y-2">
                    <input value={faq.pregunta} onChange={e => cambiarFaq(i, 'pregunta', e.target.value)} maxLength={500}
                      placeholder="Pregunta (ej: ¿Hacen envíos a Palermo?)" className={inputCls} />
                    <textarea value={faq.respuesta} onChange={e => cambiarFaq(i, 'respuesta', e.target.value)} rows={2} maxLength={500}
                      placeholder="Respuesta (ej: Sí, a Palermo llegamos con $900 de envío)" className={inputCls} />
                  </div>
                  <button onClick={() => quitarFaq(i)} title="Quitar"
                    className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              </div>
            ))}
            {(bot.faqs?.length || 0) < 30 && (
              <button onClick={agregarFaq}
                className="w-full py-2.5 rounded-lg border border-dashed border-gray-300 dark:border-gray-600 text-sm font-medium text-gray-600 dark:text-gray-300 hover:border-violet-400 hover:text-violet-600 transition-colors">
                + Agregar pregunta frecuente
              </button>
            )}
          </div>
        </div>

        {/* Banco de pruebas */}
        <div className={cardCls}>
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">Probar el asistente</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
            Escribí como si fueras un cliente y mirá qué respondería con la configuración de arriba.
            Es una simulación: <strong>no manda nada por WhatsApp</strong> y no hace falta guardar.
          </p>
          <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30 p-3 h-64 overflow-y-auto space-y-2">
            {chat.length === 0 && (
              <p className="text-xs text-gray-400 text-center pt-24">Escribí un mensaje abajo para probar…</p>
            )}
            {chat.map((m, i) => (
              <div key={i} className={`flex ${m.rol === 'cliente' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm whitespace-pre-wrap ${
                  m.rol === 'cliente'
                    ? 'bg-violet-600 text-white rounded-br-sm'
                    : m.error
                      ? 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-bl-sm'
                      : 'bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 border border-gray-200 dark:border-gray-600 rounded-bl-sm'
                }`}>
                  {m.texto}
                  {m.rol === 'bot' && m.derivado && !m.error && (
                    <span className="block mt-1 text-[10px] text-gray-400">
                      {m.sinIA ? '(IA no configurada — mensaje de espera)' : '(derivó a una persona)'}
                    </span>
                  )}
                </div>
              </div>
            ))}
            {probando && (
              <div className="flex justify-start">
                <div className="px-3 py-2 rounded-2xl bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600">
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
          <div className="flex gap-2 mt-3">
            <input value={chatInput} onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') probar() }}
              placeholder="Escribí como cliente…" className={inputCls} />
            <button onClick={probar} disabled={probando || !chatInput.trim()}
              className="px-5 py-2.5 bg-violet-600 text-white rounded-lg text-sm font-medium hover:bg-violet-700 disabled:opacity-50 flex-shrink-0">
              Enviar
            </button>
          </div>
        </div>

        {/* Guardar al final */}
        <button onClick={guardar} disabled={saving}
          className="w-full py-3 bg-violet-600 text-white rounded-lg text-sm font-semibold hover:bg-violet-700 disabled:opacity-50">
          {saving ? 'Guardando…' : 'Guardar asistente'}
        </button>
      </div>
    </div>
  )
}
