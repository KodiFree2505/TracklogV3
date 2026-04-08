import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const COLORS = ['#e34c26', '#ff6b3d', '#ff8a5c', '#ffaa7b', '#ffc99b', '#FFE500', '#d4522a', '#b84321'];

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#1a1a1c] border border-gray-700 rounded px-3 py-2 text-xs">
      <p className="text-white font-medium">{payload[0].name}</p>
      <p className="text-orange-400 font-semibold">{payload[0].value}</p>
    </div>
  );
};

export default function DonutChart({ data, title, icon: Icon }) {
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

  const total = data.reduce((sum, d) => sum + d.count, 0);

  return (
    <div className="bg-[#1a1a1c] border border-gray-800 rounded-lg p-4 md:p-6" data-testid={`donut-${title?.toLowerCase().replace(/\s/g, '-')}`}>
      <div className="flex items-center gap-2 mb-4">
        {Icon && <Icon size={16} className="text-orange-500" />}
        <h3 className="text-white font-semibold text-sm md:text-base">{title}</h3>
      </div>
      <div className="flex items-center gap-4">
        <div className="h-[160px] w-[160px] flex-shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} dataKey="count" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={2}>
                {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip content={CustomTooltip} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex-1 space-y-1.5 overflow-hidden">
          {data.slice(0, 5).map((item, i) => (
            <div key={i} className="flex items-center gap-2 text-xs">
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
              <span className="text-gray-300 truncate">{item.name}</span>
              <span className="text-gray-500 ml-auto flex-shrink-0">{Math.round((item.count / total) * 100)}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
