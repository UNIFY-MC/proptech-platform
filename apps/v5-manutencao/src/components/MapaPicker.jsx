import { useState } from 'react'
import { reverseGeocode } from '../lib/geocoding.js'

// TODO(3.3.13): mapa visual — opções: Mapbox GL JS, Google Maps iframe embed,
// ou react-leaflet quando ambiente estabilizar

const G = '#1B4332'

export default function MapaPicker({ coords, onCoordsChange, onAddressFound }) {
  const [busy, setBusy] = useState(false)

  async function handleGPS() {
    if (!navigator.geolocation) { alert('GPS não disponível neste dispositivo.'); return }
    setBusy(true)
    navigator.geolocation.getCurrentPosition(
      async pos => {
        const { latitude: lat, longitude: lng } = pos.coords
        onCoordsChange({ lat, lng })
        if (onAddressFound) {
          const addr = await reverseGeocode(lat, lng)
          if (addr) onAddressFound(addr)
        }
        setBusy(false)
      },
      err => { alert('Não foi possível obter localização: ' + err.message); setBusy(false) },
      { timeout: 10000, enableHighAccuracy: true }
    )
  }

  async function handleReverseFromCoords() {
    if (!coords?.lat || !coords?.lng || !onAddressFound) return
    setBusy(true)
    const addr = await reverseGeocode(coords.lat, coords.lng)
    setBusy(false)
    if (addr) onAddressFound(addr)
  }

  const mapsLink = coords?.lat && coords?.lng
    ? `https://www.google.com/maps?q=${coords.lat},${coords.lng}`
    : null

  return (
    <div style={{ padding: 12, background: '#f5f5f3', borderRadius: 10, border: '1px solid #e5e5e3' }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: 10 }}>
        📍 Coordenadas GPS
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
        <div>
          <label style={{ fontSize: 10, color: '#888', display: 'block', marginBottom: 2 }}>Latitude</label>
          <input
            type="number" step="0.000001" placeholder="40.21100"
            value={coords?.lat ?? ''}
            onChange={e => {
              const v = e.target.value === '' ? null : parseFloat(e.target.value)
              if (v === null) onCoordsChange(null)
              else if (!isNaN(v)) onCoordsChange({ lat: v, lng: coords?.lng ?? 0 })
            }}
            style={{ width: '100%', padding: '7px 10px', fontSize: 13, borderRadius: 6,
              border: '1px solid #ddd', boxSizing: 'border-box' }}
          />
        </div>
        <div>
          <label style={{ fontSize: 10, color: '#888', display: 'block', marginBottom: 2 }}>Longitude</label>
          <input
            type="number" step="0.000001" placeholder="-8.42870"
            value={coords?.lng ?? ''}
            onChange={e => {
              const v = e.target.value === '' ? null : parseFloat(e.target.value)
              if (v === null) onCoordsChange(null)
              else if (!isNaN(v)) onCoordsChange({ lat: coords?.lat ?? 0, lng: v })
            }}
            style={{ width: '100%', padding: '7px 10px', fontSize: 13, borderRadius: 6,
              border: '1px solid #ddd', boxSizing: 'border-box' }}
          />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
        <button type="button" onClick={handleGPS} disabled={busy}
          style={{ flex: 1, padding: '8px 10px', fontSize: 11, fontWeight: 600,
            background: G, color: '#fff', border: 'none', borderRadius: 6,
            cursor: 'pointer', opacity: busy ? 0.5 : 1 }}>
          {busy ? '⏳' : '📍'} GPS actual
        </button>
        {coords?.lat && coords?.lng && onAddressFound && (
          <button type="button" onClick={handleReverseFromCoords} disabled={busy}
            style={{ flex: 1, padding: '8px 10px', fontSize: 11, fontWeight: 600,
              background: '#fff', border: '1px solid #ddd', borderRadius: 6,
              cursor: 'pointer', opacity: busy ? 0.5 : 1, color: '#0f172a' }}>
            ↩ Morada das coords
          </button>
        )}
      </div>

      {mapsLink && (
        <a href={mapsLink} target="_blank" rel="noopener noreferrer"
          style={{ display: 'block', textAlign: 'center', padding: '7px 10px', fontSize: 11,
            color: '#185FA5', background: '#E6F1FB', borderRadius: 6, textDecoration: 'none', fontWeight: 600 }}>
          🗺️ Ver no Google Maps →
        </a>
      )}

      <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 8, fontStyle: 'italic' }}>
        Mapa visual em 3.3.13 · usa GPS actual ou insere coords manualmente
      </div>
    </div>
  )
}
