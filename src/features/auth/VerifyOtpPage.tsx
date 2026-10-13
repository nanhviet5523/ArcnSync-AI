import React, { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Logo } from '@/components/common/Logo';
import { verifyEmail } from '@/services/authService';

const PENDING_EMAIL_KEY = 'archsync-pending-verify-email';

export const VerifyOtpPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const stateEmail = (location.state as { email?: string } | null)?.email;
  const [email] = useState(() => {
    if (stateEmail) return stateEmail;
    try {
      return window.sessionStorage.getItem(PENDING_EMAIL_KEY) ?? '';
    } catch {
      return '';
    }
  });

  useEffect(() => {
    if (!stateEmail) return;
    try {
      window.sessionStorage.setItem(PENDING_EMAIL_KEY, stateEmail);
    } catch {
      // sessionStorage unavailable; email stays in router state only
    }
  }, [stateEmail]);

  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!email) {
      setError('Missing email. Please sign up again.');
      return;
    }
    if (!otp.trim()) {
      setError('Please enter the OTP code.');
      return;
    }

    setLoading(true);
    try {
      const res = await verifyEmail({ otp: otp.trim(), email });
      setSuccess(res.message);
      try {
        window.sessionStorage.removeItem(PENDING_EMAIL_KEY);
      } catch {
        // ignore
      }
      setTimeout(() => navigate('/login', { replace: true }), 1500);
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
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-2">Verify your email</h1>
        <p className="text-sm text-slate-500 mb-6 leading-relaxed">
          We sent an OTP code to <span className="font-bold text-slate-900">{email || 'your email'}</span>.
          Enter it below to activate your account.
        </p>
        <form onSubmit={handleSubmit} className="space-y-3.5">
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            placeholder="Enter OTP code"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
            className="w-full px-4 py-3 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition"
          />
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
            {loading && (
              <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            )}
            {loading ? 'Verifying...' : 'Verify'}
          </button>
        </form>
        <p className="text-center text-sm text-slate-500 mt-4">
          <Link to="/login" className="font-bold text-blue-600 hover:underline">Back to login</Link>
        </p>
      </div>
    </div>
  );
};

export default VerifyOtpPage;
