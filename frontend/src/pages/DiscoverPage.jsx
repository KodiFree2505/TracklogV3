import React, { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import safeFetch from '../lib/safeFetch';
import {
  LayoutGrid, Search, Loader2, User, Users, Camera, ChevronLeft,
  ChevronRight, LogOut, Menu, UserPlus, UserCheck
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '../components/ui/sheet';
import NotificationBell from '../components/NotificationBell';

const API = '/api';

function UserCard({ u, isFollowing, onFollow, isSelf }) {
  return (
    <div
      className="bg-[#1a1a1c] border border-gray-800 rounded-lg p-5 hover:border-orange-500/30 transition-all duration-300"
      data-testid={`user-card-${u.user_id}`}
    >
      <div className="flex items-start justify-between gap-3">
        <Link to={`/share/user/${u.user_id}`} className="flex items-center gap-3 min-w-0 flex-1">
          {u.picture ? (
            <img src={u.picture.startsWith('/api') ? u.picture : u.picture} alt="" className="w-12 h-12 rounded-full object-cover flex-shrink-0 border-2 border-gray-700" />
          ) : (
            <div className="w-12 h-12 rounded-full bg-[#e34c26] flex items-center justify-center flex-shrink-0 border-2 border-gray-700">
              <User size={22} className="text-white" />
            </div>
          )}
          <div className="min-w-0">
            <h3 className="text-white font-semibold text-sm truncate hover:text-orange-400 transition-colors">{u.name}</h3>
            <p className="text-gray-500 text-xs mt-0.5">Joined {u.created_at?.slice(0, 7) || 'N/A'}</p>
          </div>
        </Link>
        {!isSelf && (
          <button
            onClick={() => onFollow(u.user_id)}
            className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full transition-colors flex-shrink-0 ${
              isFollowing
                ? 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                : 'bg-orange-500/15 text-orange-400 hover:bg-orange-500/25'
            }`}
            data-testid={`follow-btn-${u.user_id}`}
          >
            {isFollowing ? <UserCheck size={13} /> : <UserPlus size={13} />}
            {isFollowing ? 'Following' : 'Follow'}
          </button>
        )}
      </div>

      <div className="flex items-center gap-5 mt-4 pt-3 border-t border-gray-800/60">
        <div className="text-center">
          <p className="text-white font-semibold text-sm">{u.sighting_count}</p>
          <p className="text-gray-500 text-[10px] uppercase tracking-wider">Sightings</p>
        </div>
        <div className="text-center">
          <p className="text-white font-semibold text-sm">{u.follower_count}</p>
          <p className="text-gray-500 text-[10px] uppercase tracking-wider">Followers</p>
        </div>
        <div className="text-center">
          <p className="text-white font-semibold text-sm">{u.following_count}</p>
          <p className="text-gray-500 text-[10px] uppercase tracking-wider">Following</p>
        </div>
      </div>
    </div>
  );
}

const MobileNav = ({ user, onLogout }) => (
  <Sheet>
    <SheetTrigger asChild>
      <button className="md:hidden p-2 text-gray-800" aria-label="Menu"><Menu size={24} /></button>
    </SheetTrigger>
    <SheetContent side="right" className="bg-[#0f0f10] border-gray-800 w-[280px]">
      <div className="flex flex-col gap-6 mt-8">
        <div className="flex items-center gap-3 pb-4 border-b border-gray-800">
          {user?.picture ? (
            <img src={user.picture} alt="" className="w-10 h-10 rounded-full object-cover" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-[#e34c26] flex items-center justify-center text-white"><User size={20} /></div>
          )}
          <span className="text-white font-medium">{user?.name}</span>
        </div>
        <Link to="/dashboard" className="text-gray-300 hover:text-white py-2">Dashboard</Link>
        <Link to="/sightings" className="text-gray-300 hover:text-white py-2">My Sightings</Link>
        <Link to="/log-sighting" className="text-gray-300 hover:text-white py-2">Log Sighting</Link>
        <Link to="/feed" className="text-gray-300 hover:text-white py-2">Feed</Link>
        <Link to="/discover" className="text-white font-medium py-2">Discover</Link>
        <Link to="/bookmarks" className="text-gray-300 hover:text-white py-2">Bookmarks</Link>
        <Link to="/profile" className="text-gray-300 hover:text-white py-2">Profile</Link>
        <button onClick={onLogout} className="text-red-400 hover:text-red-300 py-2 text-left mt-4">
          <LogOut size={18} className="inline mr-2" /> Logout
        </button>
      </div>
    </SheetContent>
  </Sheet>
);

export default function DiscoverPage() {
  const { user, logout, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [followingIds, setFollowingIds] = useState(new Set());

  useEffect(() => {
    if (!authLoading && !user) navigate('/auth');
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    safeFetch(`${API}/social/following/me`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setFollowingIds(new Set(data.following_ids || [])); })
      .catch(() => {});
  }, [user]);

  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (debouncedSearch) params.set('q', debouncedSearch);
      const res = await safeFetch(`${API}/social/users/search?${params}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setUsers(data.users || []);
      setTotalPages(data.pages || 1);
      setTotal(data.total || 0);
    } catch { setUsers([]); }
    finally { setLoading(false); }
  }, [page, debouncedSearch]);

  useEffect(() => { if (user) fetchUsers(); }, [fetchUsers, user]);

  const handleFollow = async (targetUserId) => {
    const res = await safeFetch(`${API}/social/follow/${targetUserId}`, { method: 'POST', credentials: 'include' });
    if (!res.ok) return;
    const data = await res.json();
    setFollowingIds(prev => {
      const next = new Set(prev);
      data.following ? next.add(targetUserId) : next.delete(targetUserId);
      return next;
    });
    setUsers(prev => prev.map(u =>
      u.user_id === targetUserId ? { ...u, follower_count: data.follower_count } : u
    ));
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
          <Link to="/feed" className="text-gray-600 text-sm hover:text-gray-900">Feed</Link>
          <Link to="/discover" className="text-gray-800 font-medium text-sm">Discover</Link>
          <Link to="/bookmarks" className="text-gray-600 text-sm hover:text-gray-900">Bookmarks</Link>
        </nav>
        <div className="flex items-center gap-2 md:gap-4">
          <NotificationBell />
          <Link to="/profile" className="hidden md:flex items-center gap-2 hover:opacity-80">
            {user?.picture ? (
              <img src={user.picture} alt={user.name} className="w-8 h-8 rounded-full object-cover" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-[#e34c26] flex items-center justify-center text-white"><User size={16} /></div>
            )}
            <span className="text-gray-800 font-medium text-sm">{user?.name}</span>
          </Link>
          <Button onClick={handleLogout} variant="outline" size="sm" className="hidden md:flex border-gray-800 text-gray-800 hover:bg-gray-800 hover:text-white">
            <LogOut size={16} className="mr-1" /> Logout
          </Button>
          <MobileNav user={user} onLogout={handleLogout} />
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 md:px-6 py-8 md:py-12">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <h1 className="text-white text-2xl md:text-3xl font-bold mb-1 flex items-center gap-3">
              <Users size={28} className="text-orange-500" /> Discover Spotters
            </h1>
            <p className="text-gray-400 text-sm">
              {total > 0 ? `${total} public spotter${total !== 1 ? 's' : ''}` : 'Find and follow trainspotters'}
            </p>
          </div>
          <div className="relative w-full sm:w-72">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              placeholder="Search spotters by name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#1a1a1c] border border-gray-800 rounded-lg pl-9 pr-4 py-2.5 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-orange-500/50 transition-colors"
              data-testid="discover-search-input"
            />
          </div>
        </div>

        {loading && (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 text-[#e34c26] animate-spin" />
          </div>
        )}

        {!loading && users.length === 0 && (
          <div className="text-center py-20" data-testid="discover-empty">
            <Users size={48} className="text-gray-700 mx-auto mb-4" />
            <h2 className="text-white text-lg font-semibold mb-2">
              {debouncedSearch ? 'No spotters found' : 'No public profiles yet'}
            </h2>
            <p className="text-gray-400 text-sm max-w-md mx-auto">
              {debouncedSearch ? 'Try a different name.' : 'Be the first to make your profile public!'}
            </p>
          </div>
        )}

        {!loading && users.length > 0 && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5" data-testid="discover-grid">
              {users.map((u) => (
                <UserCard
                  key={u.user_id}
                  u={u}
                  isFollowing={followingIds.has(u.user_id)}
                  onFollow={handleFollow}
                  isSelf={u.user_id === user?.user_id}
                />
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-4 mt-10">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="flex items-center gap-1 text-sm text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors" data-testid="discover-prev">
                  <ChevronLeft size={18} /> Previous
                </button>
                <span className="text-gray-500 text-sm">Page {page} of {totalPages}</span>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="flex items-center gap-1 text-sm text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors" data-testid="discover-next">
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
