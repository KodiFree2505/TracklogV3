import React from 'react';
import { Train, MapPin, Calendar, Trash2 } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export function formatDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function getPhotoUrl(photos) {
  if (!photos || photos.length === 0) return null;
  const photo = photos[0];
  if (photo.startsWith('/api')) {
    return `${BACKEND_URL}${photo}`;
  }
  return photo;
}

export const SightingGridCard = ({ sighting, onDelete, onClick }) => {
  const photoUrl = getPhotoUrl(sighting.photos);
  const photoCount = sighting.photos ? sighting.photos.length : 0;
  
  return (
    <div
      className="bg-[#1a1a1c] border border-gray-800 rounded-lg overflow-hidden hover:border-orange-500/30 transition-colors group cursor-pointer"
      onClick={onClick}
    >
      <div className="aspect-video bg-gray-800 relative overflow-hidden">
        {photoUrl ? (
          <img src={photoUrl} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Train size={48} className="text-gray-700" />
          </div>
        )}
        {photoCount > 1 && (
          <div className="absolute bottom-2 right-2 bg-black/70 px-2 py-1 rounded text-xs text-white">
            +{photoCount - 1} more
          </div>
        )}
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div>
            <h3 className="text-white font-semibold text-lg">{sighting.train_number}</h3>
            <p className="text-orange-500 text-sm">{sighting.train_type}</p>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(sighting.sighting_id); }}
            className="text-gray-500 hover:text-red-500 transition-colors p-1"
          >
            <Trash2 size={16} />
          </button>
        </div>
        <div className="space-y-1 text-sm text-gray-400">
          <p className="flex items-center gap-2"><MapPin size={14} /> {sighting.location}</p>
          <p className="flex items-center gap-2"><Calendar size={14} /> {formatDate(sighting.sighting_date)}</p>
        </div>
      </div>
    </div>
  );
};
