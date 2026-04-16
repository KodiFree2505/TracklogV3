import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import safeFetch from '../lib/safeFetch';
import {
  LayoutGrid, LogOut, Camera, BarChart3, MapPin, Clock, User, Loader2,
  Plus, Train, Building2, Calendar, Menu, Zap
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '../components/ui/sheet';
import TimelineChart from '../components/analytics/TimelineChart';
import BreakdownChart from '../components/analytics/BreakdownChart';
import DonutChart from '../components/analytics/DonutChart';
import { HourlyChart, DayOfWeekChart } from '../components/analytics/PatternCharts';
import { StreakCard, PlatformStats } from '../components/analytics/StatsCards';
import AiSummary from '../components/analytics/AiSummary';

const BACKEND_URL = '';
const API = '/api';

const StatCard = ({ icon: Icon, label, value }) => (
  <div className="bg-[#1a1a1c] border border-gray-800 rounded-lg p-4 md:p-6 hover:border-orange-500/30 transition-colors" data-testid={`stat-${label?.toLowerCase().replace(/\s/g, '-')}`}>
    <div className="w-8 h-8 md:w-10 md:h-10 bg-[#2a1a1a] rounded-lg flex items-center justify-center mb-3 md:mb-4">
      <Icon size={18} className="text-orange-500" />
    </div>
    <p className="text-gray-400 text-xs md:text-sm mb-1">{label}</p>
    <p className="text-white text-xl md:text-2xl font-bold">{value}</p>
  </div>
);

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
            <img src={user.picture.startsWith('/api') ? user.picture : user.picture} alt="" className="w-10 h-10 rounded-full object-cover" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-[#e34c26] flex items-center justify-center text-white">
              <User size={20} />
            </div>
          )}
          <span className="text-white font-medium">{user?.name}</span>
        </div>
        <Link to="/dashboard" className="text-white font-medium py-2">Dashboard</Link>
        <Link to="/sightings" className="text-gray-300 hover:text-white py-2">My Sightings</Link>
        <Link to="/log-sighting" className="text-gray-300 hover:text-white py-2">Log Sighting</Link>
        <Link to="/feed" className="text-gray-300 hover:text-white py-2">Feed</Link>
        <Link to="/profile" className="text-gray-300 hover:text-white py-2">Profile</Link>
        <button onClick={onLogout} className="text-red-400 hover:text-red-300 py-2 text-left mt-4">
          <LogOut size={18} className="inline mr-2" /> Logout
        </button>
      </div>
    </SheetContent>
  </Sheet>
);

