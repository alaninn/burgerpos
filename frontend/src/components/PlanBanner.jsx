import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'

function Bar({ valor, limite, label }) {
  const pct = limite === -1 ? 0 : Math.min((valor / limite) * 100, 100)
  const color = pct >= 90 ? '#ef4444' : pct >= 70 ? '#f59e0b' : '#7c3aed'
  return (
    <div className="flex-1 min-w-[120px]">
      <div className="flex justify-between text-xs mb-1" style={{ color: '#6b7280' }}>
        <span>{label}</span>
        <span style={{ fontWeight: 600, color: pct >= 90 ? '#ef4444' : '#374151' }}>
          {valor}/{limite === -1 ? '∞' : limite}
        </span>
      </div>
      <div style={{ height: 4, background: '#f3f4f6', borderRadius: 4, overflow: 'hidden' }}>
        {limite !== -1 && (
          <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 4, transition: 'width 0.5s ease' }} />
        )}
        {limite === -1 && (
          <div style={{ height: '100%', width: '100%', background: 'linear-gradient(90deg,#7c3aed,#a78bfa)', borderRadius: 4 }} />
        )}
      </div>
    </div>
  )
}

export default function PlanBanner() {
  const { usuario } = useAuth()
  const [uso, setUso] = useState(null)
  const [cerrado, setCerrado] = useState(false)

  useEffect(() => {
    if (!usuario?.negocioId || usuario?.rol === 'superadmin') return
    api.get(`/negocios/${usuario.negocioId}/uso`)
      .then(r => setUso(r.data))
      .catch(() => {})
  }, [usuario?.negocioId, usuario?.rol])

  if (!uso || usuario?.rol === 'superadmin' || cerrado) return null

  const esEstandar = uso.plan === 'estandar'

  // Mostrar solo si es estándar o si hay algo al 70%+
  const hayAlerta = esEstandar && Object.entries(uso.uso).some(([k, v]) => {
    const lim = uso.limites[k]
    return lim !== -1 && v / lim >= 0.7
  })

  if (!hayAlerta && !esEstandar) return null
  if (!esEstandar) return null // premium no muestra el banner

  const vencido = uso.vencimiento && new Date(uso.vencimiento) < new Date()

  return (
    <div style={{
      background: vencido ? '#fef2f2' : '#faf5ff',
      border: `1px solid ${vencido ? '#fca5a5' : '#ddd6fe'}`,
      borderRadius: 12,
      padding: '12px 16px',
      marginBottom: 20,
      position: 'relative',
    }}>
      <button
        onClick={() => setCerrado(true)}
        style={{ position: 'absolute', top: 10, right: 12, background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: 16 }}
        title="Cerrar"
      >×</button>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        {vencido ? (
          <>
            <span style={{ fontSize: 14 }}>⚠️</span>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#dc2626' }}>Plan vencido — algunas funciones pueden estar restringidas</span>
          </>
        ) : (
          <>
            <span style={{ fontSize: 14 }}>📊</span>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#6d28d9' }}>Plan {uso.planNombre}</span>
            {uso.vencimiento && (
              <span style={{ fontSize: '0.72rem', color: '#9ca3af' }}>
                · vence {new Date(uso.vencimiento).toLocaleDateString('es-AR')}
              </span>
            )}
          </>
        )}
      </div>

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <Bar valor={uso.uso.productos}    limite={uso.limites.productos}    label="Productos" />
        <Bar valor={uso.uso.categorias}   limite={uso.limites.categorias}   label="Categorías" />
        <Bar valor={uso.uso.operadores}   limite={uso.limites.operadores}   label="Operadores" />
        <Bar valor={uso.uso.repartidores} limite={uso.limites.repartidores} label="Repartidores" />
      </div>

      <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '0.75rem', color: '#7c3aed' }}>
          ✦ Upgrade a Premium para límites ilimitados + Cocina + Fiscal + Stock + Descuentos
        </span>
        {uso.contactoWhatsApp && (
          <a
            href={`https://wa.me/${uso.contactoWhatsApp}?text=Quiero%20actualizar%20mi%20plan%20BurgerPOS`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontSize: '0.75rem', fontWeight: 600,
              background: '#7c3aed', color: '#fff',
              padding: '4px 12px', borderRadius: 8,
              textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: 0,
            }}
          >
            Mejorar plan →
          </a>
        )}
      </div>
    </div>
  )
}
