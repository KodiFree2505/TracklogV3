import React from 'react';
import { Github, Star, GitFork, ExternalLink } from 'lucide-react';
import { Button } from './ui/button';

const OpenSourceSection = () => {
  return (
    <section className="bg-[#0f0f10] py-20 px-6 border-t border-gray-800">
      <div className="max-w-4xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 bg-gray-800/50 border border-gray-700 rounded-full px-4 py-1.5 mb-6">
          <Github size={14} className="text-white" />
          <span className="text-gray-300 text-xs uppercase tracking-wider font-medium">Open Source</span>
        </div>

        <h2 className="text-white text-3xl md:text-4xl font-bold mb-4" style={{ fontFamily: 'Inter, sans-serif' }}>
          Built in the Open
        </h2>
        <p className="text-gray-400 text-base md:text-lg max-w-xl mx-auto mb-8 leading-relaxed">
          TrackLog is fully open source. Explore the code, contribute features, report issues, or fork it and make it your own.
        </p>

        <a
          href="https://github.com/KodiFree2505/TracklogV3"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block"
          data-testid="github-repo-link"
        >
          <Button className="bg-white hover:bg-gray-100 text-gray-900 font-semibold text-sm px-8 py-6 rounded-lg gap-2 transition-all hover:scale-105">
            <Github size={18} />
            View on GitHub
            <ExternalLink size={14} className="ml-1 opacity-50" />
          </Button>
        </a>

        <div className="flex items-center justify-center gap-8 mt-8">
          <a
            href="https://github.com/KodiFree2505/TracklogV3"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-gray-500 hover:text-yellow-400 transition-colors text-sm"
          >
            <Star size={16} />
            <span>Star</span>
          </a>
          <a
            href="https://github.com/KodiFree2505/TracklogV3/fork"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-gray-500 hover:text-blue-400 transition-colors text-sm"
          >
            <GitFork size={16} />
            <span>Fork</span>
          </a>
        </div>
      </div>
    </section>
  );
};

export default OpenSourceSection;
