import { useEffect, useState, useCallback, useRef } from 'react'
import { MapContainer, TileLayer, useMapEvents } from 'react-leaflet'
import useCiudadesStore from '../../store/useCiudadesStore'
import coordsData from '../../data/ciudades-coords.json'
import barriosData from '../../data/barrios-coords.json'
import CityMarker from './CityMarker'
import BarrioMarker from './BarrioMarker'
import CityPanel from '../Panel/CityPanel'
import BarrioPanel from '../Panel/BarrioPanel'

const ZOOM_BARRIOS = 11
const CACHE_TTL = 1000 * 60 * 60 * 24 // 24 horas

function leerCache(key) {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const { data, ts } = JSON.parse(raw)
    if (Date.now() - ts > CACHE_TTL) { localStorage.removeItem(key); return null }
    return data
  } catch { return null }
}

function escribirCache(key, data) {
  try { localStorage.setItem(key, JSON.stringify({ data, ts: Date.now() })) } catch {}
}

const esSlugBasura = (slug) => /^[\d\-]+$/.test(slug) || slug === 's-n'

const slugToNombre = (slug) =>
  slug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())

// Comprueba si un punto {lat, lng} está dentro de los bounds del mapa
const enViewport = (lat, lng, bounds) => {
  if (!bounds) return true
  return (
    lat >= bounds.minLat &&
    lat <= bounds.maxLat &&
    lng >= bounds.minLng &&
    lng <= bounds.maxLng
  )
}

function MapClickHandler({ onMapClick }) {
  useMapEvents({ click: onMapClick })
  return null
}

function MapWatcher({ onZoomChange, onBoundsChange }) {
  const map = useMapEvents({
    zoomend: (e) => {
      onZoomChange(e.target.getZoom())
      const b = e.target.getBounds()
      onBoundsChange({
        minLat: b.getSouth(),
        maxLat: b.getNorth(),
        minLng: b.getWest(),
        maxLng: b.getEast(),
      })
    },
    moveend: (e) => {
      const b = e.target.getBounds()
      onBoundsChange({
        minLat: b.getSouth(),
        maxLat: b.getNorth(),
        minLng: b.getWest(),
        maxLng: b.getEast(),
      })
    },
  })

  // Inicializar bounds al montar
  useEffect(() => {
    const b = map.getBounds()
    onBoundsChange({
      minLat: b.getSouth(),
      maxLat: b.getNorth(),
      minLng: b.getWest(),
      maxLng: b.getEast(),
    })
  }, [])

  return null
}

