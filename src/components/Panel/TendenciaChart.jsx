import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { formatMes } from '../../utils/formatters'

export default function TendenciaChart({ data }) {
  if (!data || data.length === 0) return null

  // Detectar si todos los meses son iguales (bug de API)
  const mesesUnicos = new Set(data.map(p => p.mes))
  const todosIguales = mesesUnicos.size === 1

  const formatted = data.map((p, i) => ({
    label: todosIguales ? `Semana ${i + 1}` : formatMes(p.mes),
    precio: Math.round(p.precioMedio),
    muestras: p.totalMuestras,
  }))

  return (
    <ResponsiveContainer width="100%" height={160}>
      <LineChart data={formatted}>
        <XAxis
          dataKey="label"
          tick={{ fontSize: 10, fill: '#9ca3af' }}
          axisLine={false}
          tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={{ fontSize: 10, fill: '#9ca3af' }}
          axisLine={false}
          tickLine={false}
          tickFormatter={v => `${v}€`}
          width={55}
          domain={['auto', 'auto']}
        />
        <Tooltip
          formatter={(v, name, props) => [
            `${v.toLocaleString('es-ES')}€`,
            'Precio medio'
          ]}
          labelFormatter={(label) => label}
          contentStyle={{ fontSize: 12, borderRadius: 8 }}
        />
        <Line
          type="monotone"
          dataKey="precio"
          stroke="#2563eb"
          strokeWidth={2}
          dot={{ r: 3, fill: '#2563eb' }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}