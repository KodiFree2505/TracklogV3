import React, { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LayoutGrid, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const AuthCallback = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { exchangeSession } = useAuth();
  const hasProcessed = useRef(false);

  useEffect(() => {
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const handleCallback = async () => {
      try {
        const hash = window.location.hash || location.hash || '';
        const params = new URLSearchParams(hash.replace('#', ''));
        const sessionId = params.get('session_id');

        if (!sessionId) {
          throw new Error('No session_id found in URL');
        }

        await exchangeSession(sessionId);
        window.history.replaceState(null, '', window.location.pathname);
        navigate('/dashboard', { replace: true });
      } catch (error) {
        console.error("Google auth callback failed:", error);
        navigate('/auth', { replace: true });
      }
    };

    handleCallback();
  }, [exchangeSession, navigate, location.hash]);

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