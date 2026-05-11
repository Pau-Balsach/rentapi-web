const cache = new Map()

export async function fetchPisosCiudad(ciudadSlug) {
  const url = `/api/pisos/ciudad/${ciudadSlug}`
  if (cache.has(url)) return cache.get(url)
  const res = await fetch(url)
  if (!res.ok) return []
  const data = await res.json()
  cache.set(url, data)
  return Array.isArray(data) ? data : (data.pisos ?? data.content ?? [])
}

export async function fetchPisosBarrio(ciudadSlug, barrioSlug) {
  const url = `/api/pisos/barrio/${ciudadSlug}/${barrioSlug}`
  if (cache.has(url)) return cache.get(url)
  const res = await fetch(url)
  if (!res.ok) return []
  const data = await res.json()
  cache.set(url, data)
  return Array.isArray(data) ? data : (data.pisos ?? data.content ?? [])
}