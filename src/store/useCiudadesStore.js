import { create } from 'zustand'

const useCiudadesStore = create((set) => ({
  ciudades: [],          // lista de ciudades con coords y precio
  selectedCiudad: null,  // ciudad seleccionada en el mapa
  habitaciones: null,    // filtro de habitaciones (null = todos)

  setCiudades: (ciudades) => set({ ciudades }),
  setSelectedCiudad: (ciudad) => set({ selectedCiudad: ciudad }),
  setHabitaciones: (n) => set({ habitaciones: n }),
}))

export default useCiudadesStore