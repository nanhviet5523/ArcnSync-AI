import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Check } from 'lucide-react';
import { Logo } from '@/components/common';

export const AcceptInvitation: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // State param from URL: 'default' | 'error' | 'success' | 'expired'
  const stateQuery = searchParams.get('state');

  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [agreeTerms, setAgreeTerms] = useState<boolean>(false);
  const [hasError, setHasError] = useState<boolean>(stateQuery === 'error');
  const [notice, setNotice] = useState('');
  const isExpired = stateQuery === 'expired';

  // Validation rules
  const hasMinLength = password.length >= 8;
  const hasNumber = /\d/.test(password);
  const hasUppercase = /[A-Z]/.test(password);

  // Strength score
  const strengthScore =
    (hasMinLength ? 1 : 0) + (hasNumber ? 1 : 0) + (hasUppercase ? 1 : 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      setHasError(true);
      return;
    }

    if (!agreeTerms) {
      setNotice('Please agree to the terms of use.');
      return;
    }

    setHasError(false);
    setNotice('Invitation acceptance is not connected yet. The /auth/accept-invite endpoint is still pending.');
  };

  return (
    <div className="min-h-screen bg-slate-50/60 font-sans flex flex-col justify-between">
      {/* Minimal Public Top Header */}
      <header className="bg-white border-b border-slate-200/80">
        <div className="w-full max-w-[1440px] mx-auto px-6 lg:px-12 h-16 flex items-center">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="cursor-pointer hover:opacity-90 transition-opacity"
            aria-label="ArchSync AI home"
          >
            <Logo size={32} />
          </button>
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
            <div className="mt-5 p-4 rounded-2xl border border-slate-200/80 bg-slate-50/60 flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                LT
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-slate-900 leading-tight">
                  Le Trang
                </div>
                <div className="text-xs text-slate-500 leading-tight mt-0.5">
                  trang@archsync.vn
                </div>
                <div className="mt-1">
                  <span className="inline-block px-2 py-0.5 bg-blue-50 text-blue-600 text-[10px] font-semibold rounded-full border border-blue-100/70">
                    Designer
                  </span>
                </div>
              </div>
            </div>

            {/* Set Password Form */}
            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              {/* Password */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Confirm password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (hasError) setHasError(false);
                  }}
                  placeholder="Re-enter password"
                  className={`w-full px-3.5 py-2.5 border rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none transition ${
                    hasError
                      ? 'border-red-400 ring-1 ring-red-400 bg-red-50/20'
                      : 'border-slate-200 focus:ring-1 focus:ring-blue-500'
                  }`}
                />
                {/* Error Message (Image 3) */}
                {hasError && (
                  <p className="text-xs text-red-500 font-medium mt-1.5 animate-in fade-in duration-150">
                    Passwords do not match.
                  </p>
                )}
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
                    onClick={() => setAgreeTerms(!agreeTerms)}
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

              {/* Submit Button */}
              {notice && <p role="status" className="text-xs font-medium text-amber-700">{notice}</p>}
              <button
                type="submit"
                className="w-full mt-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-xs rounded-xl shadow-xs transition cursor-pointer"
              >
                Accept invitation
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
