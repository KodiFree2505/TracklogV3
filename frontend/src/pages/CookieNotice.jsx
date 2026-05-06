import React from 'react';
import { Link } from 'react-router-dom';
import { LayoutGrid, ArrowLeft } from 'lucide-react';

const CookieNotice = () => (
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
      <h1 className="text-white text-3xl md:text-4xl font-bold mb-2">Cookie Notice</h1>
      <p className="text-gray-500 text-sm mb-8">Last updated: May 2026</p>

      <div className="space-y-6 text-gray-300 text-sm leading-relaxed">
        <section>
          <h2 className="text-white text-lg font-semibold mb-2">What Are Cookies?</h2>
          <p>Cookies are small text files stored on your device when you visit a website. They help the site remember your preferences and improve your experience.</p>
        </section>

        <section>
          <h2 className="text-white text-lg font-semibold mb-2">Cookies We Use</h2>
          <div className="space-y-4 mt-3">
            <div className="bg-[#1a1a1c] border border-gray-800 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-white font-medium text-sm">Essential Cookies</h3>
                <span className="text-xs bg-green-900/30 text-green-400 px-2 py-0.5 rounded">Required</span>
              </div>
              <p className="text-gray-400 text-xs">These cookies are necessary for the service to function. They handle authentication, session management, and security.</p>
              <div className="mt-2 text-xs text-gray-500">
                <p><code className="text-gray-400">session_token</code> — Keeps you logged in (expires after 7 days)</p>
              </div>
            </div>

            <div className="bg-[#1a1a1c] border border-gray-800 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-white font-medium text-sm">Functional Cookies</h3>
                <span className="text-xs bg-blue-900/30 text-blue-400 px-2 py-0.5 rounded">Preference</span>
              </div>
              <p className="text-gray-400 text-xs">These cookies remember your choices and preferences to enhance your experience.</p>
              <div className="mt-2 text-xs text-gray-500">
                <p><code className="text-gray-400">farewell_banner_dismissed</code> — Remembers if you closed the announcement banner</p>
              </div>
            </div>

            <div className="bg-[#1a1a1c] border border-gray-800 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-white font-medium text-sm">Analytics Cookies</h3>
                <span className="text-xs bg-orange-900/30 text-orange-400 px-2 py-0.5 rounded">Analytics</span>
              </div>
              <p className="text-gray-400 text-xs">These cookies help us understand how visitors interact with TrackLog so we can improve the service.</p>
              <div className="mt-2 text-xs text-gray-500">
                <p><code className="text-gray-400">PostHog</code> — Anonymous usage analytics and session recording</p>
              </div>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-white text-lg font-semibold mb-2">Managing Cookies</h2>
          <p>You can control cookies through your browser settings. Note that disabling essential cookies will prevent you from using TrackLog's authenticated features.</p>
          <ul className="list-disc list-inside mt-2 space-y-1 text-gray-400">
            <li>Chrome: Settings &gt; Privacy and Security &gt; Cookies</li>
            <li>Firefox: Settings &gt; Privacy & Security &gt; Cookies</li>
            <li>Safari: Preferences &gt; Privacy &gt; Cookies</li>
          </ul>
        </section>

        <section>
          <h2 className="text-white text-lg font-semibold mb-2">Contact</h2>
          <p>For questions about our use of cookies, contact us at <a href="mailto:support@Train-Tracklog.com" className="text-[#e34c26] hover:underline">support@Train-Tracklog.com</a></p>
        </section>
      </div>
    </main>
  </div>
);

export default CookieNotice;
