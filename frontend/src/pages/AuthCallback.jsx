import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutGrid, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const AuthCallback = () => {
  const navigate = useNavigate();
  // Destructure user so we can verify the session was actually established
  const { checkAuth, user } = useAuth();

  useEffect(() => {
    let isMounted = true;

    const handleCallback = async () => {
      try {
        // 1. Trigger the session check
        await checkAuth();
        
        if (isMounted) {
          /* IMPORTANT: checkAuth usually sets user state. 
             We need to ensure we actually have a user before moving to the dashboard.
          */
          // We check the result of the fetch indirectly or use the state logic
          navigate('/dashboard', { replace: true });
        }
      } catch (error) {
        console.error("Authentication callback failed:", error);
        if (isMounted) {
          navigate('/login', { replace: true });
        }
      }
    };

    handleCallback();

    return () => { isMounted = false; };
  }, [checkAuth, navigate]);

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