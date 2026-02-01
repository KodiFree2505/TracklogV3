import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  LayoutGrid, LogOut, Camera, BarChart3, MapPin, Clock, User, Loader2,
  Plus, Train, Building2, Calendar
} from 'lucide-react';
import { Button } from '../components/ui/button';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const StatCard = ({ icon: Icon, label, value }) => (
  <div className="bg-[#1a1a1c] border border-gray-800 rounded-lg p-6 hover:border-orange-500/30 transition-colors">
    <div className="w-10 h-10 bg-[#2a1a1a] rounded-lg flex items-center justify-center mb-4">
      <Icon size={20} className="text-orange-500" />
    </div>
    <p className="text-gray-400 text-sm mb-1">{label}</p>
    <p className="text-white text-2xl font-bold">{value}</p>
  </div>
);

const TopList = ({ icon: Icon, title, items, loading }) => (
  <div className="bg-[#1a1a1c] border border-gray-800 rounded-lg p-6">
    <div className="flex items-center gap-2 mb-4">
      <Icon size={18} className="text-orange-500" />
      <h3 className="text-white font-semibold">{title}</h3>
    </div>
    {loading ? (
      <div className="flex justify-center py-8">
        <Loader2 className="w-6 h-6 text-orange-500 animate-spin" />
      </div>
    ) : items && items.length > 0 ? (
      <div className="space-y-3">
        {items.map((item, i) => (
          <div key={i} className="flex items-center justify-between">
            <span className="text-gray-300 text-sm">{item.name}</span>
            <span className="text-orange-500 font-semibold">{item.count}</span>
          </div>
        ))}
      </div>
    ) : (
      <p className="text-gray-500 text-sm text-center py-4">No data yet</p>
    )}
  </div>
);

const Dashboard = () => {
  const { user, logout, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // Get user from location state (passed after login) or from auth context
  const currentUser = location.state?.user || user;

  useEffect(() => {
    // Only redirect if not loading and no user from either source
    if (!loading && !currentUser) {
      navigate('/auth');
    }
  }, [loading, currentUser, navigate]);

  useEffect(() => {
    const fetchStats = async () => {
      if (!isAuthenticated) return;
      try {
        const response = await fetch(`${API}/sightings/stats`, {
          credentials: 'include'
        });
        if (response.ok) {
          const data = await response.json();
          setStats(data);
        }
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      } finally {
        setStatsLoading(false);
      }
    };
    fetchStats();
  }, [isAuthenticated]);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  if (isAuthenticated === null || loading) {
    return (
      <div className="min-h-screen bg-[#0f0f10] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#e34c26] animate-spin" />
      </div>
    );
  }

  const formatLastSighting = (date) => {
    if (!date) return 'Never';
    const d = new Date(date);
    const now = new Date();
    const diffDays = Math.floor((now - d) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return d.toLocaleDateString();
  };

  const totalSightings = statsLoading ? '...' : (stats?.total_sightings || 0);
  const thisMonth = statsLoading ? '...' : (stats?.this_month || 0);
  const uniqueLocations = statsLoading ? '...' : (stats?.unique_locations || 0);
  const lastSighting = statsLoading ? '...' : formatLastSighting(stats?.last_sighting);

  return (
    <div className="min-h-screen bg-[#0f0f10]">
      <header className="bg-[#FFE500] h-[52px] flex items-center justify-between px-6 md:px-12">
        <Link to="/" className="flex items-center gap-2">
          <div className="text-[#e34c26]">
            <LayoutGrid size={22} strokeWidth={2.5} />
          </div>
          <span className="text-[#e34c26] font-bold text-lg tracking-wider uppercase">
            TrackLog
          </span>
        </Link>
        <nav className="flex items-center gap-6">
          <Link to="/dashboard" className="text-gray-800 font-medium text-sm hover:text-gray-900">Dashboard</Link>
          <Link to="/sightings" className="text-gray-600 text-sm hover:text-gray-900">My Sightings</Link>
          <Link to="/log-sighting" className="text-gray-600 text-sm hover:text-gray-900">Log Sighting</Link>
        </nav>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            {currentUser?.picture ? (
              <img src={currentUser.picture} alt={currentUser.name} className="w-8 h-8 rounded-full" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-[#e34c26] flex items-center justify-center text-white">
                <User size={16} />
              </div>
            )}
            <span className="text-gray-800 font-medium text-sm hidden md:block">{currentUser?.name}</span>
          </div>
          <Button onClick={handleLogout} variant="outline" size="sm" className="border-gray-800 text-gray-800 hover:bg-gray-800 hover:text-white">
            <LogOut size={16} className="mr-1" /> Logout
          </Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-white text-3xl font-bold mb-2">
              Welcome back, {currentUser?.name?.split(' ')[0]}!
            </h1>
            <p className="text-gray-400">Here's an overview of your trainspotting journey.</p>
          </div>
          <Link to="/log-sighting">
            <Button className="bg-[#e34c26] hover:bg-[#d14020] text-white font-semibold">
              <Plus size={18} className="mr-2" /> Log Sighting
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
          <StatCard icon={Camera} label="Total Sightings" value={totalSightings} />
          <StatCard icon={Calendar} label="This Month" value={thisMonth} />
          <StatCard icon={MapPin} label="Locations" value={uniqueLocations} />
          <StatCard icon={Clock} label="Last Sighting" value={lastSighting} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <TopList 
            icon={Train} 
            title="Top Train Types" 
            items={stats?.top_train_types} 
            loading={statsLoading} 
          />
          <TopList 
            icon={Building2} 
            title="Top Operators" 
            items={stats?.top_operators} 
            loading={statsLoading} 
          />
          <TopList 
            icon={MapPin} 
            title="Top Locations" 
            items={stats?.top_locations} 
            loading={statsLoading} 
          />
        </div>

        {(!stats || stats.total_sightings === 0) && (
          <div className="bg-[#1a1a1c] border border-gray-800 rounded-lg p-8 text-center">
            <Camera size={48} className="text-orange-500 mx-auto mb-4" />
            <h2 className="text-white text-xl font-semibold mb-2">Log Your First Sighting</h2>
            <p className="text-gray-400 mb-6 max-w-md mx-auto">
              Start building your trainspotting collection by logging your first train sighting.
            </p>
            <Link to="/log-sighting">
              <Button className="bg-[#e34c26] hover:bg-[#d14020] text-white font-semibold px-8 py-6">
                Add New Sighting
              </Button>
            </Link>
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
