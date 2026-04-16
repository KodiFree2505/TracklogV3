import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Loader2, RefreshCw, Send, User } from 'lucide-react';
import safeFetch from '../../lib/safeFetch';

const API = '/api';

function AiMessage({ text }) {
  return (
    <div className="flex gap-3 items-start">
      <div className="w-7 h-7 flex-shrink-0 bg-gradient-to-br from-orange-500 to-yellow-500 rounded-lg flex items-center justify-center mt-0.5">
        <Sparkles size={13} className="text-white" />
      </div>
      <div className="text-gray-300 text-sm leading-relaxed whitespace-pre-line flex-1" data-testid="ai-message">
        {text}
      </div>
    </div>
  );
}

function UserMessage({ text }) {
  return (
    <div className="flex gap-3 items-start justify-end">
      <div className="bg-[#252528] border border-gray-700/50 rounded-lg px-3.5 py-2.5 max-w-[85%]">
        <p className="text-gray-200 text-sm leading-relaxed">{text}</p>
      </div>
      <div className="w-7 h-7 flex-shrink-0 bg-gray-700 rounded-lg flex items-center justify-center mt-0.5">
        <User size={13} className="text-gray-300" />
      </div>
    </div>
  );
}

export default function AiSummary({ analytics, stats, userName }) {
  const [messages, setMessages] = useState([]);
  const [chatSessionId, setChatSessionId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [replyLoading, setReplyLoading] = useState(false);
  const [error, setError] = useState('');
  const [input, setInput] = useState('');
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, replyLoading]);

  const generateSummary = async () => {
    setLoading(true);
    setError('');
    setMessages([]);
    setChatSessionId(null);
    try {
      const res = await safeFetch(`${API}/ai/analytics-summary`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ analytics, stats, user_name: userName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to generate summary');
      setMessages([{ role: 'ai', text: data.summary }]);
      setChatSessionId(data.chat_session_id);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const sendReply = async () => {
    const msg = input.trim();
    if (!msg || !chatSessionId || replyLoading) return;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: msg }]);
    setReplyLoading(true);
    try {
      const res = await safeFetch(`${API}/ai/analytics-reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ chat_session_id: chatSessionId, message: msg }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Reply failed');
      setMessages(prev => [...prev, { role: 'ai', text: data.reply }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'ai', text: `Sorry, something went wrong: ${err.message}` }]);
    } finally {
      setReplyLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendReply();
    }
  };

  const hasConversation = messages.length > 0;

  return (
    <div className="bg-[#1a1a1c] border border-gray-800 rounded-lg relative overflow-hidden" data-testid="ai-summary">
      <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-orange-500 via-yellow-500 to-orange-500" />

      {/* Header */}
      <div className="flex items-center justify-between p-4 md:px-6 md:pt-6 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-yellow-500 rounded-lg flex items-center justify-center">
            <Sparkles size={16} className="text-white" />
          </div>
          <div>
            <h3 className="text-white font-semibold text-sm md:text-base">AI Insights</h3>
            <p className="text-gray-500 text-[10px] md:text-xs">Powered by GPT</p>
          </div>
        </div>
        {hasConversation && (
          <button
            onClick={generateSummary}
            disabled={loading || replyLoading}
            className="text-gray-500 hover:text-orange-400 transition-colors p-1"
            title="New summary"
            data-testid="regenerate-summary"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        )}
      </div>

      {/* Initial state */}
      {!hasConversation && !loading && !error && (
        <div className="text-center py-4 px-4 md:px-6 pb-6">
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

      {/* Loading initial summary */}
      {loading && (
        <div className="flex items-center gap-3 py-6 justify-center px-4">
          <Loader2 size={20} className="text-orange-500 animate-spin" />
          <span className="text-gray-400 text-sm">Analyzing your spotting data...</span>
        </div>
      )}

      {/* Error */}
      {error && !hasConversation && (
        <div className="text-center py-4 px-4 pb-6">
          <p className="text-red-400 text-sm mb-3">{error}</p>
          <button onClick={generateSummary} className="text-orange-400 hover:text-orange-300 text-sm underline">
            Try again
          </button>
        </div>
      )}

      {/* Conversation thread */}
      {hasConversation && !loading && (
        <>
          <div
            ref={scrollRef}
            className="px-4 md:px-6 space-y-4 overflow-y-auto"
            style={{ maxHeight: '360px' }}
            data-testid="ai-conversation"
          >
            {messages.map((m, i) =>
              m.role === 'ai' ? <AiMessage key={i} text={m.text} /> : <UserMessage key={i} text={m.text} />
            )}
            {replyLoading && (
              <div className="flex gap-3 items-start">
                <div className="w-7 h-7 flex-shrink-0 bg-gradient-to-br from-orange-500 to-yellow-500 rounded-lg flex items-center justify-center">
                  <Sparkles size={13} className="text-white" />
                </div>
                <div className="flex items-center gap-2">
                  <Loader2 size={16} className="text-orange-500 animate-spin" />
                  <span className="text-gray-500 text-xs">Thinking...</span>
                </div>
              </div>
            )}
          </div>

          {/* Reply input */}
          <div className="p-4 md:px-6 md:pb-5 pt-3">
            <div className="flex items-center gap-2 bg-[#0f0f10] border border-gray-700/50 rounded-lg px-3 py-1.5 focus-within:border-orange-500/50 transition-colors">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask a follow-up question..."
                disabled={replyLoading}
                className="flex-1 bg-transparent text-white text-sm placeholder-gray-500 outline-none py-1.5"
                data-testid="ai-reply-input"
              />
              <button
                onClick={sendReply}
                disabled={!input.trim() || replyLoading}
                className="text-gray-500 hover:text-orange-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors p-1"
                data-testid="ai-reply-send"
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
