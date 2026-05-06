import React from 'react';
import Navbar from '../components/Navbar';
import HeroSection from '../components/HeroSection';
import StatsSection from '../components/StatsSection';
import FeaturesSection from '../components/FeaturesSection';
import OpenSourceSection from '../components/OpenSourceSection';
import YouTubeSection from '../components/YouTubeSection';
import SupportSection from '../components/SupportSection';
import CTASection from '../components/CTASection';
import Footer from '../components/Footer';

const LandingPage = () => {
  return (
    <div className="min-h-screen bg-[#0f0f10]">
      <Navbar />
      <HeroSection />
      <StatsSection />
      <FeaturesSection />
      <OpenSourceSection />
      <YouTubeSection />
      <SupportSection />
      <CTASection />
      <Footer />
    </div>
  );
};

export default LandingPage;
