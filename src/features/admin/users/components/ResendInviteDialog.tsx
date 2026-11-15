import React, { useEffect, useState } from 'react';
import { resendAdminUserInvitation } from '../usersApi';

export interface ResendInviteTarget {
  id: string;
  email: string;
}

interface ResendInviteDialogProps {
  target: ResendInviteTarget | null; // null = closed
  onClose: () => void;
  onSent: () => void;
}

export const ResendInviteDialog: React.FC<ResendInviteDialogProps> = ({ target, onClose, onSent }) => {
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setSending(false);
    setError('');
  }, [target]);

  useEffect(() => {
    if (!target) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !sending) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [target, sending, onClose]);

  if (!target) return null;

  const handleSend = async () => {
    setError('');
    setSending(true);
    try {
      await resendAdminUserInvitation(target.id);
      onSent();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resend the invitation. Please try again.');
      setSending(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/50 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !sending) onClose();
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="resend-invite-title"
        aria-describedby="resend-invite-desc"
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
      >
        <h2 id="resend-invite-title" className="text-lg font-bold text-slate-900">Resend invitation</h2>
        <p id="resend-invite-desc" className="mt-2 text-sm leading-6 text-slate-600">
          Are you sure you want to resend the invitation email to{' '}
          <span className="font-semibold text-slate-900 break-all">{target.email}</span>?
        </p>

        {error && (
          <p role="alert" className="mt-4 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm font-medium text-red-600">
            {error}
          </p>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={sending}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSend}
            disabled={sending}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {sending && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />}
            {sending ? 'Sending...' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ResendInviteDialog;
