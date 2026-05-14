import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import safeFetch from '../lib/safeFetch';
import {
  LayoutGrid, LogOut, User, Loader2, Menu, Shield, Check, X,
  Clock, AlertTriangle, ChevronDown, Train, Trash2
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '../components/ui/sheet';
import NotificationBell from '../components/NotificationBell';

const API = '/api';

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
        <Link to="/trains" className="text-gray-300 hover:text-white py-2">Train Database</Link>
        <Link to="/admin" className="text-white font-medium py-2">Admin Panel</Link>
        <button onClick={onLogout} className="text-red-400 hover:text-red-300 py-2 text-left mt-4"><LogOut size={18} className="inline mr-2" /> Logout</button>
      </div>
    </SheetContent>
  </Sheet>
);

const AdminPage = () => {
  const { user, logout, loading } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingAdmin, setCheckingAdmin] = useState(true);
  const [suggestions, setSuggestions] = useState([]);
  const [sugFilter, setSugFilter] = useState('pending');
  const [sugLoading, setSugLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState({});
  const [expandedSug, setExpandedSug] = useState(null);

  useEffect(() => { if (!loading && !user) navigate('/auth'); }, [loading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    safeFetch(`${API}/trains/admin/is-admin`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : { is_admin: false })
      .then(d => setIsAdmin(d.is_admin))
      .catch(() => setIsAdmin(false))
      .finally(() => setCheckingAdmin(false));
  }, [user]);

  useEffect(() => {
    if (!isAdmin) return;
    setSugLoading(true);
    safeFetch(`${API}/trains/admin/suggestions?status=${sugFilter}`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : { suggestions: [] })
      .then(d => setSuggestions(d.suggestions || []))
      .catch(() => {})
      .finally(() => setSugLoading(false));
  }, [isAdmin, sugFilter]);

  const handleAction = async (suggestionId, action) => {
    setActionLoading(prev => ({ ...prev, [suggestionId]: action }));
    try {
      const res = await safeFetch(`${API}/trains/admin/suggestions/${suggestionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action })
      });
      if (res.ok) {
        setSuggestions(prev => prev.filter(s => s.suggestion_id !== suggestionId));
      }
    } catch (e) {}
    setActionLoading(prev => ({ ...prev, [suggestionId]: null }));
  };

  const handleLogout = async () => { await logout(); navigate('/'); };

  if (loading || checkingAdmin) {
    return <div className="min-h-screen bg-[#0f0f10] flex items-center justify-center"><Loader2 className="w-8 h-8 text-[#e34c26] animate-spin" /></div>;
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[#0f0f10] flex items-center justify-center px-4">
        <div className="bg-[#1a1a1c] border border-red-800/30 rounded-xl p-8 text-center max-w-md">
          <AlertTriangle size={40} className="text-red-500 mx-auto mb-4" />
          <h2 className="text-white text-xl font-bold mb-2">Access Denied</h2>
          <p className="text-gray-400 text-sm mb-6">You don't have admin privileges. Contact the TrackLog team if you believe this is an error.</p>
          <Link to="/dashboard"><Button className="bg-[#e34c26] hover:bg-[#d14020] text-white">Back to Dashboard</Button></Link>
        </div>
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
          <Link to="/trains" className="text-gray-600 text-sm hover:text-gray-900">Train Database</Link>
          <Link to="/admin" className="text-gray-800 font-medium text-sm">Admin</Link>
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

      <main className="max-w-4xl mx-auto px-4 md:px-6 py-6 md:py-10">
        <div className="flex items-center gap-2 mb-1">
          <Shield size={24} className="text-[#e34c26]" />
          <h1 className="text-white text-2xl md:text-3xl font-bold">Admin Panel</h1>
        </div>
        <p className="text-gray-400 text-sm mb-8">Manage train database and review user suggestions</p>

        {/* Suggestions Section */}
        <div className="bg-[#1a1a1c] border border-gray-800 rounded-xl p-5 md:p-6 mb-6" data-testid="admin-suggestions">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-semibold text-lg flex items-center gap-2">
              <Train size={18} className="text-orange-500" /> User Suggestions
            </h2>
            <select value={sugFilter} onChange={e => setSugFilter(e.target.value)} className="bg-[#0f0f10] border border-gray-700 rounded-md px-3 py-1.5 text-xs text-gray-200" data-testid="suggestion-filter">
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          {sugLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 text-[#e34c26] animate-spin" /></div>
          ) : suggestions.length === 0 ? (
            <div className="py-8 text-center">
              <Clock size={32} className="text-gray-600 mx-auto mb-2" />
              <p className="text-gray-500 text-sm">No {sugFilter} suggestions</p>
            </div>
          ) : (
            <div className="space-y-3">
              {suggestions.map(s => (
                <div key={s.suggestion_id} className="bg-[#0f0f10] border border-gray-800 rounded-lg p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                          s.suggestion_type === 'new_train' ? 'bg-green-900/30 text-green-400 border border-green-800/40' : 'bg-blue-900/30 text-blue-400 border border-blue-800/40'
                        }`}>{s.suggestion_type === 'new_train' ? 'New Train' : 'Edit'}</span>
                        <span className="text-gray-500 text-xs">by {s.user_name}</span>
                        <span className="text-gray-600 text-xs">{s.user_email}</span>
                      </div>
                      <p className="text-white text-sm font-medium">{s.data?.name || s.train_id || 'Unnamed'}</p>
                      {s.notes && <p className="text-gray-400 text-xs mt-1">{s.notes}</p>}
                      <button onClick={() => setExpandedSug(expandedSug === s.suggestion_id ? null : s.suggestion_id)} className="text-[#e34c26] text-xs mt-2 flex items-center gap-1 hover:underline">
                        <ChevronDown size={12} className={expandedSug === s.suggestion_id ? 'rotate-180' : ''} /> {expandedSug === s.suggestion_id ? 'Hide' : 'View'} details
                      </button>
                      {expandedSug === s.suggestion_id && (
                        <pre className="mt-2 bg-[#1a1a1c] border border-gray-800 rounded p-3 text-xs text-gray-300 overflow-x-auto max-h-60">{JSON.stringify(s.data, null, 2)}</pre>
                      )}
                    </div>
                    {sugFilter === 'pending' && (
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          onClick={() => handleAction(s.suggestion_id, 'approve')}
                          disabled={!!actionLoading[s.suggestion_id]}
                          className="p-2 bg-green-900/30 text-green-400 rounded-lg hover:bg-green-900/50 transition-colors disabled:opacity-50"
                          data-testid={`approve-${s.suggestion_id}`}
                        >
                          {actionLoading[s.suggestion_id] === 'approve' ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                        </button>
                        <button
                          onClick={() => handleAction(s.suggestion_id, 'reject')}
                          disabled={!!actionLoading[s.suggestion_id]}
                          className="p-2 bg-red-900/30 text-red-400 rounded-lg hover:bg-red-900/50 transition-colors disabled:opacity-50"
                          data-testid={`reject-${s.suggestion_id}`}
                        >
                          {actionLoading[s.suggestion_id] === 'reject' ? <Loader2 size={16} className="animate-spin" /> : <X size={16} />}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Link to="/trains" className="bg-[#1a1a1c] border border-gray-800 rounded-xl p-5 hover:border-orange-500/30 transition-colors">
            <Train size={20} className="text-orange-500 mb-2" />
            <p className="text-white font-semibold text-sm">Train Database</p>
            <p className="text-gray-500 text-xs mt-1">View and manage all trains</p>
          </Link>
          <div className="bg-[#1a1a1c] border border-gray-800 rounded-xl p-5">
            <Shield size={20} className="text-orange-500 mb-2" />
            <p className="text-white font-semibold text-sm">Admin Emails</p>
            <p className="text-gray-500 text-xs mt-1">kodi055free@gmail.com</p>
            <p className="text-gray-500 text-xs">tracklog-support@train-tracklog.com</p>
          </div>
          <div className="bg-[#1a1a1c] border border-gray-800 rounded-xl p-5">
            <Clock size={20} className="text-orange-500 mb-2" />
            <p className="text-white font-semibold text-sm">Suggestion Review</p>
            <p className="text-gray-500 text-xs mt-1">Approve or reject user-submitted train entries</p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminPage;
