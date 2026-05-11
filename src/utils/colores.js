export function precioAColor(precio) {
  if (!precio) return '#94a3b8'  // gris — sin datos
  if (precio < 700)  return '#22c55e'  // verde
  if (precio < 1000) return '#eab308'  // amarillo
  if (precio < 1500) return '#f97316'  // naranja
  return '#ef4444'                     // rojo
}

export function formatPrecio(precio) {
  if (!precio) return '—'
  if (precio >= 1000) return `${(precio / 1000).toFixed(1)}k`
  return `${Math.round(precio)}`
}