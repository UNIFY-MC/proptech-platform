import React, { useEffect, useRef, useState } from 'react'
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import { reverseGeocode } from '../lib/geocoding.js'

// Fix default marker icons (Vite doesn't bundle Leaflet's internal image paths)
const defaultIcon = L.icon({
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
})

const LISBOA = [38.7169, -9.1399]
const ZOOM_DEFAULT = 6
const ZOOM_PIN = 15

function MapClickHandler({ onMapClick }) {
  useMapEvents({ click: e => onMapClick(e.latlng.lat, e.latlng.lng) })
  return null
}

export default function MapaPicker({ coords, onCoordsChange, onAddressFound }) {
  const mapRef      = useRef(null)
  const markerRef   = useRef(null)
  const [loading,   setLoading]   = useState(false)
  const [geoLoading, setGeoLoading] = useState(false)

  const center  = coords ? [coords.lat, coords.lng] : LISBOA
  const zoom    = coords ? ZOOM_PIN : ZOOM_DEFAULT

  async function handlePin(lat, lng) {
    onCoordsChange({ lat, lng })
    setLoading(true)
    const addr = await reverseGeocode(lat, lng)
    setLoading(false)
    if (addr) onAddressFound?.(addr)
  }

  function handleDragEnd(e) {
    const { lat, lng } = e.target.getLatLng()
    handlePin(lat, lng)
  }

  function handleMapClick(lat, lng) {
    handlePin(lat, lng)
    mapRef.current?.flyTo([lat, lng], ZOOM_PIN, { duration: 0.8 })
  }

  function usarLocalizacaoAtual() {
    if (!navigator.geolocation) { alert('Geolocalização não disponível neste dispositivo.'); return }
    setGeoLoading(true)
    navigator.geolocation.getCurrentPosition(
      pos => {
        const { latitude: lat, longitude: lng } = pos.coords
        setGeoLoading(false)
        handlePin(lat, lng)
        mapRef.current?.flyTo([lat, lng], ZOOM_PIN, { duration: 1 })
      },
      () => { setGeoLoading(false); alert('Não foi possível obter a localização.') },
      { timeout: 10000 }
    )
  }

  const G  = '#1B4332'
  const GL = '#52B788'

  return (
    <div>
      <div style={{ borderRadius: 10, overflow: 'hidden', border: '1px solid #e2e8f0', marginBottom: 8 }}>
        <MapContainer
          center={center}
          zoom={zoom}
          style={{ height: 200, width: '100%' }}
          ref={mapRef}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />
          <MapClickHandler onMapClick={handleMapClick}/>
          {coords && (
            <Marker
              position={[coords.lat, coords.lng]}
              icon={defaultIcon}
              draggable
              ref={markerRef}
              eventHandlers={{ dragend: handleDragEnd }}
            />
          )}
        </MapContainer>
      </div>

      {coords && (
        <div style={{ fontSize: 11, color: G, fontWeight: 600, marginBottom: 8 }}>
          📍 {coords.lat.toFixed(5)}°, {coords.lng.toFixed(5)}°
          {loading && <span style={{ color: '#64748b', fontWeight: 400 }}> · a preencher morada...</span>}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8 }}>
        <button
          type="button"
          onClick={usarLocalizacaoAtual}
          disabled={geoLoading}
          style={{
            flex: 1, padding: '7px 10px', borderRadius: 8, fontSize: 11, fontWeight: 600,
            background: '#f8fafc', border: '1px solid #e2e8f0', color: '#0f172a', cursor: 'pointer',
            opacity: geoLoading ? 0.6 : 1,
          }}
        >
          {geoLoading ? '⏳ A obter...' : '📍 Usar localização actual'}
        </button>
        {!coords && (
          <div style={{ flex: 1, fontSize: 11, color: '#64748b', padding: '7px 10px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
            Toque no mapa para colocar pin
          </div>
        )}
      </div>
    </div>
  )
}
