import React from 'react';
import { Users } from 'lucide-react';
import { useAccountStats } from '../useAccountStats';

interface TotalAccountsCardProps {
  onClick?: () => void;
}

export const TotalAccountsCard: React.FC<TotalAccountsCardProps> = ({ onClick }) => {
  const { stats, loading, error, retry } = useAccountStats();

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.();
        }
      }}
      className="cursor-pointer rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
    >
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-blue-600">
          <Users size={20} />
        </span>
        <span className="text-sm text-slate-500">Total accounts</span>
      </div>

      {loading ? (
        <div aria-busy="true" aria-label="Loading account statistics" className="mt-4 space-y-3">
          <div className="h-9 w-24 animate-pulse rounded bg-slate-100" />
          <div className="h-4 w-40 animate-pulse rounded bg-slate-100" />
        </div>
      ) : stats ? (
        <>
          <strong className="mt-3 block text-4xl font-extrabold text-slate-900">{stats.total.toLocaleString()}</strong>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-medium text-slate-600">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Active: {stats.active.toLocaleString()}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-amber-400" />
              Invited: {stats.invited.toLocaleString()}
            </span>
          </div>
        </>
      ) : (
        <div className="mt-3">
          <strong className="block text-4xl font-extrabold text-slate-300">—</strong>
          <p title={error} className="mt-2 text-xs text-red-600">
            Could not load.{' '}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                retry();
              }}
              className="font-semibold underline hover:no-underline"
            >
              Retry
            </button>
          </p>
        </div>
      )}
    </div>
  );
};

export default TotalAccountsCard;
