import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import safeFetch from '../lib/safeFetch';
import {
  LayoutGrid, Loader2, User, Camera, UserPlus, UserCheck, Users, Calendar, Train
} from 'lucide-react';
import PublicSightingCard from '../components/PublicSightingCard';

const API = '/api';

export default function PublicProfile() {
  const { userId } = useParams();
  const { user: currentUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);

  useEffect(() => {
    safeFetch(`${API}/public/users/${userId}`)
      .then(res => {
        if (!res.ok) throw new Error(res.status === 403 ? 'This profile is private.' : 'Profile not found.');
        return res.json();
      })
      .then(data => {
        setProfile(data);
        setFollowerCount(data.follower_count || 0);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [userId]);

  // Check if following
  useEffect(() => {
    if (!currentUser) return;
    safeFetch(`${API}/social/following/me`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) setIsFollowing((data.following_ids || []).includes(userId));
      })
      .catch(() => {});
  }, [currentUser, userId]);

  const handleFollow = async () => {
    if (!currentUser) return;
    const res = await safeFetch(`${API}/social/follow/${userId}`, { method: 'POST', credentials: 'include' });
    if (!res.ok) return;
    const data = await res.json();
    setIsFollowing(data.following);
    setFollowerCount(data.follower_count);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f0f10] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#e34c26] animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0f0f10]">
        <PublicHeader />
        <div className="flex items-center justify-center py-32 px-4">
          <div className="text-center" data-testid="public-profile-error">
            <User size={48} className="text-gray-700 mx-auto mb-4" />
            <h2 className="text-white text-xl font-bold mb-2">Not Available</h2>
            <p className="text-gray-400">{error}</p>
            <Link to="/" className="text-[#e34c26] hover:underline text-sm mt-4 inline-block">Back to TrackLog</Link>
          </div>
        </div>
      </div>
    );
  }

  const pictureUrl = profile.picture?.startsWith('/api') ? profile.picture : profile.picture;
  const isSelf = currentUser?.user_id === userId;

  return (
    <div className="min-h-screen bg-[#0f0f10]">
      <PublicHeader />
      <main className="max-w-6xl mx-auto px-4 md:px-6 py-6 md:py-12" data-testid="public-profile-view">
        {/* Profile Header */}
        <div className="bg-[#1a1a1c] border border-gray-800 rounded-lg p-6 md:p-8 mb-8">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
            {pictureUrl ? (
              <img src={pictureUrl} alt="" className="w-20 h-20 rounded-full object-cover border-2 border-gray-700" />
            ) : (
              <div className="w-20 h-20 rounded-full bg-[#e34c26] flex items-center justify-center text-white border-2 border-gray-700">
                <User size={34} />
              </div>
            )}
            <div className="flex-1 text-center sm:text-left">
              <h1 className="text-white text-2xl md:text-3xl font-bold">{profile.name}</h1>
              {profile.member_since && (
                <p className="text-gray-500 text-xs mt-1 flex items-center gap-1 justify-center sm:justify-start">
                  <Calendar size={12} /> Member since {profile.member_since}
                </p>
              )}

              {/* Stats row */}
              <div className="flex items-center gap-6 mt-4 justify-center sm:justify-start">
                <div className="text-center">
                  <p className="text-white font-bold text-lg">{profile.total_sightings}</p>
                  <p className="text-gray-500 text-xs uppercase tracking-wider">Sightings</p>
                </div>
                <div className="text-center">
                  <p className="text-white font-bold text-lg">{followerCount}</p>
                  <p className="text-gray-500 text-xs uppercase tracking-wider">Followers</p>
                </div>
                <div className="text-center">
                  <p className="text-white font-bold text-lg">{profile.following_count || 0}</p>
                  <p className="text-gray-500 text-xs uppercase tracking-wider">Following</p>
                </div>
              </div>

              {/* Follow button */}
              {currentUser && !isSelf && (
                <button
                  onClick={handleFollow}
                  className={`mt-4 flex items-center gap-2 text-sm font-semibold px-5 py-2 rounded-full transition-colors ${
                    isFollowing
                      ? 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                      : 'bg-[#e34c26] text-white hover:bg-[#d14020]'
                  }`}
                  data-testid="profile-follow-btn"
                >
                  {isFollowing ? <UserCheck size={16} /> : <UserPlus size={16} />}
                  {isFollowing ? 'Following' : 'Follow'}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Sightings */}
        <h2 className="text-white font-semibold text-lg mb-4 flex items-center gap-2">
          <Train size={20} className="text-orange-500" /> Public Sightings
        </h2>
        <SightingsGrid sightings={profile.sightings} />

        {!currentUser && (
          <div className="mt-8 text-center">
            <p className="text-gray-500 text-sm">
              Want to log your own sightings?{' '}
              <Link to="/auth?signup=true" className="text-[#e34c26] hover:underline">Join TrackLog</Link>
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

function PublicHeader() {
  return (
    <header className="bg-[#FFE500] h-[52px] flex items-center justify-between px-4 md:px-12">
      <Link to="/" className="flex items-center gap-2">
        <LayoutGrid size={22} strokeWidth={2.5} className="text-[#e34c26]" />
        <span className="text-[#e34c26] font-bold text-lg tracking-wider uppercase">TrackLog</span>
      </Link>
      <div className="flex items-center gap-3">
        <Link to="/discover" className="text-gray-800 hover:text-gray-900 text-sm font-medium">Discover</Link>
        <Link to="/auth" className="text-gray-800 hover:text-gray-900 text-sm font-medium">Sign In</Link>
      </div>
    </header>
  );
}

function SightingsGrid({ sightings }) {
  if (sightings.length === 0) {
    return (
      <div className="bg-[#1a1a1c] border border-gray-800 rounded-lg p-8 text-center">
        <Camera size={40} className="text-gray-700 mx-auto mb-4" />
        <p className="text-gray-400">No public sightings yet.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
      {sightings.map(s => (
        <PublicSightingCard key={s.sighting_id} sighting={s} />
      ))}
    </div>
  );
}
