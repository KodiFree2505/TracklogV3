import React from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#1a1a1c] border border-gray-700 rounded px-3 py-2 text-xs">
      <p className="text-gray-400">{label}</p>
      <p className="text-orange-400 font-semibold">{payload[0].value} sightings</p>
    </div>
  );
};

export default function TimelineChart({ data }) {
  if (!data || data.length === 0) return null;
  const formatted = data.map(d => ({
    ...d,
    label: d.date ? d.date.slice(5) : d.month || ''
  }));

  return (
    <div className="bg-[#1a1a1c] border border-gray-800 rounded-lg p-4 md:p-6" data-testid="timeline-chart">
      <h3 className="text-white font-semibold text-sm md:text-base mb-4">Sightings Over Time</h3>
      <div className="h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={formatted} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorSightings" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#e34c26" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#e34c26" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="label" tick={{ fill: '#666', fontSize: 10 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
            <YAxis tick={{ fill: '#666', fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
            <Tooltip content={CustomTooltip} />
            <Area type="monotone" dataKey="count" stroke="#e34c26" strokeWidth={2} fill="url(#colorSightings)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
