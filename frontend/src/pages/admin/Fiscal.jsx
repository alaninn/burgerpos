import { useState } from 'react'

export default function Fiscal() {
  const [tab, setTab] = useState('situacion')
  return (
    <div className="p-6">
      <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-6">Facturación ARCA</h1>
      <div className="flex border-b border-gray-300 dark:border-gray-700 mb-6">
        {[{ id: 'situacion', label: 'Situación fiscal' }, { id: 'configuracion', label: 'Configuración ARCA' }, { id: 'comprobantes', label: 'Comprobantes' }].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`pb-3 px-4 text-sm font-medium border-b-2 -mb-px transition-colors ${tab === t.id ? 'border-violet-600 text-violet-700' : 'border-transparent text-gray-700 dark:text-gray-300 hover:text-gray-700'}`}>
            {t.label}
          </button>
        ))}
      </div>
      {tab === 'situacion' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="grid grid-cols-2 gap-6">
            {[
              { label: 'CUIT', value: '—' },
              { label: 'Razón social', value: '—' },
              { label: 'Condición IVA', value: '—' },
              { label: 'Punto de venta', value: '—' },
            ].map(f => (
              <div key={f.label}>
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">{f.label}</p>
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{f.value}</p>
              </div>
            ))}
          </div>
        </div>
      )}
      {tab === 'configuracion' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <p className="text-sm text-gray-700 dark:text-gray-300 mb-6">Configurá tu conexión con ARCA (ex AFIP) para emitir facturas electrónicas.</p>
          <div className="space-y-4 max-w-sm">
            {['CUIT', 'Certificado (.crt)', 'Clave privada (.key)', 'Punto de venta'].map(f => (
              <div key={f}>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{f}</label>
                <input placeholder={f} className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
              </div>
            ))}
            <button className="px-6 py-2.5 bg-violet-600 text-white rounded-lg text-sm font-medium hover:bg-violet-700 transition-colors">Guardar configuración</button>
          </div>
        </div>
      )}
      {tab === 'comprobantes' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center text-gray-600 dark:text-gray-400">
          <div className="text-4xl mb-3">🧾</div>
          <p>No hay comprobantes emitidos</p>
        </div>
      )}
    </div>
  )
}
