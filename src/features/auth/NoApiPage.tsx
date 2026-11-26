import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Construction } from 'lucide-react';
import { Logo } from '@/components/common';

/**
 * Trang thông báo "chưa hỗ trợ" (route /no-api) — đích tạm thời cho các nút
 * chưa có backend thật, ví dụ "Continue with Google" (chưa tích hợp Google OAuth).
 */
export const NoApiPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="flex w-full min-h-screen items-center justify-center bg-surface p-8 font-sans">
      <div className="w-full max-w-[420px] text-center">
        <div className="mb-6 flex justify-center">
          <Logo size={38} to="/" />
        </div>

        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
          <Construction size={26} />
        </div>

        <h1 className="mb-2 text-2xl font-extrabold tracking-tight text-ink">
          This feature isn't available yet
        </h1>
        <p className="mb-8 text-sm leading-relaxed text-slate-500">
          We're still working on this integration. Please sign in with your email and password for now.
        </p>

        <button
          type="button"
          onClick={() => navigate('/login')}
          className="w-full rounded-xl bg-brand py-3.5 text-sm font-bold text-white shadow-md transition duration-200 hover:bg-brand-hover"
        >
          Back to login
        </button>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mt-3 w-full rounded-xl border border-control bg-surface py-3.5 text-sm font-bold text-ink transition hover:bg-sand-50"
        >
          Go back
        </button>
      </div>
    </div>
  );
};

export default NoApiPage;
