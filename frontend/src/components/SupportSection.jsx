import React from 'react';
import { Mail, Phone, MessageCircle, Headphones } from 'lucide-react';

const SupportSection = () => {
  return (
    <section className="bg-[#0f0f10] py-20 px-6 border-t border-gray-800">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-blue-900/30 border border-blue-800/40 rounded-full px-4 py-1.5 mb-6">
            <Headphones size={14} className="text-blue-400" />
            <span className="text-blue-300 text-xs uppercase tracking-wider font-medium">Support</span>
          </div>
          <h2 className="text-white text-3xl md:text-4xl font-bold mb-4" style={{ fontFamily: 'Inter, sans-serif' }}>
            Get in Touch
          </h2>
          <p className="text-gray-400 text-base md:text-lg max-w-xl mx-auto leading-relaxed">
            Have questions, feedback, or need help? Reach out and we'll get back to you.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
          {/* Email */}
          <a
            href="mailto:support@Train-Tracklog.com"
            className="bg-[#1a1a1c] border border-gray-800 rounded-lg p-6 hover:border-orange-500/30 transition-all duration-300 group text-center"
            data-testid="support-email"
          >
            <div className="w-12 h-12 bg-[#2a1a1a] rounded-lg flex items-center justify-center mb-4 mx-auto group-hover:bg-[#3a1a1a] transition-colors">
              <Mail size={22} className="text-orange-500" />
            </div>
            <h3 className="text-white font-semibold mb-1">Email Us</h3>
            <p className="text-[#e34c26] text-sm font-medium">support@Train-Tracklog.com</p>
          </a>

          {/* Phone (Text Only) */}
          <a
            href="sms:0498874917"
            className="bg-[#1a1a1c] border border-gray-800 rounded-lg p-6 hover:border-orange-500/30 transition-all duration-300 group text-center"
            data-testid="support-phone"
          >
            <div className="w-12 h-12 bg-[#2a1a1a] rounded-lg flex items-center justify-center mb-4 mx-auto group-hover:bg-[#3a1a1a] transition-colors">
              <MessageCircle size={22} className="text-orange-500" />
            </div>
            <h3 className="text-white font-semibold mb-1">Text Us</h3>
            <p className="text-[#e34c26] text-sm font-medium">0498 874 917</p>
            <p className="text-gray-500 text-xs mt-1">Text messages only</p>
          </a>
        </div>
      </div>
    </section>
  );
};

export default SupportSection;
