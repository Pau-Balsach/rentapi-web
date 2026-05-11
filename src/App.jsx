import { Routes, Route, Link, useLocation } from 'react-router-dom'
import MapView from './components/Map/MapView'
import ComparePage from './components/Pages/ComparePage'
import EvaluarPage from './components/Pages/EvaluarPage'
import RankingPage from './components/Pages/RankingPage'

function Navbar() {
  const location = useLocation()

  const links = [
    { path: '/', label: 'Mapa' },
    { path: '/comparar', label: 'Comparar' },
    { path: '/evaluar', label: 'Evaluar precio' },
    { path: '/ranking', label: 'Ranking' },
  ]

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white shadow-sm h-12 flex items-center px-4 gap-6">
      <span className="font-black text-blue-600 text-lg mr-4">RentAPI</span>
      {links.map(link => (
        <Link
          key={link.path}
          to={link.path}
          className={`text-sm font-medium transition-colors
            ${location.pathname === link.path
              ? 'text-blue-600'
              : 'text-gray-500 hover:text-gray-800'
            }`}
        >
          {link.label}
        </Link>
      ))}
    </nav>
  )
}

export default function App() {
  return (
    // h-screen con pt-12 hacia que el contenido se saliese de la pantalla.
    // Usando fixed + inset resolvemos el layout sin depender de h-screen heredado.
    <div className="fixed inset-0 flex flex-col">
      <Navbar />
      <div className="flex-1 overflow-hidden mt-12">
        <Routes>
          <Route path="/" element={<MapView />} />
          <Route path="/comparar" element={<ComparePage />} />
          <Route path="/evaluar" element={<EvaluarPage />} />
          <Route path="/ranking" element={<RankingPage />} />
        </Routes>
      </div>
    </div>
  )
}