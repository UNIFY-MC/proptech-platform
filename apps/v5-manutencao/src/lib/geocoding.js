const UA = 'V5-Manutencao/0.5 (proptech-platform)'

export async function geocodificarMorada(query) {
  const url = 'https://nominatim.openstreetmap.org/search?' + new URLSearchParams({
    q: query, format: 'json', addressdetails: '1', limit: '1', countrycodes: 'pt',
  })
  try {
    const res  = await fetch(url, { headers: { 'User-Agent': UA } })
    const data = await res.json()
    if (!data?.length) return null
    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon), display: data[0].display_name }
  } catch { return null }
}

export async function reverseGeocode(lat, lng) {
  const url = 'https://nominatim.openstreetmap.org/reverse?' + new URLSearchParams({
    lat: String(lat), lon: String(lng), format: 'json', addressdetails: '1',
  })
  try {
    const res  = await fetch(url, { headers: { 'User-Agent': UA } })
    const data = await res.json()
    const a    = data.address || {}
    return {
      rua:           a.road            || '',
      numero:        a.house_number    || '',
      codigo_postal: a.postcode        || '',
      cidade:        a.town || a.city || a.village || '',
      distrito:      a.state           || '',
      pais:          'PT',
    }
  } catch { return null }
}

// Postgres point type: "(lng,lat)" string
export const coordsToPoint = (lat, lng) =>
  lat != null && lng != null ? `(${lng},${lat})` : null

export function pointToCoords(point) {
  if (!point) return null
  const s = String(point)
  // Handle "(lng,lat)" format (Postgres native point)
  const m = s.match(/\(([\d.-]+),([\d.-]+)\)/)
  if (m) return { lng: parseFloat(m[1]), lat: parseFloat(m[2]) }
  // Handle object {x,y} if PostgREST ever returns structured form
  if (typeof point === 'object' && 'x' in point) return { lng: point.x, lat: point.y }
  return null
}
