import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import api from '../../api/axios'
import toast from 'react-hot-toast'
import EditorZonasMapa from '../../components/EditorZonasMapa'
import MercadoPagoOAuthSection from '../../components/MercadoPagoOAuthSection'
import ModalMapaGPS from '../../components/ModalMapaGPS'

// Genera UUID compatible con HTTP (sin crypto.randomUUID que requiere HTTPS)
function generateSessionToken() {
  return Date.now().toString(36) + '-' + Math.random().toString(36).substr(2, 9)
}

const TABS = ['Modalidades', 'Pedidos', 'Horarios', 'Métodos de pago', 'Zonas de entrega', 'Redes sociales', 'Marketing', 'Integraciones', 'Mapa de pedidos']

// Tipografias disponibles para el menu publico (todas de Google Fonts, se
// cargan dinamicamente segun la elegida - ver buildStyles en MenuPublico.jsx).
const TIPOGRAFIAS = [
  { nombre: 'Inter', grupo: 'Modernas' }, { nombre: 'Roboto', grupo: 'Modernas' },
  { nombre: 'Open Sans', grupo: 'Modernas' }, { nombre: 'Lato', grupo: 'Modernas' },
  { nombre: 'Work Sans', grupo: 'Modernas' }, { nombre: 'Manrope', grupo: 'Modernas' },
  { nombre: 'DM Sans', grupo: 'Modernas' }, { nombre: 'Rubik', grupo: 'Modernas' },
  { nombre: 'Sora', grupo: 'Modernas' }, { nombre: 'Outfit', grupo: 'Modernas' },
  { nombre: 'Plus Jakarta Sans', grupo: 'Modernas' }, { nombre: 'Urbanist', grupo: 'Modernas' },
  { nombre: 'Figtree', grupo: 'Modernas' }, { nombre: 'Mulish', grupo: 'Modernas' },
  { nombre: 'Karla', grupo: 'Modernas' },
  { nombre: 'Poppins', grupo: 'Redondeadas y amigables' }, { nombre: 'Nunito', grupo: 'Redondeadas y amigables' },
  { nombre: 'Quicksand', grupo: 'Redondeadas y amigables' }, { nombre: 'Comfortaa', grupo: 'Redondeadas y amigables' },
  { nombre: 'Baloo 2', grupo: 'Redondeadas y amigables' }, { nombre: 'Fredoka', grupo: 'Redondeadas y amigables' },
  { nombre: 'Montserrat', grupo: 'Con carácter' }, { nombre: 'Oswald', grupo: 'Con carácter' },
  { nombre: 'Raleway', grupo: 'Con carácter' }, { nombre: 'Bebas Neue', grupo: 'Con carácter' },
  { nombre: 'Anton', grupo: 'Con carácter' }, { nombre: 'Archivo Black', grupo: 'Con carácter' },
  { nombre: 'Playfair Display', grupo: 'Elegantes' }, { nombre: 'Merriweather', grupo: 'Elegantes' },
  { nombre: 'Lora', grupo: 'Elegantes' }, { nombre: 'Libre Baskerville', grupo: 'Elegantes' },
  { nombre: 'Pacifico', grupo: 'Divertidas' }, { nombre: 'Caveat', grupo: 'Divertidas' },
  { nombre: 'Dancing Script', grupo: 'Divertidas' },
]
const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

const METODOS_CONFIG = [
  { label: 'Efectivo',           icon: '💵' },
  { label: 'Mercado Pago',       icon: '💰' },
  { label: 'Tarjeta de crédito', icon: '💳' },
  { label: 'Tarjeta de débito',  icon: '💳' },
  { label: 'Transferencia',      icon: '🏧' },
]
// Solo se cobran presencialmente (no tiene sentido delivery/salón con posnet)
const METODOS_SOLO_TAKEAWAY = ['tarjeta_de_crédito', 'tarjeta_credito', 'tarjeta_de_débito', 'tarjeta_debito']

function getMetodoKey(label) {
  return label.toLowerCase().replace(/\s+/g, '_').replace(/\+/g, 'plus')
}

function defaultMetodoPago() {
  return { activo: false, nombrePersonalizado: '', disponibleEn: ['delivery', 'takeaway', 'salon'], ajuste: 'ninguno', tipoAjuste: 'porcentaje', valorAjuste: 0, oculto: false, alias: '', titularCuenta: '' }
}

function normalizeMetodoPago(val) {
  if (!val) return defaultMetodoPago()
  if (typeof val === 'boolean') return { ...defaultMetodoPago(), activo: val }
  return { ...defaultMetodoPago(), ...val }
}

