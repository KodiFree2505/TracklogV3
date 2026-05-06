import React from 'react';
import { Link } from 'react-router-dom';
import { LayoutGrid, ArrowLeft } from 'lucide-react';

const PrivacyPolicy = () => (
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
      <h1 className="text-white text-3xl md:text-4xl font-bold mb-2">Privacy Policy</h1>
      <p className="text-gray-500 text-sm mb-8">Last updated: May 2026</p>

      <div className="space-y-6 text-gray-300 text-sm leading-relaxed">
        <section>
          <h2 className="text-white text-lg font-semibold mb-2">1. Information We Collect</h2>
          <p>When you use TrackLog, we collect information you provide directly:</p>
          <ul className="list-disc list-inside mt-2 space-y-1 text-gray-400">
            <li>Account information (name, email address, profile picture)</li>
            <li>Train sighting data (train numbers, types, locations, dates, photos)</li>
            <li>Timezone and device information for service delivery</li>
            <li>Usage data and interaction with the platform</li>
          </ul>
        </section>

        <section>
          <h2 className="text-white text-lg font-semibold mb-2">2. How We Use Your Information</h2>
          <ul className="list-disc list-inside space-y-1 text-gray-400">
            <li>To provide and maintain the TrackLog service</li>
            <li>To send daily digest emails at your preferred time</li>
            <li>To enable community features (feed, follows, likes)</li>
            <li>To generate AI-powered analytics and insights</li>
            <li>To improve our services and user experience</li>
          </ul>
        </section>

        <section>
          <h2 className="text-white text-lg font-semibold mb-2">3. Data Sharing</h2>
          <p>We do not sell your personal data. Information may be shared in these circumstances:</p>
          <ul className="list-disc list-inside mt-2 space-y-1 text-gray-400">
            <li>Public sightings you choose to share with the community</li>
            <li>With service providers who assist in operating TrackLog (hosting, email delivery)</li>
            <li>When required by law or to protect our rights</li>
          </ul>
        </section>

        <section>
          <h2 className="text-white text-lg font-semibold mb-2">4. Data Storage & Security</h2>
          <p>Your data is stored securely using industry-standard encryption. We use secure session cookies for authentication. Photos are stored on our servers and accessible only to you unless made public.</p>
        </section>

        <section>
          <h2 className="text-white text-lg font-semibold mb-2">5. Your Rights</h2>
          <ul className="list-disc list-inside space-y-1 text-gray-400">
            <li>Access your data at any time through your profile</li>
            <li>Update or correct your information</li>
            <li>Delete your account and all associated data</li>
            <li>Control profile visibility (public/private)</li>
            <li>Opt out of digest emails by contacting support</li>
          </ul>
        </section>

        <section>
          <h2 className="text-white text-lg font-semibold mb-2">6. Cookies</h2>
          <p>TrackLog uses essential cookies for authentication and session management. We also use analytics cookies to understand how our service is used. See our <Link to="/cookies" className="text-[#e34c26] hover:underline">Cookie Notice</Link> for details.</p>
        </section>

        <section>
          <h2 className="text-white text-lg font-semibold mb-2">7. Contact</h2>
          <p>For privacy-related questions, contact us at <a href="mailto:support@Train-Tracklog.com" className="text-[#e34c26] hover:underline">support@Train-Tracklog.com</a></p>
        </section>
      </div>
    </main>
  </div>
);

export default PrivacyPolicy;
