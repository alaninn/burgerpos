import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'

// Pages
import Landing from './pages/Landing'
import Login from './pages/Login'

// Admin
import AdminLayout from './components/layout/AdminLayout'
import Dashboard from './pages/admin/Dashboard'
import PanelPedidos from './pages/admin/PanelPedidos'
import POS from './pages/admin/POS'
import MapaVivo from './pages/admin/MapaVivo'
import Pedidos from './pages/admin/Pedidos'
import Menu from './pages/admin/Menu'
import Repartidores from './pages/admin/Repartidores'
import Clientes from './pages/admin/Clientes'
import Reportes from './pages/admin/Reportes'
import SoporteNegocio from './pages/admin/Soporte'
import CentroControl from './pages/admin/CentroControl'
import Configuraciones from './pages/admin/Configuraciones'
import Fiscal from './pages/admin/Fiscal'
import Descuentos from './pages/admin/Descuentos'
// Gestión
import Stock from './pages/admin/gestion/Stock'
import GastosDiarios from './pages/admin/gestion/GastosDiarios'
import Proveedores from './pages/admin/gestion/Proveedores'
import Recetas from './pages/admin/gestion/Recetas'
import Usuarios from './pages/admin/Usuarios'
import Cajas from './pages/admin/Cajas'
import MonitorCocina from './pages/admin/MonitorCocina'
import FacturacionElectronica from './pages/admin/FacturacionElectronica'

// Menú público
import MenuPublico from './pages/menu/MenuPublico'
import PagoExitoso from './pages/menu/PagoExitoso'
import PagoFallido from './pages/menu/PagoFallido'
import PagoPendiente from './pages/menu/PagoPendiente'

// SuperAdmin
import SuperAdminLayout from './components/layout/SuperAdminLayout'
import SADashboard from './pages/superadmin/Dashboard'
import SANegocios from './pages/superadmin/Negocios'
import SAUsuarios from './pages/superadmin/Usuarios'
import SAPlanes from './pages/superadmin/Planes'
import SAConfiguracion from './pages/superadmin/ConfiguracionPlataforma'
import SAErrores from './pages/superadmin/Errores'
import SAFinanzas from './pages/superadmin/Finanzas'
import SASoporte from './pages/superadmin/Soporte'

function PrivateRoute({ children, roles }) {
  const { usuario, loading } = useAuth()
  if (loading) return (
    <div className="flex items-center justify-center h-screen">
      <div className="w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )
  if (!usuario) return <Navigate to="/login" replace />
  if (roles && !roles.includes(usuario.rol)) return <Navigate to="/admin/panel-pedidos" replace />
  return children
}

function PublicRoute({ children }) {
  const { usuario, loading } = useAuth()
  if (loading) return null
  if (usuario) {
    if (usuario.rol === 'superadmin') return <Navigate to="/superadmin" replace />
    // Los operadores y admins entran directo al Punto de Venta
    return <Navigate to="/pos" replace />
  }
  return children
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/menu" element={<MenuPublico />} />
      <Route path="/menu/:slug" element={<MenuPublico />} />
      <Route path="/menu/:slug/pago-exitoso" element={<PagoExitoso />} />
      <Route path="/menu/:slug/pago-fallido" element={<PagoFallido />} />
      <Route path="/menu/:slug/pago-pendiente" element={<PagoPendiente />} />
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />

      {/* Punto de Venta: pantalla de venta separada del panel administrativo */}
      <Route path="/pos" element={<PrivateRoute roles={['superadmin', 'admin', 'operador']}><POS /></PrivateRoute>} />
      {/* Mapa de pedidos solo, para un segundo monitor (repartidores) */}
      <Route path="/mapa" element={<PrivateRoute roles={['superadmin', 'admin', 'operador']}><MapaVivo /></PrivateRoute>} />

      <Route path="/admin" element={<PrivateRoute roles={['superadmin', 'admin', 'operador']}><AdminLayout /></PrivateRoute>}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="panel-pedidos" element={<PanelPedidos />} />
        <Route path="pedidos" element={<Pedidos />} />
        <Route path="menu" element={<Menu />} />
        <Route path="repartidores" element={<Repartidores />} />
        <Route path="clientes" element={<Clientes />} />
        <Route path="reportes" element={<Reportes />} />
        <Route path="soporte" element={<SoporteNegocio />} />
        <Route path="centro-control" element={<CentroControl />} />
        <Route path="configuraciones" element={<Configuraciones />} />
        <Route path="fiscal" element={<Fiscal />} />
        <Route path="gestion/gastos" element={<GastosDiarios />} />
        <Route path="gestion/stock" element={<Stock />} />
        <Route path="gestion/recetas" element={<Recetas />} />
        <Route path="gestion/proveedores" element={<Proveedores />} />
        <Route path="descuentos" element={<Descuentos />} />
        <Route path="usuarios" element={<Usuarios />} />
        <Route path="cajas" element={<Cajas />} />
        <Route path="monitor-cocina" element={<MonitorCocina />} />
        <Route path="facturacion" element={<FacturacionElectronica />} />
      </Route>

      <Route path="/superadmin" element={<PrivateRoute roles={['superadmin']}><SuperAdminLayout /></PrivateRoute>}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<SADashboard />} />
        <Route path="negocios" element={<SANegocios />} />
        <Route path="usuarios" element={<SAUsuarios />} />
        <Route path="planes" element={<SAPlanes />} />
        <Route path="configuracion" element={<SAConfiguracion />} />
        <Route path="finanzas" element={<SAFinanzas />} />
        <Route path="soporte" element={<SASoporte />} />
        <Route path="errores" element={<SAErrores />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ThemeProvider>
          <AppRoutes />
        </ThemeProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
