import { createContext, useContext, useState, useEffect } from 'react'

const ThemeContext = createContext(null)

export function ThemeProvider({ children }) {
  const [darkMode, setDarkMode] = useState(() => {
    try {
      const saved = localStorage.getItem('darkMode')
      if (saved !== null) return JSON.parse(saved)
      return window.matchMedia('(prefers-color-scheme: dark)').matches
    } catch {
      return false
    }
  })

  useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(darkMode))
    document.documentElement.classList.toggle('dark', darkMode)
  }, [darkMode])

  const toggleTheme = () => setDarkMode(prev => !prev)

  return (
    <ThemeContext.Provider value={{ darkMode, toggleTheme, setDarkMode }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)