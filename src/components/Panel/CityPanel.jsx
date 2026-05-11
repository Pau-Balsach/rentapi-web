import { useEffect, useState } from 'react'
import useCiudadesStore from '../../store/useCiudadesStore'
import { fetchStatsCiudad, fetchTendencia } from '../../hooks/useStats'
import { fetchBarrios } from '../../hooks/useGeo'
import { formatEuros } from '../../utils/formatters'
import TendenciaChart from './TendenciaChart'
import BarriosList from './BarriosList'

export default function CityPanel() {
  const { selectedCiudad, setSelectedCiudad, habitaciones, setHabitaciones } = useCiudadesStore()
  const [stats, setStats] = useState(null)
  const [tendencia, setTendencia] = useState(null)
  const [barrios, setBarrios] = useState([])
  const [loading, setLoading] = useState(true)
  const [showBarrios, setShowBarrios] = useState(false)

  useEffect(() => {
    if (!selectedCiudad) return
    setLoading(true)
    setStats(null)
    setTendencia(null)
    setShowBarrios(false)

    Promise.all([
      fetchStatsCiudad(selectedCiudad.slug, habitaciones).catch(() => null),
      fetchTendencia(selectedCiudad.slug).catch(() => null)
    ]).then(([statsData, tendenciaData]) => {
      setStats(statsData)
      setTendencia(tendenciaData)
    }).finally(() => setLoading(false))
  }, [selectedCiudad, habitaciones])

  const handleVerBarrios = async () => {
    if (barrios.length === 0) {
      try {
        const data = await fetchBarrios(selectedCiudad.slug)
        setBarrios(data)
      } catch {
        setBarrios([])
      }
    }
    setShowBarrios(!showBarrios)
  }

  return (
    <div className="bg-white h-full shadow-2xl flex flex-col">
      {/* Cabecera */}
      <div className="p-4 bg-blue-600 text-white flex justify-between items-start">
        <div>
          <h2 className="text-xl font-bold">{selectedCiudad.nombre}</h2>
          {stats && (
            <p className="text-3xl font-black mt-1">
              {formatEuros(stats.precioMes?.media)}
              <span className="text-sm font-normal opacity-80 ml-1">/ mes</span>
            </p>
          )}
        </div>
        <button
          onClick={() => setSelectedCiudad(null)}
          className="text-white opacity-70 hover:opacity-100 text-2xl leading-none"
        >
          ×
        </button>
      </div>

      {/* Filtro habitaciones */}
      <div className="px-4 py-2 border-b flex gap-2">
        {[null, 1, 2, 3, 4].map(n => (
          <button
            key={n}
            onClick={() => setHabitaciones(n)}
            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors
              ${habitaciones === n
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
          >
            {n === null ? 'Todos' : n === 4 ? '4+' : `${n} hab`}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center text-gray-400">
          Cargando...
        </div>
      ) : stats ? (
        <div className="flex-1 overflow-y-auto p-4 space-y-4">

          {/* Stats principales */}
          <div className="grid grid-cols-2 gap-3">
            <StatCard label="Mediana" value={formatEuros(stats.precioMes?.mediana)} />
            <StatCard label="Precio/m²" value={formatEuros(stats.precioM2?.media)} suffix="/m²" />
            <StatCard label="Mínimo" value={formatEuros(stats.precioMes?.min)} />
            <StatCard label="Máximo" value={formatEuros(stats.precioMes?.max)} />
            <StatCard label="Percentil 25" value={formatEuros(stats.precioMes?.percentil25)} />
            <StatCard label="Percentil 75" value={formatEuros(stats.precioMes?.percentil75)} />
          </div>

          <p className="text-xs text-gray-400 text-right">
            {stats.totalPisosAnalizados} pisos analizados
          </p>

          {/* Grafico tendencia */}
          {tendencia?.serieTemporal?.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Tendencia 6 meses</h3>
              <TendenciaChart data={tendencia.serieTemporal} />
            </div>
          )}

          {/* Barrios */}
          <button
            onClick={handleVerBarrios}
            className="w-full py-2 border border-blue-600 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-50 transition-colors"
          >
            {showBarrios ? 'Ocultar barrios' : 'Ver barrios'}
          </button>

          {showBarrios && (
            <BarriosList barrios={barrios} ciudadSlug={selectedCiudad.slug} />
          )}
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-gray-400 gap-2">
          <span className="text-3xl">🏚️</span>
          <p className="text-sm">Sin datos disponibles para {selectedCiudad.nombre}</p>
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value, suffix }) {
  return (
    <div className="bg-gray-50 rounded-lg p-3">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="text-sm font-bold text-gray-800">
        {value}{suffix && <span className="font-normal text-xs"> {suffix}</span>}
      </p>
    </div>
  )
}