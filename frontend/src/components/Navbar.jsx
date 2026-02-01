import React from 'react';
import { Train } from 'lucide-react';
import { Button } from './ui/button';

const Navbar = () => {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50">
      {/* Yellow top bar */}
      <div className="bg-[#FFE500] h-[52px] flex items-center justify-between px-6 md:px-12 lg:px-24">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="text-orange-600">
            <Train size={24} strokeWidth={2} />
          </div>
          <span className="text-[#e34c26] font-bold text-lg tracking-wider uppercase" style={{ fontFamily: 'Inter, sans-serif' }}>
            TrackLog
          </span>
        </div>

        {/* Navigation Links */}
        <div className="flex items-center gap-4">
          <a 
            href="/auth" 
            className="text-gray-700 hover:text-gray-900 font-medium text-sm transition-colors"
          >
            Login
          </a>
          <Button 
            className="bg-[#e34c26] hover:bg-[#d14020] text-white font-semibold text-xs uppercase tracking-wider px-5 py-2 rounded"
          >
            Get Started
          </Button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
