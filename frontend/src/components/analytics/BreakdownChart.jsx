import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const COLORS = ['#e34c26', '#ff6b3d', '#ff8a5c', '#ffaa7b', '#ffc99b', '#d4522a', '#b84321', '#9c3418', '#7f260f', '#631806'];

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#1a1a1c] border border-gray-700 rounded px-3 py-2 text-xs">
      <p className="text-white font-medium">{payload[0].payload.name}</p>
      <p className="text-orange-400 font-semibold">{payload[0].value}</p>
    </div>
  );
};

export default function BreakdownChart({ data, title, icon: Icon }) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-[#1a1a1c] border border-gray-800 rounded-lg p-4 md:p-6">
        <div className="flex items-center gap-2 mb-4">
          {Icon && <Icon size={16} className="text-orange-500" />}
          <h3 className="text-white font-semibold text-sm md:text-base">{title}</h3>
        </div>
        <p className="text-gray-500 text-sm text-center py-6">No data yet</p>
      </div>
    );
  }

  return (
    <div className="bg-[#1a1a1c] border border-gray-800 rounded-lg p-4 md:p-6" data-testid={`breakdown-${title?.toLowerCase().replace(/\s/g, '-')}`}>
      <div className="flex items-center gap-2 mb-4">
        {Icon && <Icon size={16} className="text-orange-500" />}
        <h3 className="text-white font-semibold text-sm md:text-base">{title}</h3>
      </div>
      <div className="h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 0, right: 4, left: 0, bottom: 0 }}>
            <XAxis type="number" tick={{ fill: '#666', fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
            <YAxis type="category" dataKey="name" tick={{ fill: '#aaa', fontSize: 11 }} tickLine={false} axisLine={false} width={90} />
            <Tooltip content={CustomTooltip} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
            <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={20}>
              {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
