import { useState } from 'react'
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { reverseGeocode } from '../lib/geocoding.js'

// Fix Leaflet default marker icons (Vite não resolve os paths internos do Leaflet)
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const G  = '#1B4332'
const PT = [39.5, -8.0]

function ClickHandler({ onMapClick }) {
  useMapEvents({ click: e => onMapClick(e.latlng.lat, e.latlng.lng) })
  return null
}

function FallbackCoords({ coords, onCoordsChange }) {
  function handleGPS() {
    if (!navigator.geolocation) { alert('GPS não disponível.'); return }
    navigator.geolocation.getCurrentPosition(
      p => onCoordsChange({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => alert('Não foi possível obter localização.')
    )
  }
  return (
    <div style={{ padding: 12, background: '#f5f5f3', borderRadius: 10, border: '1px solid #e2e8f0' }}>
      <div style={{ fontSize: 11, color: '#64748b', marginBottom: 8 }}>📍 Coordenadas GPS (mapa indisponível)</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
        <input
          type="number" step="0.0001" placeholder="Latitude · 40.21"
          value={coords?.lat ?? ''}
          onChange={e => { const v = parseFloat(e.target.value); if (!isNaN(v)) onCoordsChange({ lat: v, lng: coords?.lng ?? 0 }) }}
          style={{ padding: '7px 10px', fontSize: 12, borderRadius: 6, border: '1px solid #ddd', width: '100%', boxSizing: 'border-box' }}
        />
        <input
          type="number" step="0.0001" placeholder="Longitude · -8.42"
          value={coords?.lng ?? ''}
          onChange={e => { const v = parseFloat(e.target.value); if (!isNaN(v)) onCoordsChange({ lat: coords?.lat ?? 0, lng: v }) }}
          style={{ padding: '7px 10px', fontSize: 12, borderRadius: 6, border: '1px solid #ddd', width: '100%', boxSizing: 'border-box' }}
        />
      </div>
      <button type="button" onClick={handleGPS}
        style={{ width: '100%', padding: '8px 12px', fontSize: 11, fontWeight: 600,
          background: G, color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
        📍 Usar GPS actual
      </button>
    </div>
  )
}

export default function MapaPicker({ coords, onCoordsChange, onAddressFound }) {
  const [fallback,    setFallback]    = useState(false)
  const [addrLoading, setAddrLoading] = useState(false)

  const center = coords?.lat && coords?.lng ? [coords.lat, coords.lng] : PT
  const zoom   = coords?.lat && coords?.lng ? 15 : 6

  async function handlePin(lat, lng) {
    onCoordsChange({ lat, lng })
    if (!onAddressFound) return
    setAddrLoading(true)
    const addr = await reverseGeocode(lat, lng)
    setAddrLoading(false)
    if (addr) onAddressFound(addr)
  }

  function handleGPS() {
    if (!navigator.geolocation) { alert('GPS não disponível.'); return }
    navigator.geolocation.getCurrentPosition(
      p => handlePin(p.coords.latitude, p.coords.longitude),
      () => alert('Não foi possível obter localização.')
    )
  }

  if (fallback) return <FallbackCoords coords={coords} onCoordsChange={onCoordsChange} />

  return (
    <div>
      <div style={{ borderRadius: 10, overflow: 'hidden', border: '1px solid #e2e8f0', marginBottom: 8, height: 200 }}>
        <MapContainer
          center={center}
          zoom={zoom}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={false}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />
          <ClickHandler onMapClick={handlePin} />
          {coords?.lat && coords?.lng && (
            <Marker
              position={[coords.lat, coords.lng]}
              draggable
              eventHandlers={{ dragend: e => { const ll = e.target.getLatLng(); handlePin(ll.lat, ll.lng) } }}
            />
          )}
        </MapContainer>
      </div>

      {coords?.lat && coords?.lng && (
        <div style={{ fontSize: 11, color: G, fontWeight: 600, marginBottom: 6 }}>
          📍 {coords.lat.toFixed(5)}°, {coords.lng.toFixed(5)}°
          {addrLoading && <span style={{ color: '#64748b', fontWeight: 400 }}> · a preencher morada...</span>}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
        <button type="button" onClick={handleGPS}
          style={{ flex: 1, padding: '7px 10px', borderRadius: 8, fontSize: 11, fontWeight: 600,
            background: '#f8fafc', border: '1px solid #e2e8f0', color: '#0f172a', cursor: 'pointer' }}>
          📍 Usar localização actual
        </button>
        {!coords && (
          <div style={{ flex: 1, fontSize: 11, color: '#64748b', padding: '7px 10px',
            background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
            Toque no mapa para colocar pin
          </div>
        )}
      </div>

      <button type="button" onClick={() => setFallback(true)}
        style={{ fontSize: 10, color: '#94a3b8', background: 'none', border: 'none',
          cursor: 'pointer', textDecoration: 'underline', padding: 0 }}>
        Mapa com problemas? Usar coordenadas manuais
      </button>
    </div>
  )
}
