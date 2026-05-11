export default async function handler(req, res) {
  const { path, ...query } = req.query
  const params = new URLSearchParams(query).toString()
  const url = `https://rentapi-b6gc.onrender.com/api/v1/pisos/${path}${params ? '?' + params : ''}`

  try {
    const response = await fetch(url, {
      headers: {
        'X-API-Key': process.env.RENTAPI_KEY,
        'Content-Type': 'application/json'
      }
    })
    const data = await response.json()
    res.status(response.status).json(data)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}
