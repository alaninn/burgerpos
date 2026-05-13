import { createContext, useContext, useState, useEffect } from 'react'
import api from '../api/axios'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(() => {
    try { return JSON.parse(localStorage.getItem('usuario')) } catch { return null }
  })
  const [negocioGestionado, setNegocioGestionado] = useState(() => {
    try { return JSON.parse(localStorage.getItem('negocioGestionado')) } catch { return null }
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) { setLoading(false); return }

    api.get('/auth/me')
      .then(({ data }) => {
        setUsuario(data.usuario)
        localStorage.setItem('usuario', JSON.stringify(data.usuario))
      })
      .catch(() => {
        localStorage.removeItem('token')
        localStorage.removeItem('usuario')
        setUsuario(null)
      })
      .finally(() => setLoading(false))
  }, [])

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password })
    localStorage.setItem('token', data.token)
    localStorage.setItem('usuario', JSON.stringify(data.usuario))
    setUsuario(data.usuario)
    return data.usuario
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('usuario')
    setUsuario(null)
  }

  const actualizarUsuario = (nuevoUsuario) => {
    setUsuario(nuevoUsuario)
    localStorage.setItem('usuario', JSON.stringify(nuevoUsuario))
  }

  const gestionarNegocio = (negocio) => {
    setNegocioGestionado(negocio)
    localStorage.setItem('negocioGestionado', JSON.stringify(negocio))
  }

  const salirDeGestion = () => {
    setNegocioGestionado(null)
    localStorage.removeItem('negocioGestionado')
  }

  // Helper para obtener el negocioId actual (gestionado o del usuario)
  const getNegocioId = () => {
    if (usuario?.rol === 'superadmin' && negocioGestionado) {
      return negocioGestionado.id
    }
    return usuario?.negocioId
  }

  return (
    <AuthContext.Provider value={{
      usuario,
      loading,
      login,
      logout,
      actualizarUsuario,
      negocioGestionado,
      gestionarNegocio,
      salirDeGestion,
      getNegocioId
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
