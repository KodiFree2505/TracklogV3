import React from 'react';
import { Youtube, ExternalLink, Play } from 'lucide-react';
import { Button } from './ui/button';

const YouTubeSection = () => {
  return (
    <section className="bg-[#0f0f10] py-20 px-6 border-t border-gray-800">
      <div className="max-w-4xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 bg-red-900/30 border border-red-800/40 rounded-full px-4 py-1.5 mb-6">
          <Youtube size={14} className="text-red-500" />
          <span className="text-red-300 text-xs uppercase tracking-wider font-medium">YouTube</span>
        </div>

        <h2 className="text-white text-3xl md:text-4xl font-bold mb-4" style={{ fontFamily: 'Inter, sans-serif' }}>
          Watch on YouTube
        </h2>
        <p className="text-gray-400 text-base md:text-lg max-w-xl mx-auto mb-8 leading-relaxed">
          Follow along for trainspotting videos, app updates, and behind-the-scenes content on the channel.
        </p>

        <a
          href="https://youtube.com/@kodifreecartersharer"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block"
          data-testid="youtube-channel-link"
        >
          <Button className="bg-red-600 hover:bg-red-700 text-white font-semibold text-sm px-8 py-6 rounded-lg gap-2 transition-all hover:scale-105">
            <Play size={18} fill="white" />
            Subscribe on YouTube
            <ExternalLink size={14} className="ml-1 opacity-50" />
          </Button>
        </a>
      </div>
    </section>
  );
};

export default YouTubeSection;
