import { useEffect, useState } from 'react'
import { fetchStatsBarrio } from '../../hooks/useStats'
import { fetchPisosBarrio } from '../../hooks/usePisos'
import { formatEuros } from '../../utils/formatters'

export default function BarrioPanel({ barrio, ciudadSlug, onClose }) {
  const [stats, setStats] = useState(null)
  const [pisos, setPisos] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('stats') // 'stats' | 'pisos'

  useEffect(() => {
    if (!barrio) return
    setLoading(true)
    setStats(null)
    setPisos([])
    setTab('stats')

    Promise.all([
      fetchStatsBarrio(ciudadSlug, barrio.slug).catch(() => null),
      fetchPisosBarrio(ciudadSlug, barrio.slug).catch(() => [])
    ]).then(([statsData, pisosData]) => {
      setStats(statsData)
      setPisos(Array.isArray(pisosData) ? pisosData : [])
    }).finally(() => setLoading(false))
  }, [barrio, ciudadSlug])

  return (
    <div className="bg-white h-full shadow-2xl flex flex-col">
      {/* Cabecera */}
      <div className="p-4 bg-indigo-600 text-white flex justify-between items-start">
        <div>
          <p className="text-xs opacity-70 uppercase tracking-wide mb-0.5">{ciudadSlug}</p>
          <h2 className="text-lg font-bold leading-tight">{barrio.nombre}</h2>
          {stats && (
            <p className="text-2xl font-black mt-1">
              {formatEuros(stats.precioMes?.media)}
              <span className="text-xs font-normal opacity-80 ml-1">/ mes</span>
            </p>
          )}
        </div>
        <button
          onClick={onClose}
          className="text-white opacity-70 hover:opacity-100 text-2xl leading-none"
        >
          ×
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b">
        <button
          onClick={() => setTab('stats')}
          className={`flex-1 py-2 text-sm font-medium transition-colors
            ${tab === 'stats' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
        >
          Estadísticas
        </button>
        <button
          onClick={() => setTab('pisos')}
          className={`flex-1 py-2 text-sm font-medium transition-colors
            ${tab === 'pisos' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
        >
          Pisos {pisos.length > 0 && <span className="ml-1 text-xs bg-gray-100 rounded-full px-1.5">{pisos.length}</span>}
        </button>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center text-gray-400">
          Cargando...
        </div>
      ) : tab === 'stats' ? (
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {stats ? (
            <>
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
              {stats.comparativaCiudad?.diferenciaPorcentaje && (
                <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-600">
                  <span className="font-medium">vs ciudad: </span>
                  {stats.comparativaCiudad.diferenciaPorcentaje}
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-32 text-gray-400 gap-2">
              <span className="text-2xl">🏚️</span>
              <p className="text-sm">Sin datos para este barrio</p>
            </div>
          )}
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {pisos.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-gray-400 gap-2">
              <span className="text-2xl">🏠</span>
              <p className="text-sm">Sin pisos disponibles</p>
            </div>
          ) : (
            pisos.map(piso => (
              <PisoCard key={piso.id} piso={piso} />
            ))
          )}
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

function PisoCard({ piso }) {
  return (
    <div className="bg-gray-50 rounded-lg p-3 space-y-1.5">
      <div className="flex justify-between items-center">
        <span className="text-base font-bold text-gray-800">{piso.precioMes}€/mes</span>
        <span className="text-xs bg-white border rounded-full px-2 py-0.5 text-gray-500">
          {piso.fuente}
        </span>
      </div>
      <div className="flex gap-3 text-xs text-gray-500 flex-wrap">
        {piso.habitaciones != null && (
          <span>🛏 {piso.habitaciones} hab</span>
        )}
        {piso.metrosCuadrados != null && (
          <span>📐 {piso.metrosCuadrados} m²</span>
        )}
        {piso.planta && (
          <span>🏢 Planta {piso.planta}</span>
        )}
        {piso.amueblado && (
          <span>🪑 Amueblado</span>
        )}
        {piso.permiteMascotas && (
          <span>🐾 Mascotas</span>
        )}
      </div>
      {piso.fechaPublicacion && (
        <p className="text-xs text-gray-400">
          Publicado: {new Date(piso.fechaPublicacion).toLocaleDateString('es-ES')}
        </p>
      )}
    </div>
  )
}
