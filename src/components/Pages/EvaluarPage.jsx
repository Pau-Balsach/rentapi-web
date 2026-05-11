import { useState } from 'react'
import useCiudadesStore from '../../store/useCiudadesStore'
import { fetchBarrios } from '../../hooks/useGeo'
import { fetchEvaluar } from '../../hooks/useStats'
import { formatEuros } from '../../utils/formatters'

export default function EvaluarPage() {
  const { ciudades } = useCiudadesStore()
  const [form, setForm] = useState({
    ciudad: '',
    barrio: '',
    precio: '',
    habitaciones: 1
  })
  const [barrios, setBarrios] = useState([])
  const [resultado, setResultado] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleCiudadChange = async (slug) => {
    setForm(f => ({ ...f, ciudad: slug, barrio: '' }))
    setBarrios([])
    if (slug) {
      const data = await fetchBarrios(slug)
      setBarrios(data)
    }
  }

  const handleSubmit = async () => {
    if (!form.ciudad || !form.precio) return
    setLoading(true)
    setError(null)
    setResultado(null)
    try {
      const params = {
        ciudad: form.ciudad,
        precio: form.precio,
        habitaciones: form.habitaciones,
        ...(form.barrio && { barrio: form.barrio }),
      }
      const data = await fetchEvaluar(params)
      setResultado(data)
    } catch (e) {
      setError('No hay suficientes datos para evaluar este barrio. Prueba sin seleccionar barrio.')
    }
    finally {
      setLoading(false)
    }
  }

  const colorSemaforo = {
    por_debajo: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', label: 'Por debajo del mercado' },
    en_mercado: { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-700', label: 'En precio de mercado' },
    por_encima: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', label: 'Por encima del mercado' },
  }

  return (
    <div className="max-w-xl mx-auto p-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-1">Evaluar un precio</h1>
      <p className="text-sm text-gray-500 mb-6">
        Introduce los datos del piso y te diremos si el precio es justo
      </p>

      <div className="bg-white rounded-xl border p-5 space-y-4 mb-6">
        {/* Ciudad */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Ciudad</label>
          <select
            value={form.ciudad}
            onChange={e => handleCiudadChange(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Selecciona una ciudad</option>
            {ciudades.map(c => (
              <option key={c.slug} value={c.slug}>{c.nombre}</option>
            ))}
          </select>
        </div>

        {/* Barrio */}
        {barrios.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Barrio <span className="text-gray-400 font-normal">(opcional)</span>
            </label>
            <select
              value={form.barrio}
              onChange={e => setForm(f => ({ ...f, barrio: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Toda la ciudad</option>
              {barrios.map(b => (
                <option key={b.slug} value={b.slug}>{b.nombre}</option>
              ))}
            </select>
          </div>
        )}

        {/* Precio */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Precio mensual (€)</label>
          <input
            type="number"
            value={form.precio}
            onChange={e => setForm(f => ({ ...f, precio: e.target.value }))}
            placeholder="ej: 1200"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Habitaciones */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Habitaciones <span className="text-gray-400 font-normal">(opcional)</span>
          </label>
          <div className="flex gap-2">
            {[1, 2, 3, 4].map(n => (
              <button
                key={n}
                onClick={() => setForm(f => ({ ...f, habitaciones: n }))}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors
                  ${form.habitaciones === n
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
              >
                {n === 4 ? '4+' : `${n}`}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={!form.ciudad || !form.precio || loading}
          className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-medium
            disabled:opacity-40 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors"
        >
          {loading ? 'Evaluando...' : 'Evaluar precio'}
        </button>
      </div>

      {error && <p className="text-red-500 text-sm">{error}</p>}

      {resultado && (() => {
        const valoracion = colorSemaforo[resultado.valoracion] || colorSemaforo.en_mercado
        return (
          <div className={`rounded-xl border p-5 space-y-4 ${valoracion.bg} ${valoracion.border}`}>
            <div className="flex items-center justify-between">
              <h2 className={`text-lg font-bold ${valoracion.text}`}>
                {valoracion.label}
              </h2>
              <span className={`text-2xl font-black ${valoracion.text}`}>
                {resultado.diferenciaPorcentaje}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white bg-opacity-60 rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-1">Tu precio</p>
                <p className="text-sm font-bold text-gray-800">
                  {formatEuros(resultado.precioConsultado)}
                </p>
              </div>
              <div className="bg-white bg-opacity-60 rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-1">Precio medio zona</p>
                <p className="text-sm font-bold text-gray-800">
                  {formatEuros(resultado.precioMedioZona)}
                </p>
              </div>
            </div>

            {resultado.percentilZona && (
              <div>
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Más barato</span>
                  <span>Percentil {resultado.percentilZona}</span>
                  <span>Más caro</span>
                </div>
                <div className="h-2 bg-white bg-opacity-60 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-current opacity-60"
                    style={{ width: `${resultado.percentilZona}%` }}
                  />
                </div>
              </div>
            )}

            {resultado.recomendacion && (
              <p className={`text-sm ${valoracion.text}`}>
                {resultado.recomendacion}
              </p>
            )}
          </div>
        )
      })()}
    </div>
  )
}