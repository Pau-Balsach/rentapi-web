import { useEffect, useState, useCallback, useRef } from 'react'
import { MapContainer, TileLayer, useMapEvents } from 'react-leaflet'
import useCiudadesStore from '../../store/useCiudadesStore'
import { fetchCiudades } from '../../hooks/useGeo'
import coordsData from '../../data/ciudades-coords.json'
import barriosData from '../../data/barrios-coords.json'
import CityMarker from './CityMarker'
import BarrioMarker from './BarrioMarker'
import CityPanel from '../Panel/CityPanel'
import BarrioPanel from '../Panel/BarrioPanel'

const ZOOM_BARRIOS = 11

// Slugs sin nombre real: solo números, guiones, o "s-n"
const esSlugBasura = (slug) => /^[\d\-]+$/.test(slug) || slug === 's-n'

function MapClickHandler({ onMapClick }) {
  useMapEvents({ click: onMapClick })
  return null
}

function ZoomWatcher({ onZoomChange }) {
  useMapEvents({
    zoomend: (e) => onZoomChange(e.target.getZoom())
  })
  return null
}

export default function MapView() {
  const { ciudades, setCiudades, selectedCiudad, setSelectedCiudad } = useCiudadesStore()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [zoom, setZoom] = useState(8)
  const [barriosVisibles, setBarriosVisibles] = useState([])
  const [loadingBarrios, setLoadingBarrios] = useState(false)
  const [selectedBarrio, setSelectedBarrio] = useState(null)

  // Cache de rankings para no repetir fetch al hacer zoom in/out
  const rankingCiudadesCache = useRef(null)
  const rankingBarriosCache = useRef(null)

  // ── Carga inicial de ciudades ──────────────────────────────────────────────
  // Una sola llamada al ranking en lugar de N/5 llamadas a /comparar
  useEffect(() => {
    async function cargarDatos() {
      try {
        // 1. Lista de ciudades con coords (local, sin red)
        const listaCiudades = await fetchCiudades()
        const conCoords = listaCiudades.filter(c => coordsData[c.slug])

        // 2. Una sola llamada para todos los precios
        let rankingData = rankingCiudadesCache.current
        if (!rankingData) {
          const res = await fetch('/api/stats/ranking?tipo=ciudad&limite=200&orden=asc')
          if (!res.ok) throw new Error(`Error ${res.status}`)
          rankingData = await res.json()
          rankingCiudadesCache.current = rankingData
        }

        const ranking = rankingData.ranking ?? []
        const precioMap = {}
        ranking.forEach(item => {
          if (item.zona) precioMap[item.zona.toLowerCase()] = item.precioMedioMes
        })

        const ciudadesCompletas = conCoords
          .map(c => ({
            ...c,
            lat: coordsData[c.slug].lat,
            lng: coordsData[c.slug].lng,
            precioMedio: precioMap[c.nombre?.toLowerCase()] ?? precioMap[c.slug] ?? null
          }))
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

  // ── Carga barrios cuando zoom supera el umbral ─────────────────────────────
  // Sin llamadas a /geo/barrios: construimos la lista desde barrios-coords.json (local)
  // y enriquecemos con una sola llamada al ranking de barrios
  useEffect(() => {
    if (zoom < ZOOM_BARRIOS) {
      setBarriosVisibles([])
      return
    }

    setLoadingBarrios(true)

    async function cargarBarrios() {
      try {
        // 1. Construir lista de barrios candidatos desde el JSON local
        //    sin ninguna llamada de red a /geo/barrios
        const ciudadesACargar = selectedCiudad
          ? ciudades.filter(c => c.slug === selectedCiudad.slug)
          : ciudades

        const barriosSinPrecio = ciudadesACargar.flatMap(ciudad => {
          const coordsCiudad = barriosData[ciudad.slug] || {}
          return Object.entries(coordsCiudad)
            .filter(([slug]) => !esSlugBasura(slug))
            .map(([slug, coords]) => ({
              slug,
              nombre: slug
                .replace(/-/g, ' ')
                .replace(/\b\w/g, l => l.toUpperCase()),
              ciudadSlug: ciudad.slug,
              lat: coords.lat,
              lng: coords.lng,
              precioMedio: null,
            }))
        })

        // Mostrar marcadores inmediatamente (sin precio aún)
        setBarriosVisibles(barriosSinPrecio)
        setLoadingBarrios(false)

        // 2. Una sola llamada al ranking para obtener todos los precios
        let rankingData = rankingBarriosCache.current
        if (!rankingData) {
          const res = await fetch('/api/stats/ranking?tipo=barrio&limite=200&orden=asc')
          if (!res.ok) throw new Error('ranking barrios failed')
          rankingData = await res.json()
          rankingBarriosCache.current = rankingData
        }

        const ranking = rankingData.ranking ?? []
        const precioMap = {}
        ranking.forEach(item => {
          if (item.zona) precioMap[item.zona.toLowerCase()] = item.precioMedioMes
        })

        const conPrecios = barriosSinPrecio.map(barrio => ({
          ...barrio,
          precioMedio: precioMap[barrio.nombre?.toLowerCase()] ?? null
        }))

        setBarriosVisibles(conPrecios.filter(b => b.precioMedio !== null))
      } catch {
        setLoadingBarrios(false)
      }
    }

    cargarBarrios()
  }, [zoom, ciudades, selectedCiudad])

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

  const modoBarrios = zoom >= ZOOM_BARRIOS

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
        <ZoomWatcher onZoomChange={setZoom} />

        {!modoBarrios && ciudades.map(ciudad => (
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