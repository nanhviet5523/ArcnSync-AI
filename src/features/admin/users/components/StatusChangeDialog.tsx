import React, { useEffect, useState } from 'react';
import { updateAdminUserStatus } from '../usersApi';
import { STATUS_ACTION_META } from '../statusActions';
import type { StatusAction } from '../types';

export interface StatusChangeTarget {
  id: string;
  email: string;
  action: StatusAction;
}

interface StatusChangeDialogProps {
  target: StatusChangeTarget | null; // null = closed
  onClose: () => void;
  onChanged: () => void;
}

export const StatusChangeDialog: React.FC<StatusChangeDialogProps> = ({ target, onClose, onChanged }) => {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setSubmitting(false);
    setError('');
  }, [target]);

  useEffect(() => {
    if (!target) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !submitting) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [target, submitting, onClose]);

  if (!target) return null;

  const meta = STATUS_ACTION_META[target.action];
  const confirmClass =
    meta.tone === 'danger' ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700';

  const handleConfirm = async () => {
    setError('');
    setSubmitting(true);
    try {
      await updateAdminUserStatus(target.id, target.action);
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update the user status. Please try again.');
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/50 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !submitting) onClose();
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="status-change-title"
        aria-describedby="status-change-desc"
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
      >
        <h2 id="status-change-title" className="text-lg font-bold text-slate-900">{meta.label} account</h2>
        <div id="status-change-desc">
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Are you sure you want to {meta.verb} the account{' '}
            <span className="break-all font-semibold text-slate-900">{target.email}</span>?
          </p>
          <p
            className={`mt-3 rounded-lg px-3 py-2 text-sm ${
              meta.tone === 'danger' ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700'
            }`}
          >
            {meta.warning}
          </p>
        </div>

        {error && (
          <p role="alert" className="mt-4 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm font-medium text-red-600">
            {error}
          </p>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={submitting}
            className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60 ${confirmClass}`}
          >
            {submitting && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />}
            {submitting ? 'Updating...' : meta.label}
          </button>
        </div>
      </div>
    </div>
  );
};

export default StatusChangeDialog;
