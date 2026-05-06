import React from 'react';
import { Link } from 'react-router-dom';
import { LayoutGrid, ArrowLeft } from 'lucide-react';

const TermsOfService = () => (
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
      <h1 className="text-white text-3xl md:text-4xl font-bold mb-2">Terms of Service</h1>
      <p className="text-gray-500 text-sm mb-8">Last updated: May 2026</p>

      <div className="space-y-6 text-gray-300 text-sm leading-relaxed">
        <section>
          <h2 className="text-white text-lg font-semibold mb-2">1. Acceptance of Terms</h2>
          <p>By accessing or using TrackLog, you agree to be bound by these Terms of Service. If you do not agree, please do not use the service.</p>
        </section>

        <section>
          <h2 className="text-white text-lg font-semibold mb-2">2. Description of Service</h2>
          <p>TrackLog is a platform for train enthusiasts to log, track, and share train sightings. Features include sighting logging, analytics, community feed, AI insights, and daily digest emails.</p>
        </section>

        <section>
          <h2 className="text-white text-lg font-semibold mb-2">3. User Accounts</h2>
          <ul className="list-disc list-inside space-y-1 text-gray-400">
            <li>You must provide accurate information when creating an account</li>
            <li>You are responsible for maintaining the security of your account</li>
            <li>You must be at least 13 years old to use the service</li>
            <li>One person may not maintain more than one account</li>
          </ul>
        </section>

        <section>
          <h2 className="text-white text-lg font-semibold mb-2">4. User Content</h2>
          <p>You retain ownership of content you post (photos, sighting data). By posting content publicly, you grant TrackLog a non-exclusive license to display it within the platform. You must not upload content that:</p>
          <ul className="list-disc list-inside mt-2 space-y-1 text-gray-400">
            <li>Infringes on intellectual property rights</li>
            <li>Contains illegal, harmful, or offensive material</li>
            <li>Violates any person's privacy</li>
            <li>Contains malware or harmful code</li>
          </ul>
        </section>

        <section>
          <h2 className="text-white text-lg font-semibold mb-2">5. Acceptable Use</h2>
          <p>You agree not to:</p>
          <ul className="list-disc list-inside mt-2 space-y-1 text-gray-400">
            <li>Use the service for any unlawful purpose</li>
            <li>Harass, bully, or intimidate other users</li>
            <li>Attempt to gain unauthorized access to the service</li>
            <li>Interfere with or disrupt the service</li>
            <li>Scrape or collect data without permission</li>
          </ul>
        </section>

        <section>
          <h2 className="text-white text-lg font-semibold mb-2">6. Termination</h2>
          <p>We reserve the right to suspend or terminate accounts that violate these terms. You may delete your account at any time from your profile settings, which will permanently remove your data.</p>
        </section>

        <section>
          <h2 className="text-white text-lg font-semibold mb-2">7. Disclaimer</h2>
          <p>TrackLog is provided "as is" without warranty of any kind. We do not guarantee uninterrupted or error-free service. We are not liable for any damages arising from use of the service.</p>
        </section>

        <section>
          <h2 className="text-white text-lg font-semibold mb-2">8. Changes to Terms</h2>
          <p>We may update these terms from time to time. Continued use of TrackLog after changes constitutes acceptance of the revised terms.</p>
        </section>

        <section>
          <h2 className="text-white text-lg font-semibold mb-2">9. Contact</h2>
          <p>For questions about these terms, contact us at <a href="mailto:support@Train-Tracklog.com" className="text-[#e34c26] hover:underline">support@Train-Tracklog.com</a></p>
        </section>
      </div>
    </main>
  </div>
);

export default TermsOfService;
