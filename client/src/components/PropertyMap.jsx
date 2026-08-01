import React, { useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { MapPin, Navigation, Compass } from 'lucide-react';

// Custom Map Marker Icons using SVG Data URIs
function createCustomIcon(color) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="36" viewBox="0 0 24 24" fill="${color}" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3" fill="#ffffff"/></svg>`;
  return L.icon({
    iconUrl: `data:image/svg+xml;base64,${btoa(svg)}`,
    iconSize: [28, 36],
    iconAnchor: [14, 36],
    popupAnchor: [0, -32]
  });
}

const cyanIcon = createCustomIcon('#06b6d4');
const emeraldIcon = createCustomIcon('#10b981');
const amberIcon = createCustomIcon('#f59e0b');

function MapEventsHandler({ onMapClick }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng);
    }
  });
  return null;
}

export default function PropertyMap({ mapProjects, filters, setFilters, unitType }) {
  const [selectedRadius, setSelectedRadius] = useState(filters.radiusKm || 1.5);
  
  // Default map center: Singapore Keppel / Central (1.2850, 103.8200)
  const defaultCenter = [1.2850, 103.8200];

  const handleMapClick = (latlng) => {
    setFilters(prev => ({
      ...prev,
      radiusKm: selectedRadius,
      centerCoords: { lat: latlng.lat, lng: latlng.lng }
    }));
  };

  const handleSelectProjectOnMap = (projName) => {
    if (!filters.projects.includes(projName)) {
      setFilters(prev => ({
        ...prev,
        projects: [...prev.projects, projName]
      }));
    }
  };

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">
          <Navigation size={18} color="var(--accent-cyan)" />
          GIS Development Map & Spatial Radius Filter
        </h3>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Radius: {selectedRadius} km</span>
          <input
            type="range"
            min="0.5"
            max="5"
            step="0.5"
            value={selectedRadius}
            onChange={e => {
              const r = parseFloat(e.target.value);
              setSelectedRadius(r);
              if (filters.centerCoords) {
                setFilters(prev => ({ ...prev, radiusKm: r }));
              }
            }}
            style={{ width: '100px', cursor: 'pointer' }}
          />
        </div>
      </div>

      <div className="map-wrapper">
        <MapContainer center={defaultCenter} zoom={12} scrollWheelZoom={true}>
          <TileLayer
            attribution='&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          />

          <MapEventsHandler onMapClick={handleMapClick} />

          {/* Render Radius Circle if Active */}
          {filters.centerCoords && filters.radiusKm && (
            <Circle
              center={[filters.centerCoords.lat, filters.centerCoords.lng]}
              radius={filters.radiusKm * 1000}
              pathOptions={{
                color: '#3b82f6',
                fillColor: '#3b82f6',
                fillOpacity: 0.15,
                dashArray: '6, 6'
              }}
            />
          )}

          {/* Render Project Markers */}
          {mapProjects && mapProjects.map(proj => {
            if (!proj.lat || !proj.lng) return null;
            const icon = proj.segment === 'CCR' ? cyanIcon : proj.segment === 'RCR' ? emeraldIcon : amberIcon;

            return (
              <Marker key={proj.id} position={[proj.lat, proj.lng]} icon={icon}>
                <Popup>
                  <div style={{ fontFamily: 'var(--font-body)', color: '#0f172a' }}>
                    <h4 style={{ margin: '0 0 4px 0', fontSize: '0.95rem', fontWeight: 700, color: '#1e293b' }}>
                      {proj.name}
                    </h4>
                    <p style={{ margin: '0 0 6px 0', fontSize: '0.78rem', color: '#64748b' }}>
                      {proj.street} • District {proj.district} ({proj.segment})
                    </p>
                    <div style={{ background: '#f1f5f9', padding: '6px 10px', borderRadius: '6px', marginBottom: '8px', fontSize: '0.8rem' }}>
                      <div>Median Rate: <strong>${(unitType === 'sqm' ? proj.medianPsqm : proj.medianPsft)?.toLocaleString()}</strong> /{unitType}</div>
                      <div>Sales Recorded: <strong>{proj.txCount} transactions</strong></div>
                    </div>
                    <button
                      onClick={() => handleSelectProjectOnMap(proj.name)}
                      style={{
                        background: '#3b82f6',
                        color: 'white',
                        border: 'none',
                        padding: '6px 12px',
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        width: '100%'
                      }}
                    >
                      + Add to Comparison Filter
                    </button>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>
      <p style={{ fontSize: '0.78rem', color: 'var(--text-subtle)', fontStyle: 'italic' }}>
        * Click anywhere on the map to set a center point and apply a geographical radius filter.
      </p>
    </div>
  );
}
