import { useState, useCallback } from 'react'
import api from '../api/axios'
import toast from 'react-hot-toast'

// ─── Utilidades ───────────────────────────────────────────
const ESTADO_LABEL = {
  nuevo: 'Nuevo', en_preparacion: 'En preparación',
  listo: 'Listo', en_camino: 'En camino',
  entregado: 'Entregado', cancelado: 'Cancelado',
}
const ESTADO_COLOR = {
  nuevo: '#3b82f6', en_preparacion: '#f59e0b',
  listo: '#22c55e', en_camino: '#f97316',
  entregado: '#6b7280', cancelado: '#ef4444',
}
const MODALIDAD_LABEL = { delivery: 'Delivery', takeaway: 'Take Away', salon: 'Salón' }

function fmt(n) { return Number(n || 0).toLocaleString('es-AR') }
function hora(d) { return new Date(d).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) }
function fecha(d) { return new Date(d).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }) }

// ─── Impresión ────────────────────────────────────────────
function imprimirComanda(pedido, tipo = 'venta') {
  const esVenta = tipo === 'venta'
  const win = window.open('', '_blank', 'width=400,height=600')
  win.document.write(`<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: 'Courier New', monospace; font-size: 13px; padding: 16px; max-width: 380px; }
  .center { text-align: center; }
  .bold { font-weight: bold; }
  .sep { border-top: 1px dashed #000; margin: 8px 0; }
  .row { display: flex; justify-content: space-between; margin: 2px 0; }
  .title { font-size: 16px; font-weight: bold; text-transform: uppercase; text-align: center; margin-bottom: 4px; }
  .sub { font-size: 11px; color: #444; margin-left: 12px; }
  .total { font-size: 15px; font-weight: bold; }
  @media print { body { padding: 0; } }
</style></head>
<body>
<div class="center bold" style="font-size:18px; margin-bottom:2px;">🍔 BURGERPOS</div>
<div class="center" style="font-size:11px; margin-bottom:8px;">${esVenta ? 'COMPROBANTE DE VENTA' : 'COMANDA DE COCINA'}</div>
<div class="sep"></div>
<div class="row"><span class="bold">Pedido N°${pedido.numero}</span><span>${MODALIDAD_LABEL[pedido.modalidad]}</span></div>
<div class="row"><span>Cliente:</span><span>${pedido.clienteNombre || '—'}</span></div>
${pedido.clienteDireccion ? `<div class="row"><span>Dir:</span><span style="text-align:right;max-width:60%">${pedido.clienteDireccion}</span></div>` : ''}
${pedido.repartidor ? `<div class="row"><span>Repartidor:</span><span>${pedido.repartidor.nombre}</span></div>` : ''}
<div class="row"><span>Hora:</span><span>${hora(pedido.createdAt)}</span></div>
<div class="sep"></div>
<div class="bold" style="margin-bottom:4px;">ITEMS</div>
${pedido.items?.map(item => `
  <div class="row">
    <span class="bold">${item.cantidad}x ${item.nombre}</span>
    ${esVenta ? `<span>$${fmt(item.subtotal)}</span>` : ''}
  </div>
  ${item.varianteNombre ? `<div class="sub">→ ${item.varianteNombre}</div>` : ''}
  ${(item.adicionales || []).map(a => `<div class="sub">+ ${a.nombre}${a.cantidad > 1 ? ` x${a.cantidad}` : ''}${esVenta && a.precio > 0 ? ` ($${fmt(a.precio * a.cantidad)})` : ''}</div>`).join('')}
  ${item.notas ? `<div class="sub">📝 ${item.notas}</div>` : ''}
`).join('')}
${esVenta ? `
<div class="sep"></div>
${pedido.costoEnvio > 0 ? `<div class="row"><span>Envío</span><span>$${fmt(pedido.costoEnvio)}</span></div>` : ''}
${pedido.descuento > 0 ? `<div class="row"><span>Descuento</span><span>-$${fmt(pedido.descuento)}</span></div>` : ''}
<div class="row total"><span>TOTAL</span><span>$${fmt(pedido.total)}</span></div>
<div class="row"><span>Pago</span><span>${pedido.metodoPago}</span></div>
` : ''}
${pedido.notas ? `<div class="sep"></div><div>📝 ${pedido.notas}</div>` : ''}
<div class="sep"></div>
<div class="center" style="font-size:11px;">Gracias por su pedido!</div>
</body></html>`)
  win.document.close()
  setTimeout(() => { win.print(); win.close() }, 500)
}

