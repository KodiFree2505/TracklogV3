import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import safeFetch from '../lib/safeFetch';
import { LayoutGrid, LogOut, User, Loader2, Camera, Plus, Search, Grid, List, Train, MapPin, Calendar, Clock, Trash2, Menu, Zap, Share2, Link2, Globe, Lock, Check, Pencil } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '../components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Sheet, SheetContent, SheetTrigger } from '../components/ui/sheet';

const BACKEND_URL = '';
const API = '/api';

function formatDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function getPhotoUrl(photo) {
  if (!photo) return null;
  if (photo.startsWith('/api')) return `${BACKEND_URL}${photo}`;
  return photo;
}

const MobileNav = ({ user, onLogout }) => (
  <Sheet>
    <SheetTrigger asChild>
      <button className="md:hidden p-2 text-gray-800">
        <Menu size={24} />
      </button>
    </SheetTrigger>
    <SheetContent side="right" className="bg-[#0f0f10] border-gray-800 w-[280px]">
      <div className="flex flex-col gap-6 mt-8">
        <div className="flex items-center gap-3 pb-4 border-b border-gray-800">
          {user?.picture ? (
            <img src={user.picture.startsWith('/api') ? `${BACKEND_URL}${user.picture}` : user.picture} alt="" className="w-10 h-10 rounded-full object-cover" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-[#e34c26] flex items-center justify-center text-white">
              <User size={20} />
            </div>
          )}
          <span className="text-white font-medium">{user?.name}</span>
        </div>
        <Link to="/dashboard" className="text-gray-300 hover:text-white py-2">Dashboard</Link>
        <Link to="/sightings" className="text-white font-medium py-2">My Sightings</Link>
        <Link to="/log-sighting" className="text-gray-300 hover:text-white py-2">Log Sighting</Link>
        <Link to="/profile" className="text-gray-300 hover:text-white py-2">Profile</Link>
        <button onClick={onLogout} className="text-red-400 hover:text-red-300 py-2 text-left mt-4">
          <LogOut size={18} className="inline mr-2" /> Logout
        </button>
      </div>
    </SheetContent>
  </Sheet>
);

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
  const [copiedId, setCopiedId] = useState(null);
  const [editSighting, setEditSighting] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [editPhotos, setEditPhotos] = useState([]);
  const [newPhotos, setNewPhotos] = useState([]);
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState('');

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [loading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    safeFetch(`${API}/sightings`, { credentials: 'include' })
      .then(res => res.ok ? res.json() : [])
      .then(data => setSightings(data))
      .catch(() => {})
      .finally(() => setSightingsLoading(false));
  }, [user]);

  const handleLogout = () => { logout().then(() => navigate('/')); };

  const handleDelete = () => {
    if (!deleteId) return;
    setDeleting(true);
    safeFetch(`${API}/sightings/${deleteId}`, { method: 'DELETE', credentials: 'include' })
      .then(res => { if (res.ok) setSightings(sightings.filter(s => s.sighting_id !== deleteId)); })
      .finally(() => { setDeleting(false); setDeleteId(null); });
  };

  const handleToggleVisibility = async (e, sightingId, currentPublic) => {
    e.stopPropagation();
    const newPublic = !currentPublic;
    try {
      const res = await safeFetch(`${API}/sightings/${sightingId}/visibility`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ is_public: newPublic })
      });
      if (res.ok) {
        setSightings(prev => prev.map(s => s.sighting_id === sightingId ? { ...s, is_public: newPublic } : s));
      }
    } catch (err) {
      console.error('Failed to toggle visibility:', err);
    }
  };

  const handleCopyLink = (e, shareId) => {
    e.stopPropagation();
    const url = `${window.location.origin}/share/sighting/${shareId}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedId(shareId);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const openEdit = (e, s) => {
    e.stopPropagation();
    setEditForm({
      train_number: s.train_number || '',
      train_type: s.train_type || '',
      traction_type: s.traction_type || '',
      operator: s.operator || '',
      route: s.route || '',
      location: s.location || '',
      sighting_date: s.sighting_date || '',
      sighting_time: s.sighting_time || '',
      notes: s.notes || '',
    });
    setEditPhotos((s.photos || []).filter(Boolean));
    setNewPhotos([]);
    setEditError('');
    setEditSighting(s);
  };

  const handleEditChange = (field, value) => {
    setEditForm(prev => ({ ...prev, [field]: value }));
  };

  const handleRemoveExistingPhoto = (idx) => {
    setEditPhotos(prev => prev.filter((_, i) => i !== idx));
  };

  const handleRemoveNewPhoto = (idx) => {
    setNewPhotos(prev => prev.filter((_, i) => i !== idx));
  };

  const handleAddPhotos = (e) => {
    const files = Array.from(e.target.files);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setNewPhotos(prev => [...prev, { base64: ev.target.result, name: file.name }]);
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  const handleEditSave = async () => {
    if (!editSighting) return;
    setSaving(true);
    setEditError('');
    try {
      const photos = [
        ...editPhotos,
        ...newPhotos.map(p => p.base64),
      ];
      const res = await safeFetch(`${API}/sightings/${editSighting.sighting_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ ...editForm, photos }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || 'Failed to update');
      }
      const updated = await res.json();
      setSightings(prev => prev.map(s => s.sighting_id === editSighting.sighting_id ? { ...s, ...updated } : s));
      setEditSighting(null);
    } catch (err) {
      setEditError(err.message);
    } finally {
      setSaving(false);
    }
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
      {/* Header */}
      <header className="bg-[#FFE500] h-[52px] flex items-center justify-between px-4 md:px-12">
        <Link to="/" className="flex items-center gap-2">
          <LayoutGrid size={22} strokeWidth={2.5} className="text-[#e34c26]" />
          <span className="text-[#e34c26] font-bold text-lg tracking-wider uppercase">TrackLog</span>
        </Link>
        
        <nav className="hidden md:flex items-center gap-6">
          <Link to="/dashboard" className="text-gray-600 text-sm">Dashboard</Link>
          <Link to="/sightings" className="text-gray-800 font-medium text-sm">My Sightings</Link>
          <Link to="/log-sighting" className="text-gray-600 text-sm">Log Sighting</Link>
        </nav>
        
        <div className="flex items-center gap-2 md:gap-4">
          <Link to="/profile" className="hidden md:flex items-center gap-2 hover:opacity-80 transition-opacity">
            {user?.picture ? (
              <img src={user.picture.startsWith('/api') ? `${BACKEND_URL}${user.picture}` : user.picture} alt="" className="w-8 h-8 rounded-full object-cover" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-[#e34c26] flex items-center justify-center text-white"><User size={16} /></div>
            )}
            <span className="text-gray-800 font-medium text-sm">{user?.name}</span>
          </Link>
          <Button onClick={handleLogout} variant="outline" size="sm" className="hidden md:flex border-gray-800 text-gray-800 hover:bg-gray-800 hover:text-white"><LogOut size={16} /></Button>
          <MobileNav user={user} onLogout={handleLogout} />
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 md:px-6 py-6 md:py-12">
        <div className="flex flex-col gap-4 mb-6 md:mb-8">
          <div>
            <h1 className="text-white text-2xl md:text-3xl font-bold mb-1">My Sightings</h1>
            <p className="text-gray-400 text-sm">{sightings.length} train{sightings.length !== 1 ? 's' : ''} spotted</p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative flex-1 sm:max-w-[240px]">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <Input placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 bg-[#1a1a1c] border-gray-700 text-white w-full" />
            </div>
            <div className="flex items-center gap-3">
              <div className="flex border border-gray-700 rounded-lg overflow-hidden">
                <button onClick={() => setViewMode('grid')} className={viewMode === 'grid' ? 'p-2 bg-orange-500 text-white' : 'p-2 bg-[#1a1a1c] text-gray-400'}><Grid size={18} /></button>
                <button onClick={() => setViewMode('list')} className={viewMode === 'list' ? 'p-2 bg-orange-500 text-white' : 'p-2 bg-[#1a1a1c] text-gray-400'}><List size={18} /></button>
              </div>
              <Link to="/log-sighting" className="flex-1 sm:flex-none">
                <Button className="bg-[#e34c26] hover:bg-[#d14020] text-white w-full sm:w-auto"><Plus size={18} className="mr-1" /><span className="hidden sm:inline">Log</span></Button>
              </Link>
            </div>
          </div>
        </div>

        {sightingsLoading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-[#e34c26] animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <div className="bg-[#1a1a1c] border border-gray-800 rounded-lg p-8 md:p-12 text-center">
            <Camera size={40} className="text-orange-500 mx-auto mb-4" />
            <h2 className="text-white text-lg md:text-xl font-semibold mb-2">{searchTerm ? 'No matching sightings' : 'No sightings yet'}</h2>
            {!searchTerm && <Link to="/log-sighting"><Button className="bg-[#e34c26] text-white mt-4">Add New Sighting</Button></Link>}
          </div>
        ) : (
          <div className={viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6' : 'space-y-3 md:space-y-4'}>
            {filtered.map(s => {
              const photo = s.photos && s.photos[0] ? getPhotoUrl(s.photos[0]) : null;
              const photoCount = s.photos ? s.photos.length : 0;
              
              return viewMode === 'grid' ? (
                <div key={s.sighting_id} className="bg-[#1a1a1c] border border-gray-800 rounded-lg overflow-hidden cursor-pointer hover:border-orange-500/30 transition-colors" onClick={() => setSelectedSighting(s)}>
                  <div className="aspect-video bg-gray-800 relative">
                    {photo ? <img src={photo} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><Train size={40} className="text-gray-700" /></div>}
                    {photoCount > 1 && <div className="absolute bottom-2 right-2 bg-black/70 px-2 py-1 rounded text-xs text-white">+{photoCount - 1}</div>}
                    {s.is_public && <div className="absolute top-2 left-2 bg-green-500/80 px-2 py-0.5 rounded text-[10px] text-white flex items-center gap-1"><Globe size={10} />Public</div>}
                  </div>
                  <div className="p-3 md:p-4">
                    <div className="flex justify-between items-start">
                      <div className="min-w-0 flex-1">
                        <h3 className="text-white font-semibold truncate">{s.train_number}</h3>
                        <p className="text-orange-500 text-sm">{s.train_type}</p>
                        {s.traction_type && <p className="text-gray-500 text-xs flex items-center gap-1 mt-1"><Zap size={12} />{s.traction_type}</p>}
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={(e) => handleToggleVisibility(e, s.sighting_id, s.is_public)}
                          className={`p-1 rounded transition-colors ${s.is_public ? 'text-green-400 hover:text-green-300' : 'text-gray-600 hover:text-gray-400'}`}
                          title={s.is_public ? 'Make private' : 'Make public'}
                          data-testid={`toggle-visibility-${s.sighting_id}`}
                        >
                          {s.is_public ? <Globe size={15} /> : <Lock size={15} />}
                        </button>
                        {s.is_public && s.share_id && (
                          <button
                            onClick={(e) => handleCopyLink(e, s.share_id)}
                            className="p-1 text-gray-500 hover:text-orange-400 transition-colors"
                            title="Copy share link"
                            data-testid={`copy-link-${s.sighting_id}`}
                          >
                            {copiedId === s.share_id ? <Check size={15} className="text-green-400" /> : <Link2 size={15} />}
                          </button>
                        )}
                        <button onClick={(e) => openEdit(e, s)} className="text-gray-500 hover:text-orange-400 p-1" title="Edit" data-testid={`edit-btn-${s.sighting_id}`}><Pencil size={15} /></button>
                        <button onClick={(e) => { e.stopPropagation(); setDeleteId(s.sighting_id); }} className="text-gray-500 hover:text-red-500 p-1"><Trash2 size={15} /></button>
                      </div>
                    </div>
                    <p className="text-gray-400 text-xs md:text-sm mt-2 flex items-center gap-1 truncate"><MapPin size={14} className="flex-shrink-0" />{s.location}</p>
                  </div>
                </div>
              ) : (
                <div key={s.sighting_id} className="bg-[#1a1a1c] border border-gray-800 rounded-lg p-3 md:p-4 flex gap-3 md:gap-4 cursor-pointer hover:border-orange-500/30 transition-colors" onClick={() => setSelectedSighting(s)}>
                  <div className="w-20 h-20 md:w-24 md:h-24 bg-gray-800 rounded-lg overflow-hidden flex-shrink-0">
                    {photo ? <img src={photo} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><Train size={28} className="text-gray-700" /></div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                      <div className="min-w-0">
                        <h3 className="text-white font-semibold truncate">{s.train_number}</h3>
                        <p className="text-orange-500 text-sm truncate">{s.train_type} {'\u2022'} {s.operator}</p>
                        {s.traction_type && <p className="text-gray-500 text-xs flex items-center gap-1"><Zap size={12} />{s.traction_type}</p>}
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={(e) => handleToggleVisibility(e, s.sighting_id, s.is_public)}
                          className={`p-1 rounded transition-colors ${s.is_public ? 'text-green-400 hover:text-green-300' : 'text-gray-600 hover:text-gray-400'}`}
                          title={s.is_public ? 'Make private' : 'Make public'}
                        >
                          {s.is_public ? <Globe size={15} /> : <Lock size={15} />}
                        </button>
                        {s.is_public && s.share_id && (
                          <button
                            onClick={(e) => handleCopyLink(e, s.share_id)}
                            className="p-1 text-gray-500 hover:text-orange-400 transition-colors"
                            title="Copy share link"
                          >
                            {copiedId === s.share_id ? <Check size={15} className="text-green-400" /> : <Link2 size={15} />}
                          </button>
                        )}
                        <button onClick={(e) => openEdit(e, s)} className="text-gray-500 hover:text-orange-400 p-1" title="Edit"><Pencil size={15} /></button>
                        <button onClick={(e) => { e.stopPropagation(); setDeleteId(s.sighting_id); }} className="text-gray-500 hover:text-red-500 p-1"><Trash2 size={15} /></button>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 md:gap-4 mt-2 text-xs md:text-sm text-gray-400">
                      <span className="flex items-center gap-1 truncate"><MapPin size={14} className="flex-shrink-0" /><span className="truncate">{s.location}</span></span>
                      <span className="flex items-center gap-1"><Clock size={14} />{s.sighting_time}</span>
                      {s.is_public && <span className="flex items-center gap-1 text-green-400"><Globe size={12} />Public</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Delete Dialog */}
      <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="bg-[#1a1a1c] border-gray-800 mx-4">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Delete?</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel className="border-gray-700 text-gray-300 w-full sm:w-auto">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-500 text-white w-full sm:w-auto">{deleting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Detail Dialog */}
      <Dialog open={selectedSighting !== null} onOpenChange={() => setSelectedSighting(null)}>
        <DialogContent className="bg-[#1a1a1c] border-gray-800 max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
          {selectedSighting && (
            <>
              <DialogHeader>
                <DialogTitle className="text-white flex items-center gap-2">
                  <Train size={20} className="text-orange-500" />
                  {selectedSighting.train_number}
                </DialogTitle>
              </DialogHeader>
              
              {selectedSighting.photos && selectedSighting.photos.length > 0 && (
                <div className="mb-4">
                  <img src={getPhotoUrl(selectedSighting.photos[0])} alt="" className="w-full aspect-video object-cover rounded-lg" />
                  {selectedSighting.photos.length > 1 && (
                    <div className="grid grid-cols-4 gap-2 mt-2">
                      {selectedSighting.photos.slice(1).map((p, i) => (
                        <img key={i} src={getPhotoUrl(p)} alt="" className="w-full aspect-square object-cover rounded" />
                      ))}
                    </div>
                  )}
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-3 md:gap-4">
                <div>
                  <p className="text-gray-500 text-xs md:text-sm">Type</p>
                  <p className="text-white text-sm md:text-base">{selectedSighting.train_type}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs md:text-sm">Operator</p>
                  <p className="text-white text-sm md:text-base">{selectedSighting.operator}</p>
                </div>
                {selectedSighting.traction_type && (
                  <div>
                    <p className="text-gray-500 text-xs md:text-sm flex items-center gap-1"><Zap size={12} />Traction</p>
                    <p className="text-white text-sm md:text-base">{selectedSighting.traction_type}</p>
                  </div>
                )}
                <div className="col-span-2">
                  <p className="text-gray-500 text-xs md:text-sm">Location</p>
                  <p className="text-white text-sm md:text-base">{selectedSighting.location}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs md:text-sm">Date</p>
                  <p className="text-white text-sm md:text-base">{formatDate(selectedSighting.sighting_date)}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs md:text-sm">Time</p>
                  <p className="text-white text-sm md:text-base">{selectedSighting.sighting_time}</p>
                </div>
                {selectedSighting.notes && (
                  <div className="col-span-2">
                    <p className="text-gray-500 text-xs md:text-sm">Notes</p>
                    <p className="text-white text-sm md:text-base">{selectedSighting.notes}</p>
                  </div>
                )}
              </div>

              {/* Sharing controls */}
              <div className="mt-4 pt-4 border-t border-gray-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {selectedSighting.is_public ? (
                      <Globe size={16} className="text-green-400" />
                    ) : (
                      <Lock size={16} className="text-gray-500" />
                    )}
                    <span className="text-sm text-gray-300">
                      {selectedSighting.is_public ? 'Public — anyone with the link can view' : 'Private — only you can see this'}
                    </span>
                  </div>
                  <button
                    onClick={(e) => {
                      handleToggleVisibility(e, selectedSighting.sighting_id, selectedSighting.is_public);
                      setSelectedSighting(prev => prev ? { ...prev, is_public: !prev.is_public } : null);
                    }}
                    className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                      selectedSighting.is_public
                        ? 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                        : 'bg-green-600/20 text-green-400 hover:bg-green-600/30'
                    }`}
                    data-testid="dialog-toggle-visibility"
                  >
                    {selectedSighting.is_public ? 'Make Private' : 'Make Public'}
                  </button>
                </div>
                {selectedSighting.is_public && selectedSighting.share_id && (
                  <button
                    onClick={(e) => handleCopyLink(e, selectedSighting.share_id)}
                    className="mt-3 w-full flex items-center justify-center gap-2 bg-[#0f0f10] border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-gray-300 hover:border-orange-500/50 transition-colors"
                    data-testid="dialog-copy-link"
                  >
                    {copiedId === selectedSighting.share_id ? (
                      <><Check size={16} className="text-green-400" /> Link Copied!</>
                    ) : (
                      <><Link2 size={16} /> Copy Share Link</>
                    )}
                  </button>
                )}
                <button
                  onClick={(e) => { openEdit(e, selectedSighting); setSelectedSighting(null); }}
                  className="mt-3 w-full flex items-center justify-center gap-2 bg-orange-500/10 border border-orange-500/30 rounded-lg px-4 py-2.5 text-sm text-orange-400 hover:bg-orange-500/20 transition-colors"
                  data-testid="dialog-edit-btn"
                >
                  <Pencil size={16} /> Edit Sighting
                </button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editSighting !== null} onOpenChange={() => setEditSighting(null)}>
        <DialogContent className="bg-[#1a1a1c] border-gray-800 max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
          {editSighting && (
            <>
              <DialogHeader>
                <DialogTitle className="text-white flex items-center gap-2">
                  <Pencil size={18} className="text-orange-500" />
                  Edit Sighting
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4 mt-2">
                <div>
                  <Label className="text-gray-300 text-sm">Train Number</Label>
                  <Input value={editForm.train_number} onChange={(e) => handleEditChange('train_number', e.target.value)} className="bg-[#0f0f10] border-gray-700 text-white mt-1" data-testid="edit-train-number" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-gray-300 text-sm">Train Type</Label>
                    <Select value={editForm.train_type} onValueChange={(v) => handleEditChange('train_type', v)}>
                      <SelectTrigger className="bg-[#0f0f10] border-gray-700 text-white mt-1" data-testid="edit-train-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1a1a1c] border-gray-700">
                        {['Passenger','Freight','High-Speed','Commuter','Metro/Subway','Light Rail','Heritage/Steam','Other'].map(t => (
                          <SelectItem key={t} value={t} className="text-white hover:bg-gray-800">{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-gray-300 text-sm">Traction Type</Label>
                    <Select value={editForm.traction_type} onValueChange={(v) => handleEditChange('traction_type', v)}>
                      <SelectTrigger className="bg-[#0f0f10] border-gray-700 text-white mt-1" data-testid="edit-traction-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1a1a1c] border-gray-700">
                        {['Electric','Diesel','Steam','Diesel-Electric','Hybrid','Battery','Hydrogen','Other'].map(t => (
                          <SelectItem key={t} value={t} className="text-white hover:bg-gray-800">{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label className="text-gray-300 text-sm">Operator</Label>
                  <Input value={editForm.operator} onChange={(e) => handleEditChange('operator', e.target.value)} className="bg-[#0f0f10] border-gray-700 text-white mt-1" data-testid="edit-operator" />
                </div>

                <div>
                  <Label className="text-gray-300 text-sm">Route</Label>
                  <Input value={editForm.route} onChange={(e) => handleEditChange('route', e.target.value)} className="bg-[#0f0f10] border-gray-700 text-white mt-1" data-testid="edit-route" />
                </div>

                <div>
                  <Label className="text-gray-300 text-sm">Location</Label>
                  <Input value={editForm.location} onChange={(e) => handleEditChange('location', e.target.value)} className="bg-[#0f0f10] border-gray-700 text-white mt-1" data-testid="edit-location" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-gray-300 text-sm">Date</Label>
                    <Input type="date" value={editForm.sighting_date} onChange={(e) => handleEditChange('sighting_date', e.target.value)} className="bg-[#0f0f10] border-gray-700 text-white mt-1" data-testid="edit-date" />
                  </div>
                  <div>
                    <Label className="text-gray-300 text-sm">Time</Label>
                    <Input type="time" value={editForm.sighting_time} onChange={(e) => handleEditChange('sighting_time', e.target.value)} className="bg-[#0f0f10] border-gray-700 text-white mt-1" data-testid="edit-time" />
                  </div>
                </div>

                <div>
                  <Label className="text-gray-300 text-sm">Notes</Label>
                  <Textarea value={editForm.notes} onChange={(e) => handleEditChange('notes', e.target.value)} className="bg-[#0f0f10] border-gray-700 text-white mt-1 min-h-[80px]" data-testid="edit-notes" />
                </div>

                {/* Photos */}
                <div>
                  <Label className="text-gray-300 text-sm mb-2 block">Photos</Label>
                  <div className="flex flex-wrap gap-2">
                    {editPhotos.map((photo, idx) => (
                      <div key={`existing-${idx}`} className="relative w-20 h-20 rounded-lg overflow-hidden border border-gray-700 group/photo">
                        <img src={photo} alt="" className="w-full h-full object-cover" />
                        <button
                          onClick={() => handleRemoveExistingPhoto(idx)}
                          type="button"
                          className="absolute inset-0 bg-black/60 opacity-0 group-hover/photo:opacity-100 transition-opacity flex items-center justify-center"
                          data-testid={`remove-photo-${idx}`}
                        >
                          <Trash2 size={16} className="text-red-400" />
                        </button>
                      </div>
                    ))}
                    {newPhotos.map((photo, idx) => (
                      <div key={`new-${idx}`} className="relative w-20 h-20 rounded-lg overflow-hidden border border-orange-500/50 group/photo">
                        <img src={photo.base64} alt="" className="w-full h-full object-cover" />
                        <button
                          onClick={() => handleRemoveNewPhoto(idx)}
                          type="button"
                          className="absolute inset-0 bg-black/60 opacity-0 group-hover/photo:opacity-100 transition-opacity flex items-center justify-center"
                        >
                          <Trash2 size={16} className="text-red-400" />
                        </button>
                        <span className="absolute bottom-0 left-0 right-0 bg-orange-500/80 text-[9px] text-white text-center py-0.5">New</span>
                      </div>
                    ))}
                    <label className="w-20 h-20 rounded-lg border-2 border-dashed border-gray-700 hover:border-orange-500/50 flex flex-col items-center justify-center cursor-pointer transition-colors" data-testid="edit-add-photo">
                      <Camera size={18} className="text-gray-500" />
                      <span className="text-gray-500 text-[10px] mt-1">Add</span>
                      <input type="file" accept="image/*" multiple onChange={handleAddPhotos} className="hidden" />
                    </label>
                  </div>
                  <p className="text-gray-500 text-[11px] mt-1.5">{editPhotos.length + newPhotos.length} photo{editPhotos.length + newPhotos.length !== 1 ? 's' : ''} — hover to remove</p>
                </div>

                {editError && <p className="text-red-400 text-sm">{editError}</p>}

                <div className="flex gap-3 pt-2">
                  <Button variant="outline" onClick={() => setEditSighting(null)} className="flex-1 border-gray-700 text-gray-300 hover:bg-gray-800">
                    Cancel
                  </Button>
                  <Button onClick={handleEditSave} disabled={saving} className="flex-1 bg-[#e34c26] hover:bg-[#d14020] text-white" data-testid="edit-save-btn">
                    {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                    Save Changes
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MySightings;
