import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { LayoutGrid, Loader2, Train, MapPin, Clock, Calendar, Zap, User, FileText, ExternalLink } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function getPhotoUrl(photo) {
  if (!photo) return null;
  if (photo.startsWith('/api')) return `${BACKEND_URL}${photo}`;
  return photo;
}

export default function PublicSighting() {
  const { shareId } = useParams();
  const [sighting, setSighting] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`${API}/public/sightings/${shareId}`)
      .then(res => {
        if (!res.ok) throw new Error(res.status === 404 ? 'This sighting is private or does not exist.' : 'Failed to load');
        return res.json();
      })
      .then(data => setSighting(data))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [shareId]);

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
        <header className="bg-[#FFE500] h-[52px] flex items-center px-4 md:px-12">
          <Link to="/" className="flex items-center gap-2">
            <LayoutGrid size={22} strokeWidth={2.5} className="text-[#e34c26]" />
            <span className="text-[#e34c26] font-bold text-lg tracking-wider uppercase">TrackLog</span>
          </Link>
        </header>
        <div className="flex items-center justify-center py-32 px-4">
          <div className="text-center" data-testid="public-sighting-error">
            <Train size={48} className="text-gray-700 mx-auto mb-4" />
            <h2 className="text-white text-xl font-bold mb-2">Not Available</h2>
            <p className="text-gray-400">{error}</p>
            <Link to="/" className="text-[#e34c26] hover:underline text-sm mt-4 inline-block">Back to TrackLog</Link>
          </div>
        </div>
      </div>
    );
  }

  const mainPhoto = sighting.photos?.[0] ? getPhotoUrl(sighting.photos[0]) : null;

  return (
    <div className="min-h-screen bg-[#0f0f10]">
      <header className="bg-[#FFE500] h-[52px] flex items-center justify-between px-4 md:px-12">
        <Link to="/" className="flex items-center gap-2">
          <LayoutGrid size={22} strokeWidth={2.5} className="text-[#e34c26]" />
          <span className="text-[#e34c26] font-bold text-lg tracking-wider uppercase">TrackLog</span>
        </Link>
        <Link to="/auth" className="text-gray-800 text-sm font-medium hover:text-gray-900">
          Sign In
        </Link>
      </header>

      <main className="max-w-3xl mx-auto px-4 md:px-6 py-6 md:py-12" data-testid="public-sighting-view">
        {/* Owner info */}
        <div className="flex items-center gap-3 mb-6">
          {sighting.owner_picture ? (
            <img src={sighting.owner_picture.startsWith('/api') ? `${BACKEND_URL}${sighting.owner_picture}` : sighting.owner_picture} alt="" className="w-10 h-10 rounded-full object-cover" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-[#e34c26] flex items-center justify-center text-white">
              <User size={20} />
            </div>
          )}
          <div>
            <p className="text-white font-medium">{sighting.owner_name}</p>
            <p className="text-gray-500 text-xs">Shared a sighting</p>
          </div>
        </div>

        {/* Photo */}
        {mainPhoto && (
          <div className="mb-6 rounded-lg overflow-hidden">
            <img src={mainPhoto} alt={sighting.train_number} className="w-full aspect-video object-cover" />
            {sighting.photos.length > 1 && (
              <div className="grid grid-cols-4 gap-2 mt-2">
                {sighting.photos.slice(1).map((p, i) => (
                  <img key={i} src={getPhotoUrl(p)} alt="" className="w-full aspect-square object-cover rounded" />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Details card */}
        <div className="bg-[#1a1a1c] border border-gray-800 rounded-lg p-5 md:p-8">
          <h1 className="text-white text-2xl md:text-3xl font-bold mb-1 flex items-center gap-3">
            <Train size={24} className="text-orange-500" />
            {sighting.train_number}
          </h1>
          <p className="text-orange-500 text-sm mb-6">{sighting.train_type} {sighting.traction_type ? `\u2022 ${sighting.traction_type}` : ''}</p>

          <div className="grid grid-cols-2 gap-4 md:gap-6">
            <div>
              <p className="text-gray-500 text-xs mb-1">Operator</p>
              <p className="text-white text-sm">{sighting.operator}</p>
            </div>
            {sighting.route && (
              <div>
                <p className="text-gray-500 text-xs mb-1">Route</p>
                <p className="text-white text-sm">{sighting.route}</p>
              </div>
            )}
            <div>
              <p className="text-gray-500 text-xs mb-1 flex items-center gap-1"><MapPin size={12} /> Location</p>
              <p className="text-white text-sm">{sighting.location}</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs mb-1 flex items-center gap-1"><Calendar size={12} /> Date</p>
              <p className="text-white text-sm">{sighting.sighting_date}</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs mb-1 flex items-center gap-1"><Clock size={12} /> Time</p>
              <p className="text-white text-sm">{sighting.sighting_time}</p>
            </div>
            {sighting.traction_type && (
              <div>
                <p className="text-gray-500 text-xs mb-1 flex items-center gap-1"><Zap size={12} /> Traction</p>
                <p className="text-white text-sm">{sighting.traction_type}</p>
              </div>
            )}
          </div>

          {sighting.notes && (
            <div className="mt-6 pt-4 border-t border-gray-800">
              <p className="text-gray-500 text-xs mb-1 flex items-center gap-1"><FileText size={12} /> Notes</p>
              <p className="text-gray-300 text-sm">{sighting.notes}</p>
            </div>
          )}
        </div>

        <div className="mt-6 text-center">
          <p className="text-gray-500 text-sm">
            Want to log your own sightings?{' '}
            <Link to="/auth?signup=true" className="text-[#e34c26] hover:underline">Join TrackLog</Link>
          </p>
        </div>
      </main>
    </div>
  );
}
