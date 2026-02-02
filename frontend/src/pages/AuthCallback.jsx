import React, { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LayoutGrid, Loader2 } from 'lucide-react';

const AuthCallback = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { exchangeSession } = useAuth();
  const hasProcessed = useRef(false);

  useEffect(() => {
    // Prevent double processing in StrictMode
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const processSession = async () => {
      try {
        // Extract session_id from URL hash
        const hash = location.hash || '';
        const sessionIdMatch = hash.match(/session_id=([^&]+)/);

        if (!sessionIdMatch) {
          console.error('No session_id found in URL');
          navigate('/auth', { replace: true });
          return;
        }

        const sessionId = decodeURIComponent(sessionIdMatch[1]);

        // Exchange session_id for session_token and get user data
        const userData = await exchangeSession(sessionId);

        // Navigate to dashboard
        navigate('/dashboard', { replace: true, state: { user: userData } });
      } catch (error) {
        console.error('Auth callback error:', error);
        navigate('/auth', { replace: true });
      }
    };

    processSession();
  }, [location.hash, exchangeSession, navigate]);

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
        <p className="text-gray-400">Signing you in...</p>
      </div>
    </div>
  );
};

export default AuthCallback;
