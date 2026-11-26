import React, { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Logo } from '@/components/common/Logo';
import { ApiError, resendOtp, verifyEmail } from '@/services/authService';

const PENDING_EMAIL_KEY = 'archsync-pending-verify-email';
const RESEND_COOLDOWN_SECONDS = 20;

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

  // Đếm ngược "Resend OTP": bắt đầu 20s ngay khi vào trang, reset lại mỗi lần gửi lại thành công.
  const [resendCountdown, setResendCountdown] = useState(RESEND_COOLDOWN_SECONDS);
  const [resending, setResending] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    if (resendCountdown <= 0) return;
    // setTimeout tự lặp lại mỗi giây (thay vì setInterval) nên luôn khớp với dependency array
    // và tự dừng khi resendCountdown chạm 0, không cần dọn dẹp thủ công thêm.
    const timer = setTimeout(() => setResendCountdown((seconds) => seconds - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCountdown]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(timer);
  }, [toast]);

  const handleResend = async () => {
    if (resendCountdown > 0 || resending) return;

    if (!email) {
      setToast({ type: 'error', message: 'Missing email. Please sign up again.' });
      return;
    }

    setResending(true);
    try {
      await resendOtp({ email });
      setToast({ type: 'success', message: 'Đã gửi lại mã OTP mới' });
      setResendCountdown(RESEND_COOLDOWN_SECONDS);
    } catch (err) {
      setToast({
        type: 'error',
        message: err instanceof ApiError ? err.message : 'Could not resend the OTP code. Please try again.',
      });
    } finally {
      setResending(false);
    }
  };

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
    <div className="flex w-full min-h-screen items-center justify-center bg-surface p-8 font-sans">
      {toast && (
        <div
          role={toast.type === 'error' ? 'alert' : 'status'}
          className={`fixed right-4 top-4 z-[80] max-w-sm rounded-xl border px-4 py-3 text-sm font-medium shadow-lg ${
            toast.type === 'success'
              ? 'border-emerald-100 bg-emerald-50 text-emerald-800'
              : 'border-red-100 bg-red-50 text-red-700'
          }`}
        >
          {toast.message}
        </div>
      )}
      <div className="w-full max-w-[420px]">
        <div className="mb-6">
          <Logo size={38} to="/" />
        </div>
        <h1 className="text-3xl font-extrabold text-ink tracking-tight mb-2">Verify your email</h1>
        <p className="text-sm text-slate-500 mb-6 leading-relaxed">
          We sent an OTP code to <span className="font-bold text-ink">{email || 'your email'}</span>.
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
            className="w-full px-4 py-3 text-sm rounded-xl border border-control bg-sand-100 text-ink placeholder:text-subtext focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-soft focus-visible:border-brand transition"
          />
          <div className="text-center">
            {resendCountdown > 0 ? (
              <span className="text-xs font-medium text-subtext">
                Gửi lại sau ({resendCountdown}s)
              </span>
            ) : (
              <button
                type="button"
                onClick={() => void handleResend()}
                disabled={resending}
                className="text-xs font-bold text-brand-text hover:underline disabled:cursor-not-allowed disabled:text-subtext disabled:no-underline"
              >
                {resending ? 'Đang gửi…' : 'Resend OTP'}
              </button>
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
            className="w-full py-3.5 bg-brand hover:bg-brand-hover active:bg-brand-hover text-white font-bold text-sm rounded-xl shadow-md transition duration-200 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading && (
              <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            )}
            {loading ? 'Verifying...' : 'Verify'}
          </button>
        </form>
        <p className="text-center text-sm text-slate-500 mt-4">
          <Link to="/login" className="font-bold text-brand-text hover:underline">Back to login</Link>
        </p>
      </div>
    </div>
  );
};

export default VerifyOtpPage;
