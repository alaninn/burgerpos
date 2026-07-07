// =============================================
// PUNTO DE VENTA — pantalla de venta separada del panel administrativo
// (al estilo del POS de gestionQ24): barra superior propia con estado de
// caja y accesos rápidos, y el panel de pedidos a pantalla completa.
// =============================================
import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import api from '../../api/axios'
import PanelPedidos from './PanelPedidos'

export default function POS() {
  const { usuario, logout, getNegocioId } = useAuth()
  const { darkMode: dark, toggleTheme: toggle } = useTheme()
  const navigate = useNavigate()
  const negocioId = getNegocioId()

  const [caja, setCaja] = useState(null)
  const [hora, setHora] = useState(new Date())

  const cargarCaja = useCallback(() => {
    if (!negocioId) return
    api.get(`/negocios/${negocioId}/cajas/actual`)
      .then(({ data }) => setCaja(data?.caja || null))
      .catch(() => setCaja(null))
  }, [negocioId])

  useEffect(() => { cargarCaja() }, [cargarCaja])
  useEffect(() => {
    const t = setInterval(() => setHora(new Date()), 30000)
    const c = setInterval(cargarCaja, 60000)
    return () => { clearInterval(t); clearInterval(c) }
  }, [cargarCaja])

  const esAdmin = ['admin', 'superadmin'].includes(usuario?.rol)

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900 overflow-hidden">
      {/* Barra superior del POS */}
      <header className="flex-shrink-0 bg-gray-900 dark:bg-gray-950 text-white px-4 py-2.5 flex items-center gap-3 border-b border-gray-800 shadow-lg">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 bg-gradient-to-br from-violet-600 to-fuchsia-600 rounded-lg flex items-center justify-center flex-shrink-0 shadow-[0_0_14px_rgba(124,58,237,0.45)]">
            <span className="text-base">🍔</span>
          </div>
          <div className="min-w-0">
            <p className="font-bold text-sm leading-tight truncate">Punto de Venta</p>
            <p className="text-[11px] text-gray-400 leading-tight">
              {hora.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' })} · {hora.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </div>

        {/* Estado de caja */}
        <Link to="/admin/cajas"
          className={`ml-2 flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
            caja
              ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/25'
              : 'bg-red-500/15 border-red-500/40 text-red-300 hover:bg-red-500/25'
          }`}>
          <span className={`w-2 h-2 rounded-full ${caja ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
          {caja ? `Caja: ${caja.nombre || 'abierta'}` : 'Caja cerrada'}
        </Link>

        <div className="flex-1" />

        {/* Accesos rápidos */}
        <div className="flex items-center gap-1.5">
          <Link to="/admin/monitor-cocina" title="Monitor de cocina"
            className="px-3 py-1.5 rounded-lg text-xs font-medium text-gray-300 hover:bg-white/10 hover:text-white transition-colors hidden sm:block">
            👨‍🍳 Cocina
          </Link>
          <Link to="/admin/pedidos" title="Historial de pedidos"
            className="px-3 py-1.5 rounded-lg text-xs font-medium text-gray-300 hover:bg-white/10 hover:text-white transition-colors hidden sm:block">
            🧾 Historial
          </Link>
          <button onClick={toggle} title={dark ? 'Modo claro' : 'Modo oscuro'}
            className="p-2 rounded-lg text-gray-300 hover:bg-white/10 hover:text-white transition-colors">
            {dark ? '☀️' : '🌙'}
          </button>
          {esAdmin && (
            <button onClick={() => navigate('/admin/dashboard')}
              className="ml-1 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-violet-600 hover:bg-violet-500 text-white transition-colors shadow-[0_4px_14px_rgba(124,58,237,0.35)]">
              Panel administrativo →
            </button>
          )}
          <button onClick={() => { logout(); navigate('/login') }} title="Cerrar sesión"
            className="p-2 rounded-lg text-gray-400 hover:bg-red-500/20 hover:text-red-300 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
          </button>
        </div>
      </header>

      {/* Panel de pedidos a pantalla completa */}
      <main className="flex-1 overflow-hidden">
        <PanelPedidos />
      </main>
    </div>
  )
}