// ─── Componente principal ─────────────────────────────────
export default function ModalDetallePedido({ pedido: pedidoInicial, repartidores, onClose, onUpdate, onEditar }) {
  const [pedido, setPedido] = useState(pedidoInicial)
  const [loading, setLoading] = useState(false)
  const [repId, setRepId] = useState(pedidoInicial.repartidorId || '')

  const cambiarEstado = async (nuevoEstado) => {
    setLoading(true)
    try {
      const { data } = await api.put(
        `/negocios/${pedido.negocioId}/pedidos/${pedido.id}`,
        { estado: nuevoEstado, ...(nuevoEstado === 'en_camino' && repId ? { repartidorId: repId } : {}) }
      )
      setPedido(data.pedido)
      onUpdate()
      toast.success(`→ ${ESTADO_LABEL[nuevoEstado]}`)
    } catch { toast.error('Error al actualizar') }
    finally { setLoading(false) }
  }

  const asignarRepartidor = async (id) => {
    setRepId(id)
    if (!id) return
    try {
      const { data } = await api.put(`/negocios/${pedido.negocioId}/pedidos/${pedido.id}`, { repartidorId: id })
      setPedido(data.pedido)
      onUpdate()
      toast.success('Repartidor asignado')
    } catch { toast.error('Error') }
  }

  const cancelarPedido = async () => {
    if (!confirm('¿Cancelar este pedido?')) return
    await cambiarEstado('cancelado')
  }

  // Flujo diferenciado por modalidad
  const esDelivery = pedido.modalidad === 'delivery'
  const NEXT_MAP = esDelivery 
    ? { nuevo: 'en_preparacion', en_preparacion: 'listo', listo: 'en_camino', en_camino: 'entregado' }
    : { nuevo: 'en_preparacion', en_preparacion: 'listo', listo: 'entregado' }
  const PREV_MAP = esDelivery
    ? { en_preparacion: 'nuevo', listo: 'en_preparacion', en_camino: 'listo', entregado: 'en_camino' }
    : { en_preparacion: 'nuevo', listo: 'en_preparacion', entregado: 'listo' }
  const nextEstado = NEXT_MAP[pedido.estado]
  const prevEstado = PREV_MAP[pedido.estado]
  const esActivo = !['cancelado', 'entregado'].includes(pedido.estado)

  const isPagado = pedido.cobrado === true || !['efectivo', 'efectivo_sin_descuento'].includes(pedido.metodoPago)
  const subtotal = Number(pedido.subtotal || 0)
  const costoEnvio = Number(pedido.costoEnvio || 0)
  const descuento = Number(pedido.descuento || 0)
  const propina = Number(pedido.propina || 0)
  const total = Number(pedido.total || 0)

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}>
      <div
        className="relative w-full max-w-5xl mt-8 rounded-2xl overflow-hidden shadow-2xl flex flex-col"
        style={{ maxHeight: 'calc(100vh - 64px)', background: '#fff' }}
        onClick={e => e.stopPropagation()}>

        {/* ── Header ──────────────────────────────────── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700" style={{ background: '#fafafa' }}>
          <div className="flex items-center gap-3">
            <span className="font-bold text-gray-900 dark:text-gray-100 text-lg">
              {MODALIDAD_LABEL[pedido.modalidad]} N°{pedido.numero}
            </span>
            {/* Badge estado */}
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold"
              style={{ background: ESTADO_COLOR[pedido.estado] + '18', color: ESTADO_COLOR[pedido.estado] }}>
              <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: ESTADO_COLOR[pedido.estado] }} />
              {ESTADO_LABEL[pedido.estado]}
            </span>
            {/* Badge pago */}
            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${isPagado ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
              {isPagado ? '✓ Cobrado' : '💰 Sin cobrar'}
            </span>
            {/* Badge factura */}
            {pedido.requiereFactura && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-400 border border-violet-200 dark:border-violet-800">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                Factura{pedido.cuitFacturacion ? ` · ${pedido.cuitFacturacion}` : ''}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {esActivo && (
              <button onClick={() => onEditar(pedido)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold border-2 border-violet-600 text-violet-600 dark:text-violet-400 hover:bg-violet-600 hover:text-white dark:border-violet-500 transition-all">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                Editar
              </button>
            )}
            <button onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-gray-600 dark:text-gray-400 hover:text-gray-700">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        </div>

        {/* ── Contenido ────────────────────────────────── */}
        <div className="flex flex-1 overflow-hidden min-h-0">

          {/* Panel izquierdo: items */}
          <div className="flex-1 flex flex-col overflow-hidden border-r border-gray-200 dark:border-gray-700">
            <div className="px-6 pt-4 pb-2">
              <span className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-widest">Detalles del pedido</span>
            </div>

            {/* Tabla items */}
            <div className="flex-1 overflow-y-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left px-6 py-2 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Producto</th>
                    <th className="text-right px-4 py-2 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Precio</th>
                    <th className="text-right px-4 py-2 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Cant.</th>
                    <th className="text-right px-6 py-2 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {pedido.items?.map((item, i) => (
                    <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                      <td className="px-6 py-3">
                        <p className="font-semibold text-gray-900 dark:text-gray-100">{item.nombre}</p>
                        {item.varianteNombre && (
                          <p className="text-xs text-violet-600 dark:text-violet-400 mt-0.5">→ {item.varianteNombre}</p>
                        )}
                        {(item.adicionales || []).map((a, j) => (
                          <p key={j} className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                            + {a.nombre}{a.cantidad > 1 ? ` ×${a.cantidad}` : ''}
                            {a.precio > 0 && <span className="text-gray-700 dark:text-gray-300"> (${fmt(a.precio * a.cantidad)})</span>}
                          </p>
                        ))}
                        {item.notas && <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5 italic">"{item.notas}"</p>}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-300 font-mono">${fmt(item.precioUnitario)}</td>
                      <td className="px-4 py-3 text-right text-gray-900 dark:text-gray-100 font-mono font-semibold">{item.cantidad}</td>
                      <td className="px-6 py-3 text-right font-mono font-bold text-gray-900 dark:text-gray-100">${fmt(item.subtotal || item.precioUnitario * item.cantidad)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totales */}
            <div className="border-t border-gray-200 dark:border-gray-700 px-6 py-4 space-y-1.5 bg-gray-50/50">
              <div className="flex justify-between text-sm text-gray-700 dark:text-gray-300">
                <span>Subtotal</span>
                <span className="font-mono">${fmt(subtotal)}</span>
              </div>
              {costoEnvio > 0 && (
                <div className="flex justify-between text-sm text-gray-700 dark:text-gray-300">
                  <span>Envío</span>
                  <span className="font-mono">${fmt(costoEnvio)}</span>
                </div>
              )}
              {descuento > 0 && (
                <div className="flex justify-between text-sm text-green-600 dark:text-green-400">
                  <span>Descuento</span>
                  <span className="font-mono">−${fmt(descuento)}</span>
                </div>
              )}
              {propina > 0 && (
                <div className="flex justify-between text-sm text-gray-700 dark:text-gray-300">
                  <span>Propina</span>
                  <span className="font-mono">${fmt(propina)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-gray-900 dark:text-gray-100 text-base pt-1 border-t border-gray-300 dark:border-gray-700">
                <span>Total</span>
                <span className="font-mono">${fmt(total)}</span>
              </div>
            </div>

            {/* Botones imprimir + factura */}
            <div className="flex items-center gap-2 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
              <button onClick={() => imprimirComanda(pedido, 'venta')}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                Comanda venta
              </button>
              <button onClick={() => imprimirComanda(pedido, 'cocina')}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                Comanda cocina
              </button>
              <button disabled
                title="Próximamente"
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-dashed border-gray-300 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-400 cursor-not-allowed">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                Factura electrónica
              </button>
            </div>
          </div>

          {/* Panel derecho: info + acciones */}
          <div className="w-72 flex flex-col overflow-y-auto" style={{ background: '#fafafa' }}>
            <div className="p-5 space-y-5 flex-1">

              {/* N° pedido */}
              <div>
                <p className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-widest mb-2">Pedido</p>
                <p className="font-mono font-bold text-gray-900 dark:text-gray-100 text-lg">#{pedido.numero}</p>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{fecha(pedido.createdAt)}</p>
                {pedido.updatedAt !== pedido.createdAt && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">Actualizado: {hora(pedido.updatedAt)}</p>
                )}
              </div>

              {/* Cliente */}
              <div>
                <p className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-widest mb-2">Cliente</p>
                <p className="font-semibold text-gray-900 dark:text-gray-100">{pedido.clienteNombre || '—'}</p>
                {pedido.clienteTelefono && (
                  <p className="text-sm text-gray-700 dark:text-gray-300 mt-0.5">📞 {pedido.clienteTelefono}</p>
                )}
                {pedido.clienteDireccion && (
                  <a href={`https://maps.google.com/?q=${encodeURIComponent(pedido.clienteDireccion)}`}
                    target="_blank" rel="noreferrer"
                    className="flex items-start gap-1.5 text-sm text-violet-600 dark:text-violet-400 hover:underline mt-1">
                    <svg className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    <span>{pedido.clienteDireccion}</span>
                  </a>
                )}
              </div>

      {/* Pago */}
      <div>
        <p className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-widest mb-2">Pago</p>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${isPagado ? 'bg-green-500' : 'bg-amber-500'}`} />
            <span className="text-sm font-medium text-gray-800 dark:text-gray-200 capitalize">{pedido.metodoPago}</span>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={isPagado} onChange={async (e) => {
              try {
                await api.put(`/negocios/${pedido.negocioId}/pedidos/${pedido.id}`, { 
                  cobrado: e.target.checked 
                })
                onUpdate()
                toast.success(e.target.checked ? '✅ Marcado como cobrado' : '💰 Marcado como pendiente de cobro')
              } catch { toast.error('Error') }
            }} className="w-4 h-4" />
            <span className="text-xs">Pagado</span>
          </label>
        </div>
      </div>

              {/* Repartidor */}
              {pedido.modalidad === 'delivery' && (
                <div>
                  <p className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-widest mb-2">Repartidor</p>
                  <select value={repId} onChange={e => asignarRepartidor(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white dark:bg-gray-800">
                    <option value="">Sin asignar</option>
                    {repartidores.map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}
                  </select>
                </div>
              )}

              {/* Notas */}
              {pedido.notas && (
                <div>
                  <p className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-widest mb-2">Notas</p>
                  <p className="text-sm text-gray-600 dark:text-gray-300 bg-amber-50 dark:bg-amber-900/20 rounded-lg px-3 py-2 border border-amber-100">{pedido.notas}</p>
                </div>
              )}

      {/* Estado */}
      <div>
        <p className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-widest mb-2">Estado</p>
        <select value={pedido.estado} onChange={e => cambiarEstado(e.target.value)}
          className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg text-sm mb-3 bg-white dark:bg-gray-800">
          {Object.entries(ESTADO_LABEL).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <div className="space-y-2">
          {nextEstado && (
            <button onClick={() => cambiarEstado(nextEstado)} disabled={loading}
              className="w-full py-2.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-50"
              style={{ background: ESTADO_COLOR[nextEstado] }}>
              {loading ? '...' : pedido.estado === 'nuevo' ? 'Confirmar' : `→ ${ESTADO_LABEL[nextEstado]}`}
            </button>
          )}
        </div>
      </div>
            </div>

            {/* Footer: cancelar */}
            {esActivo && (
              <div className="p-5 border-t border-gray-300 dark:border-gray-700">
                <button onClick={cancelarPedido} disabled={loading}
                  className="w-full py-2 rounded-xl text-sm font-medium text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                  Cancelar pedido
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
