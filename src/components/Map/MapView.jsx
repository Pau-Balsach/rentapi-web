import { useEffect, useState, useCallback } from 'react'
import { MapContainer, TileLayer, useMapEvents } from 'react-leaflet'
import useCiudadesStore from '../../store/useCiudadesStore'
import { fetchCiudades, fetchBarrios } from '../../hooks/useGeo'
import { fetchComparar, fetchStatsCiudad, fetchStatsBarrio } from '../../hooks/useStats'
import coordsData from '../../data/ciudades-coords.json'
import barriosData from '../../data/barrios-coords.json'
import CityMarker from './CityMarker'
import BarrioMarker from './BarrioMarker'
import CityPanel from '../Panel/CityPanel'
import BarrioPanel from '../Panel/BarrioPanel'

const ZOOM_BARRIOS = 11

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
  const [loadingPrecios, setLoadingPrecios] = useState(false)
  const [selectedBarrio, setSelectedBarrio] = useState(null)

  // ── Carga inicial de ciudades ──────────────────────────────────────────────
  useEffect(() => {
    async function cargarDatos() {
      try {
        const listaCiudades = await fetchCiudades()
        const conCoords = listaCiudades.filter(c => coordsData[c.slug])

        const allSlugs = conCoords.map(c => c.slug)
        const grupos = []
        for (let j = 0; j < allSlugs.length; j += 5) {
          grupos.push(allSlugs.slice(j, j + 5))
        }
        if (grupos.length > 1 && grupos[grupos.length - 1].length === 1) {
          const sobrante = grupos.pop()[0]
          const penultimo = grupos.pop()
          penultimo.push(sobrante)
          const mitad = Math.ceil(penultimo.length / 2)
          grupos.push(penultimo.slice(0, mitad))
          grupos.push(penultimo.slice(mitad))
        }

        const precioMap = {}
        if (conCoords.length < 2) {
          if (conCoords.length === 1) {
            const stats = await fetchStatsCiudad(conCoords[0].slug)
            precioMap[conCoords[0].slug] = stats.precioMes?.media ?? null
          }
        } else {
          const resultados = await Promise.all(
            grupos.map(slugs => fetchComparar(slugs))
          )
          resultados.forEach(r => {
            if (r?.comparativa) {
              r.comparativa.forEach(item => {
                precioMap[item.zona.toLowerCase()] = item.precioMedioMes
              })
            }
          })
        }

        const ciudadesCompletas = conCoords
          .map(c => ({
            ...c,
            lat: coordsData[c.slug].lat,
            lng: coordsData[c.slug].lng,
            precioMedio: precioMap[c.slug] ?? null
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
  useEffect(() => {
    if (zoom < ZOOM_BARRIOS) {
      setBarriosVisibles([])
      return
    }

    const ciudadesACargar = selectedCiudad
      ? ciudades.filter(c => c.slug === selectedCiudad.slug)
      : ciudades

    if (ciudadesACargar.length === 0) return

    setLoadingBarrios(true)

    Promise.all(
      ciudadesACargar.map(async (ciudad) => {
        try {
          const barrios = await fetchBarrios(ciudad.slug)
          if (!barrios || barrios.length === 0) return []
          const coordsCiudad = barriosData[ciudad.slug] || {}
          return barrios
            .filter(b => coordsCiudad[b.slug] && b.pisosIndexados >= 5)
            .map(b => ({
              ...b,
              ciudadSlug: ciudad.slug,
              lat: coordsCiudad[b.slug].lat,
              lng: coordsCiudad[b.slug].lng,
              precioMedio: null
            }))
        } catch {
          return []
        }
      })
    ).then(async (resultados) => {
      const barriosSinPrecio = resultados.flat()

    // Fase 1: mostrar marcadores inmediatamente
    setBarriosVisibles(barriosSinPrecio)
    setLoadingBarrios(false)
    setLoadingPrecios(true)

    // Fase 2: fetchear stats y rellenar precios
    const conPrecios = await Promise.all(
        barriosSinPrecio.map(async (barrio) => {
          try {
            const stats = await fetchStatsBarrio(barrio.ciudadSlug, barrio.slug)
            return {
              ...barrio,
              precioMedio: stats?.precioMes?.media ?? null
            }
          } catch {
            return barrio
          }
        })
      )

      setBarriosVisibles(conPrecios.filter(b => b.precioMedio !== null))
      setLoadingPrecios(false)
    }).catch(() => {
      setLoadingBarrios(false)
      setLoadingPrecios(false)
    })

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
      {(loading || loadingBarrios || loadingPrecios) && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-[1001] bg-white shadow-lg rounded-full px-4 py-2 text-sm text-gray-600 font-medium flex items-center gap-2">
          <svg className="animate-spin h-4 w-4 text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
          </svg>
          {loading ? 'Cargando ciudades...' : loadingBarrios ? 'Cargando barrios...' : 'Cargando precios...'}
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