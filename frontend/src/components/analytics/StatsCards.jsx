import React from 'react';
import { Flame, Trophy, Users, Globe } from 'lucide-react';

export function StreakCard({ current, longest }) {
  return (
    <div className="bg-[#1a1a1c] border border-gray-800 rounded-lg p-4 md:p-6" data-testid="streak-card">
      <div className="flex items-center gap-2 mb-4">
        <Flame size={18} className="text-orange-500" />
        <h3 className="text-white font-semibold text-sm md:text-base">Spotting Streak</h3>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-[#0f0f10] rounded-lg p-3 text-center">
          <p className="text-3xl font-bold text-orange-500">{current}</p>
          <p className="text-gray-400 text-xs mt-1">Current Streak</p>
          <p className="text-gray-600 text-[10px]">consecutive days</p>
        </div>
        <div className="bg-[#0f0f10] rounded-lg p-3 text-center">
          <div className="flex items-center justify-center gap-1">
            <Trophy size={16} className="text-yellow-500" />
            <p className="text-3xl font-bold text-yellow-500">{longest}</p>
          </div>
          <p className="text-gray-400 text-xs mt-1">Best Streak</p>
          <p className="text-gray-600 text-[10px]">all time record</p>
        </div>
      </div>
    </div>
  );
}

export function PlatformStats({ totalSightings, totalUsers }) {
  return (
    <div className="bg-[#1a1a1c] border border-gray-800 rounded-lg p-4 md:p-6" data-testid="platform-stats">
      <div className="flex items-center gap-2 mb-4">
        <Globe size={18} className="text-orange-500" />
        <h3 className="text-white font-semibold text-sm md:text-base">Platform Stats</h3>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-[#0f0f10] rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-white">{totalSightings?.toLocaleString() || 0}</p>
          <p className="text-gray-400 text-xs mt-1">Total Sightings</p>
          <p className="text-gray-600 text-[10px]">across all users</p>
        </div>
        <div className="bg-[#0f0f10] rounded-lg p-3 text-center">
          <div className="flex items-center justify-center gap-1">
            <Users size={16} className="text-blue-400" />
            <p className="text-2xl font-bold text-white">{totalUsers?.toLocaleString() || 0}</p>
          </div>
          <p className="text-gray-400 text-xs mt-1">Trainspotters</p>
          <p className="text-gray-600 text-[10px]">registered users</p>
        </div>
      </div>
    </div>
  );
}
