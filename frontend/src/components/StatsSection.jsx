import React from 'react';
import { stats } from '../data/mockData';

const StatsSection = () => {
  return (
    <section className="bg-[#0f0f10] py-12 border-t border-gray-800">
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
          {stats.map((stat, index) => (
            <div key={index} className="flex flex-col items-center">
              <span 
                className={`text-3xl md:text-4xl font-bold mb-2 ${
                  index === 0 ? 'text-orange-500' : 'text-white'
                }`}
                style={{ fontFamily: 'Inter, sans-serif' }}
              >
                {stat.value}
              </span>
              <span className="text-gray-500 text-xs uppercase tracking-[0.2em]">
                {stat.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default StatsSection;
