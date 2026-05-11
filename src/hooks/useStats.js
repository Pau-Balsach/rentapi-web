const cache = new Map()

async function fetchConCache(url) {
  if (cache.has(url)) return cache.get(url)
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Error en ${url}`)
  const data = await res.json()
  cache.set(url, data)
  return data
}

export async function fetchStatsCiudad(slug, habitaciones = null) {
  const params = habitaciones ? `?habitaciones=${habitaciones}` : ''
  return fetchConCache(`/api/stats/ciudad/${slug}${params}`)
}

export async function fetchTendencia(slug) {
  return fetchConCache(`/api/stats/tendencia/${slug}?tipo=ciudad&meses=6`)
}

export async function fetchComparar(slugs) {
  const zonas = slugs.join(',')
  return fetchConCache(`/api/stats/comparar?zonas=${zonas}&tipo=ciudad`)
}

export async function fetchRanking() {
  return fetchConCache('/api/stats/ranking?tipo=ciudad&limite=50')
}

export async function fetchEvaluar(params) {
  const query = new URLSearchParams(params).toString()
  const res = await fetch(`/api/stats/evaluar?${query}`)
  if (!res.ok) throw new Error('Error evaluando precio')
  return res.json()
}

export async function fetchStatsBarrio(ciudadSlug, barrioSlug) {
  const url = `/api/stats/barrio/${ciudadSlug}/${barrioSlug}`
  if (cache.has(url)) return cache.get(url)
  const res = await fetch(url)
  if (!res.ok) return null   // ← 404 u otro error → null, sin lanzar excepción
  const data = await res.json()
  cache.set(url, data)
  return data
}