const Dashboard = () => {
  const { user, logout, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [stats, setStats] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);

  const currentUser = location.state?.user || user;

  useEffect(() => {
    if (!loading && !currentUser) navigate('/auth');
  }, [loading, currentUser, navigate]);

  useEffect(() => {
    if (!currentUser) return;
    safeFetch(`${API}/sightings/stats`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(data => setStats(data))
      .catch(() => {})
      .finally(() => setStatsLoading(false));

    safeFetch(`${API}/sightings/analytics`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(data => setAnalytics(data))
      .catch(() => {})
      .finally(() => setAnalyticsLoading(false));
  }, [currentUser]);

  const handleLogout = async () => { await logout(); navigate('/'); };

  if (loading || !currentUser) {
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
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString();
  };

  const totalSightings = statsLoading ? '...' : (stats?.total_sightings || 0);
  const thisMonth = statsLoading ? '...' : (stats?.this_month || 0);
  const uniqueLocations = statsLoading ? '...' : (stats?.unique_locations || 0);
  const lastSighting = statsLoading ? '...' : formatLastSighting(stats?.last_sighting);

  return (
    <div className="min-h-screen bg-[#0f0f10]">
      {/* Header */}
      <header className="bg-[#FFE500] h-[52px] flex items-center justify-between px-4 md:px-12">
        <Link to="/" className="flex items-center gap-2">
          <LayoutGrid size={22} strokeWidth={2.5} className="text-[#e34c26]" />
          <span className="text-[#e34c26] font-bold text-lg tracking-wider uppercase">TrackLog</span>
        </Link>
        <nav className="hidden md:flex items-center gap-6">
          <Link to="/dashboard" className="text-gray-800 font-medium text-sm">Dashboard</Link>
          <Link to="/sightings" className="text-gray-600 text-sm hover:text-gray-900">My Sightings</Link>
          <Link to="/log-sighting" className="text-gray-600 text-sm hover:text-gray-900">Log Sighting</Link>
          <Link to="/feed" className="text-gray-600 text-sm hover:text-gray-900">Feed</Link>
        </nav>
        <div className="flex items-center gap-2 md:gap-4">
          <Link to="/profile" className="hidden md:flex items-center gap-2 hover:opacity-80">
            {currentUser?.picture ? (
              <img src={currentUser.picture} alt={currentUser.name} className="w-8 h-8 rounded-full object-cover" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-[#e34c26] flex items-center justify-center text-white">
                <User size={16} />
              </div>
            )}
            <span className="text-gray-800 font-medium text-sm">{currentUser?.name}</span>
          </Link>
          <Button onClick={handleLogout} variant="outline" size="sm" className="hidden md:flex border-gray-800 text-gray-800 hover:bg-gray-800 hover:text-white">
            <LogOut size={16} className="mr-1" /> Logout
          </Button>
          <MobileNav user={currentUser} onLogout={handleLogout} />
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 md:px-6 py-6 md:py-12">
        {/* Welcome */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 md:mb-8">
          <div>
            <h1 className="text-white text-2xl md:text-3xl font-bold mb-1">
              Welcome back, {currentUser?.name?.split(' ')[0]}!
            </h1>
            <p className="text-gray-400 text-sm md:text-base">Your trainspotting analytics at a glance.</p>
          </div>
          <Link to="/log-sighting">
            <Button className="bg-[#e34c26] hover:bg-[#d14020] text-white font-semibold w-full sm:w-auto">
              <Plus size={18} className="mr-2" /> Log Sighting
            </Button>
          </Link>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6 mb-6 md:mb-8">
          <StatCard icon={Camera} label="Total Sightings" value={totalSightings} />
          <StatCard icon={Calendar} label="This Month" value={thisMonth} />
          <StatCard icon={MapPin} label="Locations" value={uniqueLocations} />
          <StatCard icon={Clock} label="Last Sighting" value={lastSighting} />
        </div>

        {/* AI Summary */}
        {!analyticsLoading && analytics && stats && stats.total_sightings > 0 && (
          <div className="mb-6 md:mb-8">
            <AiSummary analytics={analytics} stats={stats} userName={currentUser?.name?.split(' ')[0]} />
          </div>
        )}

        {/* Timeline */}
        {!analyticsLoading && analytics && (
          <div className="mb-6 md:mb-8">
            <TimelineChart data={analytics.sightings_over_time} />
          </div>
        )}

        {/* Breakdown Charts Row */}
        {!analyticsLoading && analytics && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-6 md:mb-8">
            <DonutChart data={analytics.by_train_type} title="Train Types" icon={Train} />
            <DonutChart data={analytics.by_traction_type} title="Traction Types" icon={Zap} />
          </div>
        )}

        {/* Operator & Location */}
        {!analyticsLoading && analytics && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-6 md:mb-8">
            <BreakdownChart data={analytics.by_operator} title="Top Operators" icon={Building2} />
            <BreakdownChart data={analytics.by_location} title="Top Locations" icon={MapPin} />
          </div>
        )}

        {/* Time Patterns */}
        {!analyticsLoading && analytics && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-6 md:mb-8">
            <HourlyChart data={analytics.time_of_day} />
            <DayOfWeekChart data={analytics.day_of_week} />
          </div>
        )}

        {/* Streak & Platform */}
        {!analyticsLoading && analytics && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-6 md:mb-8">
            <StreakCard current={analytics.streak?.current || 0} longest={analytics.streak?.longest || 0} />
            <PlatformStats totalSightings={analytics.platform?.total_sightings} totalUsers={analytics.platform?.total_users} />
          </div>
        )}

        {/* Empty State */}
        {!statsLoading && (!stats || stats.total_sightings === 0) && (
          <div className="bg-[#1a1a1c] border border-gray-800 rounded-lg p-6 md:p-8 text-center">
            <Camera size={40} className="text-orange-500 mx-auto mb-4" />
            <h2 className="text-white text-lg md:text-xl font-semibold mb-2">Log Your First Sighting</h2>
            <p className="text-gray-400 text-sm md:text-base mb-6 max-w-md mx-auto">
              Start building your trainspotting collection by logging your first train sighting.
            </p>
            <Link to="/log-sighting">
              <Button className="bg-[#e34c26] hover:bg-[#d14020] text-white font-semibold px-8 py-6">
                Add New Sighting
              </Button>
            </Link>
          </div>
        )}

        {analyticsLoading && (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 text-[#e34c26] animate-spin" />
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
