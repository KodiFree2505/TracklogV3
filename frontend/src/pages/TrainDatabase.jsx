import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import safeFetch from '../lib/safeFetch';
import {
  LayoutGrid, LogOut, User, Loader2, Menu, Search, ChevronRight, Train
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Sheet, SheetContent, SheetTrigger } from '../components/ui/sheet';
import NotificationBell from '../components/NotificationBell';
import TrainDetail, { StatusBadge, STATUS_CONFIG } from '../components/trains/TrainDetail';

const API = '/api';

const COUNTRIES = [
  { code: 'Australia', label: 'Australia', flag: '\u{1F1E6}\u{1F1FA}' },
  { code: 'United Kingdom', label: 'United Kingdom', flag: '\u{1F1EC}\u{1F1E7}' },
  { code: 'United States', label: 'United States', flag: '\u{1F1FA}\u{1F1F8}' },
];

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

const TrainDatabase = () => {
  const { user, logout, loading } = useAuth();
  const navigate = useNavigate();
  const [trains, setTrains] = useState([]);
  const [states, setStates] = useState([]);
  const [selectedCountry, setSelectedCountry] = useState('Australia');
  const [selectedState, setSelectedState] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [search, setSearch] = useState('');
  const [dataLoading, setDataLoading] = useState(true);
  const [selectedTrain, setSelectedTrain] = useState(null);

  useEffect(() => { if (!loading && !user) navigate('/auth'); }, [loading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    setSelectedState('');
    safeFetch(`${API}/trains/states?country=${encodeURIComponent(selectedCountry)}`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : { states: [] })
      .then(d => setStates(d.states || []))
      .catch(() => {});
  }, [user, selectedCountry]);

  useEffect(() => {
    if (!user) return;
    setDataLoading(true);
    const params = new URLSearchParams({ country: selectedCountry });
    if (selectedState) params.set('state', selectedState);
    if (selectedStatus) params.set('status', selectedStatus);
    if (search) params.set('search', search);
    safeFetch(`${API}/trains/list?${params}`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : { trains: [] })
      .then(d => setTrains(d.trains || []))
      .catch(() => {})
      .finally(() => setDataLoading(false));
  }, [user, selectedCountry, selectedState, selectedStatus, search]);

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
          <Link to="/trains" className="text-gray-800 font-medium text-sm">Trains</Link>
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
          <TrainList
            trains={trains}
            states={states}
            dataLoading={dataLoading}
            selectedCountry={selectedCountry}
            setSelectedCountry={setSelectedCountry}
            selectedState={selectedState}
            setSelectedState={setSelectedState}
            selectedStatus={selectedStatus}
            setSelectedStatus={setSelectedStatus}
            search={search}
            setSearch={setSearch}
            onSelect={setSelectedTrain}
          />
        )}
      </main>
    </div>
  );
};

const TrainList = ({ trains, states, dataLoading, selectedCountry, setSelectedCountry, selectedState, setSelectedState, selectedStatus, setSelectedStatus, search, setSearch, onSelect }) => (
  <>
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-1">
        <Train size={24} className="text-[#e34c26]" />
        <h1 className="text-white text-2xl md:text-3xl font-bold">Train Database</h1>
      </div>
      <p className="text-gray-400 text-sm">Comprehensive database of rolling stock around the world</p>
    </div>

    <div className="flex flex-wrap gap-2 mb-6" data-testid="country-tabs">
      {COUNTRIES.map(c => (
        <button key={c.code} onClick={() => setSelectedCountry(c.code)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${selectedCountry === c.code ? 'bg-[#e34c26] text-white' : 'bg-[#1a1a1c] text-gray-400 border border-gray-800 hover:border-gray-600'}`}
          data-testid={`country-tab-${c.code}`}>{c.flag} {c.label}</button>
      ))}
    </div>

    <div className="flex flex-col sm:flex-row gap-3 mb-6">
      <div className="relative flex-1">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
        <Input placeholder="Search trains..." value={search} onChange={e => setSearch(e.target.value)}
          className="pl-9 bg-[#1a1a1c] border-gray-700 text-gray-200 placeholder:text-gray-500" data-testid="train-search" />
      </div>
      <select value={selectedState} onChange={e => setSelectedState(e.target.value)}
        className="bg-[#1a1a1c] border border-gray-700 rounded-md px-3 py-2 text-sm text-gray-200" data-testid="state-filter">
        <option value="">All States</option>
        {states.map(s => <option key={s} value={s}>{s}</option>)}
      </select>
      <select value={selectedStatus} onChange={e => setSelectedStatus(e.target.value)}
        className="bg-[#1a1a1c] border border-gray-700 rounded-md px-3 py-2 text-sm text-gray-200" data-testid="status-filter">
        <option value="">All Statuses</option>
        {Object.keys(STATUS_CONFIG).map(s => <option key={s} value={s}>{s}</option>)}
      </select>
    </div>

    <div className="flex flex-wrap gap-2 mb-6">
      {Object.entries(STATUS_CONFIG).map(([status, cfg]) => {
        const Icon = cfg.icon;
        return <span key={status} className={`inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium ${cfg.bg} ${cfg.text} border ${cfg.border}`}><Icon size={10} /> {status}</span>;
      })}
    </div>

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
          <button key={t.train_id} onClick={() => onSelect(t)}
            className="w-full bg-[#1a1a1c] border border-gray-800 rounded-lg p-4 hover:border-orange-500/30 transition-all text-left group"
            data-testid={`train-card-${t.train_id}`}>
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
);

export default TrainDatabase;
