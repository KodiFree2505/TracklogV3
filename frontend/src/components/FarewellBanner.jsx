import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

const FarewellBanner = () => {
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem('farewell_banner_dismissed');
    if (stored === 'true') setDismissed(true);
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem('farewell_banner_dismissed', 'true');
  };

  if (dismissed) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[60] bg-gradient-to-r from-[#0d0d0e] via-[#1a1a1c] to-[#0d0d0e] border-b border-orange-500/20" data-testid="farewell-banner">
      <div className="max-w-7xl mx-auto px-10 py-2.5 flex items-center justify-center gap-4 md:gap-6">
        <img
          src="/sydney-trains-logo.png"
          alt="Transport Sydney Trains"
          className="h-7 md:h-9 w-auto object-contain flex-shrink-0"
        />
        <p className="text-gray-100 text-xs md:text-sm font-medium text-center italic">
          "Farewell V sets and K sets, Thanks for all the joy you brought to us"
        </p>
        <img
          src="/sydney-trains-logo.png"
          alt="Transport Sydney Trains"
          className="h-7 md:h-9 w-auto object-contain flex-shrink-0 hidden sm:block"
        />
        <button
          onClick={handleDismiss}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors p-1.5 rounded-full hover:bg-white/10"
          aria-label="Dismiss banner"
          data-testid="dismiss-banner"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
};

export default FarewellBanner;
