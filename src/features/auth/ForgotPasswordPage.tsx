import React, { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Logo } from '@/components/common';
import { forgotPassword } from '@/services/authService';

export const PENDING_RESET_EMAIL_KEY = 'archsync-pending-reset-email';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const ForgotPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const value = email.trim();
    if (!value) {
      setEmailError('Please enter your email');
      return;
    }
    if (!EMAIL_REGEX.test(value)) {
      setEmailError('Invalid email format (e.g. name@example.com)');
      return;
    }
    setEmailError('');

    setLoading(true);
    try {
      const res = await forgotPassword(value);
      setSuccess(res.message);
      try {
        window.sessionStorage.setItem(PENDING_RESET_EMAIL_KEY, value);
      } catch {
        // sessionStorage unavailable; email is still passed via router state
      }
      setTimeout(() => navigate('/reset-password', { state: { email: value } }), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="flex w-full min-h-screen items-center justify-center bg-white p-8 font-sans">
      <div className="w-full max-w-[420px]">
        <div className="mb-6">
          <Logo size={38} />
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-2">Forgot password?</h1>
        <p className="text-sm text-slate-500 mb-6 leading-relaxed">
          Enter your account email and we will send you an OTP code to reset your password.
        </p>

        <form onSubmit={handleSubmit} noValidate className="space-y-3.5">
          <div>
            <label className="block text-xs font-bold text-slate-900 mb-1.5 uppercase tracking-wide">Email</label>
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setEmailError('');
              }}
              className={`w-full px-4 py-3 text-sm rounded-xl border focus:outline-none focus:ring-2 focus:border-transparent transition placeholder:text-slate-400 ${
                emailError ? 'border-red-400 focus:ring-red-500' : 'border-slate-200 focus:ring-blue-600'
              }`}
            />
            {emailError && (
              <p role="alert" className="mt-1 text-xs font-medium text-red-600">
                {emailError}
              </p>
            )}
          </div>
          {error && (
            <p role="alert" className="text-xs font-medium text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
          {success && (
            <p role="status" className="text-xs font-medium text-green-700 bg-green-50 border border-green-100 rounded-lg px-3 py-2">
              {success}
            </p>
          )}
          <button
            type="submit"
            disabled={loading || !!success}
            className="w-full py-3.5 bg-[#0B132B] hover:bg-slate-900 text-white font-bold text-sm rounded-xl shadow-md transition duration-200 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading && <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
            {loading ? 'Sending...' : 'Send OTP'}
          </button>
        </form>

        <p className="text-center text-sm text-slate-500 mt-4">
          <Link to="/login" className="font-bold text-blue-600 hover:underline">Back to Login</Link>
        </p>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
