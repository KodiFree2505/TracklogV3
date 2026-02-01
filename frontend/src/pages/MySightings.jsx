import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutGrid, LogOut, User, Loader2, Camera, Plus, Trash2, Train,
  MapPin, Calendar, Clock, Search, Grid, List
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function formatDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function getPhotoUrl(photos) {
  if (!photos || photos.length === 0) return null;
  const photo = photos[0];
  if (photo.startsWith('/api')) {
    return `${BACKEND_URL}${photo}`;
  }
  return photo;
}

const MySightings = () => {
  const { user, logout, loading, checkAuth } = useAuth();
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(null);
  const [sightings, setSightings] = useState([]);
  const [sightingsLoading, setSightingsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const [deleteId, setDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [selectedSighting, setSelectedSighting] = useState(null);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (!loading) {
      if (user) {
        setCurrentUser(user);
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
        navigate('/auth');
      }
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!isAuthenticated) return;
    
    async function fetchSightings() {
      try {
        const response = await fetch(`${API}/sightings`, { credentials: 'include' });
        if (response.ok) {
          const data = await response.json();
          setSightings(data);
        }
      } catch (error) {
        console.error('Failed to fetch sightings:', error);
      } finally {
        setSightingsLoading(false);
      }
    }
    
    fetchSightings();
  }, [isAuthenticated]);

  async function handleLogout() {
    await logout();
    navigate('/');
  }

  async function handleDelete() {
    if (!deleteId) return;
    setDeleting(true);
    try {
      const response = await fetch(`${API}/sightings/${deleteId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (response.ok) {
        setSightings(sightings.filter(s => s.sighting_id !== deleteId));
      }
    } catch (error) {
      console.error('Failed to delete:', error);
    } finally {
      setDeleting(false);
      setDeleteId(null);
    }
  }

  function filterSightings() {
    if (!searchTerm) return sightings;
    const term = searchTerm.toLowerCase();
    return sightings.filter(s =>
      s.train_number.toLowerCase().includes(term) ||
      s.operator.toLowerCase().includes(term) ||
      s.location.toLowerCase().includes(term) ||
      s.train_type.toLowerCase().includes(term)
    );
  }

  if (isAuthenticated === null || loading) {
    return (
      <div className="min-h-screen bg-[#0f0f10] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#e34c26] animate-spin" />
      </div>
    );
  }

  const filteredSightings = filterSightings();

  return (
    <div className="min-h-screen bg-[#0f0f10]">
      <header className="bg-[#FFE500] h-[52px] flex items-center justify-between px-6 md:px-12">
        <Link to="/" className="flex items-center gap-2">
          <div className="text-[#e34c26]"><LayoutGrid size={22} strokeWidth={2.5} /></div>
          <span className="text-[#e34c26] font-bold text-lg tracking-wider uppercase">TrackLog</span>
        </Link>
        <nav className="flex items-center gap-6">
          <Link to="/dashboard" className="text-gray-600 text-sm hover:text-gray-900">Dashboard</Link>
          <Link to="/sightings" className="text-gray-800 font-medium text-sm hover:text-gray-900">My Sightings</Link>
          <Link to="/log-sighting" className="text-gray-600 text-sm hover:text-gray-900">Log Sighting</Link>
        </nav>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            {currentUser?.picture ? (
              <img src={currentUser.picture} alt="" className="w-8 h-8 rounded-full" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-[#e34c26] flex items-center justify-center text-white"><User size={16} /></div>
            )}
            <span className="text-gray-800 font-medium text-sm hidden md:block">{currentUser?.name}</span>
          </div>
          <Button onClick={handleLogout} variant="outline" size="sm" className="border-gray-800 text-gray-800 hover:bg-gray-800 hover:text-white">
            <LogOut size={16} className="mr-1" /> Logout
          </Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-12">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-white text-3xl font-bold mb-2">My Sightings</h1>
            <p className="text-gray-400">{sightings.length} trains spotted</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <Input
                placeholder="Search sightings..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-[#1a1a1c] border-gray-700 text-white w-64"
              />
            </div>
            <div className="flex border border-gray-700 rounded-lg overflow-hidden">
              <button
                onClick={() => setViewMode('grid')}
                className={viewMode === 'grid' ? 'p-2 bg-orange-500 text-white' : 'p-2 bg-[#1a1a1c] text-gray-400 hover:text-white'}
              >
                <Grid size={18} />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={viewMode === 'list' ? 'p-2 bg-orange-500 text-white' : 'p-2 bg-[#1a1a1c] text-gray-400 hover:text-white'}
              >
                <List size={18} />
              </button>
            </div>
            <Link to="/log-sighting">
              <Button className="bg-[#e34c26] hover:bg-[#d14020] text-white font-semibold">
                <Plus size={18} className="mr-2" /> Log Sighting
              </Button>
            </Link>
          </div>
        </div>

        {sightingsLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 text-[#e34c26] animate-spin" />
          </div>
        ) : filteredSightings.length === 0 ? (
          <div className="bg-[#1a1a1c] border border-gray-800 rounded-lg p-12 text-center">
            <Camera size={48} className="text-orange-500 mx-auto mb-4" />
            <h2 className="text-white text-xl font-semibold mb-2">
              {searchTerm ? 'No matching sightings' : 'No sightings yet'}
            </h2>
            <p className="text-gray-400 mb-6">
              {searchTerm ? 'Try a different search term' : 'Start building your collection by logging your first train sighting.'}
            </p>
            {!searchTerm && (
              <Link to="/log-sighting">
                <Button className="bg-[#e34c26] hover:bg-[#d14020] text-white font-semibold px-8 py-6">
                  Add New Sighting
                </Button>
              </Link>
            )}
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSightings.map((sighting) => {
              const photoUrl = getPhotoUrl(sighting.photos);
              const photoCount = sighting.photos ? sighting.photos.length : 0;
              return (
                <div
                  key={sighting.sighting_id}
                  className="bg-[#1a1a1c] border border-gray-800 rounded-lg overflow-hidden hover:border-orange-500/30 transition-colors group cursor-pointer"
                  onClick={() => setSelectedSighting(sighting)}
                >
                  <div className="aspect-video bg-gray-800 relative overflow-hidden">
                    {photoUrl ? (
                      <img src={photoUrl} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Train size={48} className="text-gray-700" />
                      </div>
                    )}
                    {photoCount > 1 && (
                      <div className="absolute bottom-2 right-2 bg-black/70 px-2 py-1 rounded text-xs text-white">
                        +{photoCount - 1} more
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="text-white font-semibold text-lg">{sighting.train_number}</h3>
                        <p className="text-orange-500 text-sm">{sighting.train_type}</p>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); setDeleteId(sighting.sighting_id); }}
                        className="text-gray-500 hover:text-red-500 transition-colors p-1"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <div className="space-y-1 text-sm text-gray-400">
                      <p className="flex items-center gap-2"><MapPin size={14} /> {sighting.location}</p>
                      <p className="flex items-center gap-2"><Calendar size={14} /> {formatDate(sighting.sighting_date)}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredSightings.map((sighting) => {
              const photoUrl = getPhotoUrl(sighting.photos);
              return (
                <div
                  key={sighting.sighting_id}
                  className="bg-[#1a1a1c] border border-gray-800 rounded-lg p-4 flex gap-4 hover:border-orange-500/30 transition-colors cursor-pointer"
                  onClick={() => setSelectedSighting(sighting)}
                >
                  <div className="w-24 h-24 rounded-lg bg-gray-800 flex-shrink-0 overflow-hidden">
                    {photoUrl ? (
                      <img src={photoUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Train size={32} className="text-gray-700" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-white font-semibold">{sighting.train_number}</h3>
                        <p className="text-orange-500 text-sm">{sighting.train_type} • {sighting.operator}</p>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); setDeleteId(sighting.sighting_id); }}
                        className="text-gray-500 hover:text-red-500 transition-colors p-1"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-400">
                      <span className="flex items-center gap-1"><MapPin size={14} /> {sighting.location}</span>
                      <span className="flex items-center gap-1"><Calendar size={14} /> {formatDate(sighting.sighting_date)}</span>
                      <span className="flex items-center gap-1"><Clock size={14} /> {sighting.sighting_time}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="bg-[#1a1a1c] border-gray-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Delete Sighting?</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-transparent border-gray-700 text-gray-300 hover:bg-gray-800">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-red-500 hover:bg-red-600 text-white">
              {deleting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={selectedSighting !== null} onOpenChange={() => setSelectedSighting(null)}>
        <DialogContent className="bg-[#1a1a1c] border-gray-800 max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedSighting && (
            <>
              <DialogHeader>
                <DialogTitle className="text-white text-xl flex items-center gap-2">
                  <Train size={20} className="text-orange-500" />
                  {selectedSighting.train_number}
                </DialogTitle>
              </DialogHeader>

              {selectedSighting.photos && selectedSighting.photos.length > 0 && (
                <div className="grid grid-cols-2 gap-2 mb-4">
                  {selectedSighting.photos.map((photo, i) => {
                    const url = photo.startsWith('/api') ? `${BACKEND_URL}${photo}` : photo;
                    return <img key={i} src={url} alt="" className="w-full aspect-video object-cover rounded-lg" />;
                  })}
                </div>
              )}

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-gray-500 text-sm">Train Type</p>
                    <p className="text-white">{selectedSighting.train_type}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-sm">Operator</p>
                    <p className="text-white">{selectedSighting.operator}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-gray-500 text-sm">Location</p>
                    <p className="text-white">{selectedSighting.location}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-sm">Date</p>
                    <p className="text-white">{formatDate(selectedSighting.sighting_date)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-sm">Time</p>
                    <p className="text-white">{selectedSighting.sighting_time}</p>
                  </div>
                </div>
                {selectedSighting.notes && (
                  <div>
                    <p className="text-gray-500 text-sm">Notes</p>
                    <p className="text-white">{selectedSighting.notes}</p>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MySightings;
