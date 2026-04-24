import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

const NAV_ITEMS = [
  { to: '/superadmin/dashboard', label: 'Dashboard', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg> },
  { to: '/superadmin/negocios', label: 'Negocios', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg> },
  { to: '/superadmin/planes', label: 'Planes', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" /></svg> },
]

export default function SuperAdminLayout() {
  const { usuario, logout } = useAuth()
  const navigate = useNavigate()

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-60 flex-shrink-0 bg-gray-900 flex flex-col">
        <div className="px-5 py-5 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-violet-600 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div>
              <p className="text-white font-bold text-sm">BurgerPOS</p>
              <p className="text-violet-400 text-xs">Super Admin</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3">
          {NAV_ITEMS.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium mb-0.5 transition-colors ${
                  isActive
                    ? 'bg-violet-600 text-white'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                }`
              }
            >
              {item.icon}
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-gray-800 p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 bg-violet-700 rounded-full flex items-center justify-center">
              <span className="text-xs font-bold text-white">{usuario?.nombre?.[0]?.toUpperCase()}</span>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-white truncate">{usuario?.nombre}</p>
              <p className="text-xs text-gray-700 dark:text-gray-300 truncate">{usuario?.email}</p>
            </div>
          </div>
          <button
            onClick={() => { logout(); navigate('/login') }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-14 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center px-6">
          <h1 className="text-sm font-semibold text-gray-600 dark:text-gray-300">Panel de Administración Global</h1>
        </header>
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
