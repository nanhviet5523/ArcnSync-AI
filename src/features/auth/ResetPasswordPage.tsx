import React, { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Logo, PasswordInput } from '@/components/common';
import { resetPassword } from '@/services/authService';
import { PENDING_RESET_EMAIL_KEY } from './ForgotPasswordPage';

const MIN_PASSWORD_LENGTH = 8;

type FieldErrors = { otp?: string; newPassword?: string; confirmPassword?: string };

export const ResetPasswordPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const stateEmail = (location.state as { email?: string } | null)?.email;
  const [email] = useState(() => {
    if (stateEmail) return stateEmail;
    try {
      return window.sessionStorage.getItem(PENDING_RESET_EMAIL_KEY) ?? '';
    } catch {
      return '';
    }
  });

  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  // Reached without going through /forgot-password: nothing to reset.
  if (!email) return <Navigate to="/forgot-password" replace />;

  const clearFieldError = (field: keyof FieldErrors) =>
    setFieldErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev));

  const inputClass = (field: keyof FieldErrors) =>
    `w-full px-4 py-3 text-sm rounded-xl border focus:outline-none focus:ring-2 focus:border-transparent transition placeholder:text-slate-400 ${
      fieldErrors[field] ? 'border-red-400 focus:ring-red-500' : 'border-slate-200 focus:ring-blue-600'
    }`;

  const renderError = (field: keyof FieldErrors) =>
    fieldErrors[field] ? (
      <p role="alert" className="mt-1 text-xs font-medium text-red-600">
        {fieldErrors[field]}
      </p>
    ) : null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const errors: FieldErrors = {};
    if (!otp.trim()) errors.otp = 'Please enter the OTP code';
    if (!newPassword) errors.newPassword = 'Please enter a new password';
    else if (newPassword.length < MIN_PASSWORD_LENGTH)
      errors.newPassword = `Password must be at least ${MIN_PASSWORD_LENGTH} characters`;
    if (!confirmPassword) errors.confirmPassword = 'Please confirm your new password';
    else if (newPassword !== confirmPassword) errors.confirmPassword = 'Passwords do not match';
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setLoading(true);
    try {
      const res = await resetPassword({ email, otp: otp.trim(), newPassword });
      try {
        window.sessionStorage.removeItem(PENDING_RESET_EMAIL_KEY);
      } catch {
        // ignore
      }
      setSuccess(res.message);
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
          <Logo size={38} to="/" />
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-2">Reset your password</h1>
        <p className="text-sm text-slate-500 mb-6 leading-relaxed">
          We sent an OTP code to <span className="font-bold text-slate-900">{email}</span>. Enter it below with
          your new password.
        </p>

        <form onSubmit={handleSubmit} noValidate className="space-y-3.5">
          <div>
            <label className="block text-xs font-bold text-slate-900 mb-1.5 uppercase tracking-wide">OTP code</label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="Enter OTP code"
              value={otp}
              onChange={(e) => {
                setOtp(e.target.value.replace(/\D/g, ''));
                clearFieldError('otp');
              }}
              className={inputClass('otp')}
            />
            {renderError('otp')}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-900 mb-1.5 uppercase tracking-wide">
              New password
            </label>
            <PasswordInput
              placeholder="At least 8 characters"
              value={newPassword}
              onChange={(e) => {
                setNewPassword(e.target.value);
                clearFieldError('newPassword');
              }}
              className={inputClass('newPassword')}
            />
            {renderError('newPassword')}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-900 mb-1.5 uppercase tracking-wide">
              Confirm new password
            </label>
            <PasswordInput
              placeholder="Re-enter new password"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                clearFieldError('confirmPassword');
              }}
              className={inputClass('confirmPassword')}
            />
            {renderError('confirmPassword')}
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
            {loading ? 'Resetting...' : 'Reset Password'}
          </button>
        </form>

        <p className="text-center text-sm text-slate-500 mt-4">
          <Link to="/login" className="font-bold text-blue-600 hover:underline">Back to Login</Link>
        </p>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
