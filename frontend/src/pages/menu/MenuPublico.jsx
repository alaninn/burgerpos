import { useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import axios from 'axios'
import toast, { Toaster } from 'react-hot-toast'
import ModalMapaGPS from '../../components/ModalMapaGPS'

const api = axios.create({ baseURL: '/api', headers: { 'Content-Type': 'application/json' } })

// Genera token de sesión compatible con HTTP (sin crypto.randomUUID que requiere HTTPS)
function generateSessionToken() {
  return Date.now().toString(36) + '-' + Math.random().toString(36).substr(2, 9)
}

// ─── CSS base (la fuente se inyecta dinámicamente según config) ───
function buildStyles(tipografia) {
  const f = tipografia || 'Inter'
  const fUrl = f.replace(/ /g, '+')
  return `
  @import url('https://fonts.googleapis.com/css2?family=${fUrl}:wght@400;500;600;700;800;900&display=swap');
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
  * { font-family: '${f}', sans-serif !important; }
  .product-description { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important; }`
}

const styles = `
  @keyframes slideUp {
    from { transform: translateY(100%); opacity: 0; }
    to   { transform: translateY(0);    opacity: 1; }
  }
  @keyframes checkDraw {
    from { stroke-dashoffset: 30; }
    to   { stroke-dashoffset: 0; }
  }
  @keyframes popIn {
    0%   { transform: scale(0.8); opacity: 0; }
    60%  { transform: scale(1.1); }
    100% { transform: scale(1);   opacity: 1; }
  }
  .modal-enter  { animation: slideUp 0.3s cubic-bezier(0.32,0.72,0,1) forwards; }
  .pop-in       { animation: popIn 0.4s cubic-bezier(0.34,1.56,0.64,1) forwards; }
  .check-path   { stroke-dasharray: 30; stroke-dashoffset: 30; animation: checkDraw 0.5s 0.2s ease forwards; }
  .no-scrollbar::-webkit-scrollbar { display: none; }
  .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
  .menu-bg {
    background-color: #09090b;
    background-image:
      radial-gradient(ellipse 80% 40% at 50% 0%, rgba(124,58,237,0.18) 0%, transparent 70%),
      radial-gradient(ellipse 60% 30% at 80% 100%, rgba(124,58,237,0.08) 0%, transparent 60%);
  }
  .highlight-ring { box-shadow: 0 0 0 3px rgba(124,58,237,0.35); }
`

// ─── Skeleton ─────────────────────────────────────────────
function SkeletonMenu() {
  return (
    <div className="min-h-screen max-w-2xl mx-auto" style={{ background: '#0a0a0a' }}>
      <style>{styles}</style>
      <div className="px-5 pt-8 pb-4">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 rounded-full animate-pulse flex-shrink-0" style={{ background: '#1c1c1e' }} />
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <div className="h-5 w-32 rounded-lg animate-pulse" style={{ background: '#1c1c1e' }} />
              <div className="h-5 w-14 rounded-full animate-pulse" style={{ background: '#1c1c1e' }} />
            </div>
            <div className="h-3 w-40 rounded animate-pulse" style={{ background: '#1c1c1e' }} />
          </div>
        </div>
        <div className="h-10 rounded-2xl animate-pulse" style={{ background: '#1c1c1e' }} />
      </div>
      <div className="px-5">
        <div className="rounded-2xl overflow-hidden animate-pulse" style={{ background: '#000', border: '1px solid rgba(255,255,255,0.12)' }}>
          <div className="py-4 px-4 text-center" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="h-4 w-28 rounded mx-auto" style={{ background: '#1c1c1e' }} />
          </div>
          <div className="grid grid-cols-2 gap-3 p-3">
            {[1,2,3,4,5,6].map((i) => (
              <div key={i} className="p-3">
                <div className="flex items-center gap-2">
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 w-full rounded" style={{ background: '#1c1c1e' }} />
                    <div className="h-3 w-4/5 rounded" style={{ background: '#1c1c1e' }} />
                    <div className="h-3 w-2/3 rounded" style={{ background: '#1c1c1e' }} />
                    <div className="h-3 w-1/2 rounded" style={{ background: '#242424' }} />
                  </div>
                  <div className="flex-shrink-0 rounded-xl" style={{ width: 80, height: 80, background: '#1c1c1e' }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Tarjeta producto (horizontal: texto izq + imagen der) ──
function ProductoCard({ prod, color, onAbrirDetalle }) {
  const sinStock = prod.stock !== null && prod.stock !== undefined && prod.stock === 0

  // Verificar descuento
  const tieneDescuento = prod.descuento && prod.descuento.activo
  const descuento = tieneDescuento ? prod.descuento : null

  // Precio base
  const precioBase = prod.variantes?.length > 0
    ? Math.min(...prod.variantes.map(v => parseFloat(v.precioVenta)))
    : parseFloat(prod.precioVenta)

  // Calcular precio con descuento
  let precioMostrar = precioBase
  let montoDescuento = 0
  if (descuento) {
    montoDescuento = descuento.tipo === 'porcentaje'
      ? (precioBase * parseFloat(descuento.valor)) / 100
      : parseFloat(descuento.valor)
    precioMostrar = Math.max(0, precioBase - montoDescuento)
  }

  const tieneVariantes = prod.variantes?.length > 0

  return (
    <div
      onClick={() => !sinStock && onAbrirDetalle(prod)}
      className={`flex items-center gap-3 p-3.5 sm:p-4 cursor-pointer transition-all duration-200 rounded-xl ${sinStock ? 'opacity-50' : ''}`}
      style={{
        background: 'rgba(255,255,255,0.03)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
        border: '1px solid rgba(255,255,255,0.05)'
      }}
      onMouseEnter={e => {
        if (!sinStock) {
          e.currentTarget.style.background = 'rgba(255,255,255,0.06)'
          e.currentTarget.style.transform = 'translateY(-1px)'
          e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)'
        }
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = 'rgba(255,255,255,0.03)'
        e.currentTarget.style.transform = 'translateY(0)'
        e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.12)'
      }}>

      {/* Texto izquierda */}
      <div className="flex-1 min-w-0">
        <h3 className="font-bold text-white leading-tight mb-2 line-clamp-2 text-sm sm:text-base"
            style={{ letterSpacing: '-0.01em' }}>
          {prod.nombre}
        </h3>
        {prod.descripcion && (
          <p className="product-description line-clamp-3 mb-2.5 leading-relaxed text-[11px] sm:text-xs"
             style={{ color: '#a1a1aa', fontWeight: '400' }}>
            {prod.descripcion}
          </p>
        )}
        <div className="flex items-center gap-2 flex-wrap">
          {descuento && (
            <>
              <span className="line-through font-medium text-[10px] sm:text-xs" style={{ color: '#6b7280' }}>
                $ {precioBase.toLocaleString('es-AR')}
              </span>
              <span className="px-2 py-0.5 rounded-full font-bold text-[9px] sm:text-[10px]"
                style={{
                  background: `linear-gradient(135deg, ${color} 0%, ${color}dd 100%)`,
                  color: '#fff',
                  boxShadow: `0 2px 4px ${color}40`
                }}>
                -{descuento.tipo === 'porcentaje' ? `${descuento.valor}%` : `$${Number(descuento.valor).toLocaleString('es-AR')}`}
              </span>
            </>
          )}
          <span className="font-black text-base sm:text-lg" style={{ color, letterSpacing: '-0.02em' }}>
            $ {precioMostrar.toLocaleString('es-AR')}
          </span>
          {tieneVariantes && <span className="text-[10px] sm:text-xs font-medium" style={{ color: '#9ca3af' }}>desde</span>}
          {sinStock && (
            <span className="px-2 py-0.5 rounded-full font-bold text-[9px] sm:text-[10px]"
                  style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444' }}>
              Agotado
            </span>
          )}
        </div>
      </div>

      {/* Imagen derecha */}
      <div className="relative flex-shrink-0 rounded-xl overflow-hidden w-20 h-20 sm:w-24 sm:h-24"
           style={{
             background: '#1a1a1a',
             boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
             border: '1px solid rgba(255,255,255,0.08)'
           }}>
        {prod.imagen
          ? <img src={prod.imagen} alt={prod.nombre} className="w-full h-full object-cover" />
          : <div className="w-full h-full flex items-center justify-center text-2xl sm:text-3xl" style={{ filter: 'grayscale(0.3)' }}>
              🍔
            </div>
        }
        {!sinStock && (
          <div className="absolute bottom-1.5 right-1.5 w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center text-white font-black text-sm sm:text-base"
            style={{
              background: `linear-gradient(135deg, ${color} 0%, ${color}dd 100%)`,
              boxShadow: `0 2px 8px ${color}60, 0 0 0 2px rgba(0,0,0,0.3)`
            }}>
            +
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Carrusel productos destacados ───────────────────────
function CarruselDestacados({ productos, color, onAbrirDetalle }) {
  const scrollRef = useRef(null)

  const scroll = (dir) => {
    scrollRef.current?.scrollBy({ left: dir * 220, behavior: 'smooth' })
  }

  return (
    <div className="px-2 md:px-5 pb-3 md:pb-4">
      {/* Encabezado con título y flechas */}
      <div className="flex items-center justify-between mb-2 md:mb-3">
        <div className="flex items-center gap-1.5 md:gap-2">
          <svg className="w-3.5 h-3.5 md:w-4 md:h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24" style={{ color }}>
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
          </svg>
          <span className="text-xs sm:text-sm font-black text-white uppercase tracking-wide">Productos destacados</span>
        </div>
        <div className="flex gap-1.5">
          <button onClick={() => scroll(-1)}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-90"
            style={{ background: '#1c1c1e', border: '1px solid #2c2c2e' }}>
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button onClick={() => scroll(1)}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-90"
            style={{ background: '#1c1c1e', border: '1px solid #2c2c2e' }}>
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Track horizontal */}
      <div ref={scrollRef}
        className="flex gap-3 sm:gap-4 overflow-x-auto no-scrollbar pb-2">
        {productos.map(prod => {
          const sinStock = prod.stock !== null && prod.stock !== undefined && prod.stock === 0
          const precio = prod.variantes?.length > 0
            ? Math.min(...prod.variantes.map(v => parseFloat(v.precioVenta)))
            : parseFloat(prod.precioVenta)
          const tieneVariantes = prod.variantes?.length > 0

          return (
            <div key={prod.id}
              onClick={() => !sinStock && onAbrirDetalle(prod)}
              className={`flex-shrink-0 cursor-pointer rounded-2xl overflow-hidden transition-all ${sinStock ? 'opacity-50' : ''}`}
              style={{
                width: 180,
                background: '#000',
                border: '1px solid rgba(255,255,255,0.12)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
              }}
              onMouseEnter={e => {
                if (!sinStock) {
                  e.currentTarget.style.transform = 'translateY(-4px)'
                  e.currentTarget.style.boxShadow = `0 8px 20px rgba(0,0,0,0.4), 0 0 0 2px ${color}40`
                }
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)'
              }}>

              {/* Imagen cuadrada */}
              <div className="relative w-full h-44 sm:h-48" style={{ background: '#1a1a1a' }}>
                {prod.imagen
                  ? <img src={prod.imagen} alt={prod.nombre} className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center text-4xl sm:text-5xl">🍔</div>
                }
                {!sinStock && (
                  <div className="absolute bottom-3 right-3 w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-white font-black text-base sm:text-lg"
                    style={{
                      background: `linear-gradient(135deg, ${color} 0%, ${color}dd 100%)`,
                      boxShadow: `0 3px 10px ${color}60, 0 0 0 3px rgba(0,0,0,0.3)`
                    }}>
                    +
                  </div>
                )}
                {sinStock && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                    <span className="px-3 py-1.5 rounded-full text-xs font-bold"
                          style={{ background: 'rgba(239,68,68,0.2)', color: '#ef4444', border: '1px solid #ef4444' }}>
                      Agotado
                    </span>
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="p-3 sm:p-4">
                <h3 className="font-bold text-white leading-tight line-clamp-2 mb-1.5 text-sm sm:text-base"
                    style={{ letterSpacing: '-0.01em' }}>
                  {prod.nombre}
                </h3>
                {prod.descripcion && (
                  <p className="product-description line-clamp-2 mb-2 leading-relaxed text-xs sm:text-sm"
                     style={{ color: '#9ca3af' }}>
                    {prod.descripcion}
                  </p>
                )}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-black text-base sm:text-lg" style={{ color, letterSpacing: '-0.02em' }}>
                    $ {precio.toLocaleString('es-AR')}
                  </span>
                  {tieneVariantes && <span className="text-[9px] sm:text-[10px]" style={{ color: '#636366' }}>desde</span>}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Modal detalle del producto ───────────────────────────
function ModalDetalle({ prod, color, onClose, onAgregar }) {
  const tieneVariantes = prod.variantes?.length > 0
  const [varianteSeleccionada, setVarianteSeleccionada] = useState(
    tieneVariantes ? null : { id: null, nombre: null, precioVenta: prod.precioVenta }
  )
  const [adicionales, setAdicionales] = useState({})
  const [nota, setNota] = useState('')
  const [cantidad, setCantidad] = useState(1)
  const [gruposAbiertos, setGruposAbiertos] = useState({})

  const grupos = prod.gruposAdicionales || []

  const gruposObligatoriosPendientes = grupos.filter(g => {
    if (!g.obligatorio) return false
    const sel = adicionales[g.id] || []
    return sel.length < (g.minSeleccion || 1)
  })

  // Verificar descuento del producto
  const tieneDescuento = prod.descuento && prod.descuento.activo
  const descuento = tieneDescuento ? prod.descuento : null

  // Calcular precio base (con descuento si aplica)
  const precioBaseOriginal = varianteSeleccionada ? parseFloat(varianteSeleccionada.precioVenta) : 0
  let precioBase = precioBaseOriginal
  let montoDescuento = 0
  if (descuento && precioBaseOriginal > 0) {
    montoDescuento = descuento.tipo === 'porcentaje'
      ? (precioBaseOriginal * parseFloat(descuento.valor)) / 100
      : parseFloat(descuento.valor)
    precioBase = Math.max(0, precioBaseOriginal - montoDescuento)
  }
  const precioAdicionales = grupos.reduce((total, g) => {
    const sel = adicionales[g.id] || []
    return total + sel.reduce((s, aId) => {
      const item = g.items?.find(i => i.id === aId)
      return s + (item ? parseFloat(item.precioVenta) : 0)
    }, 0)
  }, 0)
  const precioTotal = (precioBase + precioAdicionales) * cantidad

  const toggleAdicional = (grupoId, adicionalId, maxSeleccion) => {
    setAdicionales(prev => {
      const current = prev[grupoId] || []
      if (current.includes(adicionalId)) return { ...prev, [grupoId]: current.filter(id => id !== adicionalId) }
      if (maxSeleccion === 1) return { ...prev, [grupoId]: [adicionalId] }
      if (current.length >= maxSeleccion) return prev
      return { ...prev, [grupoId]: [...current, adicionalId] }
    })
  }

  const canConfirm = (!tieneVariantes || varianteSeleccionada) && gruposObligatoriosPendientes.length === 0

  const handleAgregar = () => {
    if (!canConfirm) {
      if (!varianteSeleccionada) return toast.error('Elegí una opción')
      return toast.error(`Completá: ${gruposObligatoriosPendientes.map(g => g.titulo).join(', ')}`)
    }
    const adicionalesArray = grupos.flatMap(g => {
      const sel = adicionales[g.id] || []
      return sel.map(aId => {
        const item = g.items?.find(i => i.id === aId)
        return { adicionalId: aId, grupoTitulo: g.titulo, nombre: item?.nombre || '', cantidad: 1 }
      })
    })
    onAgregar({
      ...prod,
      _key: `${prod.id}-${varianteSeleccionada?.id || 'base'}-${Date.now()}`,
      varianteId: varianteSeleccionada?.id || null,
      varianteNombre: varianteSeleccionada?.nombre || null,
      precioVenta: precioBase + precioAdicionales,
      adicionales: adicionalesArray,
      notaProducto: nota,
      cantidad,
      categoriaNombre: prod.categoriaNombre || prod._categoriaNombre
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: 'rgba(0,0,0,0.85)' }} onClick={onClose}>
      <div className="w-full md:max-w-lg rounded-t-3xl flex flex-col modal-enter no-scrollbar px-0 md:px-0"
        style={{ background: '#111', maxHeight: '93vh', boxShadow: '0 -20px 80px rgba(0,0,0,0.9)', border: '1px solid #222' }}
        onClick={e => e.stopPropagation()}>

        {/* Imagen o header */}
        {prod.imagen ? (
          <div className="relative w-full flex-shrink-0" style={{ height: 220 }}>
            <img src={prod.imagen} alt={prod.nombre} className="w-full h-full object-cover rounded-t-3xl" />
            <div className="absolute inset-0 rounded-t-3xl" style={{ background: 'linear-gradient(to bottom, transparent 50%, #111 100%)' }} />
            <button onClick={onClose} className="absolute top-4 right-4 w-9 h-9 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}>
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ) : (
          <div className="flex justify-end px-5 pt-4 flex-shrink-0">
            <button onClick={onClose} className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: '#222' }}>
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto no-scrollbar">
          <div className="px-5 pt-3 pb-3">
            <h2 className="text-xl font-black text-white leading-tight">{prod.nombre}</h2>
            {prod.descripcion && <p className="text-sm mt-1 leading-relaxed" style={{ color: '#8e8e93' }}>{prod.descripcion}</p>}
          </div>

          <div className="px-5 pb-4 space-y-3">
            {/* Variantes */}
            {tieneVariantes && prod.variantes.map(v => {
              const sel = varianteSeleccionada?.id === v.id

              // Calcular precio con descuento para esta variante
              const precioVarianteOriginal = parseFloat(v.precioVenta)
              let precioVariante = precioVarianteOriginal
              if (descuento) {
                const montoDescVar = descuento.tipo === 'porcentaje'
                  ? (precioVarianteOriginal * parseFloat(descuento.valor)) / 100
                  : parseFloat(descuento.valor)
                precioVariante = Math.max(0, precioVarianteOriginal - montoDescVar)
              }

              return (
                <button key={v.id} onClick={() => setVarianteSeleccionada(v)}
                  className="w-full flex items-center justify-between px-4 py-3.5 rounded-2xl transition-all text-left"
                  style={sel
                    ? { background: `${color}18`, border: `2px solid ${color}` }
                    : { background: '#1c1c1e', border: '2px solid #2c2c2e' }}>
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                      style={{ borderColor: sel ? color : '#4b5563' }}>
                      {sel && <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />}
                    </div>
                    <span className="font-semibold text-white text-sm">{v.nombre}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {descuento && (
                      <>
                        <span className="line-through text-xs" style={{ color: '#636366' }}>
                          $ {precioVarianteOriginal.toLocaleString('es-AR')}
                        </span>
                        <span className="px-1.5 py-0.5 rounded-full font-bold text-white"
                          style={{ fontSize: 9, background: color }}>
                          -{descuento.tipo === 'porcentaje' ? `${descuento.valor}%` : `$${Number(descuento.valor).toLocaleString('es-AR')}`}
                        </span>
                      </>
                    )}
                    <span className="font-bold text-sm" style={{ color }}>
                      $ {precioVariante.toLocaleString('es-AR')}
                    </span>
                  </div>
                </button>
              )
            })}

            {/* Grupos adicionales */}
            {grupos.map(grupo => {
              const sel = adicionales[grupo.id] || []
              const abierto = gruposAbiertos[grupo.id] !== false
              const esSingle = grupo.maxSeleccion === 1

              return (
                <div key={grupo.id} className="rounded-2xl overflow-hidden" style={{ border: '1px solid #2c2c2e' }}>
                  <button onClick={() => setGruposAbiertos(p => ({ ...p, [grupo.id]: !abierto }))}
                    className="w-full flex items-center justify-between px-4 py-3 text-left"
                    style={{ background: '#1a1a1a' }}>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm">{grupo.titulo}</span>
                        {grupo.obligatorio && (
                          <span className="text-xs px-2 py-0.5 rounded-full font-bold" style={{ background: '#ef44441a', color: '#ef4444' }}>Requerido</span>
                        )}
                      </div>
                      <p className="text-xs mt-0.5" style={{ color: '#8e8e93' }}>
                        {esSingle ? 'Elegí 1' : `Hasta ${grupo.maxSeleccion}`}{sel.length > 0 && ` · ${sel.length} sel.`}
                      </p>
                    </div>
                    <svg className={`w-5 h-5 transition-transform ${abierto ? 'rotate-180' : ''}`} style={{ color: '#8e8e93' }}
                      fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {abierto && (grupo.items || []).map(item => {
                    const activo = sel.includes(item.id)
                    return (
                      <button key={item.id} onClick={() => toggleAdicional(grupo.id, item.id, grupo.maxSeleccion)}
                        className="w-full flex items-center justify-between px-4 py-3 text-left transition-colors"
                        style={{ borderTop: '1px solid #2c2c2e', background: activo ? `${color}0a` : 'transparent' }}>
                        <div className="flex items-center gap-3">
                          {esSingle ? (
                            <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                              style={{ borderColor: activo ? color : '#4b5563' }}>
                              {activo && <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />}
                            </div>
                          ) : (
                            <div className="w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0"
                              style={{ borderColor: activo ? color : '#4b5563', backgroundColor: activo ? color : 'transparent' }}>
                              {activo && <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>}
                            </div>
                          )}
                          <span className="text-sm text-white">{item.nombre}</span>
                        </div>
                        {parseFloat(item.precioVenta) > 0 && (
                          <span className="text-sm font-semibold" style={{ color }}>+ $ {Number(item.precioVenta).toLocaleString('es-AR')}</span>
                        )}
                      </button>
                    )
                  })}
                </div>
              )
            })}

            {/* Nota */}
            <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid #2c2c2e' }}>
              <div className="px-4 py-3" style={{ background: '#1a1a1a', borderBottom: '1px solid #2c2c2e' }}>
                <span className="font-bold text-white text-sm">Nota al producto</span>
              </div>
              <textarea value={nota} onChange={e => setNota(e.target.value)} rows={2}
                placeholder="Aclará lo que necesites..."
                className="w-full px-4 py-3 text-sm text-white resize-none focus:outline-none"
                style={{ background: '#111' }} />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 flex-shrink-0" style={{ borderTop: '1px solid #222', background: '#111' }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <button onClick={() => setCantidad(c => Math.max(1, c - 1))}
                className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-lg transition-all active:scale-90"
                style={{ border: `2px solid ${color}`, color }}>−</button>
              <span className="w-6 text-center font-black text-white text-base">{cantidad}</span>
              <button onClick={() => setCantidad(c => c + 1)}
                className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-lg transition-all active:scale-90"
                style={{ backgroundColor: color }}>+</button>
            </div>
            <span className="text-lg font-black text-white">$ {precioTotal.toLocaleString('es-AR')}</span>
          </div>
          <button onClick={handleAgregar} disabled={!canConfirm}
            className="w-full py-4 rounded-2xl font-black text-base text-white transition-all active:scale-95 disabled:opacity-40"
            style={{ background: canConfirm ? color : '#333' }}>
            {canConfirm ? 'Agregar al pedido' : tieneVariantes && !varianteSeleccionada ? 'Elegí una opción' : `Completá: ${gruposObligatoriosPendientes[0]?.titulo || ''}`}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Verifica si el local está abierto según horarios ────
const DIAS_MAP = { 0: 'Domingo', 1: 'Lunes', 2: 'Martes', 3: 'Miércoles', 4: 'Jueves', 5: 'Viernes', 6: 'Sábado' }
function estaAbiertoPorHorarios(horarios) {
  if (!horarios || horarios.length === 0) return true
  const ahora = new Date()
  const diaActual = DIAS_MAP[ahora.getDay()]
  const diaHorario = horarios.find(h => h.dia === diaActual)
  if (!diaHorario || diaHorario.cerrado) return false
  if (!diaHorario.turnos || diaHorario.turnos.length === 0) return false
  const minActual = ahora.getHours() * 60 + ahora.getMinutes()
  return diaHorario.turnos.some(t => {
    if (!t.apertura || !t.cierre) return false
    const [aH, aM] = t.apertura.split(':').map(Number)
    const [cH, cM] = t.cierre.split(':').map(Number)
    const ap = aH * 60 + aM
    const ci = cH * 60 + cM
    if (ci < ap) return minActual >= ap || minActual <= ci // turno que cruza medianoche
    return minActual >= ap && minActual <= ci
  })
}

// ─── Helpers zona entrega ─────────────────────────────────
function puntoEnPoligono(punto, poligono) {
  let dentro = false, j = poligono.length - 1
  for (let i = 0; i < poligono.length; i++) {
    const xi = poligono[i].lat, yi = poligono[i].lng
    const xj = poligono[j].lat, yj = poligono[j].lng
    if ((yi > punto.lng) !== (yj > punto.lng) &&
      punto.lat < ((xj - xi) * (punto.lng - yi)) / (yj - yi) + xi) dentro = !dentro
    j = i
  }
  return dentro
}
function haversineKm(a, b) {
  const R = 6371, dLat = (b.lat - a.lat) * Math.PI / 180, dLng = (b.lng - a.lng) * Math.PI / 180
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s))
}
function detectarZonaEntrega(punto, negocioCoords, zonas) {
  for (let i = 0; i < zonas.length; i++) {
    const z = { tipo: 'poligono', radioKm: 0, coordenadas: [], ...zonas[i] }
    if (z.tipo === 'radio' && negocioCoords && z.radioKm > 0) {
      if (haversineKm(punto, negocioCoords) <= z.radioKm) return { idx: i, zona: z }
    } else if (z.coordenadas?.length >= 3) {
      if (puntoEnPoligono(punto, z.coordenadas)) return { idx: i, zona: z }
    }
  }
  return null
}
function calcularCostoZona(zona, coordsCliente, negocioCoords) {
  if (!zona) return 0
  if (zona.tipoCosto === 'variable' && coordsCliente && negocioCoords) {
    const km = haversineKm(coordsCliente, negocioCoords)
    return Math.round(Number(zona.costo || 0) + Math.max(0, km - Number(zona.kmGratis || 0)) * Number(zona.precioPorKm || 0))
  }
  return Number(zona.costo || 0)
}

// ─── Modal pedido ─────────────────────────────────────────
function ModalPedido({ negocio, carrito, setCarrito, modalidad, setModalidad, onClose, color }) {
  const [nombre, setNombre] = useState('')
  const [telefono, setTelefono] = useState('')
  const [direccion, setDireccion] = useState('')
  const [metodoPago, setMetodoPago] = useState('efectivo')
  const [notas, setNotas] = useState('')
  const [loading, setLoading] = useState(false)
  const [numeroPedido, setNumeroPedido] = useState(null)
  const [codigoCupon, setCodigoCupon] = useState('')
  const [cuponAplicado, setCuponAplicado] = useState(null)
  const [validandoCupon, setValidandoCupon] = useState(false)
  const [zonaSeleccionada, setZonaSeleccionada] = useState(null)
  const [propina, setPropina] = useState(0)
  const [propinaOtro, setPropinaOtro] = useState(false)
  const [propinaCustom, setPropinaCustom] = useState('')
  const [zonaDetectada, setZonaDetectada] = useState(null)
  const [coordsCliente, setCoordsCliente] = useState(null)
  const [negocioCoordsLocal, setNegocioCoordsLocal] = useState(null)
  const [clienteReconocido, setClienteReconocido] = useState(null)
  const debounceClienteRef = useRef(null)

  // ✅ ✅ GUARDADO EN EL ESTADO, NUNCA MAS DESAPARECE
  const [carritoParaWhatsapp, setCarritoParaWhatsapp] = useState([])
  const [montosParaWhatsapp, setMontosParaWhatsapp] = useState({ subtotal: 0, descuento: 0, envio: 0, total: 0 })

  // Descuentos automáticos
  const [descuentosAutomaticos, setDescuentosAutomaticos] = useState([])

  const [modalMapaDir, setModalMapaDir] = useState(false)

  const abrirMapaDireccion = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setModalMapaDir({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => setModalMapaDir({ lat: -34.6037, lng: -58.3816 })
      )
    } else {
      setModalMapaDir({ lat: -34.6037, lng: -58.3816 })
    }
  }

  const confirmarDireccionMapa = (coords, dirDetectada, dirManual) => {
    setCoordsCliente(coords)
    setDireccion(dirManual || dirDetectada || direccion)
    setModalMapaDir(false)
    toast.success('📍 Ubicación confirmada')
    if (tieneZonasGeo) {
      const res2 = detectarZonaEntrega(coords, negocioCoordsLocal, zonas)
      setZonaDetectada(res2 || false)
      setZonaSeleccionada(res2 ? res2.idx : null)
    }
  }

  useEffect(() => {
    if (!negocio?.direccion) return
    const provincia = negocio?.configuracion?.provincia || ''
    const addr = [negocio.direccion, negocio.ciudad, provincia, 'Argentina'].filter(Boolean).join(', ')
    fetch(`/api/maps/geocode?${new URLSearchParams({ address: addr })}`)
      .then(r => r.json())
      .then(d => { if (d?.results?.[0]?.geometry?.location) setNegocioCoordsLocal(d.results[0].geometry.location) })
      .catch(() => {})
  }, [negocio?.direccion, negocio?.ciudad, negocio?.configuracion?.provincia])

  // Cargar descuentos automáticos cuando cambian modalidad, metodoPago o subtotal
  useEffect(() => {
    if (!negocio?.slug || !modalidad || !metodoPago || carrito.length === 0) {
      setDescuentosAutomaticos([])
      return
    }

    const subtotalActual = carrito.reduce((s, i) => s + i.precioVenta * i.cantidad, 0)

    api.get(`/menu/${negocio.slug}/descuentos-automaticos`, {
      params: { modalidad, metodoPago, subtotal: subtotalActual }
    })
      .then(({ data }) => {
        if (data.success && data.descuentos) {
          setDescuentosAutomaticos(data.descuentos)
        }
      })
      .catch(err => {
        console.error('Error cargando descuentos automáticos:', err)
        setDescuentosAutomaticos([])
      })
  }, [negocio?.slug, modalidad, metodoPago, carrito])

  const buscarCliente = (campo, valor) => {
    clearTimeout(debounceClienteRef.current)
    if (valor.trim().length < 6) return
    debounceClienteRef.current = setTimeout(async () => {
      try {
        const param = campo === 'telefono' ? `telefono=${encodeURIComponent(valor.trim())}` : `nombre=${encodeURIComponent(valor.trim())}`
        const { data } = await api.get(`/menu/${negocio.slug}/cliente?${param}`)
        if (data.cliente) {
          setClienteReconocido(data.cliente)
          if (campo === 'telefono' && !nombre) setNombre(data.cliente.nombre)
          if (campo === 'nombre' && !telefono) setTelefono(data.cliente.telefono || '')
          if (data.cliente.direccion && modalidad === 'delivery' && !direccion) setDireccion(data.cliente.direccion)
        } else {
          setClienteReconocido(null)
        }
      } catch { setClienteReconocido(null) }
    }, 600)
  }

  const conf = negocio?.configuracion || {}
  const zonas = (conf.zonasEntrega || []).filter(z => z.nombre)
  const tieneZonasGeo = zonas.some(z => (z.tipo === 'radio' && z.radioKm > 0) || (z.coordenadas?.length >= 3))
  const costoEnvio = modalidad === 'delivery'
    ? tieneZonasGeo
      ? (zonaDetectada ? calcularCostoZona(zonaDetectada.zona, coordsCliente, negocioCoordsLocal) : 0)
      : zonaSeleccionada !== null ? (zonas[zonaSeleccionada]?.costo || 0) : (conf.costoEnvio || 0)
    : 0
  const subtotal = carrito.reduce((s, i) => s + i.precioVenta * i.cantidad, 0)
  const descuentoAutomaticoMonto = descuentosAutomaticos.reduce((sum, d) => sum + (d.monto || 0), 0)
  const descuentoMonto = (cuponAplicado?.montoDescuento || 0) + descuentoAutomaticoMonto
  const total = Math.max(0, subtotal + costoEnvio + propina - descuentoMonto)
  const montoMinimo = Number(conf.montoMinimo) || 0
  const bajoMinimo = montoMinimo > 0 && subtotal < montoMinimo

  const ALL_METODOS_MENU = [
    { key: 'efectivo', label: 'Efectivo', icon: '💵' },
    { key: 'tarjeta_de_crédito', label: 'Tarjeta de crédito', icon: '💳' },
    { key: 'tarjeta_de_débito', label: 'Tarjeta de débito', icon: '💳' },
    { key: 'transferencia', label: 'Transferencia', icon: '🏦' },
    { key: 'mercado_pago', label: 'Mercado Pago', icon: '💰' },
    { key: 'modo', label: 'MODO', icon: '📱' },
    { key: 'nave', label: 'Nave', icon: '🚀' },
    { key: 'bnaplus', label: 'BNA+', icon: '🏦' },
    { key: 'cuenta_dni', label: 'Cuenta DNI', icon: '🪪' },
    { key: 'dividir_pago', label: 'Dividir pago', icon: '✂️' },
  ]
  const metodos = ALL_METODOS_MENU.map(m => {
    const cfg = conf.metodosPago?.[m.key]
    if (!cfg) return null
    const isActive = typeof cfg === 'boolean' ? cfg : cfg.activo === true
    if (!isActive) return null
    const label = (typeof cfg === 'object' && cfg.nombrePersonalizado) ? cfg.nombrePersonalizado : m.label
    const disp = typeof cfg === 'object' ? cfg.disponibleEn : null
    if (disp && disp.length < 3 && modalidad && !disp.includes(modalidad)) return null
    return { id: m.key, key: m.key, label, icon: m.icon }
  }).filter(Boolean)

  const modalidades = [
    conf.modalidades?.delivery && { id: 'delivery', label: 'Delivery' },
    conf.modalidades?.takeaway && { id: 'takeaway', label: 'Retirar' },
  ].filter(Boolean)

  const aplicarCupon = async () => {
    if (!codigoCupon.trim()) return
    setValidandoCupon(true)
    try {
      const { data } = await api.post(`/menu/${negocio.slug}/cupon`, { codigo: codigoCupon.trim().toUpperCase(), total: subtotal })
      setCuponAplicado({ codigo: codigoCupon.trim().toUpperCase(), montoDescuento: data.montoDescuento })
      toast.success(`Cupón aplicado: -$${data.montoDescuento.toLocaleString('es-AR')}`)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Cupón inválido')
      setCuponAplicado(null)
    } finally { setValidandoCupon(false) }
  }

  const confirmar = async () => {
    // ✅ ✅ GUARDAMOS TODO ANTES DE TODO, NUNCA MAS $0
    setCarritoParaWhatsapp([...carrito])
    setMontosParaWhatsapp({ 
      subtotal: subtotal, 
      descuento: descuentoMonto, 
      envio: costoEnvio, 
      total: total 
    })
    
    if (!nombre.trim()) return toast.error('Ingresá tu nombre')
    if (conf.datosClienteObligatorios && !telefono.trim()) return toast.error('Ingresá tu teléfono')
    if (modalidad === 'delivery' && !direccion.trim()) return toast.error('Ingresá tu dirección')
    if (bajoMinimo) return toast.error(`Monto mínimo: $${montoMinimo.toLocaleString('es-AR')}`)
    if (modalidad === 'delivery' && tieneZonasGeo && coordsCliente && zonaDetectada === false)
      return toast.error('No realizamos envíos a esa dirección')
    
    setLoading(true)
    try {
      const zonaInfo = tieneZonasGeo
        ? (zonaDetectada ? zonaDetectada.zona : null)
        : (zonas.length > 0 && zonaSeleccionada !== null ? zonas[zonaSeleccionada] : null)
      const { data } = await api.post(`/menu/${negocio.slug}/pedido`, {
        modalidad, clienteNombre: nombre, clienteTelefono: telefono,
        clienteDireccion: direccion,
        clienteLat: coordsCliente?.lat || null,
        clienteLng: coordsCliente?.lng || null,
        metodoPago, notas,
        propina: propina || 0,
        codigoCupon: cuponAplicado?.codigo || '',
        zonaEntrega: zonaInfo?.nombre || '',
        costoEnvioCustom: modalidad === 'delivery' && costoEnvio > 0 ? costoEnvio : undefined,
        items: carrito.map(i => ({
          productoId: i.id, cantidad: i.cantidad,
          varianteId: i.varianteId || null,
          adicionales: i.adicionales || [],
          notas: i.notaProducto || ''
        }))
      })

      // Si el método de pago es MercadoPago, redirigir a la página de pago
      if (metodoPago === 'mercado_pago' || metodoPago === 'mercadopago') {
        const { data: pagoData } = await api.post('/api/pagos/iniciar-pago-mp', {
          pedidoId: data.pedido.id
        })
        window.location.href = pagoData.initPoint
      } else {
        // Flujo normal para otros métodos de pago
        setNumeroPedido(data.pedido.numero)
        setCarrito([])
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al enviar el pedido')
    } finally { setLoading(false) }
  }

  const inputCls = "w-full px-4 py-3.5 rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none"
  const inputStyle = { background: '#1c1c1e', border: '1px solid #2c2c2e' }

  if (numeroPedido) return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: 'rgba(0,0,0,0.9)' }}>
      <div className="w-full max-w-lg rounded-t-3xl p-8 text-center modal-enter" style={{ background: '#111', border: '1px solid #222' }}>
        <div className="pop-in mb-6">
          <div className="w-24 h-24 rounded-full flex items-center justify-center mx-auto"
            style={{ background: `${color}18`, border: `2px solid ${color}50` }}>
            <svg className="w-12 h-12" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <path className="check-path" d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>
        <h2 className="text-3xl font-black text-white mb-2">¡Pedido enviado!</h2>
        <p className="text-sm mb-8" style={{ color: '#8e8e93' }}>El local recibió tu pedido.</p>
        <div className="rounded-2xl py-6 px-4 mb-6" style={{ background: '#1a1a1a', border: '1px solid #2c2c2e' }}>
          <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: '#8e8e93' }}>Número de pedido</p>
          <p className="text-6xl font-black" style={{ color }}>#{numeroPedido}</p>
        </div>
          <div className="text-center mb-6">
            <p className="text-sm mb-2" style={{ color: '#8e8e93' }}>Para finalizar, confirma el pedido por WhatsApp.</p>
          </div>

         <a
            href={`https://wa.me/${negocio.telefono?.replace(/\D/g, '')}?text=${encodeURIComponent(`*${modalidad.toUpperCase()} #${numeroPedido}*\n\nHola, soy ${nombre}\n\n${(() => {
              // ✅ ✅ AGRUPAR PRODUCTOS POR CATEGORIA
              const categorias = {}
              carritoParaWhatsapp.forEach(i => {
                const cat = i.categoriaNombre || 'PRODUCTOS'
                if (!categorias[cat]) categorias[cat] = []
                categorias[cat].push(i)
              })

              let textoProductos = ''
              Object.entries(categorias).forEach(([cat, items]) => {
                textoProductos += `=== ${cat.toUpperCase()} ===\n`
                items.forEach(i => {
                  textoProductos += `${i.cantidad} ${i.nombre}\n`
                  if (i.varianteNombre) textoProductos += `   - ${i.varianteNombre}\n`
                  if (i.adicionales?.length) i.adicionales.forEach(a => textoProductos += `   - ${a.nombre.replace(/\.$/, '')}\n`)
                  if (i.notaProducto) textoProductos += `   Nota: ${i.notaProducto}\n`
                  textoProductos += '\n'
                })
              })

            return textoProductos.trim()
          })()}\n\n=== RESUMEN ===\nProductos: $${montosParaWhatsapp.subtotal.toLocaleString('es-AR')}${montosParaWhatsapp.descuento > 0 ? `\nDescuento: $${montosParaWhatsapp.descuento.toLocaleString('es-AR')}` : ''}${modalidad === 'delivery' ? `\nEnvio: $${montosParaWhatsapp.envio.toLocaleString('es-AR')}` : ''}\n\nTOTAL: $${montosParaWhatsapp.total.toLocaleString('es-AR')}\nPago: ${metodoPago}\n\n${modalidad === 'delivery' ? `Direccion: ${direccion}\n` : ''}Telefono: ${telefono}`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-4 rounded-2xl font-black text-base text-white block"
            style={{ background: color }}>
            ✅ Finalizar por WhatsApp
          </a>
      </div>
    </div>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: 'rgba(0,0,0,0.85)' }} onClick={onClose}>
      <div className="w-full md:max-w-lg rounded-t-3xl flex flex-col modal-enter"
        style={{ background: '#111', maxHeight: '95vh', boxShadow: '0 -20px 80px rgba(0,0,0,0.9)', border: '1px solid #222' }}
        onClick={e => e.stopPropagation()}>

        <div className="flex items-center justify-between px-4 md:px-5 py-4 flex-shrink-0" style={{ borderBottom: '1px solid #222' }}>
          <h3 className="font-black text-white text-base md:text-lg">
            Pedido de {modalidad === 'delivery' ? 'delivery' : 'retiro'}
          </h3>
          <button onClick={onClose} className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: '#222' }}>
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {modalidades.length > 1 && (
          <div className="px-4 md:px-5 py-3 flex gap-2 flex-shrink-0" style={{ borderBottom: '1px solid #222' }}>
            {modalidades.map(m => (
              <button key={m.id} onClick={() => setModalidad(m.id)}
                className="flex-1 py-2 md:py-2.5 rounded-xl text-xs md:text-sm font-bold transition-all"
                style={modalidad === m.id
                  ? { background: color, color: '#fff' }
                  : { background: '#1c1c1e', color: '#8e8e93', border: '1px solid #2c2c2e' }}>
                {m.label}
              </button>
            ))}
          </div>
        )}

        <div className="flex-1 overflow-y-auto no-scrollbar px-4 md:px-5 py-4 space-y-3 md:space-y-4">
          {/* Productos */}
          <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid #2c2c2e' }}>
            <div className="px-3 md:px-4 py-3 flex items-center justify-between" style={{ background: '#1a1a1a', borderBottom: '1px solid #2c2c2e' }}>
              <span className="text-xs md:text-sm font-bold text-white">{carrito.reduce((s,i) => s+i.cantidad,0)} Producto{carrito.reduce((s,i) => s+i.cantidad,0) !== 1 ? 's' : ''}</span>
            </div>
            <div className="grid grid-cols-[2fr_auto_auto] sm:grid-cols-3 px-3 md:px-4 py-2 text-[10px] sm:text-xs font-semibold" style={{ color: '#8e8e93', background: '#161616', borderBottom: '1px solid #2c2c2e' }}>
              <span>Item</span><span className="text-center">Cant.</span><span className="text-right">Precio</span>
            </div>
            {carrito.map((item, idx) => (
              <div key={idx} className="flex items-start gap-3 px-4 py-3" style={{ borderTop: idx > 0 ? '1px solid #2c2c2e' : 'none' }}>
                {item.imagen
                  ? <img src={item.imagen} alt={item.nombre} className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                  : <div className="w-10 h-10 rounded-lg flex items-center justify-center text-lg flex-shrink-0" style={{ background: '#1c1c1e' }}>🍔</div>
                }
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white">{item.nombre}</p>
                  {item.varianteNombre && <p className="text-xs" style={{ color: '#8e8e93' }}>{item.varianteNombre}</p>}
                  {item.adicionales?.length > 0 && (
                    <p className="text-xs" style={{ color: '#8e8e93' }}>{item.adicionales.map(a => a.nombre).join(', ')}</p>
                  )}
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button onClick={() => setCarrito(c => c.map((i,j) => j===idx ? {...i, cantidad: i.cantidad-1} : i).filter(i => i.cantidad > 0))}
                    className="w-6 h-6 rounded-full flex items-center justify-center text-white text-sm font-bold"
                    style={{ background: '#2c2c2e' }}>−</button>
                  <span className="w-4 text-center text-sm font-bold text-white">{item.cantidad}</span>
                  <button onClick={() => setCarrito(c => c.map((i,j) => j===idx ? {...i, cantidad: i.cantidad+1} : i))}
                    className="w-6 h-6 rounded-full flex items-center justify-center text-white text-sm font-bold"
                    style={{ background: color }}>+</button>
                </div>
                <span className="text-sm font-bold text-white flex-shrink-0 ml-2">$ {(item.precioVenta * item.cantidad).toLocaleString('es-AR')}</span>
              </div>
            ))}
          </div>

          {/* Datos cliente */}
          <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid #2c2c2e' }}>
            <div className="px-4 py-3" style={{ background: '#1a1a1a', borderBottom: '1px solid #2c2c2e' }}>
              <span className="text-sm font-bold text-white">Tus datos</span>
            </div>
            <div className="p-4 space-y-3" style={{ background: '#111' }}>
              {clienteReconocido && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(124,58,237,0.3)' }}>
                  <span style={{ color: '#a78bfa' }}>✓</span>
                  <span className="text-xs font-semibold" style={{ color: '#c4b5fd' }}>Cliente frecuente reconocido</span>
                </div>
              )}
              <input value={nombre} onChange={e => { setNombre(e.target.value); buscarCliente('nombre', e.target.value) }} placeholder="Nombre y apellido *" className={inputCls} style={inputStyle} />
              <input type="tel" value={telefono} onChange={e => { setTelefono(e.target.value); buscarCliente('telefono', e.target.value) }} placeholder="Teléfono *" className={inputCls} style={inputStyle} />
              {modalidad === 'delivery' && (
                <div>
                  {/* Input dirección manual */}
                  <input
                    value={direccion}
                    onChange={e => setDireccion(e.target.value)}
                    placeholder="Dirección de entrega * (calle y número)"
                    className={inputCls}
                    style={inputStyle}
                  />

                  {/* Botón abrir mapa */}
                  <button
                    onClick={abrirMapaDireccion}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold mt-2 transition-all"
                    style={{ background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.4)', color: '#c4b5fd' }}>
                    <span>📍</span> Seleccionar ubicación en el mapa
                  </button>

                  {coordsCliente && (
                    <p className="text-xs mt-1" style={{ color: '#4ade80' }}>
                      ✓ Ubicación GPS guardada
                    </p>
                  )}
                </div>
              )}
              {/* Zone detection result */}
              {modalidad === 'delivery' && tieneZonasGeo && coordsCliente && (
                zonaDetectada
                  ? <div className="flex items-start gap-3 px-4 py-3 rounded-xl" style={{ background: '#0d2d1a', border: '1px solid #166534' }}>
                      <span className="text-green-400 mt-0.5">✓</span>
                      <div>
                        <p className="text-sm font-bold text-green-400">{zonaDetectada.zona.nombre}</p>
                        <p className="text-xs mt-0.5" style={{ color: '#4ade80' }}>
                          Envío: ${calcularCostoZona(zonaDetectada.zona, coordsCliente, negocioCoordsLocal).toLocaleString('es-AR')}
                          {zonaDetectada.zona.tipoCosto === 'variable' && ' · precio por km'}
                        </p>
                      </div>
                    </div>
                  : <div className="px-4 py-3 rounded-xl" style={{ background: '#2d0d0d', border: '1px solid #7f1d1d' }}>
                      <p className="text-sm font-bold text-red-400">No realizamos envíos a esa dirección</p>
                      <p className="text-xs mt-0.5" style={{ color: '#f87171' }}>Intentá con una dirección más cercana</p>
                    </div>
              )}
              {/* Manual zone picker — only when no geographic data configured */}
              {modalidad === 'delivery' && zonas.length > 0 && !tieneZonasGeo && (
                <div className="grid grid-cols-2 gap-2">
                  {zonas.map((z, i) => (
                    <button key={i} onClick={() => setZonaSeleccionada(i)}
                      className="py-3 px-3 rounded-xl text-sm font-semibold text-left transition-all"
                      style={zonaSeleccionada === i
                        ? { background: color, color: '#fff' }
                        : { background: '#1c1c1e', color: '#8e8e93', border: '1px solid #2c2c2e' }}>
                      <p className="font-bold">{z.nombre}</p>
                      <p className="text-xs opacity-80">$ {Number(z.costo).toLocaleString('es-AR')}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Método pago */}
          {metodos.length > 0 && (
            <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid #2c2c2e' }}>
              <div className="px-4 py-3" style={{ background: '#1a1a1a', borderBottom: '1px solid #2c2c2e' }}>
                <span className="text-sm font-bold text-white">Método de pago</span>
              </div>
              <div className="p-4 space-y-2" style={{ background: '#111' }}>
                {metodos.map(m => (
                  <button key={m.id} onClick={() => setMetodoPago(m.id)}
                    className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all text-left"
                    style={metodoPago === m.id
                      ? { background: `${color}18`, border: `2px solid ${color}` }
                      : { background: '#1c1c1e', border: '2px solid #2c2c2e' }}>
                    <span className="text-xl">{m.icon}</span>
                    <span className="font-semibold text-white text-sm flex-1">{m.label}</span>
                    {metodoPago === m.id && (
                      <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: color }}>
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Info transferencia */}
          {metodoPago === 'transferencia' && (() => {
            const cfgT = conf.metodosPago?.transferencia
            if (!cfgT || typeof cfgT === 'boolean' || (!cfgT.alias && !cfgT.titularCuenta)) return null
            return (
              <div className="rounded-2xl px-4 py-3 space-y-1 text-sm" style={{ background: '#0a2540', border: '1px solid #1e3a5f' }}>
                <p className="font-bold text-blue-300 text-xs uppercase tracking-wide mb-2">Datos para transferir</p>
                {cfgT.alias && <p style={{ color: '#8e9eb5' }}>Alias: <span className="font-bold text-white">{cfgT.alias}</span></p>}
                {cfgT.titularCuenta && <p style={{ color: '#8e9eb5' }}>Titular: <span className="font-bold text-white">{cfgT.titularCuenta}</span></p>}
              </div>
            )
          })()}

          {/* Propina */}
          {conf.aceptaPropinas && (
            <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid #2c2c2e' }}>
              <div className="px-4 py-3" style={{ background: '#1a1a1a', borderBottom: '1px solid #2c2c2e' }}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-white">Propina</span>
                  {propina > 0 && <span className="text-xs font-bold" style={{ color }}>${propina.toLocaleString('es-AR')}</span>}
                </div>
              </div>
              <div className="p-3 md:p-4 space-y-2" style={{ background: '#111' }}>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {[10, 15, 20].map(pct => {
                    const amt = Math.round(subtotal * pct / 100)
                    const selected = !propinaOtro && propina === amt
                    return (
                      <button key={pct} onClick={() => { setPropina(amt); setPropinaOtro(false); setPropinaCustom('') }}
                        className="py-2.5 sm:py-3 rounded-xl text-xs font-bold transition-all"
                        style={selected
                          ? { background: color, color: '#fff' }
                          : { background: '#1c1c1e', color: '#8e8e93', border: '1px solid #2c2c2e' }}>
                        {pct}%
                        <span className="block text-[10px] sm:text-xs mt-0.5 opacity-75">+${amt.toLocaleString('es-AR')}</span>
                      </button>
                    )
                  })}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button onClick={() => { setPropina(0); setPropinaOtro(false); setPropinaCustom('') }}
                    className="py-2.5 rounded-xl text-xs font-bold transition-all"
                    style={!propinaOtro && propina === 0
                      ? { background: '#3a3a3c', color: '#fff' }
                      : { background: '#1c1c1e', color: '#8e8e93', border: '1px solid #2c2c2e' }}>
                    Sin propina
                  </button>
                  <button onClick={() => { setPropinaOtro(true); setPropina(0); setPropinaCustom('') }}
                    className="py-2.5 rounded-xl text-xs font-bold transition-all"
                    style={propinaOtro
                      ? { background: color, color: '#fff' }
                      : { background: '#1c1c1e', color: '#8e8e93', border: '1px solid #2c2c2e' }}>
                    Otro monto
                  </button>
                </div>
                {propinaOtro && (
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white font-bold text-sm">$</span>
                    <input
                      type="number" min="0" inputMode="numeric"
                      value={propinaCustom}
                      onChange={e => { setPropinaCustom(e.target.value); setPropina(parseInt(e.target.value) || 0) }}
                      placeholder="Ingresá el monto"
                      className="w-full pl-8 pr-4 py-3.5 rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none"
                      style={{ background: '#1c1c1e', border: `1px solid ${color}` }}
                      autoFocus
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Descuentos automáticos */}
          {descuentosAutomaticos.length > 0 && (
            <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid #166534' }}>
              <div className="px-4 py-3" style={{ background: '#0d2d1a', borderBottom: '1px solid #166534' }}>
                <span className="text-sm font-bold text-green-400">✨ Descuentos aplicados</span>
              </div>
              <div className="p-4 space-y-2" style={{ background: '#0a1f12' }}>
                {descuentosAutomaticos.map((desc, idx) => (
                  <div key={idx} className="flex items-center justify-between text-sm">
                    <span className="text-green-300">{desc.descripcion}</span>
                    <span className="font-bold text-green-400">-$ {desc.monto.toLocaleString('es-AR')}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Cupón */}
          <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid #2c2c2e' }}>
            <div className="px-4 py-3" style={{ background: '#1a1a1a', borderBottom: '1px solid #2c2c2e' }}>
              <span className="text-sm font-bold text-white">Código promocional</span>
            </div>
            <div className="p-4" style={{ background: '#111' }}>
              {cuponAplicado ? (
                <div className="flex items-center justify-between px-4 py-3 rounded-xl" style={{ background: '#0d2d1a', border: '1px solid #166534' }}>
                  <span className="text-sm font-bold text-green-400 font-mono">{cuponAplicado.codigo} · -$ {cuponAplicado.montoDescuento.toLocaleString('es-AR')}</span>
                  <button onClick={() => { setCuponAplicado(null); setCodigoCupon('') }} className="text-xs text-red-400 font-medium">Quitar</button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input value={codigoCupon} onChange={e => setCodigoCupon(e.target.value.toUpperCase())}
                    onKeyDown={e => e.key === 'Enter' && aplicarCupon()}
                    placeholder="Ingresá el código" className={`flex-1 ${inputCls}`} style={inputStyle} />
                  <button onClick={aplicarCupon} disabled={validandoCupon || !codigoCupon.trim()}
                    className="px-4 py-3 rounded-xl text-sm font-bold text-white disabled:opacity-40"
                    style={{ background: color }}>{validandoCupon ? '...' : 'Aplicar'}</button>
                </div>
              )}
            </div>
          </div>

          {/* Resumen */}
          <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid #2c2c2e' }}>
            <div className="px-4 py-3" style={{ background: '#1a1a1a', borderBottom: '1px solid #2c2c2e' }}>
              <span className="text-sm font-bold text-white">Resumen</span>
            </div>
            <div className="p-4 space-y-2 text-sm" style={{ background: '#111' }}>
              <div className="flex justify-between">
                <span style={{ color: '#8e8e93' }}>Productos</span>
                <span className="text-white font-medium">$ {subtotal.toLocaleString('es-AR')}</span>
              </div>
              {costoEnvio > 0 && (
                <div className="flex justify-between">
                  <span style={{ color: '#8e8e93' }}>Envío</span>
                  <span className="text-white font-medium">$ {costoEnvio.toLocaleString('es-AR')}</span>
                </div>
              )}
              {descuentoMonto > 0 && (
                <div className="flex justify-between text-green-400">
                  <span>Descuento</span>
                  <span>-$ {descuentoMonto.toLocaleString('es-AR')}</span>
                </div>
              )}
              {propina > 0 && (
                <div className="flex justify-between" style={{ color: '#8e8e93' }}>
                  <span>Propina</span>
                  <span className="text-white">+$ {propina.toLocaleString('es-AR')}</span>
                </div>
              )}
              <div className="flex justify-between font-black text-base pt-2" style={{ borderTop: '1px solid #2c2c2e' }}>
                <span className="text-white">Total</span>
                <span style={{ color }}>$ {total.toLocaleString('es-AR')}</span>
              </div>
            </div>
          </div>

          <textarea value={notas} onChange={e => setNotas(e.target.value)} rows={2}
            placeholder="Comentarios del pedido (opcional)"
            className={`${inputCls} resize-none`} style={{ ...inputStyle, width: '100%' }} />
        </div>

        <div className="px-4 md:px-5 py-3 md:py-4 flex-shrink-0" style={{ borderTop: '1px solid #222', background: '#111' }}>
          {bajoMinimo && (
            <p className="text-center text-[10px] sm:text-xs mb-2 md:mb-3 font-semibold" style={{ color: '#ff9f0a' }}>
              Monto mínimo ${montoMinimo.toLocaleString('es-AR')} · faltan ${(montoMinimo - subtotal).toLocaleString('es-AR')}
            </p>
          )}
          <button onClick={confirmar} disabled={loading || bajoMinimo}
            className="w-full py-3 md:py-4 rounded-2xl font-black text-sm md:text-base text-white transition-all active:scale-95 disabled:opacity-50"
            style={{ background: bajoMinimo ? '#444' : color }}>
            {loading ? 'Enviando...' : 'Realizar pedido'}
          </button>
        </div>
      </div>

      {modalMapaDir && (
        <ModalMapaGPS
          coords={modalMapaDir}
          direccionInicial={direccion}
          onConfirm={confirmarDireccionMapa}
          onClose={() => setModalMapaDir(false)}
          dark={true}
          color={color}
        />
      )}
    </div>
  )
}

// ─── Botón carrito flotante ───────────────────────────────
function BotonCarrito({ carrito, onClick, color, disabled }) {
  const total = carrito.reduce((s, i) => s + i.precioVenta * i.cantidad, 0)
  const cant  = carrito.reduce((s, i) => s + i.cantidad, 0)
  if (cant === 0) return null

  return (
    <div className="fixed bottom-6 left-0 right-0 px-3 md:px-4 z-40 flex justify-center">
      <button onClick={onClick} disabled={disabled}
        className="w-full md:max-w-2xl flex items-center justify-between text-white rounded-2xl px-4 md:px-5 py-3.5 md:py-4 transition-all active:scale-95 disabled:opacity-40"
        style={{
          background: disabled ? '#333' : color,
          boxShadow: disabled ? 'none' : `0 8px 30px ${color}55`
        }}>
        <span className="w-7 h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center text-xs md:text-sm font-black" style={{ background: 'rgba(255,255,255,0.2)' }}>
          {cant}
        </span>
        <span className="font-black text-sm md:text-base">{disabled ? 'Pedidos cerrados' : 'Ver carrito'}</span>
        <span className="font-black text-sm md:text-base">$ {total.toLocaleString('es-AR')}</span>
      </button>
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────
export default function MenuPublico() {
  const { slug: paramSlug } = useParams()
  const hostname = window.location.hostname
  const [data, setData]             = useState(null)
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState(null)
  const [catActiva, setCatActiva]   = useState(null)
  const [busqueda, setBusqueda]     = useState('')
  const [carrito, setCarrito]       = useState([])
  const [modalidad, setModalidad]   = useState(null)
  const [showCarrito, setShowCarrito] = useState(false)
  const [prodDetalle, setProdDetalle] = useState(null)
  const catRefs = useRef({})
  const tabsContainerRef = useRef(null)
  const tabBtnRefs = useRef({})

  useEffect(() => {
    // Si no hay slug en la URL y estamos en qrbanburger.com.ar, usar endpoint default
    const endpoint = !paramSlug && hostname.includes('qrbanburger.com')
      ? '/menu/default'
      : `/menu/${paramSlug || 'qrban'}`

    api.get(endpoint)
      .then(({ data: d }) => {
        setData(d)
        if (d.categorias?.length) setCatActiva(d.categorias[0].id)
        const conf = d.negocio?.configuracion?.modalidades || {}
        if (conf.delivery)      setModalidad('delivery')
        else if (conf.takeaway) setModalidad('takeaway')
        else if (conf.salon)    setModalidad('salon')
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [paramSlug, hostname])

  // IntersectionObserver: actualiza tab activa al hacer scroll
  useEffect(() => {
    if (!data?.categorias?.length) return
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(e => { if (e.isIntersecting) setCatActiva(e.target.dataset.catId) })
      },
      { rootMargin: '-25% 0px -65% 0px', threshold: 0 }
    )
    Object.entries(catRefs.current).forEach(([id, el]) => {
      if (el) { el.dataset.catId = id; observer.observe(el) }
    })
    return () => observer.disconnect()
  }, [data])

  // Auto-scroll tab activo al centro cuando cambia por IntersectionObserver
  useEffect(() => {
    if (!catActiva || !tabsContainerRef.current || !tabBtnRefs.current[catActiva]) return
    tabBtnRefs.current[catActiva].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
  }, [catActiva])

  const scrollToCategoria = (catId) => {
    setCatActiva(catId)
    catRefs.current[catId]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const negocio    = data?.negocio
  const categorias = data?.categorias || []
  const color      = negocio?.configuracion?.colorPrimario || '#7c3aed'
  const conf       = negocio?.configuracion || {}
  const dentroDeHorario = estaAbiertoPorHorarios(conf.horarios)
  const recibirPedidos = conf.recibirPedidos !== false && !conf.cerradoTemporalmente && dentroDeHorario

  const modalidades = [
    conf.modalidades?.delivery  && { id: 'delivery',  label: 'Delivery' },
    conf.modalidades?.takeaway  && { id: 'takeaway',  label: 'Retirar'  },
    conf.modalidades?.salon     && { id: 'salon',     label: 'Salón'    },
  ].filter(Boolean)

  const productosFiltrados = categorias.flatMap(cat =>
    (cat.productos || []).filter(p => p.nombre.toLowerCase().includes(busqueda.toLowerCase()))
  )

  const productosSugeridos = categorias.flatMap(cat => cat.productos || []).filter(p => p.sugerido)

  const abrirDetalle = (prod) => {
    if (!recibirPedidos) {
      toast.error('El local está cerrado', {
        duration: 2000, position: 'top-center',
        style: { background: '#1c1c1e', color: '#fff', borderRadius: '12px', fontSize: '13px', border: '1px solid #ef4444' }
      })
      return
    }
    setProdDetalle(prod)
  }

  const handleAgregarAlCarrito = (item) => {
    setCarrito(c => [...c, item])
    toast.success(`${item.nombre}${item.varianteNombre ? ` · ${item.varianteNombre}` : ''} agregado`, {
      duration: 1200, position: 'top-center',
      style: { background: '#1c1c1e', color: '#fff', borderRadius: '12px', fontSize: '13px', border: '1px solid #2c2c2e' }
    })
  }

  if (loading) return <SkeletonMenu />

  if (error) return (
    <div className="min-h-screen menu-bg flex items-center justify-center text-center p-6">
      <style>{buildStyles('Inter') + styles}</style>
      <div>
        <div className="text-7xl mb-6">🍔</div>
        <h1 className="text-2xl font-black text-white mb-3">Menú no disponible</h1>
        <p className="text-sm" style={{ color: '#8e8e93' }}>Verificá que el link del QR sea correcto.</p>
      </div>
    </div>
  )

  // Background: imagen de fondo (con opacidad) o degradado de color de marca
  const opacidad = (conf.opacidadFondo ?? 85) / 100
  const bgStyle = conf.imagenFondo
    ? {
        backgroundImage: `linear-gradient(rgba(9,9,11,${opacidad}), rgba(9,9,11,${opacidad})), url(${conf.imagenFondo})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
      }
    : {
        background: `radial-gradient(ellipse 90% 45% at 50% 0%, ${color}22 0%, transparent 65%), radial-gradient(ellipse 50% 25% at 85% 95%, ${color}10 0%, transparent 60%), #09090b`
      }

  const allStyles = buildStyles(conf.tipografia) + styles

  return (
    <div className="min-h-screen" style={bgStyle}>
      <style>{allStyles}</style>
      <Toaster toastOptions={{ style: { background: '#1c1c1e', color: '#fff', borderRadius: '12px', border: '1px solid #2c2c2e' } }} />

      {/* ── Sticky nav ARRIBA DE TODO ── */}
      <div className="sticky top-0 z-30"
        style={{ background: 'rgba(9,9,11,0.92)', backdropFilter: 'blur(24px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>

        {/* Buscador prominente */}
        <div className="px-3 md:px-4 pt-3 pb-2">
          <div className="relative w-full md:max-w-3xl mx-auto">
            <svg className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#636366' }}
              fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
              placeholder="Buscar en el menú..."
              className="w-full pl-10 md:pl-11 pr-9 md:pr-10 py-2.5 md:py-3 text-xs md:text-sm text-white focus:outline-none rounded-2xl transition-all"
              style={{ background: '#18181b', border: '1px solid rgba(255,255,255,0.09)' }} />
            {busqueda && (
              <button onClick={() => setBusqueda('')} className="absolute right-3 md:right-4 top-1/2 -translate-y-1/2" style={{ color: '#636366' }}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Tabs de categorías */}
        {!busqueda && categorias.length > 0 && (
          <div ref={tabsContainerRef} className="flex overflow-x-auto no-scrollbar px-3 md:px-4 gap-0 w-full md:max-w-3xl mx-auto"
            style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            {categorias.map(cat => (
              <button key={cat.id} ref={el => tabBtnRefs.current[cat.id] = el}
                onClick={() => scrollToCategoria(cat.id)}
                className="flex-shrink-0 px-3 md:px-4 py-2.5 md:py-3 text-[10px] md:text-xs font-black whitespace-nowrap transition-all relative"
                style={catActiva === cat.id ? { color: '#fff' } : { color: '#52525b' }}>
                {cat.nombre.toUpperCase()}
                {catActiva === cat.id && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full" style={{ background: color }} />
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Imagen de portada ── */}
      {conf.imagenPortada && (
        <div className="relative w-full overflow-hidden h-32 sm:h-40 md:h-48">
          <img src={conf.imagenPortada} alt="portada" className="w-full h-full object-cover" />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(9,9,11,0.15) 0%, rgba(9,9,11,0.9) 100%)' }} />
        </div>
      )}

      <div className="w-full md:max-w-3xl mx-auto px-3 md:px-0">

        {/* Header negocio */}
        <div className="px-2 md:px-5 pt-5 md:pt-7 pb-4 md:pb-5">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-3 sm:gap-4 mb-4 md:mb-5">
            {negocio?.logo ? (
              <img src={negocio.logo} alt={negocio.nombre}
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover flex-shrink-0 highlight-ring"
                style={{ border: '3px solid rgba(255,255,255,0.08)' }} />
            ) : (
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center text-2xl sm:text-3xl flex-shrink-0 font-black text-white highlight-ring"
                style={{ background: `linear-gradient(135deg, ${color}, ${color}99)` }}>
                {negocio?.nombre?.[0]?.toUpperCase() || '🍔'}
              </div>
            )}
            <div className="flex-1 min-w-0 text-center sm:text-left">
              <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap mb-1">
                <h1 className="text-lg sm:text-xl font-black text-white leading-tight">{negocio?.nombre}</h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold flex-shrink-0"
                  style={recibirPedidos
                    ? { background: 'rgba(22,163,74,0.2)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.3)' }
                    : { background: 'rgba(220,38,38,0.2)', color: '#f87171', border: '1px solid rgba(248,113,113,0.3)' }}>
                  {recibirPedidos ? '● Abierto' : '● Cerrado'}
                </span>
              </div>
              {conf.descripcion && (
                <p className="text-sm leading-relaxed" style={{ color: '#71717a' }}>{conf.descripcion}</p>
              )}
              {conf.mensajeBienvenida && (
                <p className="text-xs font-semibold mt-1 px-2 py-1 rounded-lg inline-block" style={{ background: `${color}18`, color }}>{conf.mensajeBienvenida}</p>
              )}
            </div>
          </div>

          {/* Modalidad toggle */}
          {modalidades.length > 1 && (
            <div className="flex rounded-2xl p-1" style={{ background: '#18181b', border: '1px solid rgba(255,255,255,0.07)' }}>
              {modalidades.map(m => (
                <button key={m.id} onClick={() => setModalidad(m.id)}
                  className="flex-1 py-2 sm:py-2.5 text-xs sm:text-sm font-black transition-all rounded-xl"
                  style={modalidad === m.id
                    ? { background: color, color: '#fff', boxShadow: `0 4px 14px ${color}55` }
                    : { background: 'transparent', color: '#52525b' }}>
                  {m.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Banner cerrado ── */}
        {!recibirPedidos && (
          <div className="mx-2 md:mx-5 mb-3 md:mb-4 px-3 md:px-4 py-2.5 md:py-3 rounded-2xl flex items-center gap-2 md:gap-3"
            style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
            <svg className="w-3.5 h-3.5 md:w-4 md:h-4 flex-shrink-0" fill="none" stroke="#f87171" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className="text-[10px] sm:text-xs font-semibold" style={{ color: '#f87171' }}>
              Podés ver el menú, pero no aceptamos pedidos en este momento.
            </p>
          </div>
        )}

        {/* ── Carrusel Productos Destacados ── */}
        {!busqueda && productosSugeridos.length > 0 && (
          <CarruselDestacados productos={productosSugeridos} color={color} onAbrirDetalle={abrirDetalle} />
        )}

        {/* Productos */}
        <div className="pb-36">
          {busqueda ? (
            <div className="pt-4 px-2 md:px-5">
              <p className="text-[10px] sm:text-xs mb-3" style={{ color: '#8e8e93' }}>
                {productosFiltrados.length} resultado{productosFiltrados.length !== 1 ? 's' : ''} para "{busqueda}"
              </p>
              {productosFiltrados.length > 0 ? (
                <div className="rounded-2xl overflow-hidden" style={{ background: '#000', border: '1px solid rgba(255,255,255,0.12)' }}>
                  <div className="grid grid-cols-2 gap-2.5 sm:gap-3 p-3 sm:p-4">
                    {productosFiltrados.map((prod) => (
                      <ProductoCard key={prod.id} prod={prod} color={color} onAbrirDetalle={abrirDetalle} />
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-16" style={{ color: '#8e8e93' }}>
                  <div className="text-5xl mb-4">🔍</div>
                  <p className="text-sm font-medium">Sin resultados para "{busqueda}"</p>
                </div>
              )}
            </div>
          ) : (
            categorias.map(cat => {
              const prods = cat.productos || []
              if (prods.length === 0) return null
              return (
                <div key={cat.id} ref={el => { catRefs.current[cat.id] = el }} className="scroll-mt-28 px-2 md:px-5 pt-4 md:pt-5 pb-2">
                  <div className="rounded-2xl overflow-hidden" style={{ background: '#000', border: '1px solid rgba(255,255,255,0.12)' }}>

                    {/* Banner de imagen de categoría */}
                    {cat.imagen && (
                      <div className="relative w-full h-28 sm:h-32">
                        <img src={cat.imagen} alt={cat.nombre} className="w-full h-full object-cover" />
                        <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 55%)' }} />
                        <div className="absolute bottom-2 sm:bottom-3 left-0 right-0 text-center px-2">
                          <h2 className="text-xs sm:text-sm font-black text-white uppercase tracking-widest">{cat.nombre}</h2>
                          {cat.descripcion && <p className="text-[10px] sm:text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.7)' }}>{cat.descripcion}</p>}
                        </div>
                      </div>
                    )}

                    {/* Header centrado (sin imagen) */}
                    {!cat.imagen && (
                      <div className="py-3 md:py-4 px-3 md:px-4 text-center" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                        <h2 className="text-xs sm:text-sm font-black text-white uppercase tracking-widest">{cat.nombre}</h2>
                        {cat.descripcion && <p className="text-[10px] sm:text-xs mt-1" style={{ color: '#8e8e93' }}>{cat.descripcion}</p>}
                      </div>
                    )}

                    {/* Grid 2 columnas sin bordes */}
                    <div className="grid grid-cols-2 gap-2.5 sm:gap-3 p-3 sm:p-4">
                      {prods.map((prod) => {
                        // ✅ AGREGAR NOMBRE DE CATEGORIA AL PRODUCTO
                        prod._categoriaNombre = cat.nombre
                        return (
                          <ProductoCard key={prod.id} prod={prod} color={color} onAbrirDetalle={abrirDetalle} />
                        )
                      })}
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>

        <BotonCarrito carrito={carrito} onClick={() => setShowCarrito(true)} color={color} disabled={!recibirPedidos} />

        {prodDetalle && (
          <ModalDetalle prod={prodDetalle} color={color} onClose={() => setProdDetalle(null)} onAgregar={handleAgregarAlCarrito} />
        )}

        {showCarrito && negocio && (
          <ModalPedido
            negocio={negocio} carrito={carrito} setCarrito={setCarrito}
            modalidad={modalidad} setModalidad={setModalidad}
            onClose={() => setShowCarrito(false)} color={color}
          />
        )}
      </div>
    </div>
  )
}