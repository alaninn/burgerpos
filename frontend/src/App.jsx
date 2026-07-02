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
import Pedidos from './pages/admin/Pedidos'
import Menu from './pages/admin/Menu'
import Repartidores from './pages/admin/Repartidores'
import Clientes from './pages/admin/Clientes'
import Reportes from './pages/admin/Reportes'
import Configuraciones from './pages/admin/Configuraciones'
import Fiscal from './pages/admin/Fiscal'
import Descuentos from './pages/admin/Descuentos'
// Gestión
import Stock from './pages/admin/gestion/Stock'
import GastosDiarios from './pages/admin/gestion/GastosDiarios'
import Compras from './pages/admin/gestion/Compras'
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
    return <Navigate to="/admin/panel-pedidos" replace />
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

      <Route path="/admin" element={<PrivateRoute roles={['superadmin', 'admin', 'operador']}><AdminLayout /></PrivateRoute>}>
        <Route index element={<Navigate to="panel-pedidos" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="panel-pedidos" element={<PanelPedidos />} />
        <Route path="pedidos" element={<Pedidos />} />
        <Route path="menu" element={<Menu />} />
        <Route path="repartidores" element={<Repartidores />} />
        <Route path="clientes" element={<Clientes />} />
        <Route path="reportes" element={<Reportes />} />
        <Route path="configuraciones" element={<Configuraciones />} />
        <Route path="fiscal" element={<Fiscal />} />
        <Route path="gestion/gastos" element={<GastosDiarios />} />
        <Route path="gestion/compras" element={<Compras />} />
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
