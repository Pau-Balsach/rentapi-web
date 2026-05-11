export function formatEuros(valor) {
  if (!valor) return '—'
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0
  }).format(valor)
}

export function formatMes(mesStr) {
  if (!mesStr) return ''
  const [year, month] = mesStr.split('-')
  const fecha = new Date(year, month - 1)
  return fecha.toLocaleDateString('es-ES', { month: 'short', year: '2-digit' })
}