function ModalEditarNegocio({ negocio, onClose, onSaved }) {
  const [form, setForm] = useState({
    nombre: negocio?.nombre || '',
    slug: negocio?.slug || '',
    telefono: negocio?.telefono || '',
    provincia: negocio?.configuracion?.provincia || '',
    ciudad: negocio?.ciudad || '',
    direccion: negocio?.direccion || '',
    logo: negocio?.logo || '',
    lat: negocio?.configuracion?.lat || null,
    lng: negocio?.configuracion?.lng || null,
    colorPrimario: negocio?.configuracion?.colorPrimario || '#7C3AED',
    tipografia: negocio?.configuracion?.tipografia || 'Inter',
    descripcion: negocio?.configuracion?.descripcion || '',
    mensajeBienvenida: negocio?.configuracion?.mensajeBienvenida || '',
    imagenPortada: negocio?.configuracion?.imagenPortada || '',
    imagenFondo: negocio?.configuracion?.imagenFondo || '',
    opacidadFondo: negocio?.configuracion?.opacidadFondo ?? 85,
  })
  const [uploading, setUploading] = useState(null)
  const [saving, setSaving] = useState(false)
  const logoRef = useRef()
  const portadaRef = useRef()
  const fondoRef = useRef()
  const [modalMapaDir, setModalMapaDir] = useState(false)

  // Carga dinamicamente la tipografia elegida (Google Fonts) para poder
  // mostrar la vista previa con la fuente real, no un texto generico.
  useEffect(() => {
    const href = `https://fonts.googleapis.com/css2?family=${form.tipografia.replace(/ /g, '+')}:wght@400;600;700&display=swap`
    let link = document.getElementById('preview-tipografia-link')
    if (!link) {
      link = document.createElement('link')
      link.id = 'preview-tipografia-link'
      link.rel = 'stylesheet'
      document.head.appendChild(link)
    }
    link.href = href
  }, [form.tipografia])

  const abrirMapaDireccion = () => {
    // Intentar obtener GPS o usar coords previas o centro default
    if (navigator.geolocation && !form.lat) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setModalMapaDir({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => setModalMapaDir(form.lat ? { lat: form.lat, lng: form.lng } : { lat: -34.6037, lng: -58.3816 })
      )
    } else {
      setModalMapaDir(form.lat ? { lat: form.lat, lng: form.lng } : { lat: -34.6037, lng: -58.3816 })
    }
  }

  const confirmarDireccionMapa = (coords, dirDetectada) => {
    setModalMapaDir(false)
    setForm(f => ({ ...f, lat: coords.lat, lng: coords.lng }))
    toast.success('✅ Coordenadas GPS guardadas correctamente')
  }

  const subirImagen = async (e, campo) => {
    const file = e.target.files[0]
    if (!file) return
    setUploading(campo)
    try {
      const fd = new FormData()
      fd.append('imagen', file)
      const { data } = await api.post('/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      setForm(f => ({ ...f, [campo]: data.url }))
      toast.success('Imagen subida')
    } catch { toast.error('Error al subir la imagen') }
    finally { setUploading(null) }
  }

  const guardar = async () => {
    if (!form.nombre.trim()) return toast.error('El nombre es obligatorio')
    if (!form.slug.trim()) return toast.error('El link de la tienda es obligatorio')
    if (/\s/.test(form.slug)) return toast.error('El link no puede contener espacios')
    setSaving(true)
    try {
      const { nombre, slug, telefono, direccion, ciudad, logo, provincia, colorPrimario, tipografia, descripcion, mensajeBienvenida, imagenPortada, imagenFondo, opacidadFondo } = form
      const nuevaConfig = {
        ...(negocio.configuracion || {}),
        provincia, colorPrimario, tipografia, descripcion,
        mensajeBienvenida, imagenPortada, imagenFondo, opacidadFondo,
        ...(form.lat != null ? { lat: form.lat, lng: form.lng } : {}),
      }
      await api.put(`/negocios/${negocio.id}`, { nombre, slug, telefono, direccion, ciudad, logo, configuracion: nuevaConfig })
      toast.success('Datos actualizados')
      onSaved({ nombre, slug, telefono, direccion, ciudad, logo, configuracion: nuevaConfig })
      onClose()
    } catch { toast.error('Error al guardar') }
    finally { setSaving(false) }
  }

  const inputCls = "w-full px-3 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-3 md:p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full md:max-w-lg flex flex-col"
        style={{ maxHeight: '92vh' }}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-4 md:px-6 py-3 md:py-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div>
            <h3 className="font-bold text-sm md:text-base text-gray-900 dark:text-gray-100">Configurar tienda</h3>
            <p className="text-[10px] md:text-xs text-gray-500 dark:text-gray-400">Carga los datos de tu negocio.</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
            <svg className="w-4 h-4 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body scrollable */}
        <div className="flex-1 overflow-y-auto px-4 md:px-6 py-4 md:py-5 space-y-4 md:space-y-6">

          {/* Datos básicos */}
          <div className="space-y-3">
            {/* Nombre */}
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Nombre *</label>
              <input value={form.nombre} onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))}
                placeholder="Mi hamburguesería" className={inputCls} />
            </div>

            {/* Link de la tienda (slug) */}
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Link de la tienda *</label>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 dark:text-gray-400">{window.location.hostname}/menu/</span>
                <input
                  value={form.slug}
                  onChange={e => {
                    const value = e.target.value.replace(/\s/g, '-').toLowerCase()
                    setForm(p => ({ ...p, slug: value }))
                  }}
                  placeholder="qrban-burger"
                  className={`flex-1 ${inputCls}`}
                />
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Sin espacios. Ejemplo: qrban-burger
              </p>
            </div>

            {/* Teléfono */}
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Teléfono</label>
              <input value={form.telefono} onChange={e => setForm(p => ({ ...p, telefono: e.target.value }))}
                placeholder="+54 9 11 0000-0000" className={inputCls} />
            </div>

            {/* Provincia */}
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Provincia</label>
              <input value={form.provincia} onChange={e => setForm(f => ({ ...f, provincia: e.target.value }))}
                placeholder="Buenos Aires" className={inputCls} />
            </div>

            {/* Localidad */}
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Localidad</label>
              <input value={form.ciudad} onChange={e => setForm(f => ({ ...f, ciudad: e.target.value }))}
                placeholder="Florencio Varela" className={inputCls} />
            </div>

            {/* Dirección manual + mapa GPS */}
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Dirección</label>
              <input
                value={form.direccion}
                onChange={e => setForm(f => ({ ...f, direccion: e.target.value }))}
                placeholder="Ej: Estados Unidos de América 3125"
                className={inputCls}
              />
              <button
                type="button"
                onClick={abrirMapaDireccion}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-semibold mt-2 transition-all border"
                style={{ background: 'rgba(124,58,237,0.08)', borderColor: 'rgba(124,58,237,0.3)', color: '#7c3aed' }}>
                <span>📍</span> Seleccionar ubicación en el mapa
              </button>
              {form.lat && form.lng && (
                <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                  ✓ Coordenadas GPS guardadas ({form.lat.toFixed(6)}, {form.lng.toFixed(6)})
                </p>
              )}
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                ℹ️ <strong>Importante:</strong> Complete ambos campos. La dirección escrita es la que se mostrará en los pedidos. La ubicación del mapa se usa solo para marcar la posición aproximada.
              </p>
            </div>
          </div>

          <div className="border-t border-gray-100 dark:border-gray-700" />

          {/* Apariencia */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100">Apariencia del menú</h4>

            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                Color principal de {negocio?.nombre}:
              </label>
              <div className="flex items-center gap-3">
                <input type="color" value={form.colorPrimario}
                  onChange={e => setForm(f => ({ ...f, colorPrimario: e.target.value }))}
                  className="w-10 h-10 rounded-full cursor-pointer border-0 bg-transparent p-0.5"
                />
                <input value={form.colorPrimario}
                  onChange={e => setForm(f => ({ ...f, colorPrimario: e.target.value }))}
                  placeholder="#7C3AED"
                  className={`flex-1 ${inputCls} font-mono`} />
              </div>
              <p className="text-xs text-gray-400 mt-1">Se aplica en botones, precios y degradados del menú público.</p>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Tipografía</label>
              <select value={form.tipografia}
                onChange={e => setForm(f => ({ ...f, tipografia: e.target.value }))}
                className={inputCls}>
                {Object.entries(
                  TIPOGRAFIAS.reduce((acc, t) => { (acc[t.grupo] = acc[t.grupo] || []).push(t.nombre); return acc }, {})
                ).map(([grupo, nombres]) => (
                  <optgroup key={grupo} label={grupo}>
                    {nombres.map(n => <option key={n} value={n}>{n}</option>)}
                  </optgroup>
                ))}
              </select>
              {/* Vista previa con la tipografia real, para saber como se ve antes de guardar */}
              <div className="mt-2 p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40">
                <p style={{ fontFamily: `'${form.tipografia}', sans-serif`, fontWeight: 700 }} className="text-base text-gray-900 dark:text-gray-100">
                  Hamburguesa Clásica
                </p>
                <p style={{ fontFamily: `'${form.tipografia}', sans-serif` }} className="text-sm text-gray-600 dark:text-gray-400">
                  Doble carne, cheddar, panceta y salsa especial — $4.500
                </p>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-100 dark:border-gray-700" />

          {/* Textos del menú */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100">Textos del menú</h4>

            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Descripción</label>
              <textarea value={form.descripcion}
                onChange={e => e.target.value.length <= 255 && setForm(f => ({ ...f, descripcion: e.target.value }))}
                placeholder="Descripción breve de tu negocio"
                rows={2} className={`${inputCls} resize-none`} />
              <div className="flex justify-between items-center mt-0.5">
                <p className="text-xs text-gray-400">Se visualiza en "Más información".</p>
                <span className="text-xs text-gray-400">{form.descripcion.length}/255</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Mensaje de bienvenida</label>
              <textarea value={form.mensajeBienvenida}
                onChange={e => e.target.value.length <= 255 && setForm(f => ({ ...f, mensajeBienvenida: e.target.value }))}
                placeholder="Ej: ¡Descuento abonando en efectivo!"
                rows={2} className={`${inputCls} resize-none`} />
              <div className="flex justify-between items-center mt-0.5">
                <p className="text-xs text-gray-400">Se visualiza en el menú.</p>
                <span className="text-xs text-gray-400">{form.mensajeBienvenida.length}/255</span>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-100 dark:border-gray-700" />

          {/* Imagen de perfil */}
          <div>
            <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-1 text-center">Imagen de perfil</h4>
            <p className="text-xs text-gray-500 dark:text-gray-400 text-center mb-3">Resolución recomendada: 100 x 100 píxeles.</p>
            <div className="flex flex-col items-center gap-3">
              <div className="w-20 h-20 rounded-full overflow-hidden flex items-center justify-center border-2 border-gray-200 dark:border-gray-700"
                style={{ background: '#f9fafb' }}>
                {form.logo
                  ? <img src={form.logo} alt="logo" className="w-full h-full object-cover" />
                  : <span className="text-3xl">🏪</span>
                }
              </div>
              <input type="file" accept="image/*" ref={logoRef} onChange={e => subirImagen(e, 'logo')} className="hidden" />
              <button onClick={() => logoRef.current?.click()} disabled={!!uploading}
                className="w-full border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl py-5 text-sm text-gray-500 dark:text-gray-400 hover:border-violet-400 hover:text-violet-500 transition-colors disabled:opacity-50">
                {uploading === 'logo' ? 'Subiendo...' : 'Cambiar imagen · Tamaño máximo: 10 MB.'}
              </button>
              {form.logo && (
                <button onClick={() => setForm(f => ({ ...f, logo: '' }))} className="text-xs text-red-500 hover:underline">Eliminar imagen</button>
              )}
            </div>
          </div>

          <div className="border-t border-gray-100 dark:border-gray-700" />

          {/* Imagen de portada */}
          <div>
            <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-1 text-center">Imagen de portada</h4>
            <p className="text-xs text-gray-500 dark:text-gray-400 text-center mb-3">Resolución recomendada: 768 x 210 píxeles.</p>
            {form.imagenPortada && (
              <div className="relative rounded-xl overflow-hidden mb-2" style={{ height: 90 }}>
                <img src={form.imagenPortada} alt="portada" className="w-full h-full object-cover" />
              </div>
            )}
            <input type="file" accept="image/*" ref={portadaRef} onChange={e => subirImagen(e, 'imagenPortada')} className="hidden" />
            <button onClick={() => portadaRef.current?.click()} disabled={!!uploading}
              className="w-full border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl py-6 text-sm text-gray-500 dark:text-gray-400 hover:border-violet-400 hover:text-violet-500 transition-colors disabled:opacity-50">
              {uploading === 'imagenPortada' ? 'Subiendo...' : 'Seleccionar o arrastrar imagen · Tamaño máximo: 10 MB.'}
            </button>
            {form.imagenPortada && (
              <button onClick={() => setForm(f => ({ ...f, imagenPortada: '' }))} className="mt-2 block w-full text-center text-xs text-red-500 hover:underline">Eliminar imagen</button>
            )}
          </div>

          <div className="border-t border-gray-100 dark:border-gray-700" />

          {/* Imagen de fondo */}
          <div>
            <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-1 text-center">Imagen de fondo</h4>
            <p className="text-xs text-gray-500 dark:text-gray-400 text-center mb-3">Resolución recomendada: 1920 x 1080 píxeles.</p>
            {form.imagenFondo && (
              <div className="relative rounded-xl overflow-hidden mb-2" style={{ height: 80 }}>
                <img src={form.imagenFondo} alt="fondo" className="w-full h-full object-cover" />
              </div>
            )}
            <input type="file" accept="image/*" ref={fondoRef} onChange={e => subirImagen(e, 'imagenFondo')} className="hidden" />
            <button onClick={() => fondoRef.current?.click()} disabled={!!uploading}
              className="w-full border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl py-6 text-sm text-gray-500 dark:text-gray-400 hover:border-violet-400 hover:text-violet-500 transition-colors disabled:opacity-50">
              {uploading === 'imagenFondo' ? 'Subiendo...' : 'Seleccionar o arrastrar imagen · Tamaño máximo: 10 MB.'}
            </button>
            {form.imagenFondo && (
              <button onClick={() => setForm(f => ({ ...f, imagenFondo: '' }))} className="mt-2 block w-full text-center text-xs text-red-500 hover:underline">Eliminar imagen</button>
            )}

            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Opacidad del fondo</label>
                <span className="text-xs font-bold text-gray-700 dark:text-gray-300">{form.opacidadFondo}%</span>
              </div>
              <input type="range" min="0" max="100" value={form.opacidadFondo}
                onChange={e => setForm(f => ({ ...f, opacidadFondo: Number(e.target.value) }))}
                className="w-full accent-violet-600" />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
          <button onClick={onClose} className="text-sm text-gray-600 dark:text-gray-400 hover:underline">Cancelar</button>
          <button onClick={guardar} disabled={saving}
            className="px-6 py-2.5 bg-violet-600 text-white rounded-xl text-sm font-bold hover:bg-violet-700 transition-colors disabled:opacity-50">
            {saving ? 'Guardando...' : 'Actualizar'}
          </button>
        </div>
      </div>

      {/* Modal Mapa Dirección */}
      {modalMapaDir && (
        <ModalMapaGPS
          coords={modalMapaDir}
          direccionInicial={form.direccion}
          onConfirm={confirmarDireccionMapa}
          onClose={() => setModalMapaDir(false)}
          dark={false}
        />
      )}
    </div>
  )
}

function defaultHorario() {
  return DIAS.map(dia => ({
    dia, cerrado: false,
    turnos: [{ apertura: '10:00', cierre: '22:00', disponibleEn: ['delivery', 'takeaway'] }]
  }))
}

export default function Configuraciones() {
  const { usuario, getNegocioId } = useAuth()
  const negocioId = getNegocioId()
  const [searchParams] = useSearchParams()
  const [tabActiva, setTabActiva] = useState('Modalidades')
  const [negocio, setNegocio] = useState(null)
  const [config, setConfig] = useState(null)
  const [horarios, setHorarios] = useState(defaultHorario())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showEditarNegocio, setShowEditarNegocio] = useState(false)
  const [expandedMetodo, setExpandedMetodo] = useState(null)

  // WhatsApp
  const [whatsappStatus, setWhatsappStatus] = useState({ status: 'disconnected', ready: false })
  const [whatsappQr, setWhatsappQr] = useState(null)
  const [whatsappTemplates, setWhatsappTemplates] = useState({})
  const [savingWhatsapp, setSavingWhatsapp] = useState(false)

  useEffect(() => {
    if (!negocioId) return
    api.get(`/negocios/${negocioId}`)
      .then(({ data }) => {
        setNegocio(data.negocio)
        const cfg = data.negocio.configuracion || {}
        setConfig(cfg)
        if (cfg.horarios?.length) setHorarios(cfg.horarios)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [negocioId])

  // Leer parámetro tab de la URL
  useEffect(() => {
    const tabParam = searchParams.get('tab')
    if (tabParam && TABS.includes(tabParam)) {
      setTabActiva(tabParam)
    }
  }, [searchParams])

  // Cargar estado WhatsApp SOLO cuando estamos en la pestaña Integraciones
  useEffect(() => {
    if (tabActiva !== 'Integraciones' || !negocioId) return

    const cargarEstadoWhatsapp = async () => {
      try {
        const resStatus = await api.get(`/negocios/${negocioId}/whatsapp/status`)
        setWhatsappStatus(resStatus.data)
        const resTemplates = await api.get(`/negocios/${negocioId}/whatsapp/templates`)
        setWhatsappTemplates(resTemplates.data.templates || {})
      } catch {}
    }
    cargarEstadoWhatsapp()
  }, [tabActiva, negocioId])

  const generarQrWhatsapp = async () => {
    try {
      toast.loading('Generando código QR...')
      const res = await api.get(`/negocios/${negocioId}/whatsapp/qr`)
      setWhatsappQr(res.data.qr)
      toast.remove()

      // Polling temporal solo por 60 segundos cuando se solicita manualmente
      let intentos = 0
      const interval = setInterval(async () => {
        intentos++
        // Limpiamos automaticamente despues de 60 segundos o si ya esta conectado
        if (intentos > 12 || whatsappStatus.ready) {
          clearInterval(interval)
          return
        }
        try {
          const statusRes = await api.get(`/negocios/${negocioId}/whatsapp/status`)
          setWhatsappStatus(statusRes.data)
          if (statusRes.data.ready) {
            clearInterval(interval)
            setWhatsappQr(null)
            toast.success('✅ WhatsApp conectado correctamente!')
          }
        } catch {
          clearInterval(interval)
        }
      }, 5000)

    } catch {
      toast.error('Error al generar codigo QR')
    }
  }

  const desconectarWhatsapp = async () => {
    try {
      await api.post(`/negocios/${negocioId}/whatsapp/disconnect`)
      setWhatsappStatus({ status: 'disconnected', ready: false })
      setWhatsappQr(null)
      toast.success('WhatsApp desconectado')
    } catch {
      toast.error('Error al desconectar')
    }
  }

  const guardarPlantillasWhatsapp = async () => {
    setSavingWhatsapp(true)
    try {
      await api.put(`/negocios/${negocioId}/whatsapp/templates`, { templates: whatsappTemplates })
      toast.success('Plantillas guardadas correctamente')
    } catch {
      toast.error('Error al guardar plantillas')
    } finally {
      setSavingWhatsapp(false)
    }
  }

  const guardar = async () => {
    setSaving(true)
    try {
      // Mezclamos negocio.configuracion como base para no perder campos guardados por el modal (descripcion, mensajeBienvenida, etc.)
      await api.put(`/negocios/${negocioId}`, {
        configuracion: { ...(negocio?.configuracion || {}), ...config, horarios }
      })
      toast.success('Configuración guardada')
    } catch { toast.error('Error al guardar') }
    finally { setSaving(false) }
  }

  const setModalidad = (key, val) => setConfig(c => ({ ...c, modalidades: { ...c.modalidades, [key]: val } }))
  const setPedidos = (key, val) => setConfig(c => ({ ...c, [key]: val }))
  const setMetodoPagoKey = (key, campo, valor) =>
    setConfig(c => {
      const existente = normalizeMetodoPago(c.metodosPago?.[key])
      // Débito/crédito se cobran presencialmente (posnet): solo tiene sentido
      // en take away, se fuerza al activarlo para que no quede mal configurado.
      const forzarTakeaway = campo === 'activo' && valor === true && METODOS_SOLO_TAKEAWAY.includes(key)
      const cambios = { [campo]: valor, ...(forzarTakeaway ? { disponibleEn: ['takeaway'] } : {}) }
      return { ...c, metodosPago: { ...(c.metodosPago || {}), [key]: { ...existente, ...cambios } } }
    })

  // Métodos de pago personalizados (además de los fijos): {key, label, icon}
  const metodosPersonalizados = config.metodosPersonalizados || []
  const agregarMetodoPersonalizado = () => {
    const nombre = prompt('Nombre del método de pago (ej: "Cuenta DNI", "QR del banco")')
    if (!nombre || !nombre.trim()) return
    const key = 'custom_' + nombre.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') + '_' + Date.now().toString(36).slice(-4)
    setConfig(c => ({ ...c, metodosPersonalizados: [...(c.metodosPersonalizados || []), { key, label: nombre.trim(), icon: '💳' }] }))
    setExpandedMetodo(key)
    setMetodoPagoKey(key, 'activo', true)
  }
  const eliminarMetodoPersonalizado = (key) => {
    if (!confirm('¿Eliminar este método de pago?')) return
    setConfig(c => {
      const { [key]: _omit, ...restoMetodos } = c.metodosPago || {}
      return { ...c, metodosPersonalizados: (c.metodosPersonalizados || []).filter(m => m.key !== key), metodosPago: restoMetodos }
    })
  }

  const agregarTurno = (diaIdx) => {
    setHorarios(h => h.map((d, i) => i === diaIdx
      ? { ...d, turnos: [...d.turnos, { apertura: '19:00', cierre: '23:00', disponibleEn: ['delivery', 'takeaway'] }] }
      : d))
  }
  const eliminarTurno = (diaIdx, turnoIdx) => {
    setHorarios(h => h.map((d, i) => i === diaIdx
      ? { ...d, turnos: d.turnos.filter((_, j) => j !== turnoIdx) }
      : d))
  }
  const updateTurno = (diaIdx, turnoIdx, key, val) => {
    setHorarios(h => h.map((d, i) => i === diaIdx
      ? { ...d, turnos: d.turnos.map((t, j) => j === turnoIdx ? { ...t, [key]: val } : t) }
      : d))
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full animate-spin" /></div>
  if (!config) return null

  return (
    <div className="p-6">
      <div className="text-center mb-6">
        <div className="flex items-center justify-center gap-3 mb-2">
          {negocio?.logo && (
            <img src={negocio.logo} alt="logo" className="w-10 h-10 rounded-xl object-cover border border-gray-200 dark:border-gray-700" />
          )}
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">{negocio?.nombre}</h1>
        </div>
        {negocio?.ciudad && <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">{negocio.ciudad}</p>}
        <div className="flex items-center justify-center gap-4 mt-1">
          <button onClick={() => setShowEditarNegocio(true)} className="text-sm text-violet-600 dark:text-violet-400 hover:underline">Editar perfil</button>
          <button
            className="text-sm text-violet-600 dark:text-violet-400 hover:underline"
            onClick={() => {
              const url = `${window.location.origin}/menu/${negocio?.slug}`
              navigator.clipboard.writeText(url).then(() => toast.success('Link del menú copiado!'))
            }}>
            Copiar link del menú
          </button>
          {negocio?.slug && (
            <a href={`/menu/${negocio.slug}`} target="_blank" rel="noreferrer"
              className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-600 dark:hover:text-gray-100 hover:underline">
              Ver menú →
            </a>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="flex border-b border-gray-200 dark:border-gray-700 overflow-x-auto scrollbar-thin pb-0.5 -mb-0.5">
          {TABS.map(t => (
            <button key={t} onClick={() => setTabActiva(t)}
              className={`px-3 md:px-4 py-2 md:py-3 text-xs md:text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-px ${tabActiva === t ? 'border-violet-600 text-violet-700' : 'border-transparent text-gray-700 dark:text-gray-300 hover:text-gray-700 dark:hover:text-gray-100'}`}>
              {t}
            </button>
          ))}
        </div>

        <div className="p-4 md:p-6">
          {/* Modalidades */}
          {tabActiva === 'Modalidades' && (
            <div className="space-y-3">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">Modalidades de entrega:</p>
              {[
                { key: 'delivery', label: 'Delivery' },
                { key: 'takeaway', label: 'Take away' },
                { key: 'salon', label: 'Salón' },
              ].map(m => (
                <label key={m.key} className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox"
                    checked={!!config.modalidades?.[m.key]}
                    onChange={e => setModalidad(m.key, e.target.checked)}
                    className="w-4 h-4 accent-violet-600"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{m.label}</span>
                </label>
              ))}
            </div>
          )}

          {/* Pedidos */}
          {tabActiva === 'Pedidos' && (
            <div className="space-y-3">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">Recepción de pedidos:</p>
              {[
                { key: 'recibirPedidos', label: 'Recibir pedidos.' },
                { key: 'recibirWhatsapp', label: 'Recibir confirmación por WhatsApp.' },
                { key: 'aceptaPropinas', label: 'Aceptar propinas.' },
                { key: 'datosClienteObligatorios', label: 'Datos del cliente obligatorios.' },
                { key: 'venderSinStock', label: 'Vender sin stock (nunca frenar la venta aunque no haya stock).' },
              ].map(o => (
                <label key={o.key} className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox"
                    checked={!!config[o.key]}
                    onChange={e => setPedidos(o.key, e.target.checked)}
                    className="w-4 h-4 accent-violet-600"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{o.label}</span>
                </label>
              ))}
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 max-w-xs">
                <div>
                  <label className="block text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Monto mínimo de compra</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 dark:text-gray-400 text-sm">$</span>
                    <input type="number" value={config.montoMinimo || 0}
                      onChange={e => setPedidos('montoMinimo', Number(e.target.value))}
                      className="w-full pl-7 pr-3 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Costo de envío (delivery)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 dark:text-gray-400 text-sm">$</span>
                    <input type="number" value={config.costoEnvio || 0}
                      onChange={e => setPedidos('costoEnvio', Number(e.target.value))}
                      className="w-full pl-7 pr-3 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Horarios */}
          {tabActiva === 'Horarios' && (
            <div className="space-y-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={!!config.cerradoTemporalmente}
                  onChange={e => setPedidos('cerradoTemporalmente', e.target.checked)}
                  className="w-4 h-4 accent-violet-600"
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Cerrado temporalmente</span>
              </label>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Horarios de atención:</p>
              {horarios.map((dia, diaIdx) => (
                <div key={dia.dia} className="border-b border-gray-50 pb-4">
                  <div className="flex items-center gap-6 mb-3">
                    <div className="w-20">
                      <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{dia.dia}</p>
                      <label className="flex items-center gap-1 mt-1 cursor-pointer">
                        <input type="checkbox" checked={dia.cerrado}
                          onChange={e => setHorarios(h => h.map((d, i) => i === diaIdx ? { ...d, cerrado: e.target.checked } : d))}
                          className="w-3 h-3 accent-violet-600"
                        />
                        <span className="text-xs text-gray-600 dark:text-gray-400">Cerrado</span>
                      </label>
                    </div>
                    {!dia.cerrado && (
                      <div className="flex-1 space-y-2">
                        {dia.turnos.map((turno, turnoIdx) => (
                          <div key={turnoIdx} className="flex items-center gap-3">
                            <div className="flex items-center gap-2">
                              <label className="text-xs text-gray-600 dark:text-gray-400">Apertura</label>
                              <input type="time" value={turno.apertura}
                                onChange={e => updateTurno(diaIdx, turnoIdx, 'apertura', e.target.value)}
                                className="px-2 py-1.5 border border-gray-300 dark:border-gray-700 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-violet-500"
                              />
                            </div>
                            <div className="flex items-center gap-2">
                              <label className="text-xs text-gray-600 dark:text-gray-400">Cierre</label>
                              <input type="time" value={turno.cierre}
                                onChange={e => updateTurno(diaIdx, turnoIdx, 'cierre', e.target.value)}
                                className="px-2 py-1.5 border border-gray-300 dark:border-gray-700 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-violet-500"
                              />
                            </div>
                            {turnoIdx === dia.turnos.length - 1 ? (
                              <button onClick={() => agregarTurno(diaIdx)} className="text-violet-600 dark:text-violet-400 hover:text-violet-800 p-1">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                              </button>
                            ) : (
                              <button onClick={() => eliminarTurno(diaIdx, turnoIdx)} className="text-red-400 hover:text-red-600 p-1">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Métodos de pago */}
          {tabActiva === 'Métodos de pago' && (
            <div className="space-y-1.5">
              {[...METODOS_CONFIG.map(m => ({ ...m, key: getMetodoKey(m.label), personalizado: false })),
                ...metodosPersonalizados.map(m => ({ ...m, personalizado: true }))
              ].map(({ label, icon, key, personalizado }) => {
                const cfg = normalizeMetodoPago(config.metodosPago?.[key])
                const abierto = expandedMetodo === key
                const soloTakeaway = METODOS_SOLO_TAKEAWAY.includes(key)
                return (
                  <div key={key} className={`border rounded-xl overflow-hidden transition-colors ${cfg.activo ? 'border-violet-200 dark:border-violet-700' : 'border-gray-200 dark:border-gray-700'}`}>
                    {/* Fila principal */}
                    <div className="flex items-center gap-3 px-4 py-3">
                      <input type="checkbox"
                        checked={cfg.activo}
                        onChange={e => {
                          setMetodoPagoKey(key, 'activo', e.target.checked)
                          if (e.target.checked) setExpandedMetodo(key)
                          else if (expandedMetodo === key) setExpandedMetodo(null)
                        }}
                        className="w-4 h-4 accent-violet-600 flex-shrink-0 cursor-pointer"
                      />
                      <span className="text-base flex-shrink-0">{icon}</span>
                      <span className={`flex-1 text-sm font-medium ${cfg.activo ? 'text-gray-900 dark:text-gray-100' : 'text-gray-600 dark:text-gray-400'}`}>
                        {cfg.nombrePersonalizado || label}
                      </span>
                      {personalizado && (
                        <button type="button" onClick={() => eliminarMetodoPersonalizado(key)}
                          title="Eliminar este método de pago"
                          className="p-1 text-red-400 hover:text-red-600 dark:hover:text-red-400 transition-colors flex-shrink-0">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      )}
                      {cfg.activo && (
                        <button type="button" onClick={() => setExpandedMetodo(abierto ? null : key)}
                          className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors flex-shrink-0">
                          <svg className={`w-4 h-4 transition-transform duration-200 ${abierto ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                      )}
                    </div>

                    {/* Panel expandido */}
                    {abierto && cfg.activo && (
                      <div className="px-4 pb-4 pt-3 space-y-3 border-t border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/20">
                        {/* Nombre personalizado */}
                        <div>
                          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Nombre personalizado</label>
                          <input
                            value={cfg.nombrePersonalizado}
                            onChange={e => setMetodoPagoKey(key, 'nombrePersonalizado', e.target.value)}
                            placeholder={label}
                            maxLength={40}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white dark:bg-gray-800"
                          />
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Este nombre reemplazará al original.</p>
                        </div>

                        {/* Campos especiales: Transferencia */}
                        {key === 'transferencia' && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Alias</label>
                              <input
                                value={cfg.alias || ''}
                                onChange={e => setMetodoPagoKey(key, 'alias', e.target.value)}
                                placeholder="mi.alias.mp"
                                maxLength={20}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white dark:bg-gray-800"
                              />
                              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{(cfg.alias || '').length}/20 caracteres</p>
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Titular de la cuenta</label>
                              <input
                                value={cfg.titularCuenta || ''}
                                onChange={e => setMetodoPagoKey(key, 'titularCuenta', e.target.value)}
                                placeholder="Nombre Apellido"
                                maxLength={60}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white dark:bg-gray-800"
                              />
                            </div>
                          </div>
                        )}

                        {/* Campos especiales: Mercado Pago OAuth */}
                        {(key === 'mercado_pago' || key === 'mercadopago') && (
                          <MercadoPagoOAuthSection
                            metodoActivo={cfg.activo}
                            onStatusChange={(linked) => {
                              // Callback cuando se vincula/desvincula
                              console.log('MercadoPago vinculado:', linked)
                            }}
                          />
                        )}

                        {/* Disponible en + Descuento/Recargo */}
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Método disponible en</label>
                            {soloTakeaway ? (
                              <>
                                <div className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-gray-100 dark:bg-gray-900 text-gray-600 dark:text-gray-400">
                                  Solo Take Away
                                </div>
                                <p className="text-[10px] text-gray-400 mt-0.5">Se cobra en el local con posnet, no aplica a delivery ni salón.</p>
                              </>
                            ) : (
                              <select
                                value={
                                  !cfg.disponibleEn || cfg.disponibleEn.length === 3 ? 'todos'
                                  : cfg.disponibleEn.length === 1 ? cfg.disponibleEn[0]
                                  : cfg.disponibleEn.includes('delivery') && cfg.disponibleEn.includes('takeaway') && !cfg.disponibleEn.includes('salon') ? 'delivery,takeaway'
                                  : 'todos'
                                }
                                onChange={e => {
                                  const v = e.target.value
                                  const map = { todos: ['delivery', 'takeaway', 'salon'], delivery: ['delivery'], takeaway: ['takeaway'], salon: ['salon'], 'delivery,takeaway': ['delivery', 'takeaway'] }
                                  setMetodoPagoKey(key, 'disponibleEn', map[v] || ['delivery', 'takeaway', 'salon'])
                                }}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white dark:bg-gray-800"
                              >
                                <option value="todos">Todos</option>
                                <option value="delivery">Solo Delivery</option>
                                <option value="takeaway">Solo Take Away</option>
                                <option value="salon">Solo Salón</option>
                                <option value="delivery,takeaway">Delivery, Take Away</option>
                              </select>
                            )}
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Descuento / Recargo</label>
                            <select value={cfg.ajuste || 'ninguno'}
                              onChange={e => setMetodoPagoKey(key, 'ajuste', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white dark:bg-gray-800"
                            >
                              <option value="ninguno">Ninguno</option>
                              <option value="descuento">Descuento</option>
                              <option value="recargo">Recargo</option>
                            </select>
                          </div>
                        </div>

                        {/* Tipo y valor (si hay ajuste) */}
                        {(cfg.ajuste === 'descuento' || cfg.ajuste === 'recargo') && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Tipo</label>
                              <select value={cfg.tipoAjuste || 'porcentaje'}
                                onChange={e => setMetodoPagoKey(key, 'tipoAjuste', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white dark:bg-gray-800"
                              >
                                <option value="porcentaje">Porcentaje</option>
                                <option value="fijo">Monto fijo</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                                {cfg.tipoAjuste === 'fijo' ? 'Monto ($)' : 'Porcentaje (%)'}
                              </label>
                              <div className="relative">
                                <input type="number" min="0" step="0.1"
                                  value={cfg.valorAjuste || ''}
                                  onChange={e => setMetodoPagoKey(key, 'valorAjuste', Number(e.target.value))}
                                  placeholder="0"
                                  className="w-full px-3 py-2 pr-7 border border-gray-300 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white dark:bg-gray-800"
                                />
                                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                                  {cfg.tipoAjuste === 'fijo' ? '$' : '%'}
                                </span>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Oculto en el menú */}
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" checked={!!cfg.oculto}
                            onChange={e => setMetodoPagoKey(key, 'oculto', e.target.checked)}
                            className="w-4 h-4 accent-violet-600"
                          />
                          <span className="text-xs text-gray-600 dark:text-gray-400">Método de pago oculto (no se mostrará en el menú)</span>
                        </label>
                      </div>
                    )}
                  </div>
                )
              })}
              <button type="button" onClick={agregarMetodoPersonalizado}
                className="flex items-center gap-2 px-4 py-2.5 border-2 border-dashed border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 rounded-xl hover:border-violet-400 hover:text-violet-600 dark:hover:text-violet-400 transition-colors text-sm font-medium w-full justify-center mt-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                Crear método de pago
              </button>
            </div>
          )}

          {/* Zonas de entrega */}
          {tabActiva === 'Zonas de entrega' && (
            <div className="max-w-2xl">
              <EditorZonasMapa
                zonas={config.zonasEntrega || []}
                onChange={nuevasZonas => setPedidos('zonasEntrega', nuevasZonas)}
                negocio={negocio}
              />
            </div>
          )}

          {/* Redes sociales */}
          {tabActiva === 'Redes sociales' && (
            <div className="space-y-4 max-w-sm">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Color del menú QR</label>
                <div className="flex items-center gap-3">
                  <input type="color" value={config.colorPrimario || '#7C3AED'}
                    onChange={e => setPedidos('colorPrimario', e.target.value)}
                    className="w-12 h-10 rounded-lg border border-gray-300 dark:border-gray-700 cursor-pointer p-0.5"
                  />
                  <input value={config.colorPrimario || '#7C3AED'} onChange={e => setPedidos('colorPrimario', e.target.value)}
                    placeholder="#7C3AED"
                    className="flex-1 px-3 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Se aplica en tu menú público QR</p>
              </div>
              <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                {[
                  { key: 'whatsapp', label: 'WhatsApp', placeholder: '+54 9 11 0000-0000' },
                  { key: 'instagram', label: 'Instagram', placeholder: '@tulocal' },
                  { key: 'facebook', label: 'Facebook', placeholder: 'URL de Facebook' },
                ].map(r => (
                  <div key={r.key} className="mb-4 last:mb-0">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{r.label}</label>
                    <input value={config[r.key] || ''} onChange={e => setPedidos(r.key, e.target.value)}
                      placeholder={r.placeholder}
                      className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Marketing */}
          {tabActiva === 'Marketing' && (
            <div className="space-y-6">
              {/* Link del menú */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">Link del menú público</h3>
                <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-300 dark:border-gray-700">
                  <span className="flex-1 text-sm text-gray-600 dark:text-gray-300 truncate font-mono">
                    {window.location.origin}/menu/{negocio?.slug}
                  </span>
                  <button
                    onClick={() => {
                      const url = `${window.location.origin}/menu/${negocio?.slug}`
                      navigator.clipboard.writeText(url).then(() => toast.success('Link copiado!'))
                    }}
                    className="flex-shrink-0 px-3 py-1.5 bg-violet-600 text-white text-xs font-medium rounded-lg hover:bg-violet-700 transition-colors">
                    Copiar
                  </button>
                  {negocio?.slug && (
                    <a href={`/menu/${negocio.slug}`} target="_blank" rel="noreferrer"
                      className="flex-shrink-0 px-3 py-1.5 border border-gray-300 dark:border-gray-700 text-xs font-medium text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                      Ver →
                    </a>
                  )}
                </div>
              </div>

              {/* Mensaje de bienvenida */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">Mensaje de bienvenida</h3>
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">Se muestra en la parte superior de tu menú público</p>
                <textarea
                  value={config.mensajeBienvenida || ''}
                  onChange={e => setPedidos('mensajeBienvenida', e.target.value)}
                  placeholder="Ej: ¡Bienvenido! Hacemos los mejores sandwiches de la ciudad. Pedí y retirá en local o pedí a domicilio."
                  rows={3}
                  className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
                />
              </div>

              {/* Texto para compartir por WhatsApp */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">Texto para compartir</h3>
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">Mensaje predefinido para compartir tu menú por WhatsApp</p>
                <textarea
                  value={config.textoCompartir || ''}
                  onChange={e => setPedidos('textoCompartir', e.target.value)}
                  placeholder={`Ej: ¡Mirá nuestro menú! Hacé tu pedido desde: ${window.location.origin}/menu/${negocio?.slug}`}
                  rows={3}
                  className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
                />
                {config.textoCompartir && (
                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(config.textoCompartir)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 mt-2 px-4 py-2 bg-green-500 text-white text-sm font-medium rounded-lg hover:bg-green-600 transition-colors">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                    Compartir por WhatsApp
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Integraciones */}
          {tabActiva === 'Integraciones' && (
            <div className="space-y-6">
              <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">WhatsApp</h3>
              
              <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-5 bg-gray-50 dark:bg-gray-900/20">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200">Conexión WhatsApp</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Conecta tu WhatsApp para enviar notificaciones a los clientes</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`w-2.5 h-2.5 rounded-full ${whatsappStatus.ready ? 'bg-green-500 animate-pulse' : whatsappStatus.status === 'pending' ? 'bg-yellow-500' : 'bg-gray-400'}`}></div>
                    <span className="text-xs font-medium">
                      {whatsappStatus.ready ? '✅ Conectado' : whatsappStatus.status === 'pending' ? '⏳ Esperando QR' : '❌ Desconectado'}
                    </span>
                  </div>
                </div>

                {whatsappQr && !whatsappStatus.ready && (
                  <div className="text-center py-4">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">Escaneá este código QR con WhatsApp</p>
                    <img src={whatsappQr} alt="QR WhatsApp" className="mx-auto w-48 h-48 rounded-xl border border-gray-300 dark:border-gray-600" />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">WhatsApp → Ajustes → Dispositivos conectados → Conectar un dispositivo</p>
                  </div>
                )}

                {!whatsappStatus.ready && !whatsappQr && (
                  <button
                    onClick={generarQrWhatsapp}
                    className="w-full py-2.5 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 transition-colors">
                    📱 Vincular dispositivo WhatsApp
                  </button>
                )}

                {whatsappStatus.ready && (
                  <button
                    onClick={desconectarWhatsapp}
                    className="w-full py-2.5 rounded-lg text-sm font-semibold text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors">
                    Desconectar WhatsApp
                  </button>
                )}
              </div>

              <div className="mt-6">
                <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-4">Plantillas de mensajes</h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                  Podes personalizar los mensajes que se envían automáticamente cuando cambia el estado de un pedido.
                </p>

                {/* Panel de ayuda con variables */}
                <div className="mb-6 p-4 rounded-xl border-2 border-dashed border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-950">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-violet-500 flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h5 className="text-sm font-bold text-violet-900 dark:text-violet-100 mb-2">💡 Variables disponibles</h5>
                      <p className="text-xs text-violet-700 dark:text-violet-300 mb-3">
                        Podés usar estas variables en tus mensajes. Se reemplazarán automáticamente con los datos del pedido:
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                        <div className="flex items-start gap-2">
                          <code className="px-2 py-1 rounded bg-violet-100 dark:bg-violet-900 text-violet-700 dark:text-violet-300 font-mono whitespace-nowrap">
                            {'{{tiempo_estimado}}'}
                          </code>
                          <span className="text-violet-600 dark:text-violet-400">→ Tiempo en minutos (ej: 15)</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <code className="px-2 py-1 rounded bg-violet-100 dark:bg-violet-900 text-violet-700 dark:text-violet-300 font-mono whitespace-nowrap">
                            {'{{nombre_cliente}}'}
                          </code>
                          <span className="text-violet-600 dark:text-violet-400">→ Nombre del cliente</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <code className="px-2 py-1 rounded bg-violet-100 dark:bg-violet-900 text-violet-700 dark:text-violet-300 font-mono whitespace-nowrap">
                            {'{{numero_pedido}}'}
                          </code>
                          <span className="text-violet-600 dark:text-violet-400">→ Número de pedido</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <code className="px-2 py-1 rounded bg-violet-100 dark:bg-violet-900 text-violet-700 dark:text-violet-300 font-mono whitespace-nowrap">
                            {'{{total}}'}
                          </code>
                          <span className="text-violet-600 dark:text-violet-400">→ Total del pedido</span>
                        </div>
                      </div>
                      <div className="mt-3 pt-3 border-t border-violet-200 dark:border-violet-800">
                        <p className="text-xs font-semibold text-violet-800 dark:text-violet-200 mb-1">Ejemplo:</p>
                        <div className="p-2 rounded bg-white dark:bg-gray-900 border border-violet-200 dark:border-violet-700">
                          <code className="text-xs text-violet-600 dark:text-violet-400 font-mono">
                            ¡Hola {'{{nombre_cliente}}'}! Tu pedido estará listo en {'{{tiempo_estimado}}'} minutos.
                          </code>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Mensajes para Delivery */}
                <div className="mb-8">
                  <h5 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3">Mensajes para Delivery</h5>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">Estos valores se usan si no se define una variante por modalidad</p>
                  
                  {[
                    { key: 'nuevo_a_preparacion', label: 'De "Nuevo" a "En Preparación"' },
                    { key: 'preparacion_a_listo', label: 'De "En Preparación" a "Listo"' },
                    { key: 'listo_a_en_camino', label: 'De "Listo" a "En camino"' },
                    { key: 'cualquier_a_cancelado', label: 'De cualquier estado a "Cancelado"' },
                  ].map(item => (
                    <div key={item.key} className="mb-4">
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{item.label}</label>
                      <textarea
                        value={whatsappTemplates.delivery?.[item.key] || ''}
                        onChange={(e) => setWhatsappTemplates(t => ({ ...t, delivery: { ...t.delivery, [item.key]: e.target.value } }))}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                      />
                    </div>
                  ))}
                </div>

                {/* Mensajes para Take Away */}
                <div className="mb-6">
                  <h5 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3">Take Away</h5>
                  
                  
                  {[
                    { key: 'nuevo_a_preparacion', label: 'Nuevo → En Preparación' },
                    { key: 'preparacion_a_listo', label: 'En Preparación → Listo' },
                    { key: 'cualquier_a_cancelado', label: 'Cualquier estado → Cancelado' },
                  ].map(item => (
                    <div key={item.key} className="mb-4">
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{item.label}</label>
                      <textarea
                        value={whatsappTemplates.takeaway?.[item.key] || ''}
                        onChange={(e) => setWhatsappTemplates(t => ({ ...t, takeaway: { ...t.takeaway, [item.key]: e.target.value } }))}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                      />
                    </div>
                  ))}
                </div>

                <button
                  onClick={guardarPlantillasWhatsapp}
                  disabled={savingWhatsapp}
                  className="w-full mt-2 py-2.5 bg-violet-600 text-white rounded-lg text-sm font-semibold hover:bg-violet-700 transition-colors disabled:opacity-50">
                  {savingWhatsapp ? 'Guardando...' : 'Guardar plantillas'}
                </button>
              </div>

            </div>
          )}

          {/* TAB MAPA DE PEDIDOS */}
          {tabActiva === 'Mapa de pedidos' && (
            <div className="space-y-6">
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
                <h3 className="font-bold text-lg mb-4 text-gray-900 dark:text-white">
                  Personalización del Mapa de Pedidos
                </h3>

                {/* Tema */}
                <div className="mb-6">
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                    Tema del Mapa
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setConfig({ ...config, mapaConfiguracion: { ...(config.mapaConfiguracion || {}), tema: 'oscuro' } })}
                      className={`py-3 px-4 rounded-lg border-2 font-medium transition ${
                        config.mapaConfiguracion?.tema === 'oscuro'
                          ? 'border-violet-600 bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-400'
                          : 'border-gray-300 dark:border-gray-600 hover:border-violet-300'
                      }`}
                    >
                      🌙 Oscuro
                    </button>
                    <button
                      onClick={() => setConfig({ ...config, mapaConfiguracion: { ...(config.mapaConfiguracion || {}), tema: 'claro' } })}
                      className={`py-3 px-4 rounded-lg border-2 font-medium transition ${
                        config.mapaConfiguracion?.tema === 'claro'
                          ? 'border-violet-600 bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-400'
                          : 'border-gray-300 dark:border-gray-600 hover:border-violet-300'
                      }`}
                    >
                      ☀️ Claro
                    </button>
                  </div>
                </div>

                {/* Colores de Pins */}
                <div className="mb-6">
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                    Colores de Pins de Pedidos
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                    <div>
                      <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                        Pin Pagado
                      </label>
                      <input
                        type="color"
                        value={config.mapaConfiguracion?.colorPinPagado || '#22c55e'}
                        onChange={(e) => setConfig({ ...config, mapaConfiguracion: { ...(config.mapaConfiguracion || {}), colorPinPagado: e.target.value } })}
                        className="w-full h-10 rounded-lg cursor-pointer"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                        Pin Pendiente
                      </label>
                      <input
                        type="color"
                        value={config.mapaConfiguracion?.colorPinPendiente || '#ef4444'}
                        onChange={(e) => setConfig({ ...config, mapaConfiguracion: { ...(config.mapaConfiguracion || {}), colorPinPendiente: e.target.value } })}
                        className="w-full h-10 rounded-lg cursor-pointer"
                      />
                    </div>
                  </div>
                </div>

                {/* Colores de UI */}
                <div className="mb-6">
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                    Colores de Interfaz
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                    <div>
                      <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                        Fondo del Mapa
                      </label>
                      <input
                        type="color"
                        value={config.mapaConfiguracion?.colorFondo || '#1a1a2e'}
                        onChange={(e) => setConfig({ ...config, mapaConfiguracion: { ...(config.mapaConfiguracion || {}), colorFondo: e.target.value } })}
                        className="w-full h-10 rounded-lg cursor-pointer"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                        Header/Toolbar
                      </label>
                      <input
                        type="color"
                        value={config.mapaConfiguracion?.colorHeader || '#16213e'}
                        onChange={(e) => setConfig({ ...config, mapaConfiguracion: { ...(config.mapaConfiguracion || {}), colorHeader: e.target.value } })}
                        className="w-full h-10 rounded-lg cursor-pointer"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                        Color de Texto
                      </label>
                      <input
                        type="color"
                        value={config.mapaConfiguracion?.colorTexto || '#ffffff'}
                        onChange={(e) => setConfig({ ...config, mapaConfiguracion: { ...(config.mapaConfiguracion || {}), colorTexto: e.target.value } })}
                        className="w-full h-10 rounded-lg cursor-pointer"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                        Texto Secundario
                      </label>
                      <input
                        type="color"
                        value={config.mapaConfiguracion?.colorTextoSecundario || '#9ca3af'}
                        onChange={(e) => setConfig({ ...config, mapaConfiguracion: { ...(config.mapaConfiguracion || {}), colorTextoSecundario: e.target.value } })}
                        className="w-full h-10 rounded-lg cursor-pointer"
                      />
                    </div>
                  </div>
                </div>

                {/* Tamaño de Pins */}
                <div className="mb-6">
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                    Tamaño de Pins
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {['pequeño', 'mediano', 'grande'].map((size) => (
                      <button
                        key={size}
                        onClick={() => setConfig({ ...config, mapaConfiguracion: { ...(config.mapaConfiguracion || {}), tamanioPins: size } })}
                        className={`py-2 px-4 rounded-lg border-2 font-medium capitalize transition ${
                          (config.mapaConfiguracion?.tamanioPins || 'mediano') === size
                            ? 'border-violet-600 bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-400'
                            : 'border-gray-300 dark:border-gray-600 hover:border-violet-300'
                        }`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Opacidad del Mapa */}
                <div className="mb-6">
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                    Opacidad del Mapa Base: {Math.round((config.mapaConfiguracion?.opacidadMapa || 0.9) * 100)}%
                  </label>
                  <input
                    type="range"
                    min="0.3"
                    max="1"
                    step="0.1"
                    value={config.mapaConfiguracion?.opacidadMapa || 0.9}
                    onChange={(e) => setConfig({ ...config, mapaConfiguracion: { ...(config.mapaConfiguracion || {}), opacidadMapa: parseFloat(e.target.value) } })}
                    className="w-full"
                  />
                </div>

                {/* Botón Restaurar */}
                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => setConfig({ ...config, mapaConfiguracion: {
                      tema: 'oscuro',
                      colorPinPagado: '#22c55e',
                      colorPinPendiente: '#ef4444',
                      colorFondo: '#1a1a2e',
                      colorHeader: '#16213e',
                      colorTexto: '#ffffff',
                      colorTextoSecundario: '#9ca3af',
                      colorNegocio: '#1f2937',
                      tamanioPins: 'mediano',
                      opacidadMapa: 0.9,
                      tileLayer: 'dark'
                    }})}
                    className="px-6 py-2.5 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition"
                  >
                    Restaurar Valores por Defecto
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="px-6 pb-6">
          <button onClick={guardar} disabled={saving}
            className="px-6 py-2.5 bg-violet-600 text-white rounded-lg text-sm font-medium hover:bg-violet-700 transition-colors disabled:opacity-50">
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>

      {showEditarNegocio && negocio && (
        <ModalEditarNegocio
          negocio={negocio}
          onClose={() => setShowEditarNegocio(false)}
          onSaved={(datos) => {
            setNegocio(n => ({ ...n, ...datos }))
            if (datos.configuracion) setConfig(c => ({ ...c, ...datos.configuracion }))
          }}
        />
      )}
    </div>
  )
}
