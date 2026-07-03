// Centro de Control: la ganancia real del negocio en un período.
// Venta de productos − costo de lo vendido − gastos registrados en Gestión.
// Inspirado en el centro de control de gestionQ24, adaptado a gastronomía.
import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import api from '../../api/axios'
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts'

const fmt = (n) => '$' + Math.round(Number(n) || 0).toLocaleString('es-AR')
const hoyISO = () => {
  const d = new Date()
  return new Date(d - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
}

const COLORES_METODO = {
  efectivo: '#10b981', efectivo_sin_descuento: '#34d399', transferencia: '#f59e0b',
  tarjeta: '#3b82f6', mercadopago: '#8b5cf6',
}
const NOMBRE_METODO = {
  efectivo: '💵 Efectivo', efectivo_sin_descuento: '💵 Efectivo (s/desc.)',
  transferencia: '🏦 Transferencia', tarjeta: '💳 Tarjeta', mercadopago: '📱 Mercado Pago',
}
const NOMBRE_MODALIDAD = { delivery: '🛵 Delivery', takeaway: '🥡 Take Away', salon: '🍽️ Salón' }
const NOMBRE_CATEGORIA_GASTO = {
  proveedores: 'Proveedores', servicios: 'Servicios', salarios: 'Salarios',
  alquiler: 'Alquiler', servicios_publicos: 'Servicios públicos', otro: 'Otros',
}

function CardChica({ titulo, valor, sub, color, onClick }) {
  return (
    <div onClick={onClick}
      className={`rounded-2xl p-4 text-white shadow-lg bg-gradient-to-br ${color} ${onClick ? 'cursor-pointer hover:scale-[1.02] transition-transform' : ''}`}>
      <p className="text-xs font-semibold opacity-90">{titulo}</p>
      <p className="text-2xl font-bold mt-1">{valor}</p>
      {sub && <p className="text-[11px] opacity-75 mt-1">{sub}</p>}
    </div>
  )
}

function Linea({ label, valor }) {
  return (
    <div className="flex items-center justify-between">
      <span>{label}</span>
      <span className="font-semibold text-gray-700 dark:text-gray-300">{valor}</span>
    </div>
  )
}

// Modal con las ventas de un método de pago en el período
function ModalVentasMetodo({ detalle, fechas, onClose }) {
  const { getNegocioId } = useAuth()
  const [pedidos, setPedidos] = useState(null)

  useEffect(() => {
    const negocioId = getNegocioId()
    const base = `/negocios/${negocioId}/pedidos?fechaDesde=${fechas.desde}&fechaHasta=${fechas.hasta}`
    // "efectivo" agrupa los dos métodos de efectivo
    const metodos = detalle.metodo === 'efectivo' ? ['efectivo', 'efectivo_sin_descuento'] : [detalle.metodo]
    Promise.allSettled(metodos.map(m => api.get(`${base}&metodoPago=${m}`)))
      .then(resultados => {
        const todos = resultados
          .filter(r => r.status === 'fulfilled')
          .flatMap(r => r.value.data?.pedidos || [])
          .filter(p => p.estado !== 'cancelado')
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        setPedidos(todos)
      })
  }, [detalle, fechas, getNegocioId])

  const total = (pedidos || []).reduce((acc, p) => acc + (parseFloat(p.total) || 0), 0)

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">{detalle.label} — ventas del período</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {fechas.desde === fechas.hasta ? fechas.desde : `${fechas.desde} → ${fechas.hasta}`}
              {pedidos && ` · ${pedidos.length} pedido/s · ${fmt(total)}`}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-500">✕</button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {pedidos === null ? (
            <p className="text-center text-gray-400 py-10">Cargando…</p>
          ) : pedidos.length === 0 ? (
            <p className="text-center text-gray-400 py-10">Sin ventas con este método en el período</p>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {pedidos.map(p => (
                <div key={p.id} className="px-6 py-3 flex items-center justify-between gap-3 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                      #{p.numero} · {NOMBRE_MODALIDAD[p.modalidad] || p.modalidad}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {new Date(p.createdAt).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })}
                      {p.clienteNombre ? ` · ${p.clienteNombre}` : ''}
                      {p.items?.length ? ` · ${p.items.reduce((a, i) => a + (i.cantidad || 1), 0)} ítem/s` : ''}
                    </p>
                  </div>
                  <p className="text-sm font-bold text-gray-900 dark:text-gray-100 flex-shrink-0">{fmt(p.total)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function CentroControl() {
  const { getNegocioId } = useAuth()
  const navigate = useNavigate()
  const [periodo, setPeriodo] = useState('hoy') // hoy | dia | mes | rango
  const [dia, setDia] = useState(hoyISO())
  const [mes, setMes] = useState(hoyISO().slice(0, 7))
  const [rangoDesde, setRangoDesde] = useState(hoyISO())
  const [rangoHasta, setRangoHasta] = useState(hoyISO())
  const [datos, setDatos] = useState(null)
  const [cargando, setCargando] = useState(false)
  const [sinAcceso, setSinAcceso] = useState(false)
  const [detalleMetodo, setDetalleMetodo] = useState(null)

  const calcularFechas = useCallback(() => {
    if (periodo === 'hoy') { const h = hoyISO(); return { desde: h, hasta: h } }
    if (periodo === 'dia') return { desde: dia, hasta: dia }
    if (periodo === 'mes') {
      const [a, m] = mes.split('-')
      const ultimo = new Date(a, m, 0).getDate()
      return { desde: `${a}-${m}-01`, hasta: `${a}-${m}-${String(ultimo).padStart(2, '0')}` }
    }
    return { desde: rangoDesde, hasta: rangoHasta }
  }, [periodo, dia, mes, rangoDesde, rangoHasta])

  const cargar = useCallback(async () => {
    setCargando(true)
    setSinAcceso(false)
    try {
      const { desde, hasta } = calcularFechas()
      const negocioId = getNegocioId()
      const { data } = await api.get(`/negocios/${negocioId}/reportes/centro-control?fechaDesde=${desde}&fechaHasta=${hasta}`)
      setDatos(data)
    } catch (err) {
      if (err.response?.data?.planAccesoDenegado) setSinAcceso(true)
      setDatos(null)
    } finally {
      setCargando(false)
    }
  }, [calcularFechas, getNegocioId])

  useEffect(() => { cargar() }, [cargar])

  const d = datos
  const datosPie = d ? Object.entries(d.porMetodo || {})
    .filter(([, v]) => v > 0)
    .map(([metodo, value]) => ({ metodo, name: NOMBRE_METODO[metodo] || metodo, value })) : []

  const datosBarras = d ? [
    { name: 'Venta productos', valor: Math.round(d.ventaProductos || 0), color: '#3b82f6' },
    { name: 'Costo productos', valor: -Math.round(d.costoProductos || 0), color: '#f59e0b' },
    { name: 'Gastos', valor: -Math.round(d.gastosPeriodo || 0), color: '#ef4444' },
    { name: 'Ganancia neta', valor: Math.round(d.gananciaNeta || 0), color: '#10b981' },
  ] : []

  if (sinAcceso) {
    return (
      <div className="p-6 max-w-2xl mx-auto text-center py-20">
        <p className="text-5xl mb-4">🎯</p>
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">Centro de Control</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Esta función está disponible en el plan Premium. Consultá desde Soporte para actualizar tu plan.
        </p>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 bg-clip-text text-transparent">
            🎯 Centro de Control
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Ganancia real del negocio, descontando costos y gastos.</p>
        </div>
        <button onClick={() => navigate('/admin/gestion/gastos')}
          className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors">
          💸 Ver gastos
        </button>
      </div>

      {/* Filtro de período */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 flex flex-wrap items-center gap-2">
        {[['hoy', 'Hoy'], ['dia', 'Un día'], ['mes', 'Mes'], ['rango', 'Rango']].map(([id, label]) => (
          <button key={id} onClick={() => setPeriodo(id)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${periodo === id ? 'bg-emerald-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200'}`}>
            {label}
          </button>
        ))}
        {periodo === 'dia' && (
          <input type="date" value={dia} onChange={e => setDia(e.target.value)}
            className="border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-gray-800" />
        )}
        {periodo === 'mes' && (
          <input type="month" value={mes} onChange={e => setMes(e.target.value)}
            className="border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-gray-800" />
        )}
        {periodo === 'rango' && (
          <div className="flex items-center gap-2">
            <input type="date" value={rangoDesde} onChange={e => setRangoDesde(e.target.value)} className="border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-gray-800" />
            <span className="text-gray-400">→</span>
            <input type="date" value={rangoHasta} onChange={e => setRangoHasta(e.target.value)} className="border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-gray-800" />
          </div>
        )}
        <button onClick={cargar} className="ml-auto bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-semibold">
          🔄 Actualizar
        </button>
      </div>

      {cargando && <div className="text-center text-gray-400 py-10">Calculando…</div>}

      {d && !cargando && (
        <>
          {/* GANANCIA NETA REAL — destacada */}
          <div className="rounded-3xl p-6 sm:p-8 text-white shadow-2xl relative overflow-hidden"
            style={{ background: 'linear-gradient(135deg, #064e3b 0%, #0f766e 60%, #155e75 100%)' }}>
            <div className="relative z-10">
              <p className="text-emerald-200 text-sm font-medium uppercase tracking-wider">Ganancia neta real del período</p>
              <p className={`text-4xl sm:text-5xl font-bold mt-2 ${d.gananciaNeta < 0 ? 'text-red-300' : 'text-white'}`}>{fmt(d.gananciaNeta)}</p>
              <p className="text-emerald-100/70 text-xs mt-2">
                {d.diasPeriodo} día(s) · {d.totalPedidos} pedidos · Venta de productos {fmt(d.ventaProductos)} menos descuentos, costo de lo vendido y gastos registrados
              </p>
              <div className="mt-3 inline-flex items-center gap-2 bg-white/10 border border-white/15 rounded-xl px-3 py-1.5">
                <span className="text-emerald-100/80 text-xs">📈 Ganancia bruta (sin gastos):</span>
                <span className={`text-sm font-bold ${d.gananciaBruta < 0 ? 'text-red-300' : 'text-white'}`}>{fmt(d.gananciaBruta)}</span>
              </div>
              {d.itemsSinCosto > 0 && (
                <p className="text-amber-200/90 text-xs mt-3">
                  ⚠️ {d.itemsSinCosto} producto(s) vendidos sin costo cargado — la ganancia real puede ser menor. Cargá los costos en Menú o con recetas.
                </p>
              )}
            </div>
            <div className="absolute -right-10 -bottom-10 w-48 h-48 rounded-full bg-emerald-400/10 blur-3xl" />
          </div>

          {/* Facturación total */}
          <div className="rounded-2xl p-5 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-gray-500 dark:text-gray-400 text-sm font-medium uppercase tracking-wider">Facturación total</p>
              <p className="text-3xl font-bold text-gray-800 dark:text-gray-100 mt-1">{fmt(d.totalFacturado)}</p>
              <p className="text-xs text-gray-400 mt-0.5">
                Incluye envíos {fmt(d.envios)} y propinas {fmt(d.propinas)} · Ticket promedio {fmt(d.ticketPromedio)}
              </p>
            </div>
            <span className="text-4xl">🧾</span>
          </div>

          {/* Desglose de la ganancia */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 border border-gray-100 dark:border-gray-700">
              <h3 className="font-bold text-gray-800 dark:text-gray-100 mb-1">🍔 Margen de productos</h3>
              <p className="text-xs text-gray-400 mb-3">Venta de productos − descuentos − costo de lo vendido</p>
              <p className="text-3xl font-bold text-emerald-600">{fmt(d.gananciaBruta)}</p>
              <div className="mt-3 text-sm text-gray-500 dark:text-gray-400 space-y-1">
                <Linea label="Venta de productos" valor={fmt(d.ventaProductos)} />
                <Linea label="Descuentos" valor={'− ' + fmt(d.descuentos)} />
                <Linea label="Costo de lo vendido" valor={'− ' + fmt(d.costoProductos)} />
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 border border-gray-100 dark:border-gray-700">
              <h3 className="font-bold text-gray-800 dark:text-gray-100 mb-1">💸 Gastos del período</h3>
              <p className="text-xs text-gray-400 mb-3">Registrados en Gestión → Gastos ({d.cantidadGastos} gasto/s)</p>
              <p className="text-3xl font-bold text-red-500">{fmt(d.gastosPeriodo)}</p>
              <div className="mt-3 text-sm text-gray-500 dark:text-gray-400 space-y-1">
                {Object.entries(d.gastosPorCategoria || {}).length === 0 ? (
                  <p className="text-xs text-gray-400">Sin gastos registrados en el período</p>
                ) : (
                  Object.entries(d.gastosPorCategoria).map(([cat, monto]) => (
                    <Linea key={cat} label={NOMBRE_CATEGORIA_GASTO[cat] || cat} valor={'− ' + fmt(monto)} />
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Por método de pago (tocá una tarjeta para ver las ventas) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <CardChica titulo="💵 Efectivo" color="from-emerald-500 to-green-600" sub="tocá para ver las ventas →"
              valor={fmt((d.porMetodo?.efectivo || 0) + (d.porMetodo?.efectivo_sin_descuento || 0))}
              onClick={() => setDetalleMetodo({ metodo: 'efectivo', label: '💵 Efectivo' })} />
            <CardChica titulo="🏦 Transferencia" color="from-amber-500 to-orange-600" sub="tocá para ver las ventas →"
              valor={fmt(d.porMetodo?.transferencia)}
              onClick={() => setDetalleMetodo({ metodo: 'transferencia', label: '🏦 Transferencia' })} />
            <CardChica titulo="💳 Tarjeta" color="from-blue-500 to-indigo-600" sub="tocá para ver las ventas →"
              valor={fmt(d.porMetodo?.tarjeta)}
              onClick={() => setDetalleMetodo({ metodo: 'tarjeta', label: '💳 Tarjeta' })} />
            <CardChica titulo="📱 Mercado Pago" color="from-violet-500 to-purple-600" sub="tocá para ver las ventas →"
              valor={fmt(d.porMetodo?.mercadopago)}
              onClick={() => setDetalleMetodo({ metodo: 'mercadopago', label: '📱 Mercado Pago' })} />
          </div>

          {/* Por modalidad */}
          <div className="grid grid-cols-3 gap-4">
            {Object.entries(NOMBRE_MODALIDAD).map(([k, nombre]) => (
              <div key={k} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4 text-center shadow-sm">
                <p className="text-xs text-gray-500 dark:text-gray-400">{nombre}</p>
                <p className="text-xl font-bold text-gray-800 dark:text-gray-100 mt-1">{fmt(d.porModalidad?.[k])}</p>
              </div>
            ))}
          </div>

          {/* Gráficos */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 border border-gray-100 dark:border-gray-700">
              <h3 className="font-bold text-gray-800 dark:text-gray-100 mb-3 text-center">Ventas por método</h3>
              {datosPie.length === 0 ? <p className="text-center text-gray-400 py-10">Sin ventas en el período</p> : (
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={datosPie} cx="50%" cy="50%" innerRadius={55} outerRadius={95} paddingAngle={3} dataKey="value"
                      label={({ percent }) => `${(percent * 100).toFixed(0)}%`}>
                      {datosPie.map((e, i) => <Cell key={i} fill={COLORES_METODO[e.metodo] || '#94a3b8'} />)}
                    </Pie>
                    <Tooltip formatter={(v) => fmt(v)} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 border border-gray-100 dark:border-gray-700">
              <h3 className="font-bold text-gray-800 dark:text-gray-100 mb-3 text-center">Composición de la ganancia</h3>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={datosBarras}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-12} textAnchor="end" height={50} />
                  <YAxis tickFormatter={(v) => '$' + Math.round(v / 1000) + 'k'} />
                  <Tooltip formatter={(v) => fmt(v)} />
                  <Bar dataKey="valor" radius={[6, 6, 0, 0]}>
                    {datosBarras.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}

      {detalleMetodo && (
        <ModalVentasMetodo
          detalle={detalleMetodo}
          fechas={calcularFechas()}
          onClose={() => setDetalleMetodo(null)}
        />
      )}
    </div>
  )
}
