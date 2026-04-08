import React, { useState } from 'react';
import { Sparkles, Loader2, RefreshCw } from 'lucide-react';
import safeFetch from '../../lib/safeFetch';

const API = '/api';

export default function AiSummary({ analytics, stats, userName }) {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const generateSummary = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await safeFetch(`${API}/ai/analytics-summary`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ analytics, stats, user_name: userName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to generate summary');
      setSummary(data.summary);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#1a1a1c] border border-gray-800 rounded-lg p-4 md:p-6 relative overflow-hidden" data-testid="ai-summary">
      {/* Subtle gradient accent */}
      <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-orange-500 via-yellow-500 to-orange-500" />

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-yellow-500 rounded-lg flex items-center justify-center">
            <Sparkles size={16} className="text-white" />
          </div>
          <div>
            <h3 className="text-white font-semibold text-sm md:text-base">AI Insights</h3>
            <p className="text-gray-500 text-[10px] md:text-xs">Powered by GPT</p>
          </div>
        </div>
        {summary && (
          <button
            onClick={generateSummary}
            disabled={loading}
            className="text-gray-500 hover:text-orange-400 transition-colors p-1"
            title="Regenerate"
            data-testid="regenerate-summary"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        )}
      </div>

      {!summary && !loading && !error && (
        <div className="text-center py-4">
          <p className="text-gray-400 text-sm mb-4">
            Get an AI-powered analysis of your trainspotting patterns and trends.
          </p>
          <button
            onClick={generateSummary}
            disabled={loading}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-medium text-sm px-5 py-2.5 rounded-lg transition-all"
            data-testid="generate-summary-btn"
          >
            <Sparkles size={16} />
            Generate AI Summary
          </button>
        </div>
      )}

      {loading && (
        <div className="flex items-center gap-3 py-6 justify-center">
          <Loader2 size={20} className="text-orange-500 animate-spin" />
          <span className="text-gray-400 text-sm">Analyzing your spotting data...</span>
        </div>
      )}

      {error && (
        <div className="text-center py-4">
          <p className="text-red-400 text-sm mb-3">{error}</p>
          <button
            onClick={generateSummary}
            className="text-orange-400 hover:text-orange-300 text-sm underline"
          >
            Try again
          </button>
        </div>
      )}

      {summary && !loading && (
        <div className="text-gray-300 text-sm leading-relaxed whitespace-pre-line" data-testid="ai-summary-text">
          {summary}
        </div>
      )}
    </div>
  );
}
