import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Cookie } from 'lucide-react';

const CookieConsent = () => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('cookie_consent');
    if (!consent) setShow(true);
  }, []);

  const handleAccept = () => {
    localStorage.setItem('cookie_consent', 'accepted');
    setShow(false);
  };

  const handleDecline = () => {
    localStorage.setItem('cookie_consent', 'declined');
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[70] p-4" data-testid="cookie-consent">
      <div className="max-w-2xl mx-auto bg-[#1a1a1c] border border-gray-700 rounded-xl p-4 md:p-5 shadow-2xl shadow-black/50">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 bg-[#2a1a1a] rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
            <Cookie size={18} className="text-orange-500" />
          </div>
          <div className="flex-1">
            <p className="text-gray-200 text-sm font-medium mb-1">We use cookies</p>
            <p className="text-gray-400 text-xs leading-relaxed">
              TrackLog uses essential cookies for authentication and analytics cookies to improve the service.{' '}
              <Link to="/cookies" className="text-[#e34c26] hover:underline">Learn more</Link>
            </p>
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 mt-4">
          <button
            onClick={handleDecline}
            className="px-4 py-2 text-xs text-gray-400 hover:text-white transition-colors"
            data-testid="cookie-decline"
          >
            Decline
          </button>
          <button
            onClick={handleAccept}
            className="px-5 py-2 bg-[#e34c26] hover:bg-[#d14020] text-white text-xs font-semibold rounded-lg transition-colors"
            data-testid="cookie-accept"
          >
            Accept All
          </button>
        </div>
      </div>
    </div>
  );
};

export default CookieConsent;
