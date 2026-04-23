import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import safeFetch from '../lib/safeFetch';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Maximize2, Loader2 } from 'lucide-react';

const API = '/api';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const miniIcon = (type) => {
  const colors = { 'Freight': '#f59e0b', 'Passenger': '#3b82f6', 'High-Speed': '#ef4444', 'Commuter': '#10b981', 'Heritage': '#8b5cf6' };
  const c = colors[type] || '#e34c26';
  return L.divIcon({
    className: '',
    html: `<div style="width:18px;height:18px;border-radius:50%;background:${c};border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.5);"></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 18],
    popupAnchor: [0, -18],
  });
};

const FitBoundsMini = ({ markers }) => {
  const map = useMap();
  React.useEffect(() => {
    if (markers.length > 0) {
      const bounds = L.latLngBounds(markers.map(m => [m.lat, m.lng]));
      map.fitBounds(bounds, { padding: [30, 30], maxZoom: 10 });
    }
  }, [markers, map]);
  return null;
};

const MiniMap = () => {
  const [markers, setMarkers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    safeFetch(`${API}/sightings/map/data`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : { markers: [] })
      .then(data => setMarkers(data.markers || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="bg-[#1a1a1c] border border-gray-800 rounded-lg p-6 flex items-center justify-center h-[300px]">
        <Loader2 className="w-6 h-6 text-[#e34c26] animate-spin" />
      </div>
    );
  }

  if (markers.length === 0) return null;

  const center = [
    markers.reduce((s, m) => s + m.lat, 0) / markers.length,
    markers.reduce((s, m) => s + m.lng, 0) / markers.length,
  ];

  return (
    <div className="bg-[#1a1a1c] border border-gray-800 rounded-lg overflow-hidden" data-testid="dashboard-mini-map">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-[#2a1a1a] rounded-lg flex items-center justify-center">
            <MapPin size={16} className="text-orange-500" />
          </div>
          <div>
            <h3 className="text-white font-semibold text-sm">Sighting Map</h3>
            <p className="text-gray-500 text-xs">{markers.length} mapped across {new Set(markers.map(m => m.location)).size} locations</p>
          </div>
        </div>
        <Link to="/map" className="flex items-center gap-1 text-[#e34c26] text-xs hover:text-orange-400 transition-colors" data-testid="expand-map-btn">
          <Maximize2 size={14} /> Expand
        </Link>
      </div>
      <div className="h-[250px]">
        <MapContainer center={center} zoom={4} style={{ height: '100%', width: '100%' }} zoomControl={false} attributionControl={false}>
          <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
          <FitBoundsMini markers={markers} />
          {markers.map(m => (
            <Marker key={m.sighting_id} position={[m.lat, m.lng]} icon={miniIcon(m.train_type)}>
              <Popup>
                <div className="text-xs">
                  <div className="font-bold">{m.train_number}</div>
                  <div className="text-gray-500">{m.location}</div>
                  <div className="text-gray-400">{m.sighting_date}</div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
};

export default MiniMap;
