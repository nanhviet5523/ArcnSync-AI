import React, { useState, FormEvent } from 'react';
import { Logo } from '@/components/common/Logo';

interface SignUpFormProps {
  onLoginClick?: () => void;
}

export const SignUpForm: React.FC<SignUpFormProps> = ({ onLoginClick }) => {
  const [role, setRole] = useState<'homeowner' | 'company' | 'partner'>('homeowner');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    console.log('SignUp Submit:', {
      role,
      fullName,
      email,
      phone,
      password,
      confirmPassword,
      agreeTerms,
    });
  };

  return (
    <div className="w-full max-w-[480px] mx-auto flex flex-col justify-center h-full py-2">
      {/* Logo */}
      <div className="mb-5">
        <Logo size={38} />
      </div>

      {/* Header Title */}
      <h1 className="text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight mb-2">
        Create your account
      </h1>
      <p className="text-sm lg:text-base text-slate-500 mb-5 leading-relaxed">
        Homeowners sign up here. Team and partners join by invite.
      </p>

      {/* Role Selection */}
      <div className="mb-4">
        <label className="block text-xs font-bold text-slate-900 mb-2 uppercase tracking-wide">
          Create account as
        </label>
        <div className="grid grid-cols-3 gap-2.5">
          {/* Option 1: Homeowner */}
          <button
            type="button"
            onClick={() => setRole('homeowner')}
            className={`p-3 rounded-xl text-left border transition ${
              role === 'homeowner'
                ? 'border-blue-600 bg-blue-50/50'
                : 'border-slate-200 bg-white'
            }`}
          >
            <div className={`text-xs font-bold ${role === 'homeowner' ? 'text-blue-700' : 'text-slate-800'}`}>
              Homeowner
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">Plan my project</div>
          </button>

          {/* Option 2: Company team */}
          <button
            type="button"
            disabled
            className="p-3 rounded-xl text-left border border-slate-100 bg-slate-50 opacity-60 cursor-not-allowed"
          >
            <div className="text-xs font-semibold text-slate-400">Company team</div>
            <div className="text-[11px] text-slate-300 mt-0.5">Invite only</div>
          </button>

          {/* Option 3: Partner */}
          <button
            type="button"
            disabled
            className="p-3 rounded-xl text-left border border-slate-100 bg-slate-50 opacity-60 cursor-not-allowed"
          >
            <div className="text-xs font-semibold text-slate-400">Partner</div>
            <div className="text-[11px] text-slate-300 mt-0.5">Invite only</div>
          </button>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-3.5">
        <div>
          <label className="block text-xs font-bold text-slate-900 mb-1.5 uppercase tracking-wide">
            Full name
          </label>
          <input
            type="text"
            placeholder="Nguyen Van A"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full px-4 py-3 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition placeholder:text-slate-400"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-900 mb-1.5 uppercase tracking-wide">
              Email
            </label>
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition placeholder:text-slate-400"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-900 mb-1.5 uppercase tracking-wide">
              Phone number
            </label>
            <input
              type="tel"
              placeholder="+84 9xx xxx xxx"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-4 py-3 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition placeholder:text-slate-400"
            />
          </div>
        </div>

        {/* Password & Confirm Password 2 cột */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-900 mb-1.5 uppercase tracking-wide">
              Password
            </label>
            <input
              type="password"
              placeholder="Create a password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition placeholder:text-slate-400"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-900 mb-1.5 uppercase tracking-wide">
              Confirm password
            </label>
            <input
              type="password"
              placeholder="Re-enter password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-3 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition placeholder:text-slate-400"
            />
          </div>
        </div>

        {/* Checkbox Terms */}
        <div className="pt-1">
          <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700">
            <input
              type="checkbox"
              checked={agreeTerms}
              onChange={(e) => setAgreeTerms(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
            />
            <span>
              I agree to the{' '}
              <a href="#terms" className="font-bold text-blue-600 hover:underline">
                Terms of Service
              </a>{' '}
              and{' '}
              <a href="#privacy" className="font-bold text-blue-600 hover:underline">
                Privacy Policy
              </a>
            </span>
          </label>
        </div>

        {/* Create Account Button */}
        <button
          type="submit"
          className="w-full py-3.5 bg-[#0B132B] hover:bg-slate-900 text-white font-bold text-sm rounded-xl shadow-md transition duration-200 mt-1"
        >
          Create Account
        </button>
      </form>

      {/* Divider */}
      <div className="relative my-4 flex items-center justify-center">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-200" />
        </div>
        <span className="relative bg-white px-3 text-xs text-slate-400 uppercase tracking-widest">
          or
        </span>
      </div>

      {/* Google Sign Up */}
      <button
        type="button"
        className="w-full py-3.5 px-4 border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-sm rounded-xl flex items-center justify-center gap-3 transition"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
          />
        </svg>
        <span>Continue with Google</span>
      </button>

      {/* Login Link */}
      <p className="text-center text-sm text-slate-500 mt-4">
        Already have an account?{' '}
        <button
          type="button"
          onClick={onLoginClick}
          className="font-bold text-blue-600 hover:underline"
        >
          Login
        </button>
      </p>
    </div>
  );
};