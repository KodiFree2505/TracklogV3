import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LayoutGrid, LogOut, User, Loader2, Camera, Plus, Search, Grid, List, Train, MapPin, Calendar, Clock, Trash2 } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function formatDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function getPhotoUrl(photo) {
  if (!photo) return null;
  if (photo.startsWith('/api')) return `${BACKEND_URL}${photo}`;
  return photo;
}

const MySightings = () => {
  const { user, logout, loading } = useAuth();
  const navigate = useNavigate();
  const [sightings, setSightings] = useState([]);
  const [sightingsLoading, setSightingsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const [deleteId, setDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [selectedSighting, setSelectedSighting] = useState(null);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [loading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    fetch(`${API}/sightings`, { credentials: 'include' })
      .then(res => res.ok ? res.json() : [])
      .then(data => setSightings(data))
      .catch(() => {})
      .finally(() => setSightingsLoading(false));
  }, [user]);

  const handleLogout = () => { logout().then(() => navigate('/')); };

  const handleDelete = () => {
    if (!deleteId) return;
    setDeleting(true);
    fetch(`${API}/sightings/${deleteId}`, { method: 'DELETE', credentials: 'include' })
      .then(res => { if (res.ok) setSightings(sightings.filter(s => s.sighting_id !== deleteId)); })
      .finally(() => { setDeleting(false); setDeleteId(null); });
  };

  const filtered = sightings.filter(s => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return s.train_number.toLowerCase().includes(term) || s.operator.toLowerCase().includes(term) || s.location.toLowerCase().includes(term);
  });

  if (loading || !user) {
    return <div className="min-h-screen bg-[#0f0f10] flex items-center justify-center"><Loader2 className="w-8 h-8 text-[#e34c26] animate-spin" /></div>;
  }

  return (
    <div className="min-h-screen bg-[#0f0f10]">
      <header className="bg-[#FFE500] h-[52px] flex items-center justify-between px-6 md:px-12">
        <Link to="/" className="flex items-center gap-2">
          <LayoutGrid size={22} strokeWidth={2.5} className="text-[#e34c26]" />
          <span className="text-[#e34c26] font-bold text-lg tracking-wider uppercase">TrackLog</span>
        </Link>
        <nav className="flex items-center gap-6">
          <Link to="/dashboard" className="text-gray-600 text-sm">Dashboard</Link>
          <Link to="/sightings" className="text-gray-800 font-medium text-sm">My Sightings</Link>
          <Link to="/log-sighting" className="text-gray-600 text-sm">Log Sighting</Link>
        </nav>
        <div className="flex items-center gap-4">
          {currentUser?.picture ? <img src={currentUser.picture} alt="" className="w-8 h-8 rounded-full" /> : <div className="w-8 h-8 rounded-full bg-[#e34c26] flex items-center justify-center text-white"><User size={16} /></div>}
          <span className="text-gray-800 font-medium text-sm hidden md:block">{currentUser?.name}</span>
          <Button onClick={handleLogout} variant="outline" size="sm" className="border-gray-800 text-gray-800 hover:bg-gray-800 hover:text-white"><LogOut size={16} /></Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-12">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div><h1 className="text-white text-3xl font-bold mb-2">My Sightings</h1><p className="text-gray-400">{sightings.length} trains spotted</p></div>
          <div className="flex items-center gap-4">
            <div className="relative"><Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" /><Input placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 bg-[#1a1a1c] border-gray-700 text-white w-64" /></div>
            <div className="flex border border-gray-700 rounded-lg overflow-hidden">
              <button onClick={() => setViewMode('grid')} className={viewMode === 'grid' ? 'p-2 bg-orange-500 text-white' : 'p-2 bg-[#1a1a1c] text-gray-400'}><Grid size={18} /></button>
              <button onClick={() => setViewMode('list')} className={viewMode === 'list' ? 'p-2 bg-orange-500 text-white' : 'p-2 bg-[#1a1a1c] text-gray-400'}><List size={18} /></button>
            </div>
            <Link to="/log-sighting"><Button className="bg-[#e34c26] hover:bg-[#d14020] text-white"><Plus size={18} className="mr-2" />Log</Button></Link>
          </div>
        </div>

        {sightingsLoading ? <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-[#e34c26] animate-spin" /></div> : filtered.length === 0 ? (
          <div className="bg-[#1a1a1c] border border-gray-800 rounded-lg p-12 text-center">
            <Camera size={48} className="text-orange-500 mx-auto mb-4" />
            <h2 className="text-white text-xl font-semibold mb-2">{searchTerm ? 'No matching sightings' : 'No sightings yet'}</h2>
            {!searchTerm && <Link to="/log-sighting"><Button className="bg-[#e34c26] text-white mt-4">Add New Sighting</Button></Link>}
          </div>
        ) : (
          <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-4'}>
            {filtered.map(s => {
              const photo = s.photos && s.photos[0] ? getPhotoUrl(s.photos[0]) : null;
              return viewMode === 'grid' ? (
                <div key={s.sighting_id} className="bg-[#1a1a1c] border border-gray-800 rounded-lg overflow-hidden cursor-pointer" onClick={() => setSelectedSighting(s)}>
                  <div className="aspect-video bg-gray-800">{photo ? <img src={photo} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><Train size={48} className="text-gray-700" /></div>}</div>
                  <div className="p-4"><div className="flex justify-between"><div><h3 className="text-white font-semibold">{s.train_number}</h3><p className="text-orange-500 text-sm">{s.train_type}</p></div><button onClick={(e) => { e.stopPropagation(); setDeleteId(s.sighting_id); }} className="text-gray-500 hover:text-red-500"><Trash2 size={16} /></button></div><p className="text-gray-400 text-sm mt-2 flex items-center gap-1"><MapPin size={14} />{s.location}</p></div>
                </div>
              ) : (
                <div key={s.sighting_id} className="bg-[#1a1a1c] border border-gray-800 rounded-lg p-4 flex gap-4 cursor-pointer" onClick={() => setSelectedSighting(s)}>
                  <div className="w-24 h-24 bg-gray-800 rounded-lg overflow-hidden flex-shrink-0">{photo ? <img src={photo} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><Train size={32} className="text-gray-700" /></div>}</div>
                  <div className="flex-1"><div className="flex justify-between"><div><h3 className="text-white font-semibold">{s.train_number}</h3><p className="text-orange-500 text-sm">{s.train_type} • {s.operator}</p></div><button onClick={(e) => { e.stopPropagation(); setDeleteId(s.sighting_id); }} className="text-gray-500 hover:text-red-500"><Trash2 size={16} /></button></div><div className="flex gap-4 mt-2 text-sm text-gray-400"><span className="flex items-center gap-1"><MapPin size={14} />{s.location}</span><span className="flex items-center gap-1"><Clock size={14} />{s.sighting_time}</span></div></div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="bg-[#1a1a1c] border-gray-800"><AlertDialogHeader><AlertDialogTitle className="text-white">Delete?</AlertDialogTitle><AlertDialogDescription className="text-gray-400">This cannot be undone.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel className="border-gray-700 text-gray-300">Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-red-500 text-white">{deleting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>

      <Dialog open={selectedSighting !== null} onOpenChange={() => setSelectedSighting(null)}>
        <DialogContent className="bg-[#1a1a1c] border-gray-800 max-w-2xl">
          {selectedSighting && (<><DialogHeader><DialogTitle className="text-white flex items-center gap-2"><Train size={20} className="text-orange-500" />{selectedSighting.train_number}</DialogTitle></DialogHeader>
          {selectedSighting.photos && selectedSighting.photos.length > 0 && <div className="mb-4"><img src={getPhotoUrl(selectedSighting.photos[0])} alt="" className="w-full aspect-video object-cover rounded-lg" /></div>}
          <div className="grid grid-cols-2 gap-4"><div><p className="text-gray-500 text-sm">Type</p><p className="text-white">{selectedSighting.train_type}</p></div><div><p className="text-gray-500 text-sm">Operator</p><p className="text-white">{selectedSighting.operator}</p></div><div className="col-span-2"><p className="text-gray-500 text-sm">Location</p><p className="text-white">{selectedSighting.location}</p></div><div><p className="text-gray-500 text-sm">Date</p><p className="text-white">{formatDate(selectedSighting.sighting_date)}</p></div><div><p className="text-gray-500 text-sm">Time</p><p className="text-white">{selectedSighting.sighting_time}</p></div></div></>)}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MySightings;
