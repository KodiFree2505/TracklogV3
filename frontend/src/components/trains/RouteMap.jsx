import React from 'react';
import { MapContainer, TileLayer, Polyline, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

const RouteMap = ({ routes }) => {
  const allCoords = routes.flatMap(r => r.coordinates || []);
  if (allCoords.length === 0) return null;
  const center = [allCoords.reduce((s, c) => s + c[0], 0) / allCoords.length, allCoords.reduce((s, c) => s + c[1], 0) / allCoords.length];
  const colors = ['#e34c26', '#3b82f6', '#22c55e', '#f59e0b', '#a855f7', '#ec4899'];
  return (
    <div className="h-[300px] rounded-lg overflow-hidden border border-gray-800" data-testid="route-map">
      <MapContainer center={center} zoom={6} style={{ height: '100%', width: '100%' }} zoomControl={false}>
        <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
        {routes.map((route, i) => {
          const coords = route.coordinates || [];
          if (coords.length < 2) return null;
          const color = colors[i % colors.length];
          return (
            <React.Fragment key={i}>
              <Polyline positions={coords} pathOptions={{ color, weight: 3, opacity: route.is_current ? 0.9 : 0.4, dashArray: route.is_current ? null : '8 6' }} />
              {coords.map((c, j) => (
                <CircleMarker key={j} center={c} radius={4} pathOptions={{ color, fillColor: color, fillOpacity: 1, weight: 2 }}>
                  <Popup><div className="text-xs font-medium">{route.stations?.[j] || `Stop ${j + 1}`}<br /><span className="text-gray-500">{route.name}</span></div></Popup>
                </CircleMarker>
              ))}
            </React.Fragment>
          );
        })}
      </MapContainer>
    </div>
  );
};

export default RouteMap;
