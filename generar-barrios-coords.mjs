/**
 * generar-barrios-coords.mjs
 *
 * Genera /src/data/barrios-coords.json consultando:
 *   1. RentAPI → lista de ciudades → lista de barrios de cada ciudad
 *   2. OpenStreetMap Nominatim → coordenadas de cada barrio
 *
 * Uso:
 *   node generar-barrios-coords.mjs
 *
 * Requisitos:
 *   - Node.js 18+ (fetch nativo)
 *   - RENTAPI_KEY en variable de entorno o editada abajo
 */

import fs from 'fs/promises'

const RENTAPI_BASE = 'https://rentapi-b6gc.onrender.com/api/v1'
const RENTAPI_KEY  = process.env.RENTAPI_KEY || 'PON_TU_API_KEY_AQUI'
const OUTPUT_PATH  = './src/data/barrios-coords.json'

// Pausa entre llamadas a Nominatim (política de uso: máx 1 req/s)
const sleep = (ms) => new Promise(r => setTimeout(r, ms))

async function fetchRentAPI(path) {
  const res = await fetch(`${RENTAPI_BASE}${path}`, {
    headers: { 'X-API-Key': RENTAPI_KEY }
  })
  if (!res.ok) throw new Error(`RentAPI error ${res.status} en ${path}`)
  return res.json()
}

async function fetchCoordsNominatim(barrio, ciudad) {
  // Intentamos primero con barrio + ciudad + Catalunya
  const queries = [
    `${barrio}, ${ciudad}, Catalunya, Spain`,
    `${barrio}, ${ciudad}, Spain`,
    `${barrio}, Catalunya, Spain`,
  ]

  for (const q of queries) {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1&countrycodes=es`
    const res = await fetch(url, {
      headers: { 'User-Agent': 'rentapi-web/1.0 (pau@balsach.dev)' }
    })
    if (!res.ok) continue
    const data = await res.json()
    if (data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon),
        display: data[0].display_name
      }
    }
    await sleep(1100) // respetar rate limit de Nominatim
  }
  return null
}

async function main() {
  console.log('🏙️  Obteniendo ciudades de RentAPI...')
  const ciudades = await fetchRentAPI('/geo/ciudades')
  console.log(`   → ${ciudades.length} ciudades encontradas`)

  const resultado = {}
  let totalBarrios = 0
  let encontrados = 0
  let noEncontrados = []

  for (const ciudad of ciudades) {
    console.log(`\n📍 ${ciudad.nombre} (${ciudad.slug})`)

    let barrios = []
    try {
      barrios = await fetchRentAPI(`/geo/barrios?ciudad=${ciudad.slug}`)
    } catch (e) {
      console.log(`   ⚠️  Sin barrios: ${e.message}`)
      continue
    }

    if (!barrios || barrios.length === 0) {
      console.log('   — Sin barrios disponibles')
      continue
    }

    console.log(`   → ${barrios.length} barrios`)
    resultado[ciudad.slug] = {}

    for (const barrio of barrios) {
      totalBarrios++
      process.stdout.write(`   🔍 ${barrio.nombre}... `)

      await sleep(1100) // rate limit Nominatim
      const coords = await fetchCoordsNominatim(barrio.nombre, ciudad.nombre)

      if (coords) {
        resultado[ciudad.slug][barrio.slug] = {
          lat: coords.lat,
          lng: coords.lng
        }
        console.log(`✅ ${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`)
        encontrados++
      } else {
        console.log('❌ No encontrado')
        noEncontrados.push(`${ciudad.slug}/${barrio.slug} (${barrio.nombre})`)
      }
    }
  }

  // Guardar JSON
  await fs.mkdir('./src/data', { recursive: true })
  await fs.writeFile(OUTPUT_PATH, JSON.stringify(resultado, null, 2), 'utf-8')

  console.log('\n' + '='.repeat(60))
  console.log(`✅ Completado: ${encontrados}/${totalBarrios} barrios con coordenadas`)
  console.log(`📄 Guardado en: ${OUTPUT_PATH}`)

  if (noEncontrados.length > 0) {
    console.log(`\n⚠️  Sin coordenadas (${noEncontrados.length}):`)
    noEncontrados.forEach(b => console.log(`   - ${b}`))
    console.log('\n   Añádelos manualmente en barrios-coords.json si los necesitas.')
  }
}

main().catch(err => {
  console.error('Error fatal:', err)
  process.exit(1)
})
