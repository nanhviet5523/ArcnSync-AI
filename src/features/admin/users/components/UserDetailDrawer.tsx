import React, { useEffect, useState } from 'react';
import { Check, Copy, Mail, Pencil, X } from 'lucide-react';
import { getAdminUserById, updateDesignerAvailability } from '../usersApi';
import { Badge, ROLE_BADGE, STATUS_BADGE } from './UserBadges';
import { formatValue, isEmptyValue } from '../format';
import { STATUS_ACTION_META } from '../statusActions';
import { AvailabilitySwitch } from './AvailabilitySwitch';
import type { AdminUserDetail, StatusAction } from '../types';

const formatDate = (value: string | null | undefined) => {
  if (isEmptyValue(value)) return formatValue(value);
  const date = new Date(value as string);
  return Number.isNaN(date.getTime()) ? formatValue(value) : date.toLocaleString();
};

const Row: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="grid grid-cols-[130px_1fr] gap-3 py-2.5 text-sm">
    <dt className="text-slate-500">{label}</dt>
    <dd className="min-w-0 break-words font-medium text-slate-800">{children}</dd>
  </div>
);

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section className="mb-6">
    <h3 className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-500">{title}</h3>
    <dl className="divide-y divide-slate-100 rounded-xl border border-slate-200 px-4">{children}</dl>
  </section>
);

const CopyIdButton: React.FC<{ id: string }> = ({ id }) => {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(id);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard API unavailable (e.g. insecure context); the full ID is still selectable on screen.
    }
  };

  return (
    <button
      type="button"
      onClick={copy}
      className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50"
    >
      {copied ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
      {copied ? 'Copied' : 'Copy ID'}
    </button>
  );
};

interface AvailabilityControl {
  pending: boolean;
  onToggle: (next: boolean) => void;
}

