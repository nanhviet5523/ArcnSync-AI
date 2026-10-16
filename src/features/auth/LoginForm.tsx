import React, { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Logo } from '@/components/common';
import { ApiError, loginUser, saveSession } from '@/services/authService';
import { ROLE_CONFIG } from '@/types/role';

interface LoginFormProps {
  onSignUpClick?: () => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onSignUpClick }) => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const response = await loginUser({ email: email.trim(), password });
      const user = saveSession(response, rememberMe);
      navigate(ROLE_CONFIG[user.role].defaultPath, { replace: true });
    } catch (err) {
      setError(err instanceof ApiError || err instanceof Error ? err.message : 'Login failed. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-[480px] mx-auto flex flex-col justify-center min-h-full py-6">
      {/* Logo */}
      <div className="mb-6">
        <Logo size={38} />
      </div>

      {/* Header Title */}
      <h1 className="text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight mb-2">
        Welcome back
      </h1>
      <p className="text-sm lg:text-base text-slate-500 mb-6 leading-relaxed">
        Log in to follow your project and collaborate with our design team.
      </p>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Email Input */}
        <div>
          <label className="block text-xs font-bold text-slate-900 mb-2 uppercase tracking-wide">
            Email
          </label>
          <input
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition placeholder:text-slate-400"
          />
        </div>

        {/* Password Input */}
        <div>
          <label className="block text-xs font-bold text-slate-900 mb-2 uppercase tracking-wide">
            Password
          </label>
          <input
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition placeholder:text-slate-400"
          />
        </div>

        {/* Remember Me & Forgot Password */}
        <div className="flex items-center justify-between pt-1">
          <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
            />
            <span>Remember me</span>
          </label>
          <a
            href="#forgot"
            className="text-sm font-bold text-blue-600 hover:text-blue-700 transition"
          >
            Forgot password?
          </a>
        </div>

        {/* Login Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3.5 bg-[#0B132B] hover:bg-slate-900 text-white font-bold text-sm rounded-xl shadow-md transition duration-200 mt-2 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? 'Logging in...' : 'Login'}
        </button>
        {error && <p role="alert" className="text-sm font-medium text-rose-600">{error}</p>}
      </form>

      {/* Link Sign Up */}
      <p className="text-center text-sm text-slate-500 my-4">
        Don't have an account?{' '}
        <button
          type="button"
          onClick={onSignUpClick}
          className="font-bold text-blue-600 hover:underline"
        >
          Sign Up
        </button>
      </p>

      {/* Role Access Notice Box */}
      <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 text-xs lg:text-sm text-slate-500 leading-relaxed mb-4">
        <p className="mb-2">
          Access follows your role. Homeowners see only their own projects. Team and partners use company-issued accounts.
        </p>
        <a
          href="#company-login"
          className="font-bold text-blue-600 hover:underline inline-flex items-center gap-1"
        >
          Company team or partner? Log in here →
        </a>
      </div>

      {/* Footer Copyright */}
      <div className="text-xs text-slate-400">
        © 2026 ArchSync AI
      </div>
    </div>
  );
};
