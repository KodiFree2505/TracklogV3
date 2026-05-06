import React from 'react';
import { Link } from 'react-router-dom';
import { LayoutGrid, ArrowLeft } from 'lucide-react';

const LegalImprint = () => (
  <div className="min-h-screen bg-[#0f0f10]">
    <header className="bg-[#FFE500] h-[52px] flex items-center justify-between px-4 md:px-12">
      <Link to="/" className="flex items-center gap-2">
        <LayoutGrid size={22} strokeWidth={2.5} className="text-[#e34c26]" />
        <span className="text-[#e34c26] font-bold text-lg tracking-wider uppercase">TrackLog</span>
      </Link>
      <Link to="/" className="flex items-center gap-1 text-gray-800 text-sm hover:text-gray-900">
        <ArrowLeft size={16} /> Back
      </Link>
    </header>
    <main className="max-w-3xl mx-auto px-4 md:px-6 py-10 md:py-16">
      <h1 className="text-white text-3xl md:text-4xl font-bold mb-2">Legal Imprint</h1>
      <p className="text-gray-500 text-sm mb-8">Information in accordance with legal requirements</p>

      <div className="space-y-6 text-gray-300 text-sm leading-relaxed">
        <section>
          <h2 className="text-white text-lg font-semibold mb-2">Service Provider</h2>
          <div className="bg-[#1a1a1c] border border-gray-800 rounded-lg p-5 space-y-2">
            <p><span className="text-gray-500">Service:</span> TrackLog</p>
            <p><span className="text-gray-500">Website:</span> <a href="https://train-tracklog.com" className="text-[#e34c26] hover:underline">train-tracklog.com</a></p>
            <p><span className="text-gray-500">Email:</span> <a href="mailto:support@Train-Tracklog.com" className="text-[#e34c26] hover:underline">support@Train-Tracklog.com</a></p>
            <p><span className="text-gray-500">Phone:</span> 0498 874 917 (Text only)</p>
          </div>
        </section>

        <section>
          <h2 className="text-white text-lg font-semibold mb-2">Responsible for Content</h2>
          <p>The operator of this website is responsible for the content published on TrackLog in accordance with applicable laws.</p>
        </section>

        <section>
          <h2 className="text-white text-lg font-semibold mb-2">Dispute Resolution</h2>
          <p>We are not willing or obliged to participate in dispute resolution proceedings before a consumer arbitration board. For any disputes, please contact us directly via email.</p>
        </section>

        <section>
          <h2 className="text-white text-lg font-semibold mb-2">Liability for Content</h2>
          <p>As a service provider, we are responsible for our own content on these pages. However, we are not obligated to monitor transmitted or stored third-party information. User-generated content (sightings, photos, comments) is the responsibility of the respective users.</p>
        </section>

        <section>
          <h2 className="text-white text-lg font-semibold mb-2">Liability for Links</h2>
          <p>Our service may contain links to external websites. We have no influence on the content of those sites and therefore cannot accept any liability. The respective provider of the linked pages is always responsible for their content.</p>
        </section>

        <section>
          <h2 className="text-white text-lg font-semibold mb-2">Copyright</h2>
          <p>The content and works on this platform created by the operator are subject to copyright law. Users retain rights to their own uploaded content. The TrackLog platform code is open source under the terms specified in the <a href="https://github.com/KodiFree2505/TracklogV3" target="_blank" rel="noopener noreferrer" className="text-[#e34c26] hover:underline">GitHub repository</a>.</p>
        </section>
      </div>
    </main>
  </div>
);

export default LegalImprint;
