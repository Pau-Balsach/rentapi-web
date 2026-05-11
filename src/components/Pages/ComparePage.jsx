import { useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import useCiudadesStore from '../../store/useCiudadesStore'
import { fetchComparar } from '../../hooks/useStats'
import { formatEuros } from '../../utils/formatters'
import { precioAColor } from '../../utils/colores'

export default function ComparePage() {
  const { ciudades } = useCiudadesStore()
  const [seleccionadas, setSeleccionadas] = useState([])
  const [resultados, setResultados] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const toggleCiudad = (slug) => {
    setSeleccionadas(prev =>
      prev.includes(slug)
        ? prev.filter(s => s !== slug)
        : prev.length < 5 ? [...prev, slug] : prev
    )
    setResultados(null)
  }

  const handleComparar = async () => {
    if (seleccionadas.length < 2) return
    setLoading(true)
    setError(null)
    try {
      const data = await fetchComparar(seleccionadas)
      setResultados(data)
    } catch (e) {
      setError('Error cargando comparativa')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-1">Comparar ciudades</h1>
      <p className="text-sm text-gray-500 mb-6">Selecciona entre 2 y 5 ciudades para comparar</p>

      {/* Selector de ciudades */}
      <div className="flex flex-wrap gap-2 mb-4">
        {ciudades.map(ciudad => (
          <button
            key={ciudad.slug}
            onClick={() => toggleCiudad(ciudad.slug)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors
              ${seleccionadas.includes(ciudad.slug)
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
          >
            {ciudad.nombre}
          </button>
        ))}
      </div>

      <button
        onClick={handleComparar}
        disabled={seleccionadas.length < 2 || loading}
        className="mb-6 px-6 py-2 bg-blue-600 text-white rounded-lg font-medium
          disabled:opacity-40 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors"
      >
        {loading ? 'Cargando...' : 'Comparar'}
      </button>

      {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

      {resultados && (
        <div className="space-y-6">
          {/* Badges */}
          <div className="flex gap-4">
            {resultados.zona_mas_cara && (
              <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium">
                Mas cara: {resultados.zona_mas_cara}
              </span>
            )}
            {resultados.zona_mas_barata && (
              <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                Mas barata: {resultados.zona_mas_barata}
              </span>
            )}
          </div>

          {/* Grafico */}
          <div className="bg-white rounded-xl border p-4">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Precio medio mensual</h2>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={resultados.comparativa}
                layout="vertical"
                margin={{ left: 80 }}
              >
                <XAxis
                  type="number"
                  tick={{ fontSize: 11 }}
                  tickFormatter={v => `${v}€`}
                />
                <YAxis
                  type="category"
                  dataKey="zona"
                  tick={{ fontSize: 12 }}
                  width={80}
                />
                <Tooltip formatter={v => [`${v}€`, 'Precio medio']} />
                <Bar dataKey="precioMedioMes" radius={[0, 6, 6, 0]}>
                  {resultados.comparativa.map((entry, i) => (
                    <Cell key={i} fill={precioAColor(entry.precioMedioMes)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Tabla */}
          <div className="bg-white rounded-xl border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                <tr>
                  <th className="text-left px-4 py-3">Ciudad</th>
                  <th className="text-right px-4 py-3">Precio medio/mes</th>
                  <th className="text-right px-4 py-3">Precio/m²</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {resultados.comparativa.map((item, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-800">{item.zona}</td>
                    <td className="px-4 py-3 text-right text-gray-700">
                      {formatEuros(item.precioMedioMes)}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700">
                      {formatEuros(item.precioMedioM2)}/m²
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}