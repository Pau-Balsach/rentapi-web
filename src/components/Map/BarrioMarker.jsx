import { useEffect, useRef } from 'react'
import { useMap } from 'react-leaflet'
import L from 'leaflet'
import { precioAColor, formatPrecio } from '../../utils/colores'

export default function BarrioMarker({ barrio, onClick, isSelected }) {
  const map = useMap()
  const markerRef = useRef(null)

  // Crear marker una sola vez
  useEffect(() => {
    const color = precioAColor(barrio.precioMedio)
    const precio = formatPrecio(barrio.precioMedio)

    const icon = L.divIcon({
      className: '',
      html: `
        <div style="
          background: ${color};
          border: 2px solid white;
          border-radius: 50%;
          width: 38px;
          height: 38px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 6px rgba(0,0,0,0.25);
          cursor: pointer;
          opacity: 0.92;
        ">
          <span style="color: white; font-size: 9px; font-weight: 700; line-height: 1.1">
            ${precio}
          </span>
          <span style="color: white; font-size: 7px; opacity: 0.9">€/mes</span>
        </div>
      `,
      iconSize: [38, 38],
      iconAnchor: [19, 19],
    })

    const marker = L.marker([barrio.lat, barrio.lng], { icon })

    marker.bindTooltip(`
      <div style="font-family: sans-serif; min-width: 130px">
        <div style="font-weight: 700; font-size: 13px; margin-bottom: 3px">
          ${barrio.nombre}
        </div>
        <div style="font-size: 11px; color: #555">
          Precio medio: <b>${barrio.precioMedio ? barrio.precioMedio.toFixed(0) + '€/mes' : '—'}</b>
        </div>
      </div>
    `, { direction: 'top', offset: [0, -22] })

    marker.on('click', (e) => {
      L.DomEvent.stopPropagation(e)
      onClick(barrio)
    })

    marker.addTo(map)
    markerRef.current = marker

    return () => marker.remove()
  }, [barrio])

  // Actualizar icono al seleccionar sin recrear marker
  useEffect(() => {
    const marker = markerRef.current
    if (!marker) return

    const color = precioAColor(barrio.precioMedio)

    const icon = L.divIcon({
      className: '',
      html: `
        <div style="
          background: ${color};
          border: ${isSelected ? '3px solid white' : '2px solid white'};
          border-radius: 50%;
          width: 38px;
          height: 38px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          box-shadow: ${isSelected ? '0 2px 12px rgba(0,0,0,0.45)' : '0 2px 6px rgba(0,0,0,0.25)'};
          cursor: pointer;
          opacity: 0.92;
          transform: ${isSelected ? 'scale(1.2)' : 'scale(1)'};
          transition: transform 0.15s ease;
        ">
          <span style="color: white; font-size: 9px; font-weight: 700; line-height: 1.1">
            ${formatPrecio(barrio.precioMedio)}
          </span>
          <span style="color: white; font-size: 7px; opacity: 0.9">€/mes</span>
        </div>
      `,
      iconSize: [38, 38],
      iconAnchor: [19, 19],
    })

    marker.setIcon(icon)
  }, [isSelected])

  return null
}