import React from 'react';
import {
  Camera, BarChart3, Map, Brain, Users, Share2,
  Bell, Heart, Compass, Mail, Pencil, Shield
} from 'lucide-react';
import { features } from '../data/mockData';

const iconMap = {
  Camera,
  BarChart3,
  Map,
  Brain,
  Users,
  Share2,
  Bell,
  Heart,
  Compass,
  Mail,
  Pencil,
  Shield
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
                className="bg-[#1a1a1c] border border-gray-800 rounded-lg p-6 hover:border-orange-500/30 transition-all duration-300 group"
                data-testid={`feature-card-${feature.id}`}
              >
                <div className="w-12 h-12 bg-[#2a1a1a] rounded-lg flex items-center justify-center mb-5 group-hover:bg-[#3a1a1a] transition-colors">
                  {IconComponent && <IconComponent size={22} className="text-orange-500" />}
                </div>
                <h3 className="text-white text-lg font-semibold mb-3">
                  {feature.title}
                </h3>
                <p className="text-gray-400 text-sm leading-relaxed">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
