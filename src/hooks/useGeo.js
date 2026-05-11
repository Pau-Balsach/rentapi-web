export async function fetchCiudades() {
  const res = await fetch('/api/geo/ciudades')
  if (!res.ok) throw new Error('Error cargando ciudades')
  return res.json()
}

export async function fetchBarrios(ciudadSlug) {
  const res = await fetch(`/api/geo/barrios?ciudad=${ciudadSlug}`)
  if (!res.ok) throw new Error('Error cargando barrios')
  return res.json()
}