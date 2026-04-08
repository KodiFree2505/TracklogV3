import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#1a1a1c] border border-gray-700 rounded px-3 py-2 text-xs">
      <p className="text-white font-medium">{payload[0].payload.label || payload[0].payload.day}</p>
      <p className="text-orange-400 font-semibold">{payload[0].value} sightings</p>
    </div>
  );
};

export function HourlyChart({ data }) {
  if (!data || data.length === 0) return null;
  return (
    <div className="bg-[#1a1a1c] border border-gray-800 rounded-lg p-4 md:p-6" data-testid="hourly-chart">
      <h3 className="text-white font-semibold text-sm md:text-base mb-4">Time of Day</h3>
      <div className="h-[180px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <XAxis dataKey="label" tick={{ fill: '#666', fontSize: 9 }} tickLine={false} axisLine={false} interval={2} />
            <YAxis tick={{ fill: '#666', fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
            <Tooltip content={CustomTooltip} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
            <Bar dataKey="count" fill="#e34c26" radius={[2, 2, 0, 0]} maxBarSize={14} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function DayOfWeekChart({ data }) {
  if (!data || data.length === 0) return null;
  return (
    <div className="bg-[#1a1a1c] border border-gray-800 rounded-lg p-4 md:p-6" data-testid="dow-chart">
      <h3 className="text-white font-semibold text-sm md:text-base mb-4">Day of Week</h3>
      <div className="h-[180px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <XAxis dataKey="day" tick={{ fill: '#aaa', fontSize: 11 }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fill: '#666', fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
            <Tooltip content={CustomTooltip} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
            <Bar dataKey="count" fill="#FFE500" radius={[4, 4, 0, 0]} maxBarSize={30} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
