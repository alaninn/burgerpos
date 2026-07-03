// Superadmin > Finanzas: cobros de la plataforma a los negocios.
// Muestra lo cobrado (mes/histórico/30 días), el ingreso mensual estimado
// según planes activos, y los últimos pagos registrados.
import { useState, useEffect, useCallback } from 'react'
import api from '../../api/axios'
import toast from 'react-hot-toast'

const fmt = (n) => '$' + Number(n || 0).toLocaleString('es-AR', { maximumFractionDigits: 0 })

export default function Finanzas() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  const cargar = useCallback(() => {
    setLoading(true)
    api.get('/superadmin/finanzas')
      .then(({ data }) => setData(data.finanzas))
      .catch(() => toast.error('Error al cargar finanzas'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { cargar() }, [cargar])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }
  if (!data) return <p className="text-sm text-gray-500 py-8 text-center">Sin datos</p>

  const tarjetas = [
    { label: 'Cobrado este mes', value: fmt(data.cobradoMes), sub: `${data.pagosMes} pago${data.pagosMes === 1 ? '' : 's'}`, color: 'text-green-600' },
    { label: 'Cobrado últimos 30 días', value: fmt(data.cobrado30dias), color: 'text-green-600' },
    { label: 'Cobrado histórico', value: fmt(data.cobradoHistorico), color: 'text-gray-900 dark:text-gray-100' },
    { label: 'Ingreso mensual estimado', value: fmt(data.ingresoEstimado), sub: `${data.negocios.activos} negocios activos`, color: 'text-violet-600' },
  ]

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Finanzas</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">Cobros de la plataforma a los negocios</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {tarjetas.map(t => (
          <div key={t.label} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-4">
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">{t.label}</p>
            <p className={`text-2xl font-bold ${t.color}`}>{t.value}</p>
            {t.sub && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{t.sub}</p>}
          </div>
        ))}
      </div>

      {/* Estado de vencimientos */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 text-center">
          <p className="text-2xl font-bold text-green-600">{data.negocios.activos}</p>
          <p className="text-xs text-gray-600 dark:text-gray-400">Negocios activos</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-amber-200 dark:border-amber-800 p-4 text-center">
          <p className="text-2xl font-bold text-amber-600">{data.negocios.porVencer7dias}</p>
          <p className="text-xs text-gray-600 dark:text-gray-400">Vencen en 7 días</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-red-200 dark:border-red-800 p-4 text-center">
          <p className="text-2xl font-bold text-red-600">{data.negocios.vencidos}</p>
          <p className="text-xs text-gray-600 dark:text-gray-400">Vencidos</p>
        </div>
      </div>

      {/* Últimos pagos */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-6 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Últimos pagos registrados</h3>
          <button onClick={cargar} className="text-xs text-violet-600 hover:underline">Actualizar</button>
        </div>
        {(!data.ultimosPagos || data.ultimosPagos.length === 0) ? (
          <p className="p-6 text-sm text-gray-500 dark:text-gray-400 text-center">
            Todavía no hay pagos registrados. Registrá pagos desde Negocios → detalles → "Registrar pago".
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="text-left px-6 py-2.5 text-xs font-semibold text-gray-700 dark:text-gray-300">Fecha</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-700 dark:text-gray-300">Negocio</th>
                <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-700 dark:text-gray-300">Monto</th>
                <th className="text-center px-4 py-2.5 text-xs font-semibold text-gray-700 dark:text-gray-300">Días</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-700 dark:text-gray-300">Método</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
              {data.ultimosPagos.map(p => (
                <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-6 py-2.5 text-gray-600 dark:text-gray-300 text-xs">
                    {new Date(p.createdAt).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })}
                  </td>
                  <td className="px-4 py-2.5 text-gray-800 dark:text-gray-200 font-medium">{p.negocio?.nombre || '-'}</td>
                  <td className="px-4 py-2.5 text-right font-semibold text-green-600">{fmt(p.monto)}</td>
                  <td className="px-4 py-2.5 text-center text-gray-600 dark:text-gray-300">{p.dias}</td>
                  <td className="px-4 py-2.5 text-gray-600 dark:text-gray-300 text-xs">{p.metodoPago || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
