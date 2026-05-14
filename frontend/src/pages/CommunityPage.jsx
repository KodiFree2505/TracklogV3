import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutGrid, LogOut, User, Menu, Github, Star, GitFork, ExternalLink,
  Youtube, Play, Mail, MessageCircle, Headphones
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '../components/ui/sheet';
import NotificationBell from '../components/NotificationBell';

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
        <Link to="/map" className="text-gray-300 hover:text-white py-2">Map</Link>
        <Link to="/trains" className="text-gray-300 hover:text-white py-2">Train Database</Link>
        <Link to="/feed" className="text-gray-300 hover:text-white py-2">Feed</Link>
        <Link to="/discover" className="text-gray-300 hover:text-white py-2">Discover</Link>
        <Link to="/bookmarks" className="text-gray-300 hover:text-white py-2">Bookmarks</Link>
        <Link to="/community" className="text-white font-medium py-2">Community & Support</Link>
        <Link to="/profile" className="text-gray-300 hover:text-white py-2">Profile</Link>
        <button onClick={onLogout} className="text-red-400 hover:text-red-300 py-2 text-left mt-4">
          <LogOut size={18} className="inline mr-2" /> Logout
        </button>
      </div>
    </SheetContent>
  </Sheet>
);

const CommunityPage = () => {
  const { user, logout, loading } = useAuth();
  const navigate = useNavigate();

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-[#0f0f10] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#e34c26] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const handleLogout = async () => { await logout(); navigate('/'); };

  return (
    <div className="min-h-screen bg-[#0f0f10]">
      {/* Header */}
      <header className="bg-[#FFE500] h-[52px] flex items-center justify-between px-4 md:px-12">
        <Link to="/" className="flex items-center gap-2">
          <LayoutGrid size={22} strokeWidth={2.5} className="text-[#e34c26]" />
          <span className="text-[#e34c26] font-bold text-lg tracking-wider uppercase">TrackLog</span>
        </Link>
        <nav className="hidden md:flex items-center gap-6">
          <Link to="/dashboard" className="text-gray-600 text-sm hover:text-gray-900">Dashboard</Link>
          <Link to="/sightings" className="text-gray-600 text-sm hover:text-gray-900">My Sightings</Link>
          <Link to="/log-sighting" className="text-gray-600 text-sm hover:text-gray-900">Log Sighting</Link>
          <Link to="/map" className="text-gray-600 text-sm hover:text-gray-900">Map</Link>
          <Link to="/trains" className="text-gray-600 text-sm hover:text-gray-900">Trains</Link>
          <Link to="/feed" className="text-gray-600 text-sm hover:text-gray-900">Feed</Link>
          <Link to="/discover" className="text-gray-600 text-sm hover:text-gray-900">Discover</Link>
          <Link to="/community" className="text-gray-800 font-medium text-sm">Community</Link>
        </nav>
        <div className="flex items-center gap-2 md:gap-4">
          <NotificationBell />
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

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 md:px-6 py-8 md:py-12">
        <h1 className="text-white text-2xl md:text-3xl font-bold mb-2">Community & Support</h1>
        <p className="text-gray-400 text-sm md:text-base mb-10">Connect with us, contribute, and get help.</p>

        {/* Open Source */}
        <div className="bg-[#1a1a1c] border border-gray-800 rounded-xl p-6 md:p-8 mb-6" data-testid="community-opensource">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-gray-800/50 rounded-lg flex items-center justify-center">
              <Github size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-white font-semibold text-lg">Open Source</h2>
              <p className="text-gray-500 text-xs">Built in the open</p>
            </div>
          </div>
          <p className="text-gray-400 text-sm leading-relaxed mb-5">
            TrackLog is fully open source. Explore the code, contribute features, report issues, or fork it and make it your own.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <a href="https://github.com/KodiFree2505/TracklogV3" target="_blank" rel="noopener noreferrer">
              <Button className="bg-white hover:bg-gray-100 text-gray-900 font-semibold text-sm gap-2">
                <Github size={16} /> View on GitHub <ExternalLink size={12} className="opacity-50" />
              </Button>
            </a>
            <a href="https://github.com/KodiFree2505/TracklogV3" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-gray-400 hover:text-yellow-400 transition-colors text-sm px-3 py-2">
              <Star size={15} /> Star
            </a>
            <a href="https://github.com/KodiFree2505/TracklogV3/fork" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-gray-400 hover:text-blue-400 transition-colors text-sm px-3 py-2">
              <GitFork size={15} /> Fork
            </a>
          </div>
        </div>

        {/* YouTube */}
        <div className="bg-[#1a1a1c] border border-gray-800 rounded-xl p-6 md:p-8 mb-6" data-testid="community-youtube">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-red-900/30 rounded-lg flex items-center justify-center">
              <Youtube size={20} className="text-red-500" />
            </div>
            <div>
              <h2 className="text-white font-semibold text-lg">YouTube Channel</h2>
              <p className="text-gray-500 text-xs">Trainspotting videos & updates</p>
            </div>
          </div>
          <p className="text-gray-400 text-sm leading-relaxed mb-5">
            Follow along for trainspotting videos, app updates, and behind-the-scenes content on the channel.
          </p>
          <a href="https://youtube.com/@kodifreecartersharer" target="_blank" rel="noopener noreferrer">
            <Button className="bg-red-600 hover:bg-red-700 text-white font-semibold text-sm gap-2">
              <Play size={16} fill="white" /> Subscribe on YouTube <ExternalLink size={12} className="opacity-50" />
            </Button>
          </a>
        </div>

        {/* Support & Contact */}
        <div className="bg-[#1a1a1c] border border-gray-800 rounded-xl p-6 md:p-8" data-testid="community-support">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-blue-900/30 rounded-lg flex items-center justify-center">
              <Headphones size={20} className="text-blue-400" />
            </div>
            <div>
              <h2 className="text-white font-semibold text-lg">Support & Contact</h2>
              <p className="text-gray-500 text-xs">We're here to help</p>
            </div>
          </div>
          <p className="text-gray-400 text-sm leading-relaxed mb-5">
            Have questions, feedback, or need help? Reach out and we'll get back to you.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <a href="mailto:support@Train-Tracklog.com" className="flex items-center gap-3 bg-[#0f0f10] border border-gray-700 rounded-lg p-4 hover:border-orange-500/30 transition-colors">
              <div className="w-9 h-9 bg-[#2a1a1a] rounded-lg flex items-center justify-center flex-shrink-0">
                <Mail size={18} className="text-orange-500" />
              </div>
              <div>
                <p className="text-white text-sm font-medium">Email Us</p>
                <p className="text-[#e34c26] text-xs">support@Train-Tracklog.com</p>
              </div>
            </a>
            <a href="sms:0498874917" className="flex items-center gap-3 bg-[#0f0f10] border border-gray-700 rounded-lg p-4 hover:border-orange-500/30 transition-colors">
              <div className="w-9 h-9 bg-[#2a1a1a] rounded-lg flex items-center justify-center flex-shrink-0">
                <MessageCircle size={18} className="text-orange-500" />
              </div>
              <div>
                <p className="text-white text-sm font-medium">Text Us</p>
                <p className="text-[#e34c26] text-xs">0498 874 917</p>
                <p className="text-gray-600 text-[10px]">Text messages only</p>
              </div>
            </a>
          </div>
        </div>
      </main>
    </div>
  );
};

export default CommunityPage;