export default function MapView() {
  const { ciudades, setCiudades, selectedCiudad, setSelectedCiudad } = useCiudadesStore()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [zoom, setZoom] = useState(8)
  const [bounds, setBounds] = useState(null)
  const [barriosTodos, setBarriosTodos] = useState([])
  const [loadingBarrios, setLoadingBarrios] = useState(false)
  const [selectedBarrio, setSelectedBarrio] = useState(null)

  const rankingCiudadesCache = useRef(null)
  const rankingBarriosCache = useRef(null)

  // ── Carga inicial de ciudades ──────────────────────────────────────────────
  useEffect(() => {
    async function cargarDatos() {
      try {
        const slugs = Object.keys(coordsData)

        let rankingData = rankingCiudadesCache.current
          ?? leerCache('ranking_ciudades')
        if (!rankingData) {
          const res = await fetch('/api/stats/ranking?tipo=ciudad&limite=400&orden=asc')
          if (!res.ok) throw new Error(`Error ${res.status}`)
          rankingData = await res.json()
          escribirCache('ranking_ciudades', rankingData)
        }
        rankingCiudadesCache.current = rankingData

        const ranking = rankingData.ranking ?? []
        const precioMap = {}
        ranking.forEach(item => {
          if (item.zona) precioMap[item.zona.toLowerCase()] = item.precioMedioMes
        })

        const ciudadesCompletas = slugs
          .map(slug => {
            const nombre = slugToNombre(slug)
            return {
              slug,
              nombre,
              lat: coordsData[slug].lat,
              lng: coordsData[slug].lng,
              precioMedio: precioMap[nombre.toLowerCase()] ?? null
            }
          })
          .filter(c => c.precioMedio !== null)

        setCiudades(ciudadesCompletas)
      } catch (e) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }
    cargarDatos()
  }, [])

  // ── Carga todos los barrios con precio (una sola vez) ──────────────────────
  useEffect(() => {
    if (zoom < ZOOM_BARRIOS) {
      setBarriosTodos([])
      return
    }
    if (barriosTodos.length > 0) return // ya cargados

    setLoadingBarrios(true)

    async function cargarBarrios() {
      try {
        const ciudadesACargar = selectedCiudad
          ? ciudades.filter(c => c.slug === selectedCiudad.slug)
          : ciudades

        const barriosSinPrecio = ciudadesACargar.flatMap(ciudad => {
          const coordsCiudad = barriosData[ciudad.slug] || {}
          return Object.entries(coordsCiudad)
            .filter(([slug]) => !esSlugBasura(slug))
            .map(([slug, coords]) => ({
              slug,
              nombre: slug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
              ciudadSlug: ciudad.slug,
              lat: coords.lat,
              lng: coords.lng,
              precioMedio: null,
            }))
        })

        let rankingData = rankingBarriosCache.current
          ?? leerCache('ranking_barrios')
        if (!rankingData) {
          const res = await fetch('/api/stats/ranking?tipo=barrio&limite=400&orden=asc')
          if (!res.ok) throw new Error('ranking barrios failed')
          rankingData = await res.json()
          escribirCache('ranking_barrios', rankingData)
        }
        rankingBarriosCache.current = rankingData

        const ranking = rankingData.ranking ?? []
        const precioMap = {}
        ranking.forEach(item => {
          if (item.zona) precioMap[item.zona.toLowerCase()] = item.precioMedioMes
        })

        const conPrecios = barriosSinPrecio
          .map(barrio => ({
            ...barrio,
            precioMedio: precioMap[barrio.nombre?.toLowerCase()] ?? null
          }))
          .filter(b => b.precioMedio !== null)

        setBarriosTodos(conPrecios)
      } catch {
        setBarriosTodos([])
      } finally {
        setLoadingBarrios(false)
      }
    }

    cargarBarrios()
  }, [zoom, ciudades, selectedCiudad])

  // ── Filtrar por viewport ───────────────────────────────────────────────────
  const modoBarrios = zoom >= ZOOM_BARRIOS

  const ciudadesVisibles = ciudades.filter(c =>
    enViewport(c.lat, c.lng, bounds)
  )

  const barriosVisibles = barriosTodos.filter(b =>
    enViewport(b.lat, b.lng, bounds)
  )

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleMapClick = useCallback(() => {
    setSelectedCiudad(null)
    setSelectedBarrio(null)
  }, [])

  const handleCiudadClick = useCallback((ciudad) => {
    setSelectedCiudad(ciudad)
    setSelectedBarrio(null)
  }, [])

  const handleBarrioClick = useCallback((barrio) => {
    setSelectedBarrio(barrio)
    setSelectedCiudad(null)
  }, [])

  const handleClosePanel = useCallback(() => {
    setSelectedCiudad(null)
    setSelectedBarrio(null)
  }, [])

  return (
    <div className="relative w-full h-full">
      {(loading || loadingBarrios) && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-[1001] bg-white shadow-lg rounded-full px-4 py-2 text-sm text-gray-600 font-medium flex items-center gap-2">
          <svg className="animate-spin h-4 w-4 text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
          </svg>
          {loading ? 'Cargando ciudades...' : 'Cargando barrios...'}
        </div>
      )}
      {error && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-red-100 text-red-700 px-4 py-2 rounded">
          {error}
        </div>
      )}

      <div className="absolute bottom-6 left-4 z-[999] bg-white shadow rounded-full px-3 py-1 text-xs text-gray-500 font-medium pointer-events-none">
        {modoBarrios ? '🏘 Vista barrios' : '🏙 Vista ciudades'}
      </div>

      <MapContainer
        center={[41.7, 1.8]}
        zoom={8}
        style={{ height: '100%', width: '100%' }}
        zoomControl={true}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>'
        />
        <MapClickHandler onMapClick={handleMapClick} />
        <MapWatcher onZoomChange={setZoom} onBoundsChange={setBounds} />

        {!modoBarrios && ciudadesVisibles.map(ciudad => (
          <CityMarker
            key={ciudad.slug}
            ciudad={ciudad}
            onCiudadClick={handleCiudadClick}
          />
        ))}

        {modoBarrios && barriosVisibles.map(barrio => (
          <BarrioMarker
            key={`${barrio.ciudadSlug}-${barrio.slug}`}
            barrio={barrio}
            onClick={handleBarrioClick}
            isSelected={
              selectedBarrio?.slug === barrio.slug &&
              selectedBarrio?.ciudadSlug === barrio.ciudadSlug
            }
          />
        ))}
      </MapContainer>

      {selectedCiudad && !modoBarrios && (
        <div className="fixed top-12 right-0 bottom-0 w-96 z-[1000] overflow-y-auto shadow-2xl">
          <CityPanel onClose={handleClosePanel} />
        </div>
      )}

      {selectedBarrio && modoBarrios && (
        <div className="fixed top-12 right-0 bottom-0 w-96 z-[1000] overflow-y-auto shadow-2xl">
          <BarrioPanel
            barrio={selectedBarrio}
            ciudadSlug={selectedBarrio.ciudadSlug}
            onClose={handleClosePanel}
          />
        </div>
      )}
    </div>
  )
}