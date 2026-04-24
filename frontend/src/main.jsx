import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Toaster } from 'react-hot-toast'
import './index.css'
import 'leaflet/dist/leaflet.css'
import 'leaflet-draw/dist/leaflet.draw.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 3000,
        style: { borderRadius: '8px', fontSize: '14px' },
        success: { iconTheme: { primary: '#7c3aed', secondary: '#fff' } },
      }}
    />
  </StrictMode>,
)
