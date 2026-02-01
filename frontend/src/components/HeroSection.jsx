import React from 'react';
import { Button } from './ui/button';

const HeroSection = () => {
  return (
    <section className="relative min-h-screen pt-[52px]">
      {/* Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1474487548417-781cb71495f3?w=1920&q=80')`,
          marginTop: '52px'
        }}
      >
        {/* Dark overlay */}
        <div className="absolute inset-0 bg-black/60" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-[calc(100vh-52px)] text-center px-4">
        {/* Tagline */}
        <p className="text-[#e34c26] text-xs md:text-sm uppercase tracking-[0.3em] mb-6 font-medium">
          The Digital Signal Box
        </p>

        {/* Main Headline */}
        <h1 className="text-white text-5xl md:text-7xl lg:text-[100px] font-black uppercase tracking-tight mb-6 leading-[0.9]" style={{ fontFamily: 'Inter, sans-serif' }}>
          Track Every<br />
          <span className="text-[#e34c26]" style={{ fontStyle: 'italic' }}>Sighting</span>
        </h1>

        {/* Description */}
        <p className="text-gray-400 text-base md:text-lg max-w-xl mb-10 leading-relaxed">
          A precision tool for the modern rail enthusiast. Log, analyze, and
          explore your trainspotting journey with Swiss-style clarity.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4">
          <a href="/auth?signup=true">
            <Button 
              className="bg-[#e34c26] hover:bg-[#d14020] text-white font-semibold text-sm uppercase tracking-wider px-8 py-6 rounded"
            >
              Start Logging
            </Button>
          </a>
          <a href="/auth">
            <Button 
              variant="outline"
              className="border-2 border-white text-white hover:bg-white hover:text-black font-semibold text-sm uppercase tracking-wider px-8 py-6 rounded bg-transparent"
            >
              Sign In
            </Button>
          </a>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
