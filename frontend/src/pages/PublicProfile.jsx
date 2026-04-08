import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { LayoutGrid, Loader2, User, Camera } from 'lucide-react';
import PublicSightingCard from '../components/PublicSightingCard';
import safeFetch from '../lib/safeFetch';

const BACKEND_URL = '';
const API = '/api';

export default function PublicProfile() {
  const { userId } = useParams();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    safeFetch(`${API}/public/users/${userId}`)
      .then(res => {
        if (!res.ok) throw new Error(res.status === 403 ? 'This profile is private.' : 'Profile not found.');
        return res.json();
      })
      .then(data => setProfile(data))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [userId]);

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

  const pictureUrl = profile.picture?.startsWith('/api') ? `${BACKEND_URL}${profile.picture}` : profile.picture;

  return (
    <div className="min-h-screen bg-[#0f0f10]">
      <PublicHeader />
      <main className="max-w-6xl mx-auto px-4 md:px-6 py-6 md:py-12" data-testid="public-profile-view">
        <ProfileHeader name={profile.name} picture={pictureUrl} count={profile.total_sightings} />
        <SightingsGrid sightings={profile.sightings} />
        <div className="mt-8 text-center">
          <p className="text-gray-500 text-sm">
            Want to log your own sightings?{' '}
            <Link to="/auth?signup=true" className="text-[#e34c26] hover:underline">Join TrackLog</Link>
          </p>
        </div>
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
      <Link to="/auth" className="text-gray-800 text-sm font-medium hover:text-gray-900">
        Sign In
      </Link>
    </header>
  );
}

function ProfileHeader({ name, picture, count }) {
  return (
    <div className="flex items-center gap-4 mb-8">
      {picture ? (
        <img src={picture} alt="" className="w-16 h-16 rounded-full object-cover border-2 border-gray-700" />
      ) : (
        <div className="w-16 h-16 rounded-full bg-[#e34c26] flex items-center justify-center text-white border-2 border-gray-700">
          <User size={28} />
        </div>
      )}
      <div>
        <h1 className="text-white text-2xl font-bold">{name}</h1>
        <p className="text-gray-400 text-sm">{count} public sighting{count !== 1 ? 's' : ''}</p>
      </div>
    </div>
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
