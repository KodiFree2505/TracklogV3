import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import safeFetch from '../lib/safeFetch';
import {
  LayoutGrid, Loader2, Train, MapPin, User, Calendar, Zap,
  LogOut, Menu, Heart, Bookmark, BookmarkX
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '../components/ui/sheet';
import NotificationBell from '../components/NotificationBell';

const API = '/api';

function getPhotoUrl(photo) {
  if (!photo) return null;
  if (photo.startsWith('/api')) return photo;
  return photo;
}

function BookmarkCard({ sighting, onRemove }) {
  const photo = sighting.photos?.[0] ? getPhotoUrl(sighting.photos[0]) : null;

  return (
    <div
      className="bg-[#1a1a1c] border border-gray-800 rounded-lg overflow-hidden hover:border-orange-500/40 transition-all duration-300 group"
      data-testid={`bookmark-card-${sighting.sighting_id}`}
    >
      <Link to={`/share/sighting/${sighting.share_id}`}>
        <div className="aspect-[4/3] bg-gray-900 relative overflow-hidden">
          {photo ? (
            <img src={photo} alt={sighting.train_number} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Train size={44} className="text-gray-700" />
            </div>
          )}
        </div>
      </Link>

      <div className="p-4">
        <div className="flex items-center gap-2 mb-3">
          {sighting.owner_picture ? (
            <img src={sighting.owner_picture.startsWith('/api') ? sighting.owner_picture : sighting.owner_picture} alt="" className="w-6 h-6 rounded-full object-cover" />
          ) : (
            <div className="w-6 h-6 rounded-full bg-orange-600 flex items-center justify-center">
              <User size={12} className="text-white" />
            </div>
          )}
          <span className="text-gray-400 text-xs truncate">{sighting.owner_name}</span>
        </div>

        <Link to={`/share/sighting/${sighting.share_id}`}>
          <h3 className="text-white font-semibold text-base truncate hover:text-orange-400 transition-colors">{sighting.train_number}</h3>
        </Link>
        <p className="text-orange-500 text-sm">{sighting.train_type}</p>

        {sighting.traction_type && (
          <p className="text-gray-500 text-xs flex items-center gap-1 mt-1">
            <Zap size={11} /> {sighting.traction_type}
          </p>
        )}

        <div className="flex items-center justify-between mt-3 text-gray-500 text-xs">
          <span className="flex items-center gap-1 truncate max-w-[55%]">
            <MapPin size={12} className="flex-shrink-0" /> {sighting.location}
          </span>
          <span className="flex items-center gap-1">
            <Calendar size={12} /> {sighting.sighting_date}
          </span>
        </div>

        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-800/60">
          <span className="flex items-center gap-1.5 text-gray-500 text-xs">
            <Heart size={14} /> {sighting.like_count || 0}
          </span>
          <button
            onClick={() => onRemove(sighting.sighting_id)}
            className="flex items-center gap-1 text-orange-500 hover:text-red-400 transition-colors text-xs"
            data-testid={`remove-bookmark-${sighting.sighting_id}`}
          >
            <BookmarkX size={14} /> Remove
          </button>
        </div>
      </div>
    </div>
  );
}

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
        <Link to="/feed" className="text-gray-300 hover:text-white py-2">Feed</Link>
        <Link to="/bookmarks" className="text-white font-medium py-2">Bookmarks</Link>
        <Link to="/profile" className="text-gray-300 hover:text-white py-2">Profile</Link>
        <button onClick={onLogout} className="text-red-400 hover:text-red-300 py-2 text-left mt-4">
          <LogOut size={18} className="inline mr-2" /> Logout
        </button>
      </div>
    </SheetContent>
  </Sheet>
);

export default function BookmarksPage() {
  const { user, logout, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [sightings, setSightings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) navigate('/auth');
  }, [authLoading, user, navigate]);

  const fetchBookmarks = async () => {
    setLoading(true);
    try {
      const res = await safeFetch(`${API}/sightings/bookmarks/me`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setSightings(data.sightings || []);
    } catch { setSightings([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { if (user) fetchBookmarks(); }, [user]);

  const handleRemoveBookmark = async (sightingId) => {
    const res = await safeFetch(`${API}/sightings/${sightingId}/bookmark`, { method: 'POST', credentials: 'include' });
    if (!res.ok) return;
    setSightings(prev => prev.filter(s => s.sighting_id !== sightingId));
  };

  const handleLogout = async () => { await logout(); navigate('/'); };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-[#0f0f10] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#e34c26] animate-spin" />
      </div>
    );
  }

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
          <Link to="/log-sighting" className="text-gray-600 text-sm hover:text-gray-900">Log Sighting</Link>
          <Link to="/feed" className="text-gray-600 text-sm hover:text-gray-900">Feed</Link>
          <Link to="/bookmarks" className="text-gray-800 font-medium text-sm">Bookmarks</Link>
        </nav>
        <div className="flex items-center gap-2 md:gap-4">
          <div className="hidden md:block">
            <NotificationBell />
          </div>
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

      <main className="max-w-6xl mx-auto px-4 md:px-6 py-8 md:py-12">
        <div className="mb-8">
          <h1 className="text-white text-2xl md:text-3xl font-bold mb-1 flex items-center gap-3">
            <Bookmark size={28} className="text-orange-500" /> Bookmarks
          </h1>
          <p className="text-gray-400 text-sm">
            {sightings.length > 0 ? `${sightings.length} saved sighting${sightings.length !== 1 ? 's' : ''}` : 'Your saved sightings will appear here'}
          </p>
        </div>

        {loading && (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 text-[#e34c26] animate-spin" />
          </div>
        )}

        {!loading && sightings.length === 0 && (
          <div className="text-center py-20" data-testid="bookmarks-empty">
            <Bookmark size={48} className="text-gray-700 mx-auto mb-4" />
            <h2 className="text-white text-lg font-semibold mb-2">No bookmarks yet</h2>
            <p className="text-gray-400 text-sm max-w-md mx-auto">
              Browse the community feed and bookmark sightings you want to revisit later.
            </p>
            <Link to="/feed" className="inline-block mt-6 bg-[#e34c26] hover:bg-[#d14020] text-white font-semibold text-sm px-6 py-2.5 rounded-lg transition-colors">
              Browse Feed
            </Link>
          </div>
        )}

        {!loading && sightings.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6" data-testid="bookmarks-grid">
            {sightings.map((s) => (
              <BookmarkCard key={s.sighting_id} sighting={s} onRemove={handleRemoveBookmark} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