const ProfileSection: React.FC<{ user: AdminUserDetail; availability?: AvailabilityControl }> = ({
  user,
  availability,
}) => {
  const profile = user.profile;
  if (!profile) return null;

  if (profile.type === 'DESIGNER') {
    return (
      <Section title="Designer profile">
        <Row label="Employee code">{formatValue(profile.employeeCode)}</Row>
        <Row label="Title">{formatValue(profile.title)}</Row>
        <Row label="Specialization">{formatValue(profile.specialization)}</Row>
        <Row label="Experience">
          {profile.yearsOfExperience === null || profile.yearsOfExperience === undefined
            ? '—'
            : `${profile.yearsOfExperience} year${profile.yearsOfExperience === 1 ? '' : 's'}`}
        </Row>
        <Row label="Bio">{formatValue(profile.bio)}</Row>
        <Row label="Rating">
          {formatValue(profile.ratingAvg)} ({formatValue(profile.ratingCount)} review{profile.ratingCount === 1 ? '' : 's'})
        </Row>
        <Row label="Availability">
          {availability ? (
            <AvailabilitySwitch isAvailable={profile.isAvailable} pending={availability.pending} onToggle={availability.onToggle} />
          ) : (
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                profile.isAvailable ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
              }`}
            >
              {profile.isAvailable ? 'Available' : 'Unavailable'}
            </span>
          )}
        </Row>
      </Section>
    );
  }

  if (profile.type === 'SUPPLIER') {
    return (
      <Section title="Supplier profile">
        <Row label="Company name">{formatValue(profile.companyName)}</Row>
        <Row label="Tax code">{formatValue(profile.taxCode)}</Row>
        <Row label="Business address">{formatValue(profile.businessAddress)}</Row>
        <Row label="Contact name">{formatValue(profile.contactName)}</Row>
        <Row label="Contact phone">{formatValue(profile.contactPhone)}</Row>
        <Row label="Website">
          {profile.website && !isEmptyValue(profile.website) ? (
            <a href={profile.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
              {profile.website}
            </a>
          ) : (
            '—'
          )}
        </Row>
        <Row label="Partner since">{formatValue(profile.partnerSince)}</Row>
      </Section>
    );
  }

  return null;
};

const DrawerSkeleton: React.FC = () => (
  <div aria-busy="true" aria-label="Loading user details" className="space-y-6">
    {[5, 3].map((rows, i) => (
      <div key={i} className="space-y-3 rounded-xl border border-slate-200 p-4">
        <div className="h-3 w-28 animate-pulse rounded bg-slate-100" />
        {Array.from({ length: rows }, (_, j) => (
          <div key={j} className="h-4 w-full animate-pulse rounded bg-slate-100" />
        ))}
      </div>
    ))}
  </div>
);

interface UserDetailDrawerProps {
  userId: string | null; // null = closed
  onClose: () => void;
  onEdit?: (id: string) => void;
  onResendInvite?: (user: { id: string; email: string }) => void;
  statusActions?: (user: AdminUserDetail) => StatusAction[];
  onStatusAction?: (user: { id: string; email: string }, action: StatusAction) => void;
  onAvailabilityChange?: (id: string, isAvailable: boolean) => void;
  refreshKey?: number; // bump to refetch the open user (e.g. after a status change)
}

export const UserDetailDrawer: React.FC<UserDetailDrawerProps> = ({
  userId,
  onClose,
  onEdit,
  onResendInvite,
  statusActions,
  onStatusAction,
  onAvailabilityChange,
  refreshKey = 0,
}) => {
  const [user, setUser] = useState<AdminUserDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [togglingAvailability, setTogglingAvailability] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(timer);
  }, [toast]);

  // Optimistic: flip the switch immediately, call the API, roll back on failure.
  const setAvailability = (id: string, isAvailable: boolean) =>
    setUser((prev) =>
      prev && prev.id === id && prev.profile?.type === 'DESIGNER'
        ? { ...prev, profile: { ...prev.profile, isAvailable } }
        : prev,
    );

  const handleToggleAvailability = async (next: boolean) => {
    if (!user || togglingAvailability) return;
    const id = user.id;
    setTogglingAvailability(true);
    setAvailability(id, next);
    try {
      await updateDesignerAvailability(id, next);
      onAvailabilityChange?.(id, next);
      setToast({ type: 'success', message: 'Designer availability updated successfully' });
    } catch (err) {
      setAvailability(id, !next);
      setToast({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to update availability. Please try again.',
      });
    } finally {
      setTogglingAvailability(false);
    }
  };

  useEffect(() => {
    if (!userId) return;
    let ignore = false; // a newer click (or close) must not be overwritten by a slow response
    setUser((prev) => (prev && prev.id === userId ? prev : null));
    setError('');
    setLoading(true);
    getAdminUserById(userId)
      .then((res) => {
        if (!ignore) setUser(res);
      })
      .catch((err) => {
        if (!ignore) setError(err instanceof Error ? err.message : 'Failed to load user details.');
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [userId, reloadKey, refreshKey]);

  useEffect(() => {
    if (!userId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [userId, onClose]);

  if (!userId) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="User details"
        className="flex h-full w-full max-w-md flex-col bg-white shadow-xl"
      >
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 p-5">
          <div className="min-w-0">
            {user ? (
              <>
                <h2 className="truncate text-lg font-bold text-slate-900">{formatValue(user.fullName)}</h2>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Badge value={user.role} styles={ROLE_BADGE} />
                  <Badge value={user.status} styles={STATUS_BADGE} />
                </div>
              </>
            ) : (
              <>
                <h2 className="text-lg font-bold text-slate-900">User details</h2>
                {loading && <div className="mt-2 h-5 w-32 animate-pulse rounded bg-slate-100" />}
              </>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {onResendInvite && user?.status === 'INVITED' && (
              <button
                type="button"
                onClick={() => onResendInvite({ id: user.id, email: user.email })}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                <Mail size={13} /> Resend invite
              </button>
            )}
            {onEdit && user && (
              <button
                type="button"
                onClick={() => onEdit(user.id)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                <Pencil size={13} /> Edit
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            >
              <X size={18} />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-5">
          {loading && !user && <DrawerSkeleton />}

          {error && (
            <div role="alert" className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
              <p>{error}</p>
              <button
                type="button"
                onClick={() => setReloadKey((k) => k + 1)}
                className="mt-2 font-semibold underline hover:no-underline"
              >
                Retry
              </button>
            </div>
          )}

          {user && (
            <>
              <Section title="General information">
                <Row label="ID">
                  <span className="flex items-center justify-between gap-2">
                    <span className="break-all font-mono text-xs">{user.id}</span>
                    <CopyIdButton id={user.id} />
                  </span>
                </Row>
                <Row label="Email">{formatValue(user.email)}</Row>
                <Row label="Phone">{formatValue(user.phone)}</Row>
                <Row label="Created at">{formatDate(user.createdAt)}</Row>
                <Row label="Activated at">{formatDate(user.activatedAt)}</Row>
                <Row label="Last login">{formatDate(user.lastLoginAt)}</Row>
              </Section>
              <ProfileSection
                user={user}
                availability={
                  user.role === 'DESIGNER'
                    ? { pending: togglingAvailability, onToggle: handleToggleAvailability }
                    : undefined
                }
              />
              {onStatusAction && statusActions && statusActions(user).length > 0 && (
                <section className="mb-6">
                  <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Account status</h3>
                  <div className="flex flex-wrap gap-2">
                    {statusActions(user).map((action) => {
                      const meta = STATUS_ACTION_META[action];
                      return (
                        <button
                          key={action}
                          type="button"
                          onClick={() => onStatusAction({ id: user.id, email: user.email }, action)}
                          className={`rounded-xl border px-3.5 py-2 text-sm font-semibold transition ${
                            meta.tone === 'danger'
                              ? 'border-red-200 text-red-600 hover:bg-red-50'
                              : 'border-blue-200 text-blue-700 hover:bg-blue-50'
                          }`}
                        >
                          {meta.label}
                        </button>
                      );
                    })}
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      </aside>
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
    </div>
  );
};

export default UserDetailDrawer;
