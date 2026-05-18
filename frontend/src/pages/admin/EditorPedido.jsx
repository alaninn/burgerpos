import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import api from '../../api/axios'
import toast from 'react-hot-toast'
import DireccionAutocomplete from '../../components/DireccionAutocomplete'

function fmt(n) { return Number(n || 0).toLocaleString('es-AR') }

const METODOS_PAGO = [
  { id: 'efectivo', label: 'Efectivo c/dto', icon: '💵' },
  { id: 'tarjeta', label: 'Tarjeta', icon: '💳' },
  { id: 'transferencia', label: 'Transferencia', icon: '📲' },
  { id: 'efectivo_sin_descuento', label: 'Salón efectivo', icon: '🏪' },
]

// ─── Selector de cliente ──────────────────────────────────
function ClienteSelector({
  negocioId, ciudad, modalidad,
  clienteNombre, setClienteNombre,
  clienteTelefono, setClienteTelefono,
  clienteEmail, setClienteEmail,
  clienteDireccion, setClienteDireccion,
  clienteId, setClienteId,
  onDescuentoFijo,
}) {
  const [omitir, setOmitir] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const [resultados, setResultados] = useState([])
  const [showResultados, setShowResultados] = useState(false)
  const [buscando, setBuscando] = useState(false)
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null)
  const [direccionesGuardadas, setDireccionesGuardadas] = useState([])
  const [modoNuevo, setModoNuevo] = useState(false)
  const [dropdownRect, setDropdownRect] = useState(null)
  const searchRef = useRef(null)
  const inputRef = useRef(null)
  const wrapRef = useRef(null)

  useEffect(() => {
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setShowResultados(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Calcular posición fixed del dropdown para escapar contenedores overflow-hidden
  const actualizarDropdownRect = useCallback(() => {
    if (inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect()
      setDropdownRect({ top: rect.bottom + 4, left: rect.left, width: rect.width })
    }
  }, [])

  const buscarClientes = useCallback((q) => {
    clearTimeout(searchRef.current)
    if (!q || q.length < 2) { setResultados([]); setShowResultados(false); return }
    searchRef.current = setTimeout(async () => {
      setBuscando(true)
      try {
        const { data } = await api.get(`/negocios/${negocioId}/clientes?q=${encodeURIComponent(q)}`)
        const lista = data.clientes || []
        setResultados(lista)
        actualizarDropdownRect()
        setShowResultados(true)
      } catch { }
      finally { setBuscando(false) }
    }, 300)
  }, [negocioId, actualizarDropdownRect])

  const handleBusquedaChange = (e) => {
    const val = e.target.value
    setBusqueda(val)
    setClienteSeleccionado(null)
    setClienteId(null)
    setModoNuevo(false)
    buscarClientes(val)
  }

  const seleccionarCliente = (c) => {
    setClienteSeleccionado(c)
    setClienteId(c.id)
    setClienteNombre(c.nombre || '')
    setClienteTelefono(c.telefono || '')
    setClienteEmail(c.email || '')
    setBusqueda(c.nombre || c.telefono || '')
    const dirs = Array.isArray(c.direcciones) ? [...c.direcciones] : []
    if (c.direccion && !dirs.includes(c.direccion)) dirs.unshift(c.direccion)
    setDireccionesGuardadas(dirs)
    if (dirs.length > 0) setClienteDireccion(dirs[0])
    if (c.descuentoFijo > 0 && onDescuentoFijo) onDescuentoFijo(Number(c.descuentoFijo))
    setResultados([])
    setShowResultados(false)
    setModoNuevo(false)
  }

  const activarModoNuevo = () => {
    setClienteSeleccionado(null)
    setClienteId(null)
    setClienteNombre('')
    setClienteTelefono(busqueda.match(/^\d/) ? busqueda : '')
    setClienteEmail('')
    setClienteDireccion('')
    setDireccionesGuardadas([])
    setResultados([])
    setShowResultados(false)
    setModoNuevo(true)
  }

  const limpiarSeleccion = () => {
    setClienteSeleccionado(null)
    setClienteId(null)
    setClienteNombre('')
    setClienteTelefono('')
    setClienteEmail('')
    setClienteDireccion('')
    setDireccionesGuardadas([])
    setBusqueda('')
    setModoNuevo(false)
  }

  const handleOmitir = (val) => {
    setOmitir(val)
    if (val) limpiarSeleccion()
  }

  // ── Header con toggle omitir ──────────────────────────────
  const HeaderCliente = () => (
    <div className="flex items-center justify-between mb-2">
      <p className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-widest">Cliente</p>
      <label className="flex items-center gap-1.5 cursor-pointer select-none">
        <div className="relative">
          <input type="checkbox" checked={omitir} onChange={e => handleOmitir(e.target.checked)} className="sr-only" />
          <div className={`w-8 h-4 rounded-full transition-colors ${omitir ? 'bg-gray-400' : 'bg-gray-200'}`}>
            <span className={`absolute top-0.5 w-3 h-3 bg-white dark:bg-gray-800 rounded-full shadow transition-transform ${omitir ? 'translate-x-4' : 'translate-x-0.5'}`} />
          </div>
        </div>
        <span className="text-xs text-gray-700 dark:text-gray-300">Omitir cliente</span>
      </label>
    </div>
  )

  // ── Modo omitir ───────────────────────────────────────────
  if (omitir) {
    return (
      <div>
        <HeaderCliente />
        <div className="px-3 py-2.5 bg-gray-50 dark:bg-gray-900 border border-dashed border-gray-300 dark:border-gray-700 rounded-xl text-xs text-gray-600 dark:text-gray-400 text-center">
          Pedido sin datos de cliente
        </div>
      </div>
    )
  }

  // ── Cliente ya seleccionado ───────────────────────────────
  if (clienteSeleccionado) {
    return (
      <div>
        <HeaderCliente />
        <div className="border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 rounded-xl p-3 space-y-2">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{clienteSeleccionado.nombre}</p>
              {clienteSeleccionado.telefono && (
                <p className="text-xs text-gray-700 dark:text-gray-300 mt-0.5">{clienteSeleccionado.telefono}</p>
              )}
              <p className="text-xs text-green-600 dark:text-green-400 font-medium mt-1">
                {clienteSeleccionado._count?.pedidos || 0} pedidos anteriores
              </p>
            </div>
            <button onClick={limpiarSeleccion}
              className="text-xs text-gray-600 dark:text-gray-400 hover:text-red-500 px-2 py-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
              Cambiar
            </button>
          </div>

          {/* Dirección — solo delivery */}
          {modalidad === 'delivery' && (
            <div className="space-y-1.5 pt-2 border-t border-green-200 dark:border-green-800">
              {direccionesGuardadas.length > 0 && (
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1.5">Direcciones guardadas:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {direccionesGuardadas.map((d, i) => (
                      <button key={i} type="button"
                        onClick={() => setClienteDireccion(d)}
                        className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${clienteDireccion === d ? 'bg-violet-600 text-white border-violet-600' : 'border-gray-200 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:border-violet-400'}`}>
                        {d.length > 30 ? d.slice(0, 30) + '…' : d}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <DireccionAutocomplete value={clienteDireccion} onChange={setClienteDireccion} ciudad={ciudad} />
              {clienteDireccion && !direccionesGuardadas.includes(clienteDireccion) && (
                <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                  <svg className="w-3 h-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" /></svg>
                  Dirección nueva — se guardará en el perfil
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    )
  }

  // ── Modo nuevo cliente ────────────────────────────────────
  if (modoNuevo) {
    return (
      <div>
        <HeaderCliente />
        <div className="border border-violet-200 dark:border-violet-800 bg-violet-50/50 dark:bg-violet-900/10 rounded-xl p-3 space-y-2">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-semibold text-violet-700 dark:text-violet-400">Nuevo cliente</p>
            <button onClick={() => setModoNuevo(false)}
              className="text-xs text-gray-600 dark:text-gray-400 hover:text-gray-600 underline">
              ← Buscar existente
            </button>
          </div>
          <input
            value={clienteNombre}
            onChange={e => setClienteNombre(e.target.value)}
            placeholder="Nombre *"
            autoFocus
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white dark:bg-gray-800"
          />
          <input
            value={clienteTelefono}
            onChange={e => setClienteTelefono(e.target.value)}
            placeholder="Teléfono (opcional)"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white dark:bg-gray-800"
          />
          {modalidad === 'delivery' && (
            <DireccionAutocomplete
              value={clienteDireccion}
              onChange={setClienteDireccion}
              ciudad={ciudad}
              placeholder="Dirección de entrega..."
              rows={1}
            />
          )}
        </div>
      </div>
    )
  }

  // ── Búsqueda de cliente existente ─────────────────────────
  return (
    <div ref={wrapRef}>
      <HeaderCliente />
      <div className="relative">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={inputRef}
            value={busqueda}
            onChange={handleBusquedaChange}
            onFocus={() => { actualizarDropdownRect(); resultados.length > 0 && setShowResultados(true) }}
            placeholder="Buscar por nombre, teléfono o N° cliente..."
            className="w-full pl-9 pr-9 py-2.5 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
          {buscando && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <div className="w-3.5 h-3.5 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>

        {/* Dropdown con position:fixed para escapar contenedores overflow-hidden */}
        {showResultados && dropdownRect && (
          <ul
            style={{ position: 'fixed', top: dropdownRect.top, left: dropdownRect.left, width: dropdownRect.width, zIndex: 9999 }}
            className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl shadow-2xl overflow-hidden max-h-56 overflow-y-auto"
          >
            {resultados.length === 0 && busqueda.length >= 2 && !buscando && (
              <li>
                <div className="px-4 py-3 text-xs text-gray-600 dark:text-gray-400 text-center">
                  Sin resultados para "{busqueda}"
                </div>
              </li>
            )}
            {resultados.map(c => (
              <li key={c.id}>
                <button type="button" onMouseDown={() => seleccionarCliente(c)}
                  className="w-full text-left px-4 py-2.5 hover:bg-violet-50 dark:hover:bg-violet-900/30 border-b border-gray-50 dark:border-gray-700 last:border-0 transition-colors">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex-1">{c.nombre}</p>
                    {c.numeroCliente && (
                      <span className="text-xs font-bold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded">
                        #{c.numeroCliente}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                    {c.telefono && <span>{c.telefono} · </span>}
                    {c._count?.pedidos || 0} pedidos
                  </p>
                  {c.direccion && <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">{c.direccion}</p>}
                </button>
              </li>
            ))}
            <li className="sticky bottom-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
              <button type="button" onMouseDown={activarModoNuevo}
                className="w-full text-left px-4 py-2.5 text-xs text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/30 font-semibold flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                Crear nuevo cliente
              </button>
            </li>
          </ul>
        )}
      </div>

      {/* Atajo para nuevo cliente sin escribir */}
      {!busqueda && (
        <button type="button" onClick={activarModoNuevo}
          className="mt-2 text-xs text-violet-600 dark:text-violet-400 hover:underline font-medium">
          + Ingresar datos de nuevo cliente
        </button>
      )}
    </div>
  )
}

// ─── Customizador de producto ─────────────────────────────
function ProductoCustomizer({ producto, onAgregar, onCerrar }) {
  const [varianteSeleccionada, setVarianteSeleccionada] = useState(
    producto.variantes?.[0] || null
  )
  const [adicionalesMap, setAdicionalesMap] = useState({})
  const [notas, setNotas] = useState('')
  const [cantidad, setCantidad] = useState(1)

  // Verificar descuento
  const tieneDescuento = producto.descuento && producto.descuento.activo
  const descuento = tieneDescuento ? producto.descuento : null

  // Precio base de la variante o producto
  const precioBaseOriginal = varianteSeleccionada
    ? parseFloat(varianteSeleccionada.precioVenta || 0)
    : parseFloat(producto.precioVenta || 0)

  // Aplicar descuento al precio base
  let precioBase = precioBaseOriginal
  if (descuento && descuento.valor != null && !isNaN(descuento.valor)) {
    const valorDescuento = Number(descuento.valor)
    const montoDescuento = descuento.tipo === 'porcentaje'
      ? (precioBaseOriginal * valorDescuento) / 100
      : valorDescuento
    precioBase = Math.max(0, precioBaseOriginal - montoDescuento)
  } else if (descuento) {
    console.warn('⚠️ Descuento con valor inválido:', descuento)
  }

  const precioExtras = Object.values(adicionalesMap).reduce(
    (s, a) => s + (parseFloat(a.precio) || 0) * a.cantidad, 0
  )
  const precioUnitario = precioBase + precioExtras
  const totalItem = precioUnitario * cantidad

  const toggleAdicional = (adicional, grupo) => {
    setAdicionalesMap(prev => {
      if (prev[adicional.id]) {
        // Deseleccionar siempre está permitido
        const { [adicional.id]: _, ...rest } = prev
        return rest
      }
      const maxSel = grupo?.maxSeleccion || 99
      const selEnGrupo = (grupo?.items || []).filter(it => prev[it.id]).length

      if (maxSel === 1) {
        // Comportamiento radio: deseleccionar todos los del grupo y seleccionar el nuevo
        const sinGrupo = Object.fromEntries(
          Object.entries(prev).filter(([k]) => !(grupo?.items || []).some(it => String(it.id) === String(k)))
        )
        return { ...sinGrupo, [adicional.id]: { id: adicional.id, nombre: adicional.nombre, precio: parseFloat(adicional.precioVenta || 0), cantidad: 1, grupoTitulo: grupo?.titulo || '' } }
      }

      if (selEnGrupo >= maxSel) {
        toast.error(`Máx. ${maxSel} opciones en "${grupo.titulo}"`)
        return prev
      }
      return {
        ...prev, [adicional.id]: {
          id: adicional.id,
          nombre: adicional.nombre,
          precio: parseFloat(adicional.precioVenta || 0),
          grupoTitulo: grupo?.titulo || '',
          cantidad: 1
        }
      }
    })
  }

  const cambiarCantidadAdic = (id, delta, maxPorItem = 99) => {
    setAdicionalesMap(prev => {
      const curr = prev[id]
      if (!curr) return prev
      const nueva = curr.cantidad + delta
      if (nueva <= 0) { const { [id]: _, ...rest } = prev; return rest }
      if (nueva > maxPorItem) return prev
      return { ...prev, [id]: { ...curr, cantidad: nueva } }
    })
  }

  const handleAgregar = () => {
    // Validar variante obligatoria
    if (producto.variantes?.length > 0 && !varianteSeleccionada) {
      toast.error('Seleccioná una variante para continuar')
      return
    }
    // Validar grupos obligatorios
    const gruposObligatorios = producto.gruposAdicionales?.filter(
      g => g.activo !== false && g.obligatorio && g.items?.length > 0
    ) || []
    for (const grupo of gruposObligatorios) {
      const haySeleccion = grupo.items.some(it => adicionalesMap[it.id])
      if (!haySeleccion) {
        toast.error(`"${grupo.titulo}" es obligatorio`)
        return
      }
    }
    onAgregar({
      productoId: producto.id,
      nombre: producto.nombre,
      varianteNombre: varianteSeleccionada?.nombre || null,
      varianteId: varianteSeleccionada?.id || null,
      cantidad,
      precioUnitario,
      adicionales: Object.values(adicionalesMap),
      notas
    })
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-5 pt-5 pb-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1a1a24] flex items-start gap-4">
        {producto.imagen ? (
          <img src={producto.imagen} alt={producto.nombre}
            className="w-20 h-20 object-cover rounded-2xl flex-shrink-0 shadow-sm" />
        ) : (
          <div className="w-20 h-20 bg-gradient-to-br from-violet-100 to-violet-200 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0">
            🍔
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-bold text-gray-900 dark:text-white text-lg leading-tight">{producto.nombre}</h3>
            <button onClick={onCerrar} className="p-1.5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg text-gray-600 dark:text-gray-300 flex-shrink-0 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          {producto.descripcion && (
            <p className="text-sm text-gray-700 dark:text-gray-300 mt-1 line-clamp-2">{producto.descripcion}</p>
          )}
          <div className="flex items-center gap-2 mt-1">
            {descuento && descuento.valor != null && !isNaN(descuento.valor) && (
              <>
                <span className="text-sm line-through text-gray-500 dark:text-gray-400">${fmt(precioBaseOriginal)}</span>
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-violet-600 text-white">
                  -{descuento.tipo === 'porcentaje' ? `${descuento.valor}%` : `$${fmt(descuento.valor)}`}
                </span>
              </>
            )}
            {descuento && (!descuento.valor || isNaN(descuento.valor)) && (
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-500 text-white">
                ⚠️ Descuento inválido
              </span>
            )}
            <p className="text-lg font-black text-violet-700 dark:text-violet-400">${fmt(precioBase)}</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5 bg-white dark:bg-[#1a1a24]">
        {producto.variantes?.length > 0 && (
          <div>
            <p className="text-xs font-bold text-gray-600 uppercase tracking-widest mb-1.5">Elegir variante</p>
            <div className="space-y-2">
              {producto.variantes.map(v => {
                // Calcular precio con descuento para esta variante
                const precioVarianteOriginal = parseFloat(v.precioVenta || 0)
                let precioVariante = precioVarianteOriginal
                if (descuento && descuento.valor != null && !isNaN(descuento.valor)) {
                  const valorDescuento = Number(descuento.valor)
                  const montoDescVar = descuento.tipo === 'porcentaje'
                    ? (precioVarianteOriginal * valorDescuento) / 100
                    : valorDescuento
                  precioVariante = Math.max(0, precioVarianteOriginal - montoDescVar)
                }

                return (
                  <button key={v.id} onClick={() => setVarianteSeleccionada(v)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-all text-left ${varianteSeleccionada?.id === v.id ? 'border-violet-600 bg-violet-50 dark:bg-violet-900/30' : 'border-gray-200 dark:border-gray-700 hover:border-violet-300 dark:bg-gray-800'}`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${varianteSeleccionada?.id === v.id ? 'border-violet-600' : 'border-gray-300 dark:border-gray-600'}`}>
                        {varianteSeleccionada?.id === v.id && <div className="w-2 h-2 bg-violet-600 rounded-full" />}
                      </div>
                      <span className="font-medium text-gray-800 dark:text-gray-200">{v.nombre}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {descuento && descuento.valor != null && !isNaN(descuento.valor) && (
                        <>
                          <span className="text-xs line-through text-gray-400 dark:text-gray-500">${fmt(precioVarianteOriginal)}</span>
                          <span className="px-1.5 py-0.5 rounded-full text-xs font-bold bg-violet-600 text-white">
                            -{descuento.tipo === 'porcentaje' ? `${descuento.valor}%` : `$${fmt(descuento.valor)}`}
                          </span>
                        </>
                      )}
                      <span className="font-bold text-violet-700 dark:text-violet-400">${fmt(precioVariante)}</span>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {producto.gruposAdicionales?.filter(g => g.activo !== false && g.items?.length > 0).map(grupo => {
          const maxSel = grupo.maxSeleccion || 1
          const selEnGrupo = grupo.items.filter(it => adicionalesMap[it.id]).length
          return (
          <div key={grupo.id}>
            <div className="flex items-center gap-2 mb-2">
              <p className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-widest">{grupo.titulo}</p>
              {grupo.obligatorio && (
                <span className="text-xs bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-1.5 py-0.5 rounded font-medium">Obligatorio</span>
              )}
              <span className="text-xs text-gray-500 dark:text-gray-400 ml-auto">
                {selEnGrupo}/{maxSel} seleccionado{selEnGrupo !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="space-y-1.5">
              {grupo.items.map(adicional => {
                const sel = adicionalesMap[adicional.id]
                const bloqueado = !sel && selEnGrupo >= maxSel && maxSel > 1
                const maxPorItem = parseInt(adicional.maxSeleccion) || 1
                return (
                  <div key={adicional.id}
                    className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl border transition-all ${sel ? 'border-violet-400 bg-violet-50 dark:bg-violet-900/30' : bloqueado ? 'border-gray-100 dark:border-gray-700 opacity-40' : 'border-gray-200 dark:border-gray-700 dark:bg-gray-800 hover:border-gray-300'}`}>
                    <div className="flex items-center gap-3">
                      <button onClick={() => toggleAdicional(adicional, grupo)}
                        disabled={bloqueado}
                        className={`w-5 h-5 rounded border-2 flex-shrink-0 flex items-center justify-center transition-all ${sel ? 'bg-violet-600 border-violet-600' : 'border-gray-300 dark:border-gray-600 hover:border-violet-400'}`}>
                        {sel && <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>}
                      </button>
                      <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{adicional.nombre}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {adicional.precioVenta > 0 && (
                        <span className="text-sm font-semibold text-violet-700 dark:text-violet-400">+${fmt(adicional.precioVenta)}</span>
                      )}
                      {sel && maxPorItem > 1 && (
                        <div className="flex items-center gap-0.5 bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700 shadow-sm">
                          <button onClick={() => cambiarCantidadAdic(adicional.id, -1, maxPorItem)}
                            className="w-7 h-7 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:text-red-500 font-bold text-sm">−</button>
                          <span className="w-6 text-center text-sm font-bold">{sel.cantidad}</span>
                          <button onClick={() => cambiarCantidadAdic(adicional.id, 1, maxPorItem)}
                            className="w-7 h-7 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:text-violet-600 font-bold text-sm">+</button>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
          )
        })}

        <div>
          <p className="text-xs font-bold text-gray-600 uppercase tracking-widest mb-1.5">Notas del item</p>
          <textarea value={notas} onChange={e => setNotas(e.target.value)}
            placeholder="Ej: sin cebolla, bien cocido..."
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none bg-gray-50 dark:bg-[#12121a] text-gray-900 dark:text-gray-200 placeholder:text-gray-400 dark:placeholder:text-gray-500 transition-colors" />
        </div>
      </div>

      <div className="px-5 py-4 border-t border-gray-200 dark:border-[#232330] bg-gray-50 dark:bg-[#16161e]">
        <div className="flex items-center gap-3 mb-3">
          <div className="flex items-center bg-gray-200 dark:bg-[#12121a] rounded-xl border border-gray-300 dark:border-[#232330] shadow-sm">
            <button onClick={() => setCantidad(c => Math.max(1, c - 1))}
              className="w-10 h-10 flex items-center justify-center text-gray-600 dark:text-gray-400 hover:text-red-400 font-bold text-lg">−</button>
            <span className="w-10 text-center font-black text-gray-900 dark:text-white text-lg">{cantidad}</span>
            <button onClick={() => setCantidad(c => c + 1)}
              className="w-10 h-10 flex items-center justify-center text-gray-600 dark:text-gray-400 hover:text-violet-400 font-bold text-lg">+</button>
          </div>
          <div className="flex-1 text-right">
            {precioExtras > 0 && <p className="text-xs text-gray-700 dark:text-gray-300">+${fmt(precioExtras)} extras</p>}
            <p className="text-2xl font-black text-gray-900 dark:text-white">${fmt(totalItem)}</p>
          </div>
        </div>
        {(() => {
          const gruposInvalidos = (producto.gruposAdicionales?.filter(
            g => g.activo !== false && g.obligatorio && g.items?.length > 0
          ) || []).filter(g => !g.items.some(it => adicionalesMap[it.id]))
          const varianteInvalida = producto.variantes?.length > 0 && !varianteSeleccionada
          const bloqueado = varianteInvalida || gruposInvalidos.length > 0
          return (
            <button onClick={handleAgregar}
              className={`w-full py-3.5 font-bold rounded-xl transition-colors text-sm shadow-lg ${
                bloqueado
                  ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                  : 'bg-[#7c3aed] hover:bg-[#6d28d9] text-white cursor-pointer'
              }`}>
              {bloqueado && gruposInvalidos.length > 0
                ? `Seleccioná: ${gruposInvalidos[0].titulo}`
                : varianteInvalida ? 'Seleccioná una variante'
                : 'Agregar al pedido'}
            </button>
          )
        })()}
      </div>
    </div>
  )
}

// ─── Item del carrito ─────────────────────────────────────
function CartItem({ item, onRemove, onChangeQty }) {
  return (
    <div className="border-b border-gray-100 dark:border-gray-700 py-3 px-1">
      {/* Nombre + precio */}
      <div className="flex items-start justify-between gap-3 mb-1">
        <p className="font-bold text-base text-gray-900 dark:text-gray-100 leading-tight flex-1">
          {item.nombre}
        </p>
        <span className="text-base font-bold text-gray-900 dark:text-gray-100 flex-shrink-0">
          ${fmt(item.precioUnitario * item.cantidad)}
        </span>
      </div>
      {/* Detalle variante */}
      {item.varianteNombre && (
        <p className="text-sm text-gray-700 dark:text-gray-300 mt-0.5">
          • <span className="font-semibold">{item.varianteNombre}</span> (${fmt(item.precioUnitario)})
        </p>
      )}
      {/* Adicionales agrupados por grupo */}
      {(() => {
        const adicionales = item.adicionales?.filter(a => a.nombre) || []
        if (!adicionales.length) return null
        // Group by grupoTitulo
        const grupos = {}
        adicionales.forEach(a => {
          const key = a.grupoTitulo || 'Adicionales'
          if (!grupos[key]) grupos[key] = []
          grupos[key].push(a)
        })
        return Object.entries(grupos).map(([titulo, items]) => (
          <div key={titulo} className="mt-1.5">
            <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{titulo}</p>
            {items.map((a, i) => (
              <p key={i} className="text-sm text-gray-700 dark:text-gray-300 mt-0.5 pl-1">
                – <span className="font-medium">{a.nombre}</span>
                {a.cantidad > 1 ? ` ×${a.cantidad}` : ''}
                {a.precio > 0 ? <span className="text-gray-500 text-xs"> (${fmt(a.precio * (a.cantidad||1))})</span> : ''}
              </p>
            ))}
          </div>
        ))
      })()}
      {/* Notas */}
      {item.notas && (
        <p className="text-sm text-amber-600 dark:text-amber-400 italic mt-1">📝 {item.notas}</p>
      )}
      {/* Qty + Eliminar */}
      <div className="flex items-center justify-between mt-2.5">
        <div className="flex items-center gap-1.5 border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
          <button onClick={() => onChangeQty(-1)} className="w-8 h-8 flex items-center justify-center text-gray-700 dark:text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 font-bold text-base transition-colors">−</button>
          <span className="w-7 text-center text-sm font-bold text-gray-900 dark:text-gray-100">{item.cantidad}</span>
          <button onClick={() => onChangeQty(1)} className="w-8 h-8 flex items-center justify-center text-gray-700 dark:text-gray-300 hover:text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-900/20 font-bold text-base transition-colors">+</button>
        </div>
        <button onClick={onRemove} className="text-sm font-semibold text-red-500 hover:text-red-700 transition-colors">
          Eliminar
        </button>
      </div>
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────
export default function EditorPedido({ negocioId, pedidoExistente, onClose, onGuardado, config: configProp = {}, ciudad: ciudadProp = '' }) {
  const [modalidad, setModalidad] = useState(pedidoExistente?.modalidad || '')
  const [metodoPago, setMetodoPago] = useState(pedidoExistente?.metodoPago || 'efectivo')
  const [clienteId, setClienteId] = useState(pedidoExistente?.clienteId || null)
  const [clienteNombre, setClienteNombre] = useState(pedidoExistente?.clienteNombre || '')
  const [clienteTelefono, setClienteTelefono] = useState(pedidoExistente?.clienteTelefono || '')
  const [clienteEmail, setClienteEmail] = useState('')
  const [clienteDireccion, setClienteDireccion] = useState(pedidoExistente?.clienteDireccion || '')
  const [notas, setNotas] = useState(pedidoExistente?.notas || '')
  const [descuento, setDescuento] = useState(Number(pedidoExistente?.descuento || 0))
  const [descuentoTipo, setDescuentoTipo] = useState('fijo') // 'fijo' | 'porcentaje'
  const [costoEnvio, setCostoEnvio] = useState(Number(pedidoExistente?.costoEnvio || 0))
  const [propina, setPropina] = useState(Number(pedidoExistente?.propina || 0))
  const [repartidorId, setRepartidorId] = useState(pedidoExistente?.repartidorId || '')
  const [requiereFactura, setRequiereFactura] = useState(pedidoExistente?.requiereFactura || false)
  const [cobrado, setCobrado] = useState(pedidoExistente?.cobrado || false)
  const [metodosPagoHabilitados, setMetodosPagoHabilitados] = useState(METODOS_PAGO)
  const [cuitFacturacion, setCuitFacturacion] = useState(pedidoExistente?.cuitFacturacion || '')
  const [ciudad, setCiudad] = useState('') // para contexto de autocomplete

  const [carrito, setCarrito] = useState(() => {
    if (!pedidoExistente?.items) return []
    return pedidoExistente.items.map(item => ({
      _id: Math.random().toString(36).slice(2),
      productoId: item.productoId,
      nombre: item.nombre,
      varianteNombre: item.varianteNombre || null,
      cantidad: item.cantidad,
      precioUnitario: parseFloat(item.precioUnitario),
      adicionales: item.adicionales || [],
      notas: item.notas || ''
    }))
  })

  const [productos, setProductos] = useState([])
  const [categorias, setCategorias] = useState([])
  const [catActiva, setCatActiva] = useState(null)
  const [busqueda, setBusqueda] = useState('')
  const [repartidores, setRepartidores] = useState([])
  const [loadingProds, setLoadingProds] = useState(false)
  const [productoCustom, setProductoCustom] = useState(null)
  const [loading, setLoading] = useState(false)
  const [paso, setPaso] = useState(pedidoExistente ? 2 : 1)
  const [descuentosAutomaticos, setDescuentosAutomaticos] = useState([])

  // Aplicar config del negocio recibida como prop (métodos de pago habilitados + ciudad)
  useEffect(() => {
    if (ciudadProp) setCiudad(ciudadProp)
    const cfgMetodos = configProp.metodosPago || {}
    if (!Object.keys(cfgMetodos).length) return

    const isActive = (key) => {
      const v = cfgMetodos[key]
      if (!v) return false
      return typeof v === 'boolean' ? v : v.activo === true
    }
    const getLabel = (key, def) => {
      const v = cfgMetodos[key]
      return (v && typeof v === 'object' && v.nombrePersonalizado) ? v.nombrePersonalizado : def
    }

    const methods = []
    if (isActive('efectivo'))
      methods.push({ id: 'efectivo', cfgKey: 'efectivo', label: getLabel('efectivo', 'Efectivo'), icon: '💵' })
    // tarjeta: acepta tanto claves con acento como sin acento (retrocompatibilidad)
    if (isActive('tarjeta_de_cr\u00e9dito') || isActive('tarjeta_credito') || isActive('tarjeta_de_d\u00e9bito') || isActive('tarjeta_debito')) {
      const cfgKey = isActive('tarjeta_de_cr\u00e9dito') ? 'tarjeta_de_cr\u00e9dito' : 'tarjeta_credito'
      methods.push({ id: 'tarjeta', cfgKey, label: getLabel('tarjeta_de_cr\u00e9dito', getLabel('tarjeta_credito', 'Tarjeta')), icon: '💳' })
    }
    if (isActive('transferencia'))
      methods.push({ id: 'transferencia', cfgKey: 'transferencia', label: getLabel('transferencia', 'Transferencia'), icon: '📲' })
    if (isActive('mercado_pago') || isActive('modo') || isActive('nave')) {
      const cfgKey = isActive('mercado_pago') ? 'mercado_pago' : isActive('modo') ? 'modo' : 'nave'
      methods.push({ id: 'transferencia', cfgKey, label: getLabel(cfgKey, 'Transferencia'), icon: '📲' })
    }
    if (isActive('efectivo_sin_descuento'))
      methods.push({ id: 'efectivo_sin_descuento', cfgKey: 'efectivo_sin_descuento', label: getLabel('efectivo_sin_descuento', 'Salón efectivo'), icon: '🏪' })

    // Deduplicar por id (ej. transferencia puede haberse agregado dos veces)
    const seen = new Set()
    const unique = methods.filter(m => { if (seen.has(m.id)) return false; seen.add(m.id); return true })
    if (unique.length > 0) setMetodosPagoHabilitados(unique)
  }, [configProp, ciudadProp])

  useEffect(() => {
    if (paso !== 2) return
    setLoadingProds(true)
    Promise.all([
      api.get(`/negocios/${negocioId}/productos?activo=true`),
      api.get(`/negocios/${negocioId}/repartidores`),
      api.get(`/negocios/${negocioId}`),
    ]).then(([prodRes, repRes, negRes]) => {
      const prods = prodRes.data.productos || []
      const cats = []
      const seen = new Set()
      prods.forEach(p => {
        if (p.categoria && !seen.has(p.categoria.id)) {
          seen.add(p.categoria.id)
          cats.push(p.categoria)
        }
      })
      setCategorias(cats)
      if (cats.length) setCatActiva(cats[0].id)
      setProductos(prods)
      setRepartidores((repRes.data.repartidores || []).filter(r => r.activo !== false))

      const neg = negRes.data.negocio || {}
      if (!ciudadProp) setCiudad(neg.ciudad || neg.configuracion?.ciudad || '')
      if (!pedidoExistente) {
        const envio = neg.configuracion?.costoEnvio || 0
        setCostoEnvio(envio)
      }
    }).catch(() => { }).finally(() => setLoadingProds(false))
  }, [paso, negocioId])

  // Cargar descuentos automáticos cuando cambien modalidad, método de pago o subtotal
  useEffect(() => {
    if (!modalidad || !metodoPago || paso !== 2) {
      setDescuentosAutomaticos([])
      return
    }
    const subtotalCalc = carrito.reduce((s, i) => s + i.precioUnitario * i.cantidad, 0)
    if (subtotalCalc === 0) {
      setDescuentosAutomaticos([])
      return
    }

    api.get(`/negocios/${negocioId}/descuentos/automaticos`, {
      params: { modalidad, metodoPago, subtotal: subtotalCalc }
    })
      .then(({ data }) => {
        setDescuentosAutomaticos(data.descuentos || [])
      })
      .catch(() => {
        setDescuentosAutomaticos([])
      })
  }, [negocioId, modalidad, metodoPago, carrito, paso])

  const productosFiltrados = productos.filter(p => {
    const matchCat = !busqueda && catActiva ? p.categoriaId === catActiva : true
    const matchBusq = busqueda ? p.nombre.toLowerCase().includes(busqueda.toLowerCase()) : true
    return matchCat && matchBusq
  })

  const agregarAlCarrito = (itemData) => {
    setCarrito(c => [...c, { ...itemData, _id: Math.random().toString(36).slice(2) }])
    setProductoCustom(null)
  }

  const eliminarDelCarrito = (idx) => setCarrito(c => c.filter((_, i) => i !== idx))

  const cambiarCantidadCarrito = (idx, delta) => {
    setCarrito(c => c.map((item, i) => {
      if (i !== idx) return item
      const nueva = item.cantidad + delta
      return nueva <= 0 ? null : { ...item, cantidad: nueva }
    }).filter(Boolean))
  }

  const envio = modalidad === 'delivery' ? costoEnvio : 0
  const subtotal = carrito.reduce((s, i) => s + i.precioUnitario * i.cantidad, 0)
  const descuentoValor = descuentoTipo === 'porcentaje'
    ? Math.round(subtotal * descuento / 100)
    : descuento
  const descuentosAutomaticosValor = descuentosAutomaticos.reduce((sum, d) => sum + (d.monto || 0), 0)
  const total = Math.max(0, subtotal + envio - descuentoValor - descuentosAutomaticosValor + propina)

  // Guardar dirección nueva en el cliente si corresponde
  const guardarDireccionEnCliente = async (cId, dir) => {
    if (!cId || !dir) return
    try {
      // Fetch current client to get existing addresses
      const { data } = await api.get(`/negocios/${negocioId}/clientes/${cId}`)
      const c = data.cliente
      const dirs = Array.isArray(c.direcciones) ? [...c.direcciones] : []
      if (c.direccion && !dirs.includes(c.direccion)) dirs.unshift(c.direccion)
      if (!dirs.includes(dir)) {
        dirs.push(dir)
        await api.put(`/negocios/${negocioId}/clientes/${cId}`, {
          direcciones: dirs,
          direccion: dirs[0] // mantener la principal
        })
      }
    } catch { }
  }

  // Crear cliente nuevo si no existe
  const obtenerOCrearCliente = async () => {
    if (clienteId) return clienteId
    if (!clienteNombre && !clienteTelefono) return null
    try {
      // Si hay teléfono, buscar primero si ya existe para no duplicar
      if (clienteTelefono) {
        const { data: busq } = await api.get(`/negocios/${negocioId}/clientes?q=${encodeURIComponent(clienteTelefono)}`)
        const existente = (busq.clientes || []).find(c => c.telefono === clienteTelefono)
        if (existente) {
          // Actualizar nombre si cambió
          if (clienteNombre && existente.nombre !== clienteNombre) {
            await api.put(`/negocios/${negocioId}/clientes/${existente.id}`, { nombre: clienteNombre })
          }
          return existente.id
        }
      }
      const { data } = await api.post(`/negocios/${negocioId}/clientes`, {
        nombre: clienteNombre || 'Cliente',
        telefono: clienteTelefono || '',
        email: clienteEmail || '',
        direccion: clienteDireccion || '',
        direcciones: clienteDireccion ? [clienteDireccion] : [],
      })
      return data.cliente?.id || null
    } catch { return null }
  }

  const guardar = async () => {
    if (!modalidad) return toast.error('Seleccioná una modalidad')
    if (carrito.length === 0) return toast.error('Agregá productos al pedido')
    setLoading(true)
    try {
      // Resolver cliente
      const cId = await obtenerOCrearCliente()
      // Guardar dirección nueva si el cliente ya existía
      if (clienteId && clienteDireccion) {
        await guardarDireccionEnCliente(clienteId, clienteDireccion)
      }

      const itemsPayload = carrito.map(i => ({
        productoId: i.productoId || null,
        nombre: i.nombre,
        varianteNombre: i.varianteNombre || null,
        cantidad: i.cantidad,
        precioUnitario: i.precioUnitario,
        adicionales: i.adicionales || [],
        notas: i.notas || ''
      }))

      const descuentoTotal = descuentoValor + descuentosAutomaticosValor
      const body = {
        modalidad, metodoPago,
        clienteNombre: clienteNombre || 'Cliente',
        clienteTelefono, clienteDireccion, notas,
        descuento: descuentoTotal,
        costoEnvio: envio,
        propina,
        clienteId: cId || null,
        repartidorId: repartidorId || null,
        requiereFactura,
        cuitFacturacion: requiereFactura ? (cuitFacturacion || null) : null,
        cobrado,
      }

      if (pedidoExistente) {
        await api.put(`/negocios/${negocioId}/pedidos/${pedidoExistente.id}/completo`, {
          ...body, subtotal, total, items: itemsPayload
        })
        toast.success('Pedido actualizado')
      } else {
        await api.post(`/negocios/${negocioId}/pedidos`, {
          ...body, items: itemsPayload
        })
        toast.success('Pedido creado')
      }
      onGuardado()
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al guardar')
    } finally {
      setLoading(false)
    }
  }

  // ── Paso 1: Modalidad ─────────────────────────────────
  if (paso === 1) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center"
        style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}>
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-10 flex flex-col items-center gap-6 w-full max-w-md mx-4">
          <div className="text-center">
            <div className="w-16 h-16 bg-gray-900 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Nuevo pedido</h2>
            <p className="text-gray-700 dark:text-gray-300 text-sm mt-1">Seleccioná la modalidad de entrega</p>
          </div>
          <div className="flex gap-3 w-full">
            {[
              { id: 'delivery', label: 'Delivery', icon: '🛵' },
              { id: 'takeaway', label: 'Take Away', icon: '🥡' },
              { id: 'salon', label: 'Salón', icon: '🪑' },
            ].filter(m => configProp.modalidades?.[m.id] !== false).map(m => (
              <button key={m.id} onClick={() => { setModalidad(m.id); setPaso(2) }}
                className="flex-1 flex flex-col items-center gap-3 py-6 border-2 border-gray-300 dark:border-gray-700 rounded-2xl hover:border-violet-500 hover:bg-violet-50 dark:hover:bg-violet-900/30 transition-all">
                <span className="text-3xl">{m.icon}</span>
                <span className="text-sm font-bold text-gray-700 dark:text-gray-300">{m.label}</span>
              </button>
            ))}
          </div>
          <button onClick={onClose} className="text-sm text-gray-600 dark:text-gray-400 hover:text-red-500 transition-colors">Cancelar</button>
        </div>
      </div>
    )
  }

  // ── Paso 2: Editor principal ───────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gray-100 dark:bg-gray-900">

      {/* Header */}
      <div className="flex items-center gap-2 md:gap-3 px-3 md:px-5 py-2.5 md:py-3.5 bg-gray-900 text-white flex-shrink-0">
        <button onClick={onClose} className="p-1.5 md:p-2 hover:bg-white/10 rounded-xl transition-colors flex-shrink-0">
          <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="font-bold text-sm md:text-base">
            {pedidoExistente ? `Editando #${pedidoExistente.numero}` : 'Nuevo pedido'}
          </h1>
          <p className="text-[10px] md:text-xs text-gray-400">
            {modalidad === 'delivery' ? '🛵 Delivery' : modalidad === 'takeaway' ? '🥡 Take Away' : '🪑 Salón'}
            {!pedidoExistente && (
              <button onClick={() => setPaso(1)} className="ml-1 md:ml-2 text-violet-400 hover:text-violet-300 underline">cambiar</button>
            )}
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-2 md:gap-3 text-xs md:text-sm flex-shrink-0">
          <span className="text-gray-400">{carrito.length} producto{carrito.length !== 1 ? 's' : ''}</span>
          {carrito.length > 0 && <span className="text-white font-bold text-base md:text-lg">${fmt(total)}</span>}
        </div>
      </div>

      {/* 3 columnas - responsive: stack en móvil, lado a lado en desktop */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-auto lg:overflow-hidden gap-2 md:gap-3 p-2 md:p-3">

        {/* IZQUIERDA: Carrito */}
        <div className="w-full lg:w-[480px] lg:min-w-[220px] min-h-[200px] lg:min-h-0 flex flex-col flex-shrink-0 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex items-center justify-between">
            <p className="text-sm font-bold text-gray-900 dark:text-gray-100">Detalle del pedido</p>
            {subtotal > 0 && <span className="text-sm font-bold text-gray-900 dark:text-gray-100">${fmt(subtotal)}</span>}
          </div>
          <div className="flex-1 overflow-y-auto px-3 py-1">
            {carrito.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-12 text-center">
                <svg className="w-10 h-10 text-gray-200 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <p className="text-xs font-semibold text-gray-600 dark:text-gray-400">Sin productos</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Seleccioná del catálogo</p>
              </div>
            ) : (
              carrito.map((item, idx) => (
                <CartItem key={item._id || idx} item={item}
                  onRemove={() => eliminarDelCarrito(idx)}
                  onChangeQty={delta => cambiarCantidadCarrito(idx, delta)} />
              ))
            )}
          </div>
          {carrito.length > 0 && (
            <div className="border-t border-gray-200 dark:border-gray-700 p-3 space-y-1 bg-gray-50/80 dark:bg-gray-800/80">
              <div className="flex justify-between text-xs text-gray-700 dark:text-gray-300">
                <span>Subtotal</span><span className="font-mono">${fmt(subtotal)}</span>
              </div>
              {envio > 0 && (
                <div className="flex justify-between text-xs text-gray-700 dark:text-gray-300">
                  <span>Envío</span><span className="font-mono">${fmt(envio)}</span>
                </div>
              )}
              {descuentoValor > 0 && (
                <div className="flex justify-between text-xs text-green-600 dark:text-green-400">
                  <span>Descuento</span><span className="font-mono">−${fmt(descuentoValor)}</span>
                </div>
              )}
              {descuentosAutomaticos.length > 0 && descuentosAutomaticos.map((desc, idx) => (
                <div key={idx} className="flex justify-between text-xs text-violet-600 dark:text-violet-400">
                  <span className="flex items-center gap-1">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-violet-600 dark:bg-violet-400"></span>
                    {desc.categoria === 'global' ? 'Descuento global' :
                     desc.categoria === 'modalidad' ? 'Descuento modalidad' :
                     desc.categoria === 'metodo_pago' ? 'Descuento método pago' : 'Descuento'}
                    {desc.tipo === 'porcentaje' ? ` (${desc.valor}%)` : ''}
                  </span>
                  <span className="font-mono">−${fmt(desc.monto)}</span>
                </div>
              ))}
              {propina > 0 && (
                <div className="flex justify-between text-xs text-gray-700 dark:text-gray-300">
                  <span>Propina</span><span className="font-mono">${fmt(propina)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-sm text-gray-900 dark:text-gray-100 pt-1.5 border-t border-gray-300 dark:border-gray-700 mt-1">
                <span>Total</span><span className="font-mono">${fmt(total)}</span>
              </div>
            </div>
          )}
        </div>

        {/* CENTRO: Catálogo o Customizador */}
        <div className="flex-1 w-full min-h-[400px] lg:min-h-0 lg:min-w-[280px] flex flex-col overflow-hidden bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700">
          {productoCustom ? (
            <div className="flex-1 overflow-hidden bg-white dark:bg-[#1a1a24]">
              <ProductoCustomizer
                producto={productoCustom}
                onAgregar={agregarAlCarrito}
                onCerrar={() => setProductoCustom(null)} />
            </div>
          ) : (
            <>
              <div className="px-4 py-3 flex-shrink-0 space-y-2.5 border-b border-gray-200 dark:border-gray-700">
                <div className="relative">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
                    placeholder="Buscar producto..."
                    className="w-full pl-9 pr-4 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
                </div>
                {!busqueda && (
                  <div className="flex gap-2 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
                    {categorias.map(cat => (
                      <button key={cat.id} onClick={() => setCatActiva(cat.id)}
                        className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${catActiva === cat.id ? 'bg-violet-600 text-white' : 'bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-violet-400'}`}>
                        {cat.nombre}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex-1 overflow-y-auto p-3 bg-gray-50 dark:bg-gray-900/50">
                {loadingProds ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="w-8 h-8 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : productosFiltrados.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-gray-600 dark:text-gray-400">
                    <div className="text-4xl mb-2">🔍</div>
                    <p className="text-sm font-medium">No hay productos</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-2">
                    {productosFiltrados.map(prod => (
                      <button key={prod.id}
                        onClick={() => prod.activo && setProductoCustom(prod)}
                        disabled={!prod.activo}
                        className={`group rounded-xl overflow-hidden text-left transition-all border border-gray-200 dark:border-gray-700 ${!prod.activo ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer hover:shadow-md hover:-translate-y-0.5'}`}>
                        {prod.imagen ? (
                          <div className="h-20 overflow-hidden bg-gray-100 dark:bg-gray-700">
                            <img src={prod.imagen} alt={prod.nombre} className="w-full h-full object-contain p-1 transition-transform duration-300 group-hover:scale-105" />
                          </div>
                        ) : (
                          <div className="h-20 bg-gradient-to-br from-gray-100 dark:from-gray-700 to-gray-200 dark:to-gray-600 flex items-center justify-center text-2xl">🍔</div>
                        )}
                        <div className="px-2 py-1.5 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
                          <p className="text-xs font-medium text-gray-900 dark:text-gray-100 leading-tight line-clamp-2">{prod.nombre}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* DERECHA: Pago + Cliente — más ancho que antes */}
        <div className="w-full lg:w-[480px] lg:min-w-[220px] min-h-[300px] lg:min-h-0 flex flex-col flex-shrink-0 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="flex-1 overflow-y-auto">
            <div className="p-4 space-y-4">

              {/* Modalidad */}
              <div>
                <p className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-widest mb-1.5">Modalidad</p>
                <div className="flex gap-1.5">
                  {[{ id: 'delivery', label: 'Delivery', icon: '🛵' }, { id: 'takeaway', label: 'Take Away', icon: '🥡' }, { id: 'salon', label: 'Salón', icon: '🪑' }]
                    .filter(m => configProp.modalidades?.[m.id] !== false)
                    .map(m => (
                    <button key={m.id} onClick={() => setModalidad(m.id)}
                      className={`flex-1 py-2 text-xs font-semibold rounded-lg border-2 transition-colors ${modalidad === m.id ? 'bg-violet-600 text-white border-violet-600' : 'border-gray-200 text-gray-600 dark:text-gray-300 hover:border-gray-400'}`}>
                      {m.icon} {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Método de pago */}
              <div>
                <p className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-widest mb-1.5">Método de pago</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {metodosPagoHabilitados.filter(m => {
                    if (!m.cfgKey || !modalidad) return true
                    const cfg = configProp.metodosPago?.[m.cfgKey]
                    if (!cfg || typeof cfg === 'boolean') return true
                    const disp = cfg.disponibleEn
                    if (!disp || disp.length >= 3) return true
                    return disp.includes(modalidad)
                  }).map(m => (
                    <button key={m.id} onClick={() => setMetodoPago(m.id)}
                      className={`py-3 px-3 rounded-xl text-xs font-bold border-2 transition-all text-left flex items-center gap-2 ${metodoPago === m.id ? 'bg-violet-600 text-white border-violet-600 shadow-sm' : 'border-gray-200 text-gray-600 dark:text-gray-300 hover:border-gray-300 hover:bg-gray-50'}`}>
                      <span className="text-base">{m.icon}</span>
                      <span className="leading-tight">{m.label}</span>
                    </button>
                  ))}
                </div>
                {/* Info de transferencia: alias y titular */}
                {metodoPago === 'transferencia' && (() => {
                  const cfgT = configProp.metodosPago?.transferencia
                  if (!cfgT || typeof cfgT === 'boolean' || (!cfgT.alias && !cfgT.titularCuenta)) return null
                  return (
                    <div className="mt-2 p-2.5 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg space-y-0.5">
                      <p className="text-xs font-bold text-blue-700 dark:text-blue-300">Datos para transferencia:</p>
                      {cfgT.alias && <p className="text-xs text-blue-600 dark:text-blue-400">Alias: <span className="font-bold">{cfgT.alias}</span></p>}
                      {cfgT.titularCuenta && <p className="text-xs text-blue-600 dark:text-blue-400">Titular: <span className="font-bold">{cfgT.titularCuenta}</span></p>}
                    </div>
                  )
                })()}
              </div>

              {/* Descuento extra */}
              <div>
                <p className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-widest mb-1.5">Descuento extra</p>
                <div className="flex gap-2 mb-2">
                  <button onClick={() => setDescuentoTipo('porcentaje')}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg border-2 transition-colors flex items-center justify-center gap-1 ${descuentoTipo === 'porcentaje' ? 'bg-violet-600 text-white border-violet-600' : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300'}`}>
                    <span>%</span> Porcentaje
                  </button>
                  <button onClick={() => setDescuentoTipo('fijo')}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg border-2 transition-colors flex items-center justify-center gap-1 ${descuentoTipo === 'fijo' ? 'bg-violet-600 text-white border-violet-600' : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300'}`}>
                    <span>$</span> Monto fijo
                  </button>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-600 dark:text-gray-400 font-medium">
                    {descuentoTipo === 'porcentaje' ? '%' : '$'}
                  </span>
                  <input type="number" value={descuento}
                    onChange={e => {
                      const val = Number(e.target.value);
                      // Validar máximo según tipo
                      if (descuentoTipo === 'porcentaje') {
                        setDescuento(Math.min(val, 100));
                      } else {
                        setDescuento(Math.min(val, subtotal)); // No puede superar subtotal
                      }
                    }}
                    min={0}
                    max={descuentoTipo === 'porcentaje' ? 100 : subtotal}
                    className="w-full pl-7 pr-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
                  {descuentoTipo === 'porcentaje' && subtotal > 0 && descuento > 0 && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-green-600 dark:text-green-400 font-medium">
                      −${fmt(descuentoValor)}
                    </span>
                  )}
                </div>
              </div>

              {/* Envío (solo delivery) */}
              {modalidad === 'delivery' && (
                <div>
                  <p className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-widest mb-1.5">Costo de envío</p>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-600 dark:text-gray-400">$</span>
                    <input type="number" value={costoEnvio} onChange={e => setCostoEnvio(Number(e.target.value))} min={0}
                      className="w-full pl-7 pr-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
                  </div>
                </div>
              )}

              {/* Repartidor */}
              {modalidad === 'delivery' && repartidores.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-widest mb-1.5">Repartidor</p>
                  <select value={repartidorId} onChange={e => setRepartidorId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500">
                    <option value="">Sin asignar</option>
                    {repartidores.map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}
                  </select>
                </div>
              )}

              {/* Línea separadora */}
              <div className="border-t border-gray-200 dark:border-gray-700" />

              {/* Cliente con selector inteligente */}
              <ClienteSelector
                negocioId={negocioId}
                ciudad={ciudad}
                modalidad={modalidad}
                clienteNombre={clienteNombre} setClienteNombre={setClienteNombre}
                clienteTelefono={clienteTelefono} setClienteTelefono={setClienteTelefono}
                clienteEmail={clienteEmail} setClienteEmail={setClienteEmail}
                clienteDireccion={clienteDireccion} setClienteDireccion={setClienteDireccion}
                clienteId={clienteId} setClienteId={setClienteId}
                onDescuentoFijo={(pct) => { setDescuento(pct); setDescuentoTipo('porcentaje') }}
              />

              {/* Notas del pedido */}
              <div>
                <p className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-widest mb-1.5">Notas del pedido</p>
                <textarea value={notas} onChange={e => setNotas(e.target.value)}
                  placeholder="Instrucciones especiales..."
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500" />
              </div>

              {/* Facturación */}
              <div className="border border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <div className="relative flex-shrink-0">
                    <input
                      type="checkbox"
                      checked={requiereFactura}
                      onChange={e => setRequiereFactura(e.target.checked)}
                      className="sr-only"
                    />
                    <div className={`w-9 h-5 rounded-full transition-colors ${requiereFactura ? 'bg-violet-600' : 'bg-gray-200'}`}>
                      <span className={`absolute top-0.5 w-4 h-4 bg-white dark:bg-gray-800 rounded-full shadow transition-transform ${requiereFactura ? 'translate-x-4' : 'translate-x-0.5'}`} />
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200">Facturar este pedido</p>
                    <p className="text-xs text-gray-700 dark:text-gray-300">Requiere emisión de factura ARCA/AFIP</p>
                  </div>
                </label>
                {requiereFactura && (
                  <div className="mt-3">
                    <input
                      value={cuitFacturacion}
                      onChange={e => setCuitFacturacion(e.target.value)}
                      placeholder="CUIT del cliente (ej: 20-12345678-9)"
                      className="w-full px-3 py-2 border border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-900/20 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                    />
                  </div>
                )}
              </div>

              {/* Cobrado */}
              <div className="border border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <div className="relative flex-shrink-0">
                    <input type="checkbox" checked={cobrado} onChange={e => setCobrado(e.target.checked)} className="sr-only" />
                    <div className={`w-9 h-5 rounded-full transition-colors ${cobrado ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-600'}`}>
                      <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${cobrado ? 'translate-x-4' : 'translate-x-0.5'}`} />
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                      {cobrado ? '✓ Pedido cobrado' : 'Marcar como cobrado'}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">El cliente ya abonó este pedido</p>
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-gray-300 dark:border-gray-700 p-4 bg-gray-50/80 dark:bg-gray-800/80 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-widest">Total</span>
              <span className="text-2xl font-black text-gray-900 dark:text-gray-100">${fmt(total)}</span>
            </div>
            <div className="flex gap-2">
              <button onClick={onClose}
                className="px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-700 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                Cancelar
              </button>
              <button onClick={guardar} disabled={loading || carrito.length === 0}
                className="flex-1 py-2.5 bg-gray-900 hover:bg-gray-700 disabled:opacity-40 text-white text-sm font-bold rounded-xl transition-all">
                {loading ? 'Guardando...' : pedidoExistente ? 'Actualizar pedido' : 'Crear pedido'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
