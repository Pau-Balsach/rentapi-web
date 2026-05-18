export default async function handler(req, res) {
  // La ruta puede venir como ?path=ciudades o capturada por el rewrite /(.*) 
  const { path, '0': captured, ...query } = req.query
  const subpath = path || captured || req.url.replace(/^\/api\/geo\/?/, '').split('?')[0]

  const params = new URLSearchParams(query).toString()
  const url = `https://rentapi-tuaq.onrender.com/api/v1/geo/${subpath}${params ? '?' + params : ''}`

  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.RENTAPI_KEY
      }
    })
    const data = await response.json()
    res.status(response.status).json(data)
  } catch (error) {
    res.status(500).json({ error: 'Error conectando con RentAPI', detail: error.message })
  }
}