import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import safeFetch from '../lib/safeFetch';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  LayoutGrid, LogOut, User, Loader2, Menu, Train, MapPin, Clock, Camera, Layers
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '../components/ui/sheet';
import NotificationBell from '../components/NotificationBell';

const API = '/api';

// Fix default leaflet marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const createCustomIcon = (trainType) => {
  const colors = {
    'Freight': '#f59e0b',
    'Passenger': '#3b82f6',
    'High-Speed': '#ef4444',
    'Commuter': '#10b981',
    'Heritage': '#8b5cf6',
  };
  const color = colors[trainType] || '#e34c26';
  return L.divIcon({
    className: '',
    html: `<div style="
      width:32px;height:32px;border-radius:50%;
      background:${color};border:3px solid #fff;
      box-shadow:0 2px 8px rgba(0,0,0,0.5);
      display:flex;align-items:center;justify-content:center;
    "><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg></div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });
};

const FitBounds = ({ markers }) => {
  const map = useMap();
  useEffect(() => {
    if (markers.length > 0) {
      const bounds = L.latLngBounds(markers.map(m => [m.lat, m.lng]));
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 });
    }
  }, [markers, map]);
  return null;
};

const createClusterIcon = (cluster) => {
  const count = cluster.getChildCount();
  let size = 36;
  let bg = '#e34c26';
  if (count >= 10) { size = 44; bg = '#dc2626'; }
  else if (count >= 5) { size = 40; bg = '#ea580c'; }
  return L.divIcon({
    html: `<div style="
      width:${size}px;height:${size}px;border-radius:50%;
      background:${bg};border:3px solid rgba(255,255,255,0.8);
      box-shadow:0 2px 12px rgba(227,76,38,0.5);
      display:flex;align-items:center;justify-content:center;
      color:#fff;font-weight:700;font-size:${count >= 10 ? 14 : 13}px;
      font-family:Inter,sans-serif;
    ">${count}</div>`,
    className: '',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
};

const MobileNav = ({ user, onLogout }) => (
  <Sheet>
    <SheetTrigger asChild>
      <button className="md:hidden p-2 text-gray-800" aria-label="Menu">
        <Menu size={24} />
      </button>
    </SheetTrigger>
    <SheetContent side="right" className="bg-[#0f0f10] border-gray-800 w-[280px]">
      <div className="flex flex-col gap-6 mt-8">
        <div className="flex items-center gap-3 pb-4 border-b border-gray-800">
          {user?.picture ? (
            <img src={user.picture} alt="" className="w-10 h-10 rounded-full object-cover" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-[#e34c26] flex items-center justify-center text-white">
              <User size={20} />
            </div>
          )}
          <span className="text-white font-medium">{user?.name}</span>
        </div>
        <Link to="/dashboard" className="text-gray-300 hover:text-white py-2">Dashboard</Link>
        <Link to="/sightings" className="text-gray-300 hover:text-white py-2">My Sightings</Link>
        <Link to="/log-sighting" className="text-gray-300 hover:text-white py-2">Log Sighting</Link>
        <Link to="/map" className="text-white font-medium py-2">Map</Link>
        <Link to="/feed" className="text-gray-300 hover:text-white py-2">Feed</Link>
        <Link to="/discover" className="text-gray-300 hover:text-white py-2">Discover</Link>
        <Link to="/bookmarks" className="text-gray-300 hover:text-white py-2">Bookmarks</Link>
        <Link to="/profile" className="text-gray-300 hover:text-white py-2">Profile</Link>
        <button onClick={onLogout} className="text-red-400 hover:text-red-300 py-2 text-left mt-4">
          <LogOut size={18} className="inline mr-2" /> Logout
        </button>
      </div>
    </SheetContent>
  </Sheet>
);

const SightingPopup = ({ marker }) => (
  <div className="min-w-[200px]">
    {marker.photos?.length > 0 && (
      <img
        src={marker.photos[0].startsWith('/') ? marker.photos[0] : marker.photos[0]}
        alt={marker.train_number}
        className="w-full h-24 object-cover rounded mb-2"
      />
    )}
    <div className="font-bold text-sm">{marker.train_number}</div>
    <div className="text-xs text-gray-600 mt-1">
      <span className="inline-block bg-gray-100 rounded px-1.5 py-0.5 mr-1">{marker.train_type}</span>
      {marker.traction_type && <span className="inline-block bg-gray-100 rounded px-1.5 py-0.5">{marker.traction_type}</span>}
    </div>
    <div className="text-xs text-gray-500 mt-1">{marker.operator}</div>
    <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
      <span>{marker.location}</span>
    </div>
    <div className="text-xs text-gray-400 mt-1">{marker.sighting_date} at {marker.sighting_time}</div>
  </div>
);

const MapView = () => {
  const { user, logout, loading } = useAuth();
  const navigate = useNavigate();
  const [markers, setMarkers] = useState([]);
  const [mapLoading, setMapLoading] = useState(true);
  const [showRailLines, setShowRailLines] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate('/auth');
  }, [loading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    safeFetch(`${API}/sightings/map/data`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : { markers: [] })
      .then(data => setMarkers(data.markers || []))
      .catch(() => {})
      .finally(() => setMapLoading(false));
  }, [user]);

  const handleLogout = async () => { await logout(); navigate('/'); };

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-[#0f0f10] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#e34c26] animate-spin" />
      </div>
    );
  }

  const center = markers.length > 0
    ? [markers.reduce((s, m) => s + m.lat, 0) / markers.length, markers.reduce((s, m) => s + m.lng, 0) / markers.length]
    : [51.505, -0.09];
  const zoom = markers.length > 0 ? 5 : 4;

  return (
    <div className="h-screen flex flex-col bg-[#0f0f10]">
      {/* Header */}
      <header className="bg-[#FFE500] h-[52px] flex items-center justify-between px-4 md:px-12 flex-shrink-0 relative z-[1100]">
        <Link to="/" className="flex items-center gap-2">
          <LayoutGrid size={22} strokeWidth={2.5} className="text-[#e34c26]" />
          <span className="text-[#e34c26] font-bold text-lg tracking-wider uppercase">TrackLog</span>
        </Link>
        <nav className="hidden md:flex items-center gap-6">
          <Link to="/dashboard" className="text-gray-600 text-sm hover:text-gray-900">Dashboard</Link>
          <Link to="/sightings" className="text-gray-600 text-sm hover:text-gray-900">My Sightings</Link>
          <Link to="/log-sighting" className="text-gray-600 text-sm hover:text-gray-900">Log Sighting</Link>
          <Link to="/map" className="text-gray-800 font-medium text-sm">Map</Link>
          <Link to="/feed" className="text-gray-600 text-sm hover:text-gray-900">Feed</Link>
          <Link to="/discover" className="text-gray-600 text-sm hover:text-gray-900">Discover</Link>
          <Link to="/bookmarks" className="text-gray-600 text-sm hover:text-gray-900">Bookmarks</Link>
        </nav>
        <div className="flex items-center gap-2 md:gap-4">
          <NotificationBell />
          <Link to="/profile" className="hidden md:flex items-center gap-2 hover:opacity-80">
            {user?.picture ? (
              <img src={user.picture} alt={user.name} className="w-8 h-8 rounded-full object-cover" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-[#e34c26] flex items-center justify-center text-white">
                <User size={16} />
              </div>
            )}
            <span className="text-gray-800 font-medium text-sm">{user?.name}</span>
          </Link>
          <Button onClick={handleLogout} variant="outline" size="sm" className="hidden md:flex border-gray-800 text-gray-800 hover:bg-gray-800 hover:text-white">
            <LogOut size={16} className="mr-1" /> Logout
          </Button>
          <MobileNav user={user} onLogout={handleLogout} />
        </div>
      </header>

      {/* Map Area */}
      <div className="flex-1 relative" data-testid="map-container">
        {mapLoading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-[#0f0f10]">
            <div className="text-center">
              <Loader2 className="w-8 h-8 text-[#e34c26] animate-spin mx-auto mb-3" />
              <p className="text-gray-400 text-sm">Loading map data...</p>
            </div>
          </div>
        ) : (
          <>
            <MapContainer
              center={center}
              zoom={zoom}
              style={{ height: '100%', width: '100%' }}
              zoomControl={false}
            >
              <TileLayer
                attribution='&copy; <a href="https://carto.com/">CARTO</a>'
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              />
              {showRailLines && (
                <TileLayer
                  url="https://tiles.openrailwaymap.org/standard/{z}/{x}/{y}.png"
                  attribution='Style: <a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA 2.0</a> <a href="https://www.openrailwaymap.org/">OpenRailwayMap</a>'
                  maxZoom={19}
                  tileSize={256}
                  opacity={0.75}
                />
              )}
              <FitBounds markers={markers} />
              <MarkerClusterGroup
                chunkedLoading
                iconCreateFunction={createClusterIcon}
                maxClusterRadius={50}
                spiderfyOnMaxZoom
                showCoverageOnHover={false}
              >
                {markers.map((m) => (
                  <Marker key={m.sighting_id} position={[m.lat, m.lng]} icon={createCustomIcon(m.train_type)}>
                    <Popup><SightingPopup marker={m} /></Popup>
                  </Marker>
                ))}
              </MarkerClusterGroup>
            </MapContainer>

            {/* Stats Overlay */}
            <div className="absolute top-4 left-4 z-[1000] bg-[#1a1a1c]/90 backdrop-blur-md border border-gray-700 rounded-xl p-4 max-w-[220px]" data-testid="map-stats-overlay">
              <h3 className="text-white font-semibold text-sm mb-3 flex items-center gap-2">
                <MapPin size={14} className="text-[#e34c26]" /> Sighting Map
              </h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-400">Mapped</span>
                  <span className="text-white font-medium">{markers.length} sightings</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Locations</span>
                  <span className="text-white font-medium">{new Set(markers.map(m => m.location)).size}</span>
                </div>
              </div>
              {/* Legend */}
              <div className="mt-3 pt-3 border-t border-gray-700">
                <p className="text-gray-500 text-[10px] uppercase tracking-wider mb-2">Legend</p>
                <div className="grid grid-cols-1 gap-1">
                  {[
                    { label: 'Passenger', color: '#3b82f6' },
                    { label: 'Freight', color: '#f59e0b' },
                    { label: 'High-Speed', color: '#ef4444' },
                    { label: 'Commuter', color: '#10b981' },
                    { label: 'Heritage', color: '#8b5cf6' },
                  ].map(item => (
                    <div key={item.label} className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: item.color }} />
                      <span className="text-gray-400 text-[10px]">{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>
              {/* Rail Lines Toggle */}
              <div className="mt-3 pt-3 border-t border-gray-700">
                <button
                  onClick={() => setShowRailLines(prev => !prev)}
                  className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-medium transition-all ${
                    showRailLines
                      ? 'bg-[#e34c26]/20 text-[#e34c26] border border-[#e34c26]/40'
                      : 'bg-gray-800/50 text-gray-400 border border-gray-700 hover:text-gray-300 hover:border-gray-600'
                  }`}
                  data-testid="toggle-rail-lines"
                >
                  <Layers size={14} />
                  Rail Lines
                  <span className={`ml-auto text-[9px] uppercase tracking-wider ${showRailLines ? 'text-[#e34c26]' : 'text-gray-500'}`}>
                    {showRailLines ? 'ON' : 'OFF'}
                  </span>
                </button>
              </div>
            </div>

            {markers.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center z-[999] pointer-events-none">
                <div className="bg-[#1a1a1c]/95 backdrop-blur-md border border-gray-700 rounded-xl p-8 text-center pointer-events-auto">
                  <Camera size={36} className="text-[#e34c26] mx-auto mb-3" />
                  <h3 className="text-white font-semibold mb-1">No sightings to map</h3>
                  <p className="text-gray-400 text-sm mb-4">Log sightings with locations to see them on the map</p>
                  <Link to="/log-sighting">
                    <Button className="bg-[#e34c26] hover:bg-[#d14020] text-white text-sm">
                      Log a Sighting
                    </Button>
                  </Link>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default MapView;
