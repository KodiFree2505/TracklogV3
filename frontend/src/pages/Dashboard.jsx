import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LayoutGrid, LogOut, Camera, BarChart3, MapPin, Clock, User, Loader2 } from 'lucide-react';
import { Button } from '../components/ui/button';

const Dashboard = () => {
  const { user, logout, loading, checkAuth } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isAuthenticated, setIsAuthenticated] = useState(location.state?.user ? true : null);
  const [currentUser, setCurrentUser] = useState(location.state?.user || null);

  useEffect(() => {
    // If user data was passed from AuthCallback, use it
    if (location.state?.user) {
      setCurrentUser(location.state.user);
      setIsAuthenticated(true);
      return;
    }

    // Otherwise check auth
    const verifyAuth = async () => {
      await checkAuth();
    };
    verifyAuth();
  }, [location.state, checkAuth]);

  useEffect(() => {
    if (!loading && !location.state?.user) {
      if (user) {
        setCurrentUser(user);
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
        navigate('/auth');
      }
    }
  }, [user, loading, navigate, location.state]);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  // Show loading while checking authentication
  if (isAuthenticated === null || loading) {
    return (
      <div className="min-h-screen bg-[#0f0f10] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#e34c26] animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f0f10]">
      {/* Header */}
      <header className="bg-[#FFE500] h-[52px] flex items-center justify-between px-6 md:px-12">
        <div className="flex items-center gap-2">
          <div className="text-[#e34c26]">
            <LayoutGrid size={22} strokeWidth={2.5} />
          </div>
          <span className="text-[#e34c26] font-bold text-lg tracking-wider uppercase">
            TrackLog
          </span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            {currentUser?.picture ? (
              <img 
                src={currentUser.picture} 
                alt={currentUser.name}
                className="w-8 h-8 rounded-full"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-[#e34c26] flex items-center justify-center text-white">
                <User size={16} />
              </div>
            )}
            <span className="text-gray-800 font-medium text-sm hidden md:block">
              {currentUser?.name}
            </span>
          </div>
          <Button
            onClick={handleLogout}
            variant="outline"
            size="sm"
            className="border-gray-800 text-gray-800 hover:bg-gray-800 hover:text-white"
          >
            <LogOut size={16} className="mr-1" />
            Logout
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-12">
        <div className="mb-8">
          <h1 className="text-white text-3xl font-bold mb-2">
            Welcome back, {currentUser?.name?.split(' ')[0]}!
          </h1>
          <p className="text-gray-400">
            Ready to log your next train sighting?
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
          {[
            { icon: Camera, label: 'Total Sightings', value: '0' },
            { icon: BarChart3, label: 'This Month', value: '0' },
            { icon: MapPin, label: 'Locations', value: '0' },
            { icon: Clock, label: 'Last Sighting', value: 'Never' }
          ].map((stat, index) => (
            <div 
              key={index}
              className="bg-[#1a1a1c] border border-gray-800 rounded-lg p-6"
            >
              <div className="w-10 h-10 bg-[#2a1a1a] rounded-lg flex items-center justify-center mb-4">
                <stat.icon size={20} className="text-orange-500" />
              </div>
              <p className="text-gray-400 text-sm mb-1">{stat.label}</p>
              <p className="text-white text-2xl font-bold">{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="bg-[#1a1a1c] border border-gray-800 rounded-lg p-8 text-center">
          <Camera size={48} className="text-orange-500 mx-auto mb-4" />
          <h2 className="text-white text-xl font-semibold mb-2">Log Your First Sighting</h2>
          <p className="text-gray-400 mb-6 max-w-md mx-auto">
            Start building your trainspotting collection by logging your first train sighting.
          </p>
          <Button className="bg-[#e34c26] hover:bg-[#d14020] text-white font-semibold px-8 py-6">
            Add New Sighting
          </Button>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
