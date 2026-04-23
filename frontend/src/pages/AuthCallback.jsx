import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutGrid, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const AuthCallback = () => {
  const navigate = useNavigate();
  const { exchangeGoogleCode } = useAuth();
  const hasProcessed = useRef(false);

  useEffect(() => {
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const handleCallback = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const code = params.get('code');

        if (!code) {
          throw new Error('No authorization code found in URL');
        }

        // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
        const redirectUri = window.location.origin + '/auth/callback';
        await exchangeGoogleCode(code, redirectUri);
        window.history.replaceState(null, '', '/dashboard');
        navigate('/dashboard', { replace: true });
      } catch (error) {
        console.error("Google auth callback failed:", error);
        navigate('/auth', { replace: true });
      }
    };

    handleCallback();
  }, [exchangeGoogleCode, navigate]);

  return (
    <div className="min-h-screen bg-[#0f0f10] flex items-center justify-center">
      <div className="text-center">
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className="text-[#e34c26]">
            <LayoutGrid size={32} strokeWidth={2.5} />
          </div>
          <span className="text-[#e34c26] font-bold text-2xl tracking-wider uppercase">
            TrackLog
          </span>
        </div>
        <Loader2 className="w-8 h-8 text-[#e34c26] animate-spin mx-auto mb-4" />
        <p className="text-gray-400">Completing secure sign in...</p>
      </div>
    </div>
  );
};

export default AuthCallback;
