# RentAPI Web 🏠

Aplicación web que muestra estadísticas y precios de alquiler en Cataluña mediante un mapa interactivo. Explora los precios por ciudad y barrio, consulta rankings y analiza el mercado inmobiliario catalán en tiempo real.

🌐 **[rentapi-web.vercel.app](https://rentapi-web.vercel.app/)**

---

## Ecosistema RentAPI

Este repositorio es el **frontend** del ecosistema. Los otros dos componentes son:

| Repositorio | Descripción |
|---|---|
| ⚙️ [rentapi](https://github.com/Pau-Balsach/rentapi) | API REST en Spring Boot que sirve los datos al frontend |
| 🕷️ [rentapi-scraper](https://github.com/Pau-Balsach/rentapi-scrapper) | Scraper en Java que extrae los datos de Idealista y Habitaclia |

---

## Características

- 🗺️ **Mapa interactivo** con clustering por zoom: ciudades a vista general, barrios al acercarse
- 📊 **Ranking de precios** ordenable por precio medio mensual y €/m²
- 🎨 **Código de colores** por rangos de precio (verde → rojo)
- 📍 **Paneles de detalle** al hacer clic en cualquier marcador
- ⚡ **Carga progresiva** de datos para una experiencia fluida

---

## Stack Tecnológico

| Capa | Tecnología |
|---|---|
| Frontend | React + Vite |
| Mapa | Leaflet |
| Estilos | Tailwind CSS |
| Estado | Zustand |
| Despliegue | Vercel (Serverless Functions) |
| Backend | API REST (Render) |

---

## Estructura del Proyecto

```
rentapi-web/
├── api/                  # Serverless functions (proxy hacia Render)
├── public/               # Assets estáticos (favicon, icons)
├── src/
│   ├── components/       # MapView, CityMarker, BarrioMarker, paneles...
│   ├── hooks/            # useStats, useGeo, usePisos
│   ├── store/            # Zustand (useCiudadesStore)
│   └── pages/            # RankingPage, ...
├── vercel.json           # Configuración de rutas y proxy
└── vite.config.js        # Configuración de Vite
```

---

## Cómo funciona el mapa

El mapa carga datos en **dos fases** para evitar bloqueos:

1. **Fase 1** — Renderiza los marcadores inmediatamente con coordenadas locales (precio pendiente)
2. **Fase 2** — Obtiene los precios de la API en paralelo y actualiza los marcadores progresivamente

El nivel de zoom determina qué se muestra:
- **Zoom < 11** → Marcadores de ciudades
- **Zoom ≥ 11** → Marcadores de barrios

---

## Desarrollo Local

```bash
# Instalar dependencias
npm install

# Arrancar en modo desarrollo
npm run dev

# Build de producción
npm run build
```

---

## Despliegue

El proyecto está desplegado en **Vercel**. Cada push a `main` genera un despliegue automático.

Las funciones serverless en `/api` actúan como proxy hacia el backend en Render, evitando problemas de CORS.

---

Desarrollado por [Pau Balsach](https://github.com/Pau-Balsach)
