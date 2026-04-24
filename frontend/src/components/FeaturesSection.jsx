import React from 'react';
import {
  Camera, BarChart3, Map, Brain, Users, Share2,
  Bell, Heart, Compass, Mail, Pencil, Shield, Layers
} from 'lucide-react';
import { features } from '../data/mockData';

const iconMap = {
  Camera, BarChart3, Map, Brain, Users, Share2,
  Bell, Heart, Compass, Mail, Pencil, Shield, Layers
};

const FeaturesSection = () => {
  return (
    <section className="bg-[#0f0f10] py-20 px-6">
      <div className="max-w-6xl mx-auto">
        {/* Section Header */}
        <div className="mb-12">
          <p className="text-orange-500 text-xs uppercase tracking-[0.3em] mb-3 font-medium">
            Features
          </p>
          <h2 className="text-white text-4xl md:text-5xl font-bold italic" style={{ fontFamily: 'Georgia, serif' }}>
            Everything You Need
          </h2>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature) => {
            const IconComponent = iconMap[feature.icon];
            return (
              <div
                key={feature.id}
                className="bg-[#1a1a1c] border border-gray-800 rounded-lg overflow-hidden hover:border-orange-500/30 transition-all duration-300 group"
                data-testid={`feature-card-${feature.id}`}
              >
                {/* Preview Image */}
                {feature.image && (
                  <div className="relative h-36 overflow-hidden">
                    <img
                      src={feature.image}
                      alt={feature.title}
                      className="w-full h-full object-cover object-top opacity-60 group-hover:opacity-80 group-hover:scale-105 transition-all duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#1a1a1c] via-transparent to-transparent" />
                  </div>
                )}
                {/* Content */}
                <div className="p-6 pt-4">
                  <div className="w-10 h-10 bg-[#2a1a1a] rounded-lg flex items-center justify-center mb-4 group-hover:bg-[#3a1a1a] transition-colors">
                    {IconComponent && <IconComponent size={20} className="text-orange-500" />}
                  </div>
                  <h3 className="text-white text-lg font-semibold mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-gray-400 text-sm leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
