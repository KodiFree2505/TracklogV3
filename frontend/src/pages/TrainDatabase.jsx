import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import safeFetch from '../lib/safeFetch';
import {
  LayoutGrid, LogOut, User, Loader2, Menu, Search, ChevronRight,
  Train, MapPin, Clock, Gauge, Weight, Ruler, Zap, Users as UsersIcon,
  Calendar, Factory, Hash, ArrowLeft, X, Map, Layers,
  CheckCircle, XCircle, Wrench, FlaskConical, Archive
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Sheet, SheetContent, SheetTrigger } from '../components/ui/sheet';
import { MapContainer, TileLayer, Polyline, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import NotificationBell from '../components/NotificationBell';

const API = '/api';

const STATUS_CONFIG = {
  'In Service': { color: '#22c55e', bg: 'bg-green-900/30', text: 'text-green-400', border: 'border-green-800/40', icon: CheckCircle },
  'Withdrawn': { color: '#ef4444', bg: 'bg-red-900/30', text: 'text-red-400', border: 'border-red-800/40', icon: XCircle },
  'Preserved': { color: '#a855f7', bg: 'bg-purple-900/30', text: 'text-purple-400', border: 'border-purple-800/40', icon: Archive },
  'Under Refurbishment': { color: '#f59e0b', bg: 'bg-amber-900/30', text: 'text-amber-400', border: 'border-amber-800/40', icon: Wrench },
  'Testing': { color: '#3b82f6', bg: 'bg-blue-900/30', text: 'text-blue-400', border: 'border-blue-800/40', icon: FlaskConical },
};

const StatusBadge = ({ status }) => {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG['In Service'];
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${cfg.bg} ${cfg.text} border ${cfg.border}`} data-testid="train-status-badge">
      <Icon size={12} /> {status}
    </span>
  );
};

const SpecItem = ({ icon: Icon, label, value }) => {
  if (!value) return null;
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-gray-800/50 last:border-0">
      <Icon size={15} className="text-orange-500 flex-shrink-0" />
      <span className="text-gray-500 text-xs flex-shrink-0 w-28">{label}</span>
      <span className="text-gray-200 text-sm font-medium">{value}</span>
    </div>
  );
};

const MobileNav = ({ user, onLogout }) => (
  <Sheet>
    <SheetTrigger asChild>
      <button className="md:hidden p-2 text-gray-800" aria-label="Menu"><Menu size={24} /></button>
    </SheetTrigger>
    <SheetContent side="right" className="bg-[#0f0f10] border-gray-800 w-[280px]">
      <div className="flex flex-col gap-6 mt-8">
        <div className="flex items-center gap-3 pb-4 border-b border-gray-800">
          {user?.picture ? <img src={user.picture} alt="" className="w-10 h-10 rounded-full object-cover" /> : <div className="w-10 h-10 rounded-full bg-[#e34c26] flex items-center justify-center text-white"><User size={20} /></div>}
          <span className="text-white font-medium">{user?.name}</span>
        </div>
        <Link to="/dashboard" className="text-gray-300 hover:text-white py-2">Dashboard</Link>
        <Link to="/sightings" className="text-gray-300 hover:text-white py-2">My Sightings</Link>
        <Link to="/log-sighting" className="text-gray-300 hover:text-white py-2">Log Sighting</Link>
        <Link to="/map" className="text-gray-300 hover:text-white py-2">Map</Link>
        <Link to="/trains" className="text-white font-medium py-2">Train Database</Link>
        <Link to="/feed" className="text-gray-300 hover:text-white py-2">Feed</Link>
        <Link to="/community" className="text-gray-300 hover:text-white py-2">Community</Link>
        <Link to="/profile" className="text-gray-300 hover:text-white py-2">Profile</Link>
        <button onClick={onLogout} className="text-red-400 hover:text-red-300 py-2 text-left mt-4"><LogOut size={18} className="inline mr-2" /> Logout</button>
      </div>
    </SheetContent>
  </Sheet>
);

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

const TrainDetail = ({ train, onBack }) => {
  const specs = train.specs || {};
  const routes = train.routes || [];
  const history = train.history || [];
  const livery = train.livery || [];

  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-1 text-gray-400 hover:text-white text-sm mb-4 transition-colors" data-testid="back-to-list">
        <ArrowLeft size={16} /> Back to list
      </button>

      {/* Header */}
      <div className="bg-[#1a1a1c] border border-gray-800 rounded-xl p-5 md:p-6 mb-4">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-3">
          <div>
            <h2 className="text-white text-xl md:text-2xl font-bold" data-testid="train-name">{train.name}</h2>
            {train.designation && <p className="text-gray-500 text-sm">{train.designation}</p>}
          </div>
          <StatusBadge status={train.status} />
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400 mb-4">
          <span className="flex items-center gap-1"><Factory size={12} /> {train.operator}</span>
          <span className="flex items-center gap-1"><MapPin size={12} /> {train.state}</span>
          <span className="flex items-center gap-1"><Train size={12} /> {train.train_type}</span>
        </div>
        {train.description && <p className="text-gray-300 text-sm leading-relaxed">{train.description}</p>}
      </div>

      {/* Quick Specs */}
      <div className="bg-[#1a1a1c] border border-gray-800 rounded-xl p-5 md:p-6 mb-4" data-testid="specs-panel">
        <h3 className="text-white font-semibold mb-3 flex items-center gap-2"><Gauge size={16} className="text-orange-500" /> Quick Specs</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
          <SpecItem icon={Factory} label="Manufacturer" value={specs.manufacturer} />
          <SpecItem icon={Calendar} label="Introduced" value={specs.year_introduced} />
          {specs.year_retired && <SpecItem icon={Calendar} label="Retired" value={specs.year_retired} />}
          <SpecItem icon={Gauge} label="Top Speed" value={specs.top_speed_kmh ? `${specs.top_speed_kmh} km/h` : null} />
          <SpecItem icon={UsersIcon} label="Capacity" value={specs.capacity ? `${specs.capacity} pax` : null} />
          <SpecItem icon={Zap} label="Power Type" value={specs.power_type} />
          <SpecItem icon={Hash} label="Axle Config" value={specs.axle_config} />
          <SpecItem icon={Weight} label="Weight" value={specs.weight_tonnes ? `${specs.weight_tonnes}t` : null} />
          <SpecItem icon={Ruler} label="Length" value={specs.length_m ? `${specs.length_m}m` : null} />
          <SpecItem icon={Ruler} label="Gauge" value={specs.gauge_mm ? `${specs.gauge_mm}mm` : null} />
          <SpecItem icon={Zap} label="Power Output" value={specs.power_output_kw ? `${specs.power_output_kw} kW` : null} />
          <SpecItem icon={Hash} label="Number Built" value={specs.number_built} />
          <SpecItem icon={Train} label="Formation" value={specs.formation} />
          {specs.acceleration && <SpecItem icon={Gauge} label="Acceleration" value={specs.acceleration} />}
          {specs.braking_distance && <SpecItem icon={Gauge} label="Braking Dist." value={specs.braking_distance} />}
        </div>
      </div>

      {/* Livery */}
      {livery.length > 0 && (
        <div className="bg-[#1a1a1c] border border-gray-800 rounded-xl p-5 md:p-6 mb-4" data-testid="livery-section">
          <h3 className="text-white font-semibold mb-3 flex items-center gap-2"><Layers size={16} className="text-orange-500" /> Livery</h3>
          <div className="space-y-3">
            {livery.map((l, i) => (
              <div key={i} className="flex items-start gap-3 p-3 bg-[#0f0f10] rounded-lg border border-gray-800/50">
                <div className={`w-3 h-3 rounded-full mt-1 flex-shrink-0 ${l.is_current ? 'bg-green-500' : 'bg-gray-600'}`} />
                <div>
                  <p className="text-white text-sm font-medium">{l.name} {l.is_current && <span className="text-green-400 text-xs ml-1">(Current)</span>}</p>
                  <p className="text-gray-400 text-xs mt-0.5">{l.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Routes */}
      {routes.length > 0 && (
        <div className="bg-[#1a1a1c] border border-gray-800 rounded-xl p-5 md:p-6 mb-4" data-testid="routes-section">
          <h3 className="text-white font-semibold mb-3 flex items-center gap-2"><Map size={16} className="text-orange-500" /> Routes</h3>
          <RouteMap routes={routes} />
          <div className="mt-4 space-y-2">
            {routes.map((r, i) => (
              <div key={i} className="flex items-start gap-2 p-2.5 bg-[#0f0f10] rounded-lg border border-gray-800/50">
                <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${r.is_current ? 'bg-green-500' : 'bg-gray-600'}`} />
                <div>
                  <p className="text-white text-sm font-medium">{r.name} {!r.is_current && <span className="text-gray-500 text-xs ml-1">(Former)</span>}</p>
                  <p className="text-gray-500 text-xs mt-0.5">{(r.stations || []).join(' → ')}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* History */}
      {history.length > 0 && (
        <div className="bg-[#1a1a1c] border border-gray-800 rounded-xl p-5 md:p-6 mb-4" data-testid="history-section">
          <h3 className="text-white font-semibold mb-3 flex items-center gap-2"><Clock size={16} className="text-orange-500" /> History</h3>
          <div className="relative pl-4 border-l-2 border-gray-800 space-y-4">
            {history.map((h, i) => (
              <div key={i} className="relative">
                <div className="absolute -left-[21px] w-3 h-3 rounded-full bg-[#e34c26] border-2 border-[#0f0f10]" />
                <p className="text-[#e34c26] text-xs font-bold mb-0.5">{h.year}</p>
                <p className="text-gray-300 text-sm">{h.event}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const TrainDatabase = () => {
  const { user, logout, loading } = useAuth();
  const navigate = useNavigate();
  const [trains, setTrains] = useState([]);
  const [states, setStates] = useState([]);
  const [selectedState, setSelectedState] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [search, setSearch] = useState('');
  const [dataLoading, setDataLoading] = useState(true);
  const [selectedTrain, setSelectedTrain] = useState(null);

  useEffect(() => { if (!loading && !user) navigate('/auth'); }, [loading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    safeFetch(`${API}/trains/states?country=Australia`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : { states: [] })
      .then(d => setStates(d.states || []))
      .catch(() => {});
  }, [user]);

  useEffect(() => {
    if (!user) return;
    setDataLoading(true);
    const params = new URLSearchParams({ country: 'Australia' });
    if (selectedState) params.set('state', selectedState);
    if (selectedStatus) params.set('status', selectedStatus);
    if (search) params.set('search', search);
    safeFetch(`${API}/trains/list?${params}`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : { trains: [] })
      .then(d => setTrains(d.trains || []))
      .catch(() => {})
      .finally(() => setDataLoading(false));
  }, [user, selectedState, selectedStatus, search]);

  const handleLogout = async () => { await logout(); navigate('/'); };

  if (loading || !user) return <div className="min-h-screen bg-[#0f0f10] flex items-center justify-center"><Loader2 className="w-8 h-8 text-[#e34c26] animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-[#0f0f10]">
      <header className="bg-[#FFE500] h-[52px] flex items-center justify-between px-4 md:px-12">
        <Link to="/" className="flex items-center gap-2">
          <LayoutGrid size={22} strokeWidth={2.5} className="text-[#e34c26]" />
          <span className="text-[#e34c26] font-bold text-lg tracking-wider uppercase">TrackLog</span>
        </Link>
        <nav className="hidden md:flex items-center gap-6">
          <Link to="/dashboard" className="text-gray-600 text-sm hover:text-gray-900">Dashboard</Link>
          <Link to="/sightings" className="text-gray-600 text-sm hover:text-gray-900">My Sightings</Link>
          <Link to="/map" className="text-gray-600 text-sm hover:text-gray-900">Map</Link>
          <Link to="/trains" className="text-gray-800 font-medium text-sm">Train Database</Link>
          <Link to="/feed" className="text-gray-600 text-sm hover:text-gray-900">Feed</Link>
          <Link to="/community" className="text-gray-600 text-sm hover:text-gray-900">Community</Link>
        </nav>
        <div className="flex items-center gap-2 md:gap-4">
          <NotificationBell />
          <Link to="/profile" className="hidden md:flex items-center gap-2 hover:opacity-80">
            {user?.picture ? <img src={user.picture} alt={user.name} className="w-8 h-8 rounded-full object-cover" /> : <div className="w-8 h-8 rounded-full bg-[#e34c26] flex items-center justify-center text-white"><User size={16} /></div>}
            <span className="text-gray-800 font-medium text-sm">{user?.name}</span>
          </Link>
          <Button onClick={handleLogout} variant="outline" size="sm" className="hidden md:flex border-gray-800 text-gray-800 hover:bg-gray-800 hover:text-white"><LogOut size={16} className="mr-1" /> Logout</Button>
          <MobileNav user={user} onLogout={handleLogout} />
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 md:px-6 py-6 md:py-10">
        {selectedTrain ? (
          <TrainDetail train={selectedTrain} onBack={() => setSelectedTrain(null)} />
        ) : (
          <>
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-1">
                <Train size={24} className="text-[#e34c26]" />
                <h1 className="text-white text-2xl md:text-3xl font-bold">Australian Train Database</h1>
              </div>
              <p className="text-gray-400 text-sm">Comprehensive database of Australian rolling stock</p>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
              <div className="relative flex-1">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <Input
                  placeholder="Search trains..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-9 bg-[#1a1a1c] border-gray-700 text-gray-200 placeholder:text-gray-500"
                  data-testid="train-search"
                />
              </div>
              <select value={selectedState} onChange={e => setSelectedState(e.target.value)} className="bg-[#1a1a1c] border border-gray-700 rounded-md px-3 py-2 text-sm text-gray-200" data-testid="state-filter">
                <option value="">All States</option>
                {states.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <select value={selectedStatus} onChange={e => setSelectedStatus(e.target.value)} className="bg-[#1a1a1c] border border-gray-700 rounded-md px-3 py-2 text-sm text-gray-200" data-testid="status-filter">
                <option value="">All Statuses</option>
                {Object.keys(STATUS_CONFIG).map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            {/* Status legend */}
            <div className="flex flex-wrap gap-2 mb-6">
              {Object.entries(STATUS_CONFIG).map(([status, cfg]) => {
                const Icon = cfg.icon;
                return <span key={status} className={`inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium ${cfg.bg} ${cfg.text} border ${cfg.border}`}><Icon size={10} /> {status}</span>;
              })}
            </div>

            {/* Train List */}
            {dataLoading ? (
              <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 text-[#e34c26] animate-spin" /></div>
            ) : trains.length === 0 ? (
              <div className="bg-[#1a1a1c] border border-gray-800 rounded-lg p-8 text-center">
                <Train size={40} className="text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400">No trains found matching your filters</p>
              </div>
            ) : (
              <div className="space-y-3">
                {trains.map(t => (
                  <button
                    key={t.train_id}
                    onClick={() => setSelectedTrain(t)}
                    className="w-full bg-[#1a1a1c] border border-gray-800 rounded-lg p-4 hover:border-orange-500/30 transition-all text-left group"
                    data-testid={`train-card-${t.train_id}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="text-white font-semibold text-sm md:text-base truncate">{t.name}</h3>
                          <StatusBadge status={t.status} />
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                          <span>{t.operator}</span>
                          <span>{t.state}</span>
                          <span>{t.train_type}</span>
                          {t.specs?.top_speed_kmh && <span>{t.specs.top_speed_kmh} km/h</span>}
                        </div>
                      </div>
                      <ChevronRight size={18} className="text-gray-600 group-hover:text-orange-500 transition-colors flex-shrink-0 ml-2" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default TrainDatabase;
