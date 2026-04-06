import React from 'react';
import { Link } from 'react-router-dom';
import { Train, MapPin, Zap } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

function getPhotoUrl(photo) {
  if (!photo) return null;
  if (photo.startsWith('/api')) return `${BACKEND_URL}${photo}`;
  return photo;
}

export default function PublicSightingCard({ sighting }) {
  const photo = sighting.photos?.[0] ? getPhotoUrl(sighting.photos[0]) : null;

  return (
    <Link
      to={`/share/sighting/${sighting.share_id}`}
      className="bg-[#1a1a1c] border border-gray-800 rounded-lg overflow-hidden hover:border-orange-500/30 transition-colors"
      data-testid={`public-sighting-card-${sighting.share_id}`}
    >
      <div className="aspect-video bg-gray-800 relative">
        {photo ? (
          <img src={photo} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Train size={40} className="text-gray-700" />
          </div>
        )}
      </div>
      <div className="p-3 md:p-4">
        <h3 className="text-white font-semibold truncate">{sighting.train_number}</h3>
        <p className="text-orange-500 text-sm">{sighting.train_type}</p>
        {sighting.traction_type && (
          <p className="text-gray-500 text-xs flex items-center gap-1 mt-1">
            <Zap size={12} />{sighting.traction_type}
          </p>
        )}
        <p className="text-gray-400 text-xs mt-2 flex items-center gap-1 truncate">
          <MapPin size={14} className="flex-shrink-0" />{sighting.location}
        </p>
      </div>
    </Link>
  );
}
