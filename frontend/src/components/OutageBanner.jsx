import React, { useState, useEffect } from 'react';
import { X, AlertTriangle } from 'lucide-react';

const OutageBanner = () => {
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem('outage_banner_dismissed');
    if (stored === 'true') setDismissed(true);
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem('outage_banner_dismissed', 'true');
  };

  if (dismissed) return null;

  return (
    <div className="bg-amber-900/40 border-b border-amber-600/30 relative" data-testid="outage-banner">
      <div className="max-w-7xl mx-auto px-10 py-3 flex items-center justify-center gap-3">
        <AlertTriangle size={16} className="text-amber-400 flex-shrink-0" />
        <p className="text-amber-200 text-xs md:text-sm font-medium text-center">
          We apologise for the recent website outage. All user data has been deleted in compliance with privacy laws. Please re-register to continue using TrackLog.
        </p>
        <button
          onClick={handleDismiss}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-amber-400/60 hover:text-white transition-colors p-1.5 rounded-full hover:bg-white/10"
          aria-label="Dismiss banner"
          data-testid="dismiss-outage-banner"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
};

export default OutageBanner;
