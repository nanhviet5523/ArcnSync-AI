import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Check } from 'lucide-react';
import { Logo, PasswordInput } from '@/components/common';
import { acceptInvite } from '@/services/authService';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MIN_PASSWORD_LENGTH = 8;

type FieldErrors = { email?: string; otp?: string; password?: string; confirmPassword?: string; terms?: string };

export const AcceptInvitation: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // State param from URL: 'default' | 'error' | 'success' | 'expired'
  const stateQuery = searchParams.get('state');

  // Email from the invitation link (?email=...) is locked; otherwise the user types it.
  const emailFromUrl = (searchParams.get('email') ?? '').trim();
  const [email, setEmail] = useState<string>(emailFromUrl);
  const [otp, setOtp] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [agreeTerms, setAgreeTerms] = useState<boolean>(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const isExpired = stateQuery === 'expired';
  // ?state=success previews the confirmation screen; real activation redirects to /login.
  const isSuccess = stateQuery === 'success';

  const handleGoToProjects = () => navigate('/login');

  // Validation rules
  const hasMinLength = password.length >= 8;
  const hasNumber = /\d/.test(password);
  const hasUppercase = /[A-Z]/.test(password);

  // Strength score
  const strengthScore =
    (hasMinLength ? 1 : 0) + (hasNumber ? 1 : 0) + (hasUppercase ? 1 : 0);

  const clearFieldError = (field: keyof FieldErrors) =>
    setFieldErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev));

  const inputClass = (field: keyof FieldErrors) =>
    `w-full px-3.5 py-2.5 border rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none transition ${
      fieldErrors[field]
        ? 'border-red-400 ring-1 ring-red-400 bg-red-50/20'
        : 'border-slate-200 focus:ring-1 focus:ring-blue-500'
    }`;

  const renderError = (field: keyof FieldErrors) =>
    fieldErrors[field] ? (
      <p role="alert" className="text-xs text-red-500 font-medium mt-1.5">
        {fieldErrors[field]}
      </p>
    ) : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const errors: FieldErrors = {};
    if (!email.trim()) errors.email = 'Email is required';
    else if (!EMAIL_REGEX.test(email.trim())) errors.email = 'Enter a valid email address (e.g. name@example.com)';
    if (!otp.trim()) errors.otp = 'OTP code is required';
    else if (!/^\d{6}$/.test(otp.trim())) errors.otp = 'OTP code must be 6 digits';
    if (!password) errors.password = 'Password is required';
    else if (password.length < MIN_PASSWORD_LENGTH) errors.password = `Password must be at least ${MIN_PASSWORD_LENGTH} characters`;
    if (!confirmPassword) errors.confirmPassword = 'Please confirm your password';
    else if (password !== confirmPassword) errors.confirmPassword = 'Passwords do not match';
    if (!agreeTerms) errors.terms = 'Please agree to the terms of use';
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setLoading(true);
    try {
      await acceptInvite({ email: email.trim(), otp: otp.trim(), password });
      setSuccess('Account activated successfully!');
      setTimeout(() => navigate('/login', { replace: true }), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/60 font-sans flex flex-col justify-between">
      {/* Minimal Public Top Header */}
      <header className="bg-white border-b border-slate-200/80">
        <div className="w-full max-w-[1440px] mx-auto px-6 lg:px-12 h-16 flex items-center">
          <Logo size={32} to="/" />
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex items-center justify-center p-6 py-12">
        {isExpired ? (
          /* STATE 4: EXPIRED (Image 2) */
          <div className="w-full max-w-[390px] bg-white rounded-3xl border border-slate-200/80 shadow-xs p-8 text-center animate-in fade-in zoom-in-95 duration-200">
            {/* Info Circle Icon */}
            <div className="w-11 h-11 rounded-full bg-cyan-50 text-cyan-600 flex items-center justify-center mx-auto mb-4 font-serif italic text-base font-bold">
              i
            </div>

            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
              This invitation link has expired
            </h1>
            <p className="text-xs text-slate-500 mt-2 mb-6">
              Ask your administrator to send a new invitation.
            </p>

            <button
              type="button"
              onClick={() => navigate('/login')}
              className="w-full py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-xl transition cursor-pointer shadow-2xs"
            >
              Back to sign in
            </button>
          </div>
        ) : isSuccess ? (
          /* STATE 3: SUCCESS (Image 1) */
          <div className="w-full max-w-[390px] bg-white rounded-3xl border border-slate-200/80 shadow-xs p-8 text-center animate-in fade-in zoom-in-95 duration-200">
            {/* Checkmark Circle Icon */}
            <div className="w-11 h-11 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4">
              <Check className="w-5 h-5 stroke-[2.5]" />
            </div>

            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
              Your account is ready
            </h1>
            <p className="text-xs text-slate-500 mt-2 mb-6">
              You can now sign in with your new password.
            </p>

            <button
              type="button"
              onClick={handleGoToProjects}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-xs rounded-xl shadow-xs transition cursor-pointer"
            >
              Go to sign in
            </button>
          </div>
        ) : (
          /* STATE 1 & 2: DEFAULT & ERROR (Image 4 & Image 3) */
          <div className="w-full max-w-[460px] bg-white rounded-3xl border border-slate-200/80 shadow-xs p-8 animate-in fade-in zoom-in-95 duration-200">
            {/* Logo Squircle Icon */}
            <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center mb-5 shadow-xs">
              <svg
                className="w-5 h-5 text-white"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
            </div>

            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              You're invited to ArchSync AI
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Set a password to activate your account.
            </p>

            {/* Invitee User Box */}
            {email.trim() && (
              <div className="mt-5 p-4 rounded-2xl border border-slate-200/80 bg-slate-50/60 flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0 uppercase">
                  {email.trim().charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs text-slate-500 leading-tight">Invited as</div>
                  <div className="text-xs font-bold text-slate-900 leading-tight mt-0.5 truncate">{email.trim()}</div>
                </div>
              </div>
            )}

            {/* Set Password Form */}
            <form onSubmit={handleSubmit} noValidate className="mt-5 space-y-4">
              {/* Email */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Email</label>
                <input
                  type="email"
                  value={email}
                  readOnly={!!emailFromUrl}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    clearFieldError('email');
                  }}
                  placeholder="you@example.com"
                  className={`${inputClass('email')} ${emailFromUrl ? 'bg-slate-50 text-slate-500 cursor-not-allowed' : ''}`}
                />
                {renderError('email')}
              </div>

              {/* OTP */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">OTP code</label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => {
                    setOtp(e.target.value.replace(/\D/g, ''));
                    clearFieldError('otp');
                  }}
                  placeholder="6-digit code from your email"
                  className={inputClass('otp')}
                />
                {renderError('otp')}
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Password
                </label>
                <PasswordInput
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    clearFieldError('password');
                  }}
                  placeholder="Enter your password"
                  className={inputClass('password')}
                />
                {renderError('password')}
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Confirm password
                </label>
                <PasswordInput
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    clearFieldError('confirmPassword');
                  }}
                  placeholder="Re-enter password"
                  className={inputClass('confirmPassword')}
                />
                {renderError('confirmPassword')}
              </div>

              {/* Password Strength Meter (3 segments) */}
              <div className="pt-1 flex gap-1.5">
                <div
                  className={`h-1 flex-1 rounded-full transition-colors ${
                    strengthScore >= 1 ? 'bg-blue-600' : 'bg-slate-200'
                  }`}
                />
                <div
                  className={`h-1 flex-1 rounded-full transition-colors ${
                    strengthScore >= 2 ? 'bg-blue-600' : 'bg-slate-200'
                  }`}
                />
                <div
                  className={`h-1 flex-1 rounded-full transition-colors ${
                    strengthScore >= 3 ? 'bg-blue-600' : 'bg-slate-200'
                  }`}
                />
              </div>

              {/* Requirement Checkboxes */}
              <div className="pt-2 space-y-2 text-xs text-slate-600">
                {/* At least 8 characters */}
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <div
                    className={`w-4 h-4 rounded flex items-center justify-center transition ${
                      hasMinLength
                        ? 'bg-blue-600 text-white'
                        : 'border border-slate-300 bg-white'
                    }`}
                  >
                    {hasMinLength && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                  <span className="text-[11px] font-medium text-slate-700">
                    At least 8 characters
                  </span>
                </label>

                {/* One number */}
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <div
                    className={`w-4 h-4 rounded flex items-center justify-center transition ${
                      hasNumber
                        ? 'bg-blue-600 text-white'
                        : 'border border-slate-300 bg-white'
                    }`}
                  >
                    {hasNumber && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                  <span className="text-[11px] font-medium text-slate-700">
                    One number
                  </span>
                </label>

                {/* One uppercase letter */}
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <div
                    className={`w-4 h-4 rounded flex items-center justify-center transition ${
                      hasUppercase
                        ? 'bg-blue-600 text-white'
                        : 'border border-slate-300 bg-white'
                    }`}
                  >
                    {hasUppercase && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                  <span className="text-[11px] font-medium text-slate-700">
                    One uppercase letter
                  </span>
                </label>

                {/* Agree to terms */}
                <label className="flex items-center gap-2 cursor-pointer select-none pt-1">
                  <div
                    onClick={() => {
                      setAgreeTerms(!agreeTerms);
                      clearFieldError('terms');
                    }}
                    className={`w-4 h-4 rounded flex items-center justify-center transition ${
                      agreeTerms
                        ? 'bg-blue-600 text-white'
                        : 'border border-slate-300 bg-white'
                    }`}
                  >
                    {agreeTerms && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                  <span className="text-[11px] font-medium text-slate-700">
                    I agree to the terms of use
                  </span>
                </label>
              </div>

              {renderError('terms')}

              {/* Submit Button */}
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
                className="w-full mt-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-xs rounded-xl shadow-xs transition cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading && <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
                {loading ? 'Activating...' : 'Activate Account'}
              </button>

              {/* Link expiration note */}
              <p className="text-[11px] text-slate-400 text-center pt-1 font-medium">
                This link expires in 7 days.
              </p>
            </form>
          </div>
        )}
      </main>
    </div>
  );
};

export default AcceptInvitation;
