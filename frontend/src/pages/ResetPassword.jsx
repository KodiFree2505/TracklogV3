import React, { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { LayoutGrid, Lock, Eye, EyeOff, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import safeFetch from '../lib/safeFetch';

const API = '/api';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
    if (password !== confirmPassword) { setError('Passwords do not match'); return; }

    setLoading(true);
    try {
      const res = await safeFetch(`${API}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, new_password: password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Reset failed');
      setSuccess(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-[#0f0f10] flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <AlertCircle size={48} className="text-red-500 mx-auto mb-4" />
          <h1 className="text-white text-xl font-bold mb-2">Invalid Reset Link</h1>
          <p className="text-gray-400 text-sm mb-6">This link is missing a reset token. Please request a new one.</p>
          <Link to="/auth" className="text-[#e34c26] hover:underline text-sm font-medium">Back to Sign In</Link>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-[#0f0f10] flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <CheckCircle size={48} className="text-green-500 mx-auto mb-4" />
          <h1 className="text-white text-xl font-bold mb-2">Password Reset</h1>
          <p className="text-gray-400 text-sm mb-6">Your password has been reset. You can now sign in with your new password.</p>
          <Link to="/auth" className="inline-block bg-[#e34c26] hover:bg-[#d14020] text-white font-semibold text-sm px-6 py-2.5 rounded-lg transition-colors" data-testid="go-to-signin">
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f0f10] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 mb-8 justify-center">
          <LayoutGrid size={28} strokeWidth={2.5} className="text-[#e34c26]" />
          <span className="text-[#e34c26] font-bold text-xl tracking-wider uppercase">TrackLog</span>
        </div>

        <h1 className="text-white text-2xl font-bold mb-2 text-center">Set New Password</h1>
        <p className="text-gray-400 text-sm mb-8 text-center">Enter your new password below.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label className="text-gray-300 text-sm">New Password</Label>
            <div className="relative mt-1">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
              <Input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                placeholder="Min 6 characters"
                className="pl-10 pr-10 h-12 bg-[#1a1a1c] border-gray-700 text-white placeholder:text-gray-500 focus:border-[#e34c26]"
                required
                data-testid="new-password"
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div>
            <Label className="text-gray-300 text-sm">Confirm Password</Label>
            <div className="relative mt-1">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
              <Input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => { setConfirmPassword(e.target.value); setError(''); }}
                placeholder="Re-enter password"
                className="pl-10 h-12 bg-[#1a1a1c] border-gray-700 text-white placeholder:text-gray-500 focus:border-[#e34c26]"
                required
                data-testid="confirm-password"
              />
            </div>
          </div>

          {error && (
            <div className="text-red-500 text-sm bg-red-500/10 p-3 rounded-lg" data-testid="reset-error">{error}</div>
          )}

          <Button type="submit" disabled={loading} className="w-full h-12 bg-[#e34c26] hover:bg-[#d14020] text-white font-semibold text-sm uppercase tracking-wider rounded-lg" data-testid="reset-submit">
            {loading ? 'Resetting...' : 'Reset Password'}
          </Button>
        </form>

        <p className="mt-6 text-center">
          <Link to="/auth" className="text-gray-500 hover:text-gray-300 text-sm">Back to Sign In</Link>
        </p>
      </div>
    </div>
  );
}
