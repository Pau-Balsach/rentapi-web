import { useState } from 'react'
import { fetchStatsBarrio } from '../../hooks/useStats'
import { formatEuros } from '../../utils/formatters'

export default function BarriosList({ barrios, ciudadSlug }) {
  const [selectedBarrio, setSelectedBarrio] = useState(null)
  const [statsBarrio, setStatsBarrio] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleSelectBarrio = async (barrio) => {
    if (selectedBarrio?.slug === barrio.slug) {
      setSelectedBarrio(null)
      setStatsBarrio(null)
      return
    }
    setSelectedBarrio(barrio)
    setLoading(true)
    try {
      const data = await fetchStatsBarrio(ciudadSlug, barrio.slug)
      setStatsBarrio(data)
    } catch {
      setStatsBarrio(null)
    } finally {
      setLoading(false)
    }
  }

  if (!barrios || barrios.length === 0) {
    return <p className="text-sm text-gray-400 text-center py-2">Sin barrios disponibles</p>
  }

  return (
    <div className="space-y-2">
      {barrios.map(barrio => (
        <div key={barrio.slug}>
          <button
            onClick={() => handleSelectBarrio(barrio)}
            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors
              ${selectedBarrio?.slug === barrio.slug
                ? 'bg-blue-50 border border-blue-200 text-blue-700'
                : 'bg-gray-50 hover:bg-gray-100 text-gray-700'
              }`}
          >
            <span className="font-medium">{barrio.nombre}</span>
            {barrio.pisosIndexados && (
              <span className="text-xs text-gray-400 ml-2">
                {barrio.pisosIndexados} pisos
              </span>
            )}
          </button>

          {selectedBarrio?.slug === barrio.slug && (
            <div className="mt-1 ml-2 p-3 bg-blue-50 rounded-lg border border-blue-100">
              {loading ? (
                <p className="text-xs text-gray-400">Cargando...</p>
              ) : statsBarrio ? (
                <div className="space-y-1">
                  <p className="text-sm font-bold text-blue-700">
                    {formatEuros(statsBarrio.precioMes?.media)}
                    <span className="font-normal text-xs"> / mes</span>
                  </p>
                  <p className="text-xs text-gray-500">
                    Mediana: {formatEuros(statsBarrio.precioMes?.mediana)}
                  </p>
                  <p className="text-xs text-gray-500">
                    Precio/m²: {formatEuros(statsBarrio.precioM2?.media)}
                  </p>
                  {statsBarrio.comparativaCiudad?.diferenciaPorcentaje && (
                    <p className="text-xs font-medium mt-1 text-gray-600">
                      {statsBarrio.comparativaCiudad.diferenciaPorcentaje} vs ciudad
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-xs text-gray-400">Sin datos</p>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}