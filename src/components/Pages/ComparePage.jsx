import { useState, useRef } from 'react'
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
  const [busqueda, setBusqueda] = useState('')
  const [dropdownAbierto, setDropdownAbierto] = useState(false)
  const inputRef = useRef(null)

  const ciudadesFiltradas = ciudades.filter(c =>
    c.nombre.toLowerCase().includes(busqueda.toLowerCase()) &&
    !seleccionadas.includes(c.slug)
  ).slice(0, 8)

  const toggleCiudad = (slug) => {
    setSeleccionadas(prev =>
      prev.includes(slug)
        ? prev.filter(s => s !== slug)
        : prev.length < 5 ? [...prev, slug] : prev
    )
    setResultados(null)
  }

  const addCiudad = (slug) => {
    if (!seleccionadas.includes(slug) && seleccionadas.length < 5) {
      setSeleccionadas(prev => [...prev, slug])
      setResultados(null)
    }
    setBusqueda('')
    setDropdownAbierto(false)
    inputRef.current?.focus()
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

      {/* Selector con búsqueda */}
      <div className="mb-4">
        {/* Chips de ciudades seleccionadas */}
        {seleccionadas.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {seleccionadas.map(slug => {
              const ciudad = ciudades.find(c => c.slug === slug)
              return (
                <span
                  key={slug}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-full text-sm font-medium"
                >
                  {ciudad?.nombre}
                  <button
                    onClick={() => toggleCiudad(slug)}
                    className="hover:opacity-70 leading-none text-base"
                  >×</button>
                </span>
              )
            })}
          </div>
        )}

        {/* Input de búsqueda */}
        {seleccionadas.length < 5 && (
          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              value={busqueda}
              onChange={e => { setBusqueda(e.target.value); setDropdownAbierto(true) }}
              onFocus={() => setDropdownAbierto(true)}
              onBlur={() => setTimeout(() => setDropdownAbierto(false), 150)}
              placeholder="Buscar ciudad..."
              className="w-full max-w-sm px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {dropdownAbierto && ciudadesFiltradas.length > 0 && (
              <div className="absolute z-10 mt-1 w-full max-w-sm bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
                {ciudadesFiltradas.map(ciudad => (
                  <button
                    key={ciudad.slug}
                    onMouseDown={() => addCiudad(ciudad.slug)}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                  >
                    {ciudad.nombre}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        <p className="text-xs text-gray-400 mt-2">
          {seleccionadas.length}/5 ciudades seleccionadas
        </p>
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