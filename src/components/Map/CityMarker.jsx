import { useEffect, useRef } from 'react'
import { useMap } from 'react-leaflet'
import L from 'leaflet'
import useCiudadesStore from '../../store/useCiudadesStore'
import { precioAColor, formatPrecio } from '../../utils/colores'

export default function CityMarker({ ciudad, onCiudadClick }) {
  const map = useMap()
  const markerRef = useRef(null)
  const { selectedCiudad } = useCiudadesStore()

  // Crea el marker una sola vez
  useEffect(() => {
    const color = precioAColor(ciudad.precioMedio)
    const precio = formatPrecio(ciudad.precioMedio)

    const icon = L.divIcon({
      className: '',
      html: `
        <div style="
          background: ${color};
          border: 2px solid white;
          border-radius: 50%;
          width: 52px;
          height: 52px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          cursor: pointer;
        ">
          <span style="color: white; font-size: 11px; font-weight: 700; line-height: 1.1">
            ${precio}
          </span>
          <span style="color: white; font-size: 8px; opacity: 0.9">€/mes</span>
        </div>
      `,
      iconSize: [52, 52],
      iconAnchor: [26, 26],
    })

    const marker = L.marker([ciudad.lat, ciudad.lng], { icon })

    marker.bindTooltip(`
      <div style="font-family: sans-serif; min-width: 150px">
        <div style="font-weight: 700; font-size: 14px; margin-bottom: 4px">
          ${ciudad.nombre}
        </div>
        <div style="font-size: 12px; color: #555">
          Precio medio: <b>${ciudad.precioMedio ? ciudad.precioMedio.toFixed(0) + '€/mes' : '—'}</b>
        </div>
      </div>
    `, { direction: 'top', offset: [0, -30] })

    marker.on('click', (e) => {
      L.DomEvent.stopPropagation(e)
      onCiudadClick(ciudad)
    })

    marker.addTo(map)
    markerRef.current = marker

    return () => marker.remove()
  }, [ciudad])

  // Actualiza el icono al seleccionar sin recrear el marker
  useEffect(() => {
    const marker = markerRef.current
    if (!marker) return

    const isSelected = selectedCiudad?.slug === ciudad.slug
    const color = precioAColor(ciudad.precioMedio)

    const icon = L.divIcon({
      className: '',
      html: `
        <div style="
          background: ${color};
          border: ${isSelected ? '3px solid white' : '2px solid white'};
          border-radius: 50%;
          width: 52px;
          height: 52px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          box-shadow: ${isSelected ? '0 2px 14px rgba(0,0,0,0.5)' : '0 2px 8px rgba(0,0,0,0.3)'};
          cursor: pointer;
          transform: ${isSelected ? 'scale(1.15)' : 'scale(1)'};
          transition: transform 0.15s ease;
        ">
          <span style="color: white; font-size: 11px; font-weight: 700; line-height: 1.1">
            ${formatPrecio(ciudad.precioMedio)}
          </span>
          <span style="color: white; font-size: 8px; opacity: 0.9">€/mes</span>
        </div>
      `,
      iconSize: [52, 52],
      iconAnchor: [26, 26],
    })

    marker.setIcon(icon)
  }, [selectedCiudad])

  return null
}