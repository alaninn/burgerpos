import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'

/* ─── Google Fonts + Custom Styles ──────────────────────────────── */
const GlobalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@300;400;500;600&display=swap');

    :root {
      --orange: #f97316;
      --amber:  #fbbf24;
      --bg:     #080808;
      --surface:#111111;
      --card:   #181818;
      --border: rgba(255,255,255,0.07);
      --text:   #f0ebe4;
      --muted:  #6b6b6b;
    }

    .landing * { box-sizing: border-box; }
    .landing { font-family: 'DM Sans', sans-serif; background: var(--bg); color: var(--text); overflow-x: hidden; }
    .display { font-family: 'Syne', sans-serif; }

    /* Grain overlay */
    .landing::before {
      content: '';
      position: fixed; inset: 0;
      background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E");
      pointer-events: none; z-index: 9999; opacity: 0.4;
    }

    /* Glow blob */
    .hero-glow {
      position: absolute; top: -20%; left: 50%;
      transform: translateX(-50%);
      width: 900px; height: 600px;
      background: radial-gradient(ellipse, rgba(249,115,22,0.12) 0%, transparent 70%);
      pointer-events: none;
    }

    /* Animated underline */
    .highlight {
      background: linear-gradient(135deg, var(--orange), var(--amber));
      -webkit-background-clip: text; -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    /* Float animation */
    @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
    @keyframes floatR { 0%,100%{transform:translateY(0) rotate(2deg)} 50%{transform:translateY(-8px) rotate(-1deg)} }
    @keyframes pulse-orange { 0%,100%{box-shadow:0 0 0 0 rgba(249,115,22,0.3)} 50%{box-shadow:0 0 0 20px rgba(249,115,22,0)} }
    @keyframes slide-up { from{opacity:0;transform:translateY(40px)} to{opacity:1;transform:translateY(0)} }
    @keyframes counter { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
    @keyframes shimmer { 0%{background-position:-200% center} 100%{background-position:200% center} }

    .float-1 { animation: float 4s ease-in-out infinite; }
    .float-2 { animation: floatR 5s ease-in-out infinite 0.5s; }
    .float-3 { animation: float 6s ease-in-out infinite 1s; }

    .hero-animate { animation: slide-up 0.8s ease forwards; opacity: 0; }
    .hero-animate-1 { animation-delay: 0.1s; }
    .hero-animate-2 { animation-delay: 0.25s; }
    .hero-animate-3 { animation-delay: 0.4s; }
    .hero-animate-4 { animation-delay: 0.55s; }

    /* Card hover */
    .feature-card {
      border: 1px solid var(--border);
      background: var(--card);
      transition: all 0.3s ease;
    }
    .feature-card:hover {
      border-color: rgba(249,115,22,0.3);
      transform: translateY(-4px);
      box-shadow: 0 20px 40px rgba(249,115,22,0.08);
    }
    .feature-card:hover .feature-icon { transform: scale(1.15) rotate(-5deg); }
    .feature-icon { transition: transform 0.3s ease; display: inline-block; }

    /* Nav link */
    .nav-link {
      position: relative; color: var(--muted); transition: color 0.2s;
      font-size: 0.875rem; letter-spacing: 0.02em;
    }
    .nav-link::after {
      content: ''; position: absolute; bottom: -4px; left: 0; width: 0; height: 1px;
      background: var(--orange); transition: width 0.3s ease;
    }
    .nav-link:hover { color: var(--text); }
    .nav-link:hover::after { width: 100%; }

    /* Orange button */
    .btn-orange {
      background: linear-gradient(135deg, #f97316, #ea580c);
      color: #fff; font-weight: 600;
      transition: all 0.2s ease;
      position: relative; overflow: hidden;
    }
    .btn-orange::before {
      content: ''; position: absolute; inset: 0;
      background: linear-gradient(135deg, rgba(255,255,255,0.15), transparent);
      opacity: 0; transition: opacity 0.2s;
    }
    .btn-orange:hover { transform: translateY(-1px); box-shadow: 0 8px 25px rgba(249,115,22,0.35); }
    .btn-orange:hover::before { opacity: 1; }
    .btn-orange:active { transform: translateY(0); }

    /* Ghost button */
    .btn-ghost {
      border: 1px solid var(--border); color: var(--text);
      transition: all 0.2s ease; background: transparent;
    }
    .btn-ghost:hover { border-color: rgba(249,115,22,0.4); background: rgba(249,115,22,0.05); }

    /* Stat card */
    .stat-card {
      border: 1px solid var(--border); background: var(--card);
      transition: border-color 0.3s;
    }
    .stat-card:hover { border-color: rgba(249,115,22,0.25); }

    /* Diagonal separator */
    .diagonal-sep {
      position: relative;
    }
    .diagonal-sep::before {
      content: '';
      position: absolute; top: -1px; left: 0; right: 0;
      height: 80px;
      background: var(--bg);
      clip-path: polygon(0 0, 100% 0, 100% 30%, 0 100%);
    }

    /* FAQ */
    .faq-item { border-bottom: 1px solid var(--border); }
    .faq-item:last-child { border-bottom: none; }

    /* Scroll reveal */
    .reveal { opacity: 0; transform: translateY(30px); transition: all 0.6s ease; }
    .reveal.visible { opacity: 1; transform: translateY(0); }
    .reveal-delay-1 { transition-delay: 0.1s; }
    .reveal-delay-2 { transition-delay: 0.2s; }
    .reveal-delay-3 { transition-delay: 0.3s; }
    .reveal-delay-4 { transition-delay: 0.4s; }
    .reveal-delay-5 { transition-delay: 0.5s; }
    .reveal-delay-6 { transition-delay: 0.6s; }

    /* Mock UI */
    .mock-bar { background: #1a1a1a; border-bottom: 1px solid #2a2a2a; }
    .mock-sidebar { background: #111; border-right: 1px solid #222; }
    .mock-card-a { background: #1e1e1e; border: 1px solid #2a2a2a; border-radius: 8px; }
    .mock-card-b { background: rgba(249,115,22,0.08); border: 1px solid rgba(249,115,22,0.2); border-radius: 8px; }

    /* Step connector */
    .step-connector { position: relative; }
    .step-connector::after {
      content: '';
      position: absolute; top: 24px; left: calc(50% + 40px);
      width: calc(100% - 80px);
      height: 1px;
      background: linear-gradient(90deg, rgba(249,115,22,0.4), rgba(249,115,22,0.1));
    }

    /* Navbar scroll effect */
    .navbar { transition: all 0.3s ease; }
    .navbar.scrolled { background: rgba(8,8,8,0.95) !important; backdrop-filter: blur(20px); }

    /* Tag badge */
    .tag-badge {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 4px 12px; border-radius: 999px;
      border: 1px solid rgba(249,115,22,0.3);
      background: rgba(249,115,22,0.08);
      color: #fb923c; font-size: 0.75rem; font-weight: 500;
      letter-spacing: 0.04em;
    }

    /* Pricing card */
    .pricing-popular {
      background: linear-gradient(145deg, rgba(249,115,22,0.1), rgba(251,191,36,0.05));
      border: 1px solid rgba(249,115,22,0.3);
      position: relative;
    }
    .pricing-popular::before {
      content: '';
      position: absolute; inset: -1px;
      background: linear-gradient(135deg, rgba(249,115,22,0.3), transparent, rgba(251,191,36,0.2));
      border-radius: inherit;
      z-index: -1;
    }

    /* WhatsApp button */
    .btn-wa {
      background: #25d366;
      transition: all 0.2s ease;
    }
    .btn-wa:hover { background: #1ebe59; transform: translateY(-2px); box-shadow: 0 8px 25px rgba(37,211,102,0.3); }

    /* Ticker text */
    @keyframes ticker { 0% { transform: translateX(0) } 100% { transform: translateX(-50%) } }
    .ticker-track { animation: ticker 20s linear infinite; white-space: nowrap; }
    .ticker-track:hover { animation-play-state: paused; }

    /* Scrollbar */
    .landing ::-webkit-scrollbar { width: 4px; }
    .landing ::-webkit-scrollbar-track { background: var(--bg); }
    .landing ::-webkit-scrollbar-thumb { background: #2a2a2a; border-radius: 2px; }
  `}</style>
)

/* ─── Intersection Observer Hook ─────────────────────────────────── */
function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll('.reveal')
    const obs = new IntersectionObserver(
      entries => entries.forEach(e => e.isIntersecting && e.target.classList.add('visible')),
      { threshold: 0.1 }
    )
    els.forEach(el => obs.observe(el))
    return () => obs.disconnect()
  }, [])
}

/* ─── Counter animation ───────────────────────────────────────────── */
function useCounter(target, duration = 1500) {
  const [count, setCount] = useState(0)
  const ref = useRef(null)
  const started = useRef(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !started.current) {
        started.current = true
        const start = Date.now()
        const tick = () => {
          const elapsed = Date.now() - start
          const progress = Math.min(elapsed / duration, 1)
          const ease = 1 - Math.pow(1 - progress, 3)
          setCount(Math.floor(ease * target))
          if (progress < 1) requestAnimationFrame(tick)
        }
        requestAnimationFrame(tick)
      }
    }, { threshold: 0.5 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [target, duration])

  return [count, ref]
}

/* ─── Stat ─────────────────────────────────────────────────────────── */
function Stat({ value, suffix = '', label }) {
  const [count, ref] = useCounter(value)
  return (
    <div ref={ref} className="stat-card rounded-2xl p-6 text-center">
      <div className="display text-4xl font-bold highlight mb-1">
        {count}{suffix}
      </div>
      <div className="text-sm" style={{ color: 'var(--muted)' }}>{label}</div>
    </div>
  )
}

/* ─── Mock POS UI ──────────────────────────────────────────────────── */
function MockUI() {
  const pedidos = [
    { num: 42, cliente: 'Martín G.', items: 'Doble + Papas', total: '$5.200', estado: 'nuevo', modal: 'Delivery' },
    { num: 43, cliente: 'Ana R.', items: 'Crispy + Coca', total: '$4.100', estado: 'prep', modal: 'Take Away' },
    { num: 44, cliente: 'Carlos M.', items: 'BBQ Bacon x2', total: '$11.000', estado: 'listo', modal: 'Salón' },
  ]
  const cols = [
    { label: 'Nuevos', color: '#3b82f6', items: [pedidos[0]] },
    { label: 'En cocina', color: '#f59e0b', items: [pedidos[1]] },
    { label: 'Listos', color: '#22c55e', items: [pedidos[2]] },
  ]
  return (
    <div style={{ background: '#0c0c0c', borderRadius: '16px', overflow: 'hidden', border: '1px solid #222', height: '340px' }}>
      {/* Window bar */}
      <div className="mock-bar flex items-center gap-2 px-4 py-3">
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ff5f57' }} />
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#febc2e' }} />
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#28c840' }} />
        <div style={{ flex: 1, textAlign: 'center' }}>
          <span style={{ fontSize: '11px', color: '#555', background: '#1a1a1a', padding: '2px 12px', borderRadius: 4 }}>
            Panel de Pedidos — Burger Demo
          </span>
        </div>
        <div style={{ width: 10 }} />
      </div>
      {/* Content */}
      <div style={{ display: 'flex', height: 'calc(100% - 41px)' }}>
        {/* Sidebar mini */}
        <div className="mock-sidebar" style={{ width: 48, display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 12, gap: 10 }}>
          {['🍔', '📋', '📊', '👥', '⚙️'].map((icon, i) => (
            <div key={i} style={{ fontSize: 16, opacity: i === 0 ? 1 : 0.3, cursor: 'pointer' }}>{icon}</div>
          ))}
        </div>
        {/* Kanban */}
        <div style={{ flex: 1, padding: '12px 10px', display: 'flex', gap: 8, overflow: 'hidden' }}>
          {cols.map(col => (
            <div key={col.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: col.color, display: 'inline-block' }} />
                {col.label} ({col.items.length})
              </div>
              {col.items.map(p => (
                <div key={p.num} className="mock-card-a" style={{ padding: '8px 10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#f0ebe4' }}>N°{p.num}</span>
                    <span style={{ fontSize: 9, color: col.color, background: `${col.color}22`, padding: '1px 6px', borderRadius: 4 }}>{p.modal}</span>
                  </div>
                  <div style={{ fontSize: 10, color: '#888', marginBottom: 2 }}>{p.cliente}</div>
                  <div style={{ fontSize: 10, color: '#555' }}>{p.items}</div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#f97316', marginTop: 6 }}>{p.total}</div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ─── ChatBot ─────────────────────────────────────────────────────── */
function ChatBot() {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState([
    { from: 'bot', text: '¡Hola! 👋 Soy el asistente de BurgerPOS. ¿En qué puedo ayudarte?' }
  ])
  const chatRef = useRef(null)

  const RESPUESTAS = {
    precio: 'Los planes comienzan desde precios accesibles. Tenemos plan Estándar y Premium. ¡Contactanos por WhatsApp para conocer los precios actuales!',
    plan: 'Estándar incluye panel de pedidos, menú, clientes y reportes. Premium agrega facturación ARCA, monitor de cocina y más. ¿Cuál te interesa?',
    pedido: 'Gestionás pedidos de delivery, take away y salón en tiempo real desde un panel kanban. Los estados se actualizan al instante.',
    factura: 'La facturación electrónica con ARCA (ex AFIP) está disponible en el plan Premium.',
    contacto: 'Podés contactarnos por WhatsApp haciendo click en el botón naranja 👇',
    demo: 'Podés probar el sistema con nuestra cuenta demo: demo@burgerpos.com / admin123',
    default: 'Gracias por tu consulta. Para más información detallada, contactanos por WhatsApp y te respondemos al instante. ¡Estamos activos! 🔥'
  }

  const responder = (texto) => {
    const lower = texto.toLowerCase()
    if (lower.includes('precio') || lower.includes('costo') || lower.includes('vale') || lower.includes('cuanto')) return RESPUESTAS.precio
    if (lower.includes('plan') || lower.includes('premium') || lower.includes('estandar')) return RESPUESTAS.plan
    if (lower.includes('pedido')) return RESPUESTAS.pedido
    if (lower.includes('factura') || lower.includes('arca') || lower.includes('afip')) return RESPUESTAS.factura
    if (lower.includes('demo') || lower.includes('probar') || lower.includes('prueba')) return RESPUESTAS.demo
    if (lower.includes('contacto') || lower.includes('contactar') || lower.includes('whatsapp')) return RESPUESTAS.contacto
    return RESPUESTAS.default
  }

  const enviar = () => {
    if (!input.trim()) return
    const userMsg = { from: 'user', text: input }
    const botMsg = { from: 'bot', text: responder(input) }
    setMessages(m => [...m, userMsg, botMsg])
    setInput('')
    setTimeout(() => {
      if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight
    }, 50)
  }

  return (
    <>
      <button onClick={() => setOpen(!open)}
        className="btn-orange"
        style={{
          position: 'fixed', bottom: 24, right: 24,
          width: 52, height: 52, borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, border: 'none', cursor: 'pointer',
          animation: open ? 'none' : 'pulse-orange 2.5s ease infinite'
        }}>
        {open
          ? <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
          : <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
        }
      </button>

      {open && (
        <div style={{
          position: 'fixed', bottom: 88, right: 24, width: 320, height: 420,
          background: '#141414', borderRadius: 20, border: '1px solid rgba(249,115,22,0.2)',
          display: 'flex', flexDirection: 'column', zIndex: 1000,
          boxShadow: '0 25px 60px rgba(0,0,0,0.6), 0 0 40px rgba(249,115,22,0.08)'
        }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,#f97316,#ea580c)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>🍔</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>BurgerPOS</div>
              <div style={{ fontSize: 11, color: '#22c55e', display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
                En línea
              </div>
            </div>
          </div>

          <div ref={chatRef} style={{ flex: 1, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {messages.map((m, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: m.from === 'user' ? 'flex-end' : 'flex-start' }}>
                <div style={{
                  maxWidth: '80%', padding: '8px 12px', borderRadius: m.from === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                  fontSize: 12.5, lineHeight: 1.5,
                  background: m.from === 'user' ? 'linear-gradient(135deg,#f97316,#ea580c)' : '#1f1f1f',
                  color: m.from === 'user' ? '#fff' : 'var(--text)',
                  border: m.from === 'bot' ? '1px solid rgba(255,255,255,0.05)' : 'none'
                }}>
                  {m.text}
                </div>
              </div>
            ))}
          </div>

          <div style={{ padding: '10px 12px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', gap: 8 }}>
            <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && enviar()}
              placeholder="Escribí tu pregunta..."
              style={{
                flex: 1, padding: '8px 12px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.08)',
                background: '#1a1a1a', color: 'var(--text)', fontSize: 12.5, outline: 'none',
                fontFamily: 'inherit'
              }} />
            <button onClick={enviar} className="btn-orange"
              style={{ width: 36, height: 36, borderRadius: 10, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
            </button>
          </div>
        </div>
      )}
    </>
  )
}

/* ─── FAQ ─────────────────────────────────────────────────────────── */
const FAQ_DATA = [
  { q: '¿Cómo funciona el sistema?', a: 'Es un panel de gestión online. Desde ahí manejás tus pedidos, menú, clientes y repartidores en tiempo real con actualizaciones instantáneas vía WebSocket.' },
  { q: '¿Puedo usarlo desde el celular?', a: 'Sí, el sistema es responsive y funciona desde cualquier dispositivo con internet. El monitor de cocina y el panel de pedidos son perfectos en tablets.' },
  { q: '¿Qué pasa si no tengo conocimientos de sistemas?', a: 'El panel es muy intuitivo. Además te acompañamos en la configuración inicial sin costo adicional y con soporte por WhatsApp.' },
  { q: '¿Puedo cambiar de plan?', a: 'Sí, podés cambiar de plan estándar a premium en cualquier momento sin perder ningún dato ni historial.' },
  { q: '¿Incluye factura electrónica?', a: 'El plan premium incluye integración con ARCA (ex AFIP) para emitir facturas electrónicas A, B y C directamente desde el sistema.' },
  { q: '¿Hay contrato de permanencia?', a: 'No. Es un servicio mensual sin contrato de permanencia. Podés cancelar cuando quieras sin penalidades.' },
]

function FaqItem({ item, index, open, toggle }) {
  return (
    <div className="faq-item" style={{ padding: '4px 0' }}>
      <button onClick={toggle}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '18px 0', background: 'none', border: 'none', cursor: 'pointer',
          textAlign: 'left', gap: 16
        }}>
        <span style={{ fontSize: '0.95rem', fontWeight: 500, color: open ? '#f97316' : 'var(--text)', transition: 'color 0.2s', lineHeight: 1.4 }}>
          {item.q}
        </span>
        <span style={{
          width: 24, height: 24, borderRadius: 6, border: '1px solid rgba(255,255,255,0.1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          background: open ? 'rgba(249,115,22,0.15)' : 'transparent',
          borderColor: open ? 'rgba(249,115,22,0.3)' : 'rgba(255,255,255,0.1)',
          transition: 'all 0.2s'
        }}>
          <svg width="12" height="12" fill="none" stroke={open ? '#f97316' : '#666'} viewBox="0 0 24 24"
            style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
          </svg>
        </span>
      </button>
      {open && (
        <div style={{ fontSize: '0.875rem', color: 'var(--muted)', lineHeight: 1.7, paddingBottom: 18, animation: 'slide-up 0.2s ease' }}>
          {item.a}
        </div>
      )}
    </div>
  )
}

/* ─── Main Landing ────────────────────────────────────────────────── */
export default function Landing() {
  const [faqAbierta, setFaqAbierta] = useState(null)
  const [scrolled, setScrolled] = useState(false)
  useReveal()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const FEATURES = [
    { icon: '📋', title: 'Panel Kanban', desc: 'Nuevos → En cocina → Listo → En camino. Cada pedido en su lugar, en tiempo real.' },
    { icon: '🛵', title: 'Delivery & Repartidores', desc: 'Asigná repartidores, definí zonas y calculá el costo de envío automáticamente.' },
    { icon: '📊', title: 'Reportes y caja', desc: 'Facturación por método de pago, apertura y cierre de caja, exportación a Excel.' },
    { icon: '🍔', title: 'Gestión de menú', desc: 'Categorías, productos, imágenes y precios. Tu menú público QR incluido.' },
    { icon: '👥', title: 'Clientes & CRM', desc: 'Historial de pedidos, datos de contacto y dirección por cliente.' },
    { icon: '🖥️', title: 'Monitor de cocina', desc: 'Pantalla KDS en tiempo real para el equipo de cocina. Pantalla completa.' },
  ]

  const STEPS = [
    { n: '01', title: 'Te registrás', desc: 'Contactanos por WhatsApp. En menos de 24 h tu panel está listo con tu marca.' },
    { n: '02', title: 'Cargás tu menú', desc: 'Agregás categorías, productos con fotos y precios desde el panel de gestión.' },
    { n: '03', title: 'Empezás a vender', desc: 'Compartís el link QR y gestionás pedidos desde el panel en tiempo real.' },
  ]

  const TICKER_ITEMS = ['Pedidos en tiempo real', 'Menú QR sin app', 'Repartidores', 'Facturación ARCA', 'Monitor de cocina', 'Reportes Excel', 'Caja diaria', 'Descuentos y cupones']

  return (
    <div className="landing">
      <GlobalStyles />

      {/* ── NAVBAR ────────────────────────────────────────────── */}
      <nav className={`navbar ${scrolled ? 'scrolled' : ''}`}
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
          borderBottom: scrolled ? '1px solid rgba(255,255,255,0.06)' : '1px solid transparent',
          background: scrolled ? undefined : 'transparent'
        }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: 'linear-gradient(135deg,#f97316,#ea580c)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17 }}>🍔</div>
            <span className="display" style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em' }}>BurgerPOS</span>
          </div>
          {/* Links */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 32 }} className="hidden md:flex">
            {['#caracteristicas', '#como-funciona', '#precios', '#faq'].map((href, i) => (
              <a key={i} href={href} className="nav-link">
                {['Características', 'Cómo funciona', 'Precios', 'FAQ'][i]}
              </a>
            ))}
          </div>
          {/* CTA */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Link to="/login" className="nav-link" style={{ fontSize: '0.875rem' }}>Ingresar</Link>
            <a href="https://wa.me/5491100000000?text=Hola!%20Quiero%20info%20sobre%20BurgerPOS"
              target="_blank" rel="noreferrer"
              className="btn-orange"
              style={{ padding: '8px 18px', borderRadius: 10, fontSize: '0.85rem', fontWeight: 600, textDecoration: 'none', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              Empezar →
            </a>
          </div>
        </div>
      </nav>

      {/* ── HERO ──────────────────────────────────────────────── */}
      <section style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', paddingTop: 80, position: 'relative', overflow: 'hidden' }}>
        <div className="hero-glow" />

        {/* Big background text */}
        <div className="display" style={{
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          fontSize: 'clamp(100px, 18vw, 240px)', fontWeight: 800, color: 'rgba(255,255,255,0.02)',
          letterSpacing: '-0.05em', whiteSpace: 'nowrap', userSelect: 'none', pointerEvents: 'none',
          zIndex: 0
        }}>BURGER</div>

        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 60, alignItems: 'center' }}>
            {/* Left */}
            <div>
              <div className="hero-animate hero-animate-1 tag-badge" style={{ marginBottom: 24, display: 'inline-flex' }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', flexShrink: 0 }} />
                Sistema SaaS gastronómico
              </div>

              <h1 className="display hero-animate hero-animate-2"
                style={{ fontSize: 'clamp(40px, 5vw, 68px)', fontWeight: 800, lineHeight: 1.05, letterSpacing: '-0.03em', marginBottom: 24, color: 'var(--text)' }}>
                El panel que tu<br />
                <span className="highlight">hamburguesería</span><br />
                estaba esperando.
              </h1>

              <p className="hero-animate hero-animate-3" style={{ fontSize: '1.1rem', color: 'var(--muted)', lineHeight: 1.7, marginBottom: 36, maxWidth: 440 }}>
                Pedidos, delivery, take away, cocina, reportes y menú QR — todo desde un solo panel. Sin papeles, sin confusión.
              </p>

              <div className="hero-animate hero-animate-4" style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <a href="https://wa.me/5491100000000?text=Hola!%20Quiero%20probar%20BurgerPOS"
                  target="_blank" rel="noreferrer"
                  className="btn-orange"
                  style={{ padding: '14px 28px', borderRadius: 12, fontSize: '0.95rem', fontWeight: 600, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 8, border: 'none', cursor: 'pointer' }}>
                  <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                  Empezar por WhatsApp
                </a>
                <Link to="/login"
                  className="btn-ghost"
                  style={{ padding: '14px 24px', borderRadius: 12, fontSize: '0.95rem', fontWeight: 500, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  Ya tengo cuenta
                </Link>
              </div>

              {/* Trust badges */}
              <div className="hero-animate hero-animate-4" style={{ marginTop: 36, display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
                {['⚡ Configuración en 24h', '🔒 Sin contrato', '📱 Funciona en celular'].map(b => (
                  <span key={b} style={{ fontSize: '0.8rem', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 4 }}>{b}</span>
                ))}
              </div>
            </div>

            {/* Right — Mock UI */}
            <div className="hero-animate hero-animate-3" style={{ position: 'relative' }}>
              {/* Floating cards */}
              <div className="float-2" style={{
                position: 'absolute', top: -24, right: -12, zIndex: 2,
                background: '#1a1a1a', border: '1px solid rgba(249,115,22,0.2)', borderRadius: 12,
                padding: '10px 14px', fontSize: 12, color: 'var(--text)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.4)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e' }} />
                  <span style={{ fontSize: 11, color: '#666' }}>Nuevo pedido</span>
                </div>
                <div style={{ fontWeight: 600, color: '#f97316' }}>N°47 — $6.200</div>
                <div style={{ fontSize: 11, color: '#555', marginTop: 2 }}>Doble BBQ + Papas + Coca</div>
              </div>

              <div className="float-3" style={{
                position: 'absolute', bottom: -16, left: -16, zIndex: 2,
                background: '#1a1a1a', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 12,
                padding: '10px 14px',
                boxShadow: '0 8px 32px rgba(0,0,0,0.4)'
              }}>
                <div style={{ fontSize: 11, color: '#666', marginBottom: 4 }}>Facturación hoy</div>
                <div className="display" style={{ fontSize: 22, fontWeight: 800, color: '#22c55e' }}>$127.400</div>
                <div style={{ fontSize: 10, color: '#555', marginTop: 2 }}>↑ 18% vs. ayer</div>
              </div>

              <MockUI />
            </div>
          </div>
        </div>
      </section>

      {/* ── TICKER ────────────────────────────────────────────── */}
      <div style={{ borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', overflow: 'hidden', padding: '14px 0', background: 'rgba(249,115,22,0.03)' }}>
        <div className="ticker-track" style={{ display: 'inline-flex', gap: 0 }}>
          {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, i) => (
            <span key={i} style={{ padding: '0 32px', fontSize: '0.8rem', fontWeight: 500, color: 'var(--muted)', letterSpacing: '0.06em', textTransform: 'uppercase', borderRight: '1px solid var(--border)', whiteSpace: 'nowrap' }}>
              {i % 2 === 0 ? <span style={{ color: '#f97316', marginRight: 8 }}>✦</span> : null}
              {item}
            </span>
          ))}
        </div>
      </div>

      {/* ── STATS ─────────────────────────────────────────────── */}
      <section style={{ padding: '80px 24px', maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
          <Stat value={500} suffix="+" label="Pedidos procesados por día" />
          <Stat value={98} suffix="%" label="Uptime del sistema" />
          <Stat value={24} suffix="h" label="Configuración inicial" />
          <Stat value={3} suffix="min" label="Tiempo promedio de pedido" />
        </div>
      </section>

      {/* ── FEATURES ──────────────────────────────────────────── */}
      <section id="caracteristicas" style={{ padding: '80px 24px', background: 'var(--surface)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div className="reveal" style={{ textAlign: 'center', marginBottom: 56 }}>
            <div className="tag-badge" style={{ marginBottom: 16, display: 'inline-flex' }}>Características</div>
            <h2 className="display" style={{ fontSize: 'clamp(28px, 4vw, 48px)', fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.1, marginBottom: 16 }}>
              Todo lo que necesitás,<br /><span className="highlight">sin lo que no necesitás.</span>
            </h2>
            <p style={{ color: 'var(--muted)', fontSize: '1rem', maxWidth: 480, margin: '0 auto', lineHeight: 1.7 }}>
              Pensado especialmente para hamburgueserías y locales gastronómicos de Argentina.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            {FEATURES.map((f, i) => (
              <div key={i} className={`feature-card reveal reveal-delay-${(i % 3) + 1}`}
                style={{ borderRadius: 16, padding: '28px 24px' }}>
                <div className="feature-icon" style={{ fontSize: 32, marginBottom: 16 }}>{f.icon}</div>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 8, color: 'var(--text)' }}>{f.title}</h3>
                <p style={{ fontSize: '0.875rem', color: 'var(--muted)', lineHeight: 1.7 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ──────────────────────────────────────── */}
      <section id="como-funciona" style={{ padding: '100px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div className="reveal" style={{ textAlign: 'center', marginBottom: 64 }}>
            <div className="tag-badge" style={{ marginBottom: 16, display: 'inline-flex' }}>Proceso</div>
            <h2 className="display" style={{ fontSize: 'clamp(28px, 4vw, 48px)', fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.1 }}>
              En 3 pasos, <span className="highlight">ya estás vendiendo.</span>
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 40, position: 'relative' }}>
            {/* Connector line */}
            <div style={{
              position: 'absolute', top: 28, left: '22%', right: '22%', height: 1,
              background: 'linear-gradient(90deg, rgba(249,115,22,0.5), rgba(249,115,22,0.2), rgba(249,115,22,0.5))'
            }} />

            {STEPS.map((s, i) => (
              <div key={i} className={`reveal reveal-delay-${i + 1}`} style={{ textAlign: 'center' }}>
                <div style={{
                  width: 56, height: 56, borderRadius: '50%', margin: '0 auto 20px',
                  background: 'linear-gradient(135deg, rgba(249,115,22,0.2), rgba(249,115,22,0.05))',
                  border: '1px solid rgba(249,115,22,0.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', zIndex: 1
                }}>
                  <span className="display" style={{ fontSize: '0.8rem', fontWeight: 800, color: '#f97316' }}>{s.n}</span>
                </div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: 10, color: 'var(--text)' }}>{s.title}</h3>
                <p style={{ fontSize: '0.875rem', color: 'var(--muted)', lineHeight: 1.7 }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ───────────────────────────────────────────── */}
      <section id="precios" style={{ padding: '100px 24px', background: 'var(--surface)' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div className="reveal" style={{ textAlign: 'center', marginBottom: 56 }}>
            <div className="tag-badge" style={{ marginBottom: 16, display: 'inline-flex' }}>Precios</div>
            <h2 className="display" style={{ fontSize: 'clamp(28px, 4vw, 48px)', fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.1, marginBottom: 12 }}>
              Simple. Claro. <span className="highlight">Sin sorpresas.</span>
            </h2>
            <p style={{ color: 'var(--muted)', fontSize: '0.95rem' }}>Sin costos ocultos. Cancelá cuando quieras.</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            {/* Estándar */}
            <div className="reveal reveal-delay-1" style={{ borderRadius: 20, padding: 32, border: '1px solid var(--border)', background: 'var(--card)' }}>
              <div style={{ marginBottom: 24 }}>
                <h3 className="display" style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: 4, color: 'var(--text)' }}>Estándar</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>Todo lo necesario para empezar</p>
              </div>
              <div style={{ marginBottom: 28 }}>
                <span className="display" style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text)' }}>Consultá</span>
                <span style={{ fontSize: '0.85rem', color: 'var(--muted)', marginLeft: 6 }}>precio</span>
              </div>
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 28px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {['Panel de pedidos kanban', 'Delivery + Take Away + Salón', 'Gestión de menú con fotos', 'Repartidores y clientes', 'Reportes y caja diaria', 'Soporte por WhatsApp'].map(f => (
                  <li key={f} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.875rem', color: 'var(--text)' }}>
                    <svg width="16" height="16" fill="none" stroke="#f97316" viewBox="0 0 24 24" style={{ flexShrink: 0 }}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                    {f}
                  </li>
                ))}
              </ul>
              <a href="https://wa.me/5491100000000?text=Hola!%20Quiero%20el%20plan%20Estandar%20de%20BurgerPOS" target="_blank" rel="noreferrer"
                className="btn-ghost"
                style={{ display: 'block', textAlign: 'center', padding: '13px 20px', borderRadius: 12, fontWeight: 600, fontSize: '0.9rem', textDecoration: 'none' }}>
                Empezar con Estándar
              </a>
            </div>

            {/* Premium */}
            <div className="reveal reveal-delay-2 pricing-popular" style={{ borderRadius: 20, padding: 32, position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 16, right: 16, background: 'linear-gradient(135deg,#f97316,#ea580c)', color: '#fff', fontSize: '0.7rem', fontWeight: 700, padding: '3px 10px', borderRadius: 999, letterSpacing: '0.06em' }}>
                ⭐ MÁS ELEGIDO
              </div>
              <div style={{ marginBottom: 24 }}>
                <h3 className="display" style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: 4, color: 'var(--text)' }}>Premium</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>Para negocios más exigentes</p>
              </div>
              <div style={{ marginBottom: 28 }}>
                <span className="display" style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text)' }}>Consultá</span>
                <span style={{ fontSize: '0.85rem', color: 'var(--muted)', marginLeft: 6 }}>precio</span>
              </div>
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 28px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {['Todo el plan Estándar', 'Facturación ARCA (A, B y C)', 'Monitor de cocina KDS', 'Descuentos y cupones', 'Stock avanzado', 'Soporte prioritario 24/7'].map(f => (
                  <li key={f} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.875rem', color: 'var(--text)' }}>
                    <svg width="16" height="16" fill="none" stroke="#fbbf24" viewBox="0 0 24 24" style={{ flexShrink: 0 }}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                    {f}
                  </li>
                ))}
              </ul>
              <a href="https://wa.me/5491100000000?text=Hola!%20Quiero%20el%20plan%20Premium%20de%20BurgerPOS" target="_blank" rel="noreferrer"
                className="btn-orange"
                style={{ display: 'block', textAlign: 'center', padding: '13px 20px', borderRadius: 12, fontWeight: 600, fontSize: '0.9rem', textDecoration: 'none', border: 'none', cursor: 'pointer' }}>
                Empezar con Premium →
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ───────────────────────────────────────────────── */}
      <section id="faq" style={{ padding: '100px 24px' }}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <div className="reveal" style={{ textAlign: 'center', marginBottom: 56 }}>
            <div className="tag-badge" style={{ marginBottom: 16, display: 'inline-flex' }}>FAQ</div>
            <h2 className="display" style={{ fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.1 }}>
              Preguntas <span className="highlight">frecuentes.</span>
            </h2>
          </div>

          <div className="reveal" style={{ border: '1px solid var(--border)', borderRadius: 20, background: 'var(--card)', padding: '8px 28px' }}>
            {FAQ_DATA.map((item, i) => (
              <FaqItem key={i} item={item} index={i}
                open={faqAbierta === i}
                toggle={() => setFaqAbierta(faqAbierta === i ? null : i)}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA FINAL ─────────────────────────────────────────── */}
      <section style={{ padding: '100px 24px', background: 'var(--surface)', position: 'relative', overflow: 'hidden' }}>
        {/* Glow */}
        <div style={{
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          width: 600, height: 400, pointerEvents: 'none',
          background: 'radial-gradient(ellipse, rgba(249,115,22,0.1) 0%, transparent 70%)'
        }} />
        <div className="reveal" style={{ maxWidth: 700, margin: '0 auto', textAlign: 'center', position: 'relative' }}>
          <div style={{ fontSize: 56, marginBottom: 20 }}>🍔</div>
          <h2 className="display" style={{ fontSize: 'clamp(32px, 5vw, 56px)', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.05, marginBottom: 20 }}>
            ¿Listo para <span className="highlight">digitalizar</span><br />tu negocio?
          </h2>
          <p style={{ color: 'var(--muted)', fontSize: '1rem', lineHeight: 1.7, marginBottom: 36, maxWidth: 480, margin: '0 auto 36px' }}>
            Contactanos por WhatsApp y en menos de 24 horas tu panel está configurado, con tu menú cargado y listo para recibir pedidos.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href="https://wa.me/5491100000000?text=Hola!%20Quiero%20info%20sobre%20BurgerPOS"
              target="_blank" rel="noreferrer"
              className="btn-wa"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '16px 32px', borderRadius: 14, color: '#fff', fontWeight: 700, fontSize: '1rem', textDecoration: 'none', border: 'none', cursor: 'pointer' }}>
              <svg width="22" height="22" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              Contactar por WhatsApp
            </a>
            <Link to="/login"
              className="btn-ghost"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '16px 24px', borderRadius: 14, fontWeight: 600, fontSize: '0.95rem', textDecoration: 'none' }}>
              Ver demo →
            </Link>
          </div>
        </div>
      </section>

      {/* ── FOOTER ────────────────────────────────────────────── */}
      <footer style={{ borderTop: '1px solid var(--border)', padding: '32px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg,#f97316,#ea580c)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>🍔</div>
            <span className="display" style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text)' }}>BurgerPOS</span>
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>© {new Date().getFullYear()} BurgerPOS. Todos los derechos reservados.</p>
          <Link to="/login" style={{ fontSize: '0.8rem', color: '#f97316', textDecoration: 'none', opacity: 0.7 }}>
            Acceso administradores
          </Link>
        </div>
      </footer>

      {/* ── CHATBOT ───────────────────────────────────────────── */}
      <ChatBot />
    </div>
  )
}
