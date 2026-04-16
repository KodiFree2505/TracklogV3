import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { LayoutGrid, Search, Loader2, ChevronLeft, ChevronRight, Train, MapPin, User, Calendar, Zap } from 'lucide-react';
import safeFetch from '../lib/safeFetch';

const API = '/api';

function getPhotoUrl(photo) {
  if (!photo) return null;
  if (photo.startsWith('/api')) return photo;
  return photo;
}

function FeedCard({ sighting }) {
  const photo = sighting.photos?.[0] ? getPhotoUrl(sighting.photos[0]) : null;
  const photoCount = sighting.photos?.length || 0;

  return (
    <Link
      to={`/share/sighting/${sighting.share_id}`}
      className="bg-[#1a1a1c] border border-gray-800 rounded-lg overflow-hidden hover:border-orange-500/40 transition-all duration-300 group block"
      data-testid={`feed-card-${sighting.sighting_id}`}
    >
      <div className="aspect-[4/3] bg-gray-900 relative overflow-hidden">
        {photo ? (
          <img
            src={photo}
            alt={sighting.train_number}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Train size={44} className="text-gray-700" />
          </div>
        )}
        {photoCount > 1 && (
          <span className="absolute bottom-2 right-2 bg-black/70 text-white text-[10px] px-2 py-0.5 rounded-full">
            +{photoCount - 1}
          </span>
        )}
      </div>

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

        <h3 className="text-white font-semibold text-base truncate">{sighting.train_number}</h3>
        <p className="text-orange-500 text-sm">{sighting.train_type}</p>

        {sighting.traction_type && (
          <p className="text-gray-500 text-xs flex items-center gap-1 mt-1">
            <Zap size={11} /> {sighting.traction_type}
          </p>
        )}

        <div className="flex items-center justify-between mt-3 text-gray-500 text-xs">
          <span className="flex items-center gap-1 truncate max-w-[60%]">
            <MapPin size={12} className="flex-shrink-0" /> {sighting.location}
          </span>
          <span className="flex items-center gap-1">
            <Calendar size={12} /> {sighting.sighting_date}
          </span>
        </div>
      </div>
    </Link>
  );
}

export default function PublicFeed() {
  const [sightings, setSightings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const fetchFeed = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (debouncedSearch) params.set('search', debouncedSearch);
      const res = await safeFetch(`${API}/public/feed?${params}`);
      if (!res.ok) throw new Error('Failed to load feed');
      const data = await res.json();
      setSightings(data.sightings || []);
      setTotalPages(data.pages || 1);
      setTotal(data.total || 0);
    } catch {
      setSightings([]);
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch]);

  useEffect(() => { fetchFeed(); }, [fetchFeed]);

  return (
    <div className="min-h-screen bg-[#0f0f10]">
      {/* Header */}
      <header className="bg-[#FFE500] h-[52px] flex items-center justify-between px-4 md:px-12">
        <Link to="/" className="flex items-center gap-2">
          <LayoutGrid size={22} strokeWidth={2.5} className="text-[#e34c26]" />
          <span className="text-[#e34c26] font-bold text-lg tracking-wider uppercase">TrackLog</span>
        </Link>
        <div className="flex items-center gap-3">
          <Link to="/auth" className="text-gray-800 hover:text-gray-900 text-sm font-medium">
            Sign In
          </Link>
          <Link to="/auth?signup=true" className="bg-[#e34c26] hover:bg-[#d14020] text-white font-semibold text-xs uppercase tracking-wider px-4 py-2 rounded transition-colors">
            Get Started
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 md:px-6 py-8 md:py-12">
        {/* Title & Search */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <h1 className="text-white text-2xl md:text-3xl font-bold mb-1">Public Sightings</h1>
            <p className="text-gray-400 text-sm">
              {total > 0 ? `${total} sighting${total !== 1 ? 's' : ''} shared by the community` : 'Explore train sightings shared by spotters'}
            </p>
          </div>
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
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 text-[#e34c26] animate-spin" />
          </div>
        )}

        {/* Empty */}
        {!loading && sightings.length === 0 && (
          <div className="text-center py-20" data-testid="feed-empty">
            <Train size={48} className="text-gray-700 mx-auto mb-4" />
            <h2 className="text-white text-lg font-semibold mb-2">
              {debouncedSearch ? 'No results found' : 'No public sightings yet'}
            </h2>
            <p className="text-gray-400 text-sm max-w-md mx-auto">
              {debouncedSearch
                ? 'Try a different search term.'
                : 'Be the first to share a sighting with the community!'}
            </p>
            {!debouncedSearch && (
              <Link to="/auth?signup=true" className="inline-block mt-6 bg-[#e34c26] hover:bg-[#d14020] text-white font-semibold text-sm px-6 py-2.5 rounded-lg transition-colors">
                Start Logging
              </Link>
            )}
          </div>
        )}

        {/* Grid */}
        {!loading && sightings.length > 0 && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6" data-testid="feed-grid">
              {sightings.map((s) => (
                <FeedCard key={s.sighting_id} sighting={s} />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-4 mt-10">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="flex items-center gap-1 text-sm text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  data-testid="feed-prev-page"
                >
                  <ChevronLeft size={18} /> Previous
                </button>
                <span className="text-gray-500 text-sm">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="flex items-center gap-1 text-sm text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  data-testid="feed-next-page"
                >
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
