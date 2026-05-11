export default async function handler(req, res) {
  // Con "source": "/api/stats/:path*" Vercel pasa el wildcard en req.query.path
  // que puede ser string ("comparar") o array (["ciudad","barcelona"])
  const { path: pathParam, ...query } = req.query

  const subpath = Array.isArray(pathParam)
    ? pathParam.join('/')
    : pathParam || ''

  const params = new URLSearchParams(query).toString()
  const url = `https://rentapi-b6gc.onrender.com/api/v1/stats/${subpath}${params ? '?' + params : ''}`

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