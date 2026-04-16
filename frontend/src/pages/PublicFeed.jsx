import React, { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import safeFetch from '../lib/safeFetch';
import {
  LayoutGrid, Search, Loader2, ChevronLeft, ChevronRight, Train, MapPin,
  User, Calendar, Zap, LogOut, Menu, Plus, Heart, Bookmark
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '../components/ui/sheet';

const API = '/api';

function getPhotoUrl(photo) {
  if (!photo) return null;
  if (photo.startsWith('/api')) return photo;
  return photo;
}

function FeedCard({ sighting, liked, bookmarked, onLike, onBookmark }) {
  const photo = sighting.photos?.[0] ? getPhotoUrl(sighting.photos[0]) : null;
  const photoCount = sighting.photos?.length || 0;

  return (
    <div
      className="bg-[#1a1a1c] border border-gray-800 rounded-lg overflow-hidden hover:border-orange-500/40 transition-all duration-300 group"
      data-testid={`feed-card-${sighting.sighting_id}`}
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
          {photoCount > 1 && (
            <span className="absolute bottom-2 right-2 bg-black/70 text-white text-[10px] px-2 py-0.5 rounded-full">+{photoCount - 1}</span>
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

        {/* Like & Bookmark bar */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-800/60">
          <button
            onClick={() => onLike(sighting.sighting_id)}
            className="flex items-center gap-1.5 transition-colors group/like"
            data-testid={`like-btn-${sighting.sighting_id}`}
          >
            <Heart
              size={16}
              className={liked ? 'text-red-500 fill-red-500' : 'text-gray-500 group-hover/like:text-red-400'}
            />
            <span className={`text-xs ${liked ? 'text-red-400' : 'text-gray-500'}`}>
              {sighting.like_count || 0}
            </span>
          </button>
          <button
            onClick={() => onBookmark(sighting.sighting_id)}
            className="transition-colors group/bm"
            data-testid={`bookmark-btn-${sighting.sighting_id}`}
          >
            <Bookmark
              size={16}
              className={bookmarked ? 'text-orange-500 fill-orange-500' : 'text-gray-500 group-hover/bm:text-orange-400'}
            />
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
        <Link to="/feed" className="text-white font-medium py-2">Feed</Link>
        <Link to="/bookmarks" className="text-gray-300 hover:text-white py-2">Bookmarks</Link>
        <Link to="/profile" className="text-gray-300 hover:text-white py-2">Profile</Link>
        <button onClick={onLogout} className="text-red-400 hover:text-red-300 py-2 text-left mt-4">
          <LogOut size={18} className="inline mr-2" /> Logout
        </button>
      </div>
    </SheetContent>
  </Sheet>
);

export default function PublicFeed() {
  const { user, logout, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [sightings, setSightings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [likedIds, setLikedIds] = useState(new Set());
  const [bookmarkedIds, setBookmarkedIds] = useState(new Set());

  useEffect(() => {
    if (!authLoading && !user) navigate('/auth');
  }, [authLoading, user, navigate]);

  // Fetch interactions
  useEffect(() => {
    if (!user) return;
    safeFetch(`${API}/sightings/interactions/me`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) {
          setLikedIds(new Set(data.liked_ids || []));
          setBookmarkedIds(new Set(data.bookmarked_ids || []));
        }
      })
      .catch(() => {});
  }, [user]);

  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const fetchFeed = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (debouncedSearch) params.set('search', debouncedSearch);
      const res = await safeFetch(`${API}/public/feed?${params}`);
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setSightings(data.sightings || []);
      setTotalPages(data.pages || 1);
      setTotal(data.total || 0);
    } catch { setSightings([]); }
    finally { setLoading(false); }
  }, [page, debouncedSearch]);

  useEffect(() => { if (user) fetchFeed(); }, [fetchFeed, user]);

  const handleLike = async (sightingId) => {
    const res = await safeFetch(`${API}/sightings/${sightingId}/like`, { method: 'POST', credentials: 'include' });
    if (!res.ok) return;
    const data = await res.json();
    setLikedIds(prev => {
      const next = new Set(prev);
      data.liked ? next.add(sightingId) : next.delete(sightingId);
      return next;
    });
    setSightings(prev => prev.map(s => s.sighting_id === sightingId ? { ...s, like_count: data.like_count } : s));
  };

  const handleBookmark = async (sightingId) => {
    const res = await safeFetch(`${API}/sightings/${sightingId}/bookmark`, { method: 'POST', credentials: 'include' });
    if (!res.ok) return;
    const data = await res.json();
    setBookmarkedIds(prev => {
      const next = new Set(prev);
      data.bookmarked ? next.add(sightingId) : next.delete(sightingId);
      return next;
    });
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
          <Link to="/feed" className="text-gray-800 font-medium text-sm">Feed</Link>
          <Link to="/bookmarks" className="text-gray-600 text-sm hover:text-gray-900">Bookmarks</Link>
        </nav>
        <div className="flex items-center gap-2 md:gap-4">
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
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <h1 className="text-white text-2xl md:text-3xl font-bold mb-1">Community Feed</h1>
            <p className="text-gray-400 text-sm">
              {total > 0 ? `${total} sighting${total !== 1 ? 's' : ''} shared by the community` : 'Explore train sightings shared by spotters'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative w-full sm:w-72">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                placeholder="Search trains, operators, locations..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-[#1a1a1c] border border-gray-800 rounded-lg pl-9 pr-4 py-2.5 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-orange-500/50 transition-colors"
                data-testid="feed-search-input"
              />
            </div>
            <Link to="/log-sighting" className="hidden sm:block">
              <Button className="bg-[#e34c26] hover:bg-[#d14020] text-white font-semibold">
                <Plus size={18} className="mr-2" /> Log Sighting
              </Button>
            </Link>
          </div>
        </div>

        {loading && (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 text-[#e34c26] animate-spin" />
          </div>
        )}

        {!loading && sightings.length === 0 && (
          <div className="text-center py-20" data-testid="feed-empty">
            <Train size={48} className="text-gray-700 mx-auto mb-4" />
            <h2 className="text-white text-lg font-semibold mb-2">
              {debouncedSearch ? 'No results found' : 'No public sightings yet'}
            </h2>
            <p className="text-gray-400 text-sm max-w-md mx-auto">
              {debouncedSearch ? 'Try a different search term.' : 'Be the first to share a sighting with the community!'}
            </p>
            {!debouncedSearch && (
              <Link to="/log-sighting" className="inline-block mt-6 bg-[#e34c26] hover:bg-[#d14020] text-white font-semibold text-sm px-6 py-2.5 rounded-lg transition-colors">
                Log a Sighting
              </Link>
            )}
          </div>
        )}

        {!loading && sightings.length > 0 && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6" data-testid="feed-grid">
              {sightings.map((s) => (
                <FeedCard
                  key={s.sighting_id}
                  sighting={s}
                  liked={likedIds.has(s.sighting_id)}
                  bookmarked={bookmarkedIds.has(s.sighting_id)}
                  onLike={handleLike}
                  onBookmark={handleBookmark}
                />
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-4 mt-10">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="flex items-center gap-1 text-sm text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors" data-testid="feed-prev-page">
                  <ChevronLeft size={18} /> Previous
                </button>
                <span className="text-gray-500 text-sm">Page {page} of {totalPages}</span>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="flex items-center gap-1 text-sm text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors" data-testid="feed-next-page">
                  Next <ChevronRight size={18} />
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
