import React from 'react';
import { Link } from 'react-router-dom';
import { LayoutGrid } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="bg-[#0a0a0b] border-t border-gray-800 py-8 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-6">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="text-gray-500">
              <LayoutGrid size={18} strokeWidth={2.5} />
            </div>
            <span className="text-gray-500 font-semibold text-sm tracking-wider uppercase">
              TrackLog
            </span>
          </div>

          {/* Legal Links */}
          <nav className="flex flex-wrap items-center justify-center gap-4 md:gap-6">
            <Link to="/privacy" className="text-gray-500 text-xs hover:text-gray-300 transition-colors">Privacy Policy</Link>
            <Link to="/terms" className="text-gray-500 text-xs hover:text-gray-300 transition-colors">Terms of Service</Link>
            <Link to="/legal" className="text-gray-500 text-xs hover:text-gray-300 transition-colors">Legal Imprint</Link>
            <Link to="/cookies" className="text-gray-500 text-xs hover:text-gray-300 transition-colors">Cookie Notice</Link>
          </nav>

          {/* Emergent Badge */}
          <a 
            href="https://app.emergent.sh/?utm_source=emergent-badge" 
            target="_blank" 
            rel="noopener noreferrer"
            className="opacity-60 hover:opacity-100 transition-opacity"
          >
            <img 
              src="https://avatars.githubusercontent.com/in/1201222?s=120&u=2686cf91179bbafbc7a71bfbc43004cf9ae1acea&v=4" 
              alt="Made with Emergent" 
              className="w-6 h-6 rounded-full"
            />
          </a>
        </div>

        {/* Copyright */}
        <p className="text-gray-600 text-xs tracking-wide text-center" style={{ fontFamily: 'monospace' }}>
          © 2026 TrackLog. Built for rail enthusiasts.
        </p>
      </div>
    </footer>
  );
};

export default Footer;
