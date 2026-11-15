import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Eye, Mail, Pencil, Plus, Search } from 'lucide-react';
import { AdminButton, AdminCard, AdminCell, AdminPageFrame, AdminTable } from '../AdminPageFrame';
import { InviteUserModal } from './components/InviteUserModal';
import { UserDetailDrawer } from './components/UserDetailDrawer';
import { EditUserModal } from './components/EditUserModal';
import { ResendInviteDialog } from './components/ResendInviteDialog';
import { AvailabilitySwitch } from './components/AvailabilitySwitch';
import { StatusChangeDialog } from './components/StatusChangeDialog';
import type { StatusChangeTarget } from './components/StatusChangeDialog';
import { StatusActionsMenu } from './components/StatusActionsMenu';
import { getAvailableStatusActions } from './statusActions';
import { getCurrentUser } from '@/services/authService';
import type { ResendInviteTarget } from './components/ResendInviteDialog';
import { Badge, ROLE_BADGE, STATUS_BADGE } from './components/UserBadges';
import { formatValue } from './format';
import { getAdminUserById, getAdminUsers, updateDesignerAvailability } from './usersApi';
import type { ApiUser, CreateUserResponse } from './types';

const ROLE_OPTIONS = [
  { value: '', label: 'All roles' },
  { value: 'CUSTOMER', label: 'Customer' },
  { value: 'DESIGNER', label: 'Designer' },
  { value: 'STAFF', label: 'Staff' },
  { value: 'SUPPLIER', label: 'Supplier' },
  { value: 'ADMIN', label: 'Admin' },
];

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'INACTIVE', label: 'Inactive' },
  { value: 'LOCKED', label: 'Locked' },
  { value: 'INVITED', label: 'Invited' },
];

const LIMIT_OPTIONS = [10, 20, 50];
const SEARCH_DEBOUNCE_MS = 400;
const HEADINGS = ['ID', 'Full name', 'Email', 'Role', 'Status', 'Available', 'Actions'];

const selectClass =
  'rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-400';

export const AdminUsersPage: React.FC = () => {
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [searchInput, setSearchInput] = useState('');
  const [q, setQ] = useState('');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [viewUserId, setViewUserId] = useState<string | null>(null);
  const [editUserId, setEditUserId] = useState<string | null>(null);
  const [resendTarget, setResendTarget] = useState<ResendInviteTarget | null>(null);
  const [statusTarget, setStatusTarget] = useState<StatusChangeTarget | null>(null);
  // Designer availability is not part of the list response, so it is fetched per designer row and cached by id.
  const [availability, setAvailability] = useState<Record<string, boolean>>({});
  const [availabilityPending, setAvailabilityPending] = useState<Record<string, boolean>>({});
  const [availabilityFailed, setAvailabilityFailed] = useState<Record<string, boolean>>({});
  const pendingRef = useRef(new Set<string>());
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [drawerRefreshKey, setDrawerRefreshKey] = useState(0);
  // Admins must not change their own status.
  const currentUserId = getCurrentUser()?.id;
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(''), 4000);
    return () => clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(timer);
  }, [toast]);

  const loadAvailability = useCallback(async (id: string) => {
    setAvailabilityFailed((prev) => ({ ...prev, [id]: false }));
    try {
      const detail = await getAdminUserById(id);
      // Do not clobber an optimistic toggle that is still in flight.
      const profile = detail.profile;
      if (profile?.type === 'DESIGNER' && !pendingRef.current.has(id)) {
        setAvailability((prev) => ({ ...prev, [id]: profile.isAvailable }));
      }
    } catch {
      setAvailabilityFailed((prev) => ({ ...prev, [id]: true }));
    }
  }, []);

  // Whenever a new page of rows arrives, (re)load availability for the designers on it.
  useEffect(() => {
    users.filter((u) => u.role === 'DESIGNER').forEach((u) => void loadAvailability(u.id));
  }, [users, loadAvailability]);

  const toggleAvailability = async (id: string, next: boolean) => {
    if (pendingRef.current.has(id)) return;
    pendingRef.current.add(id);
    setAvailabilityPending((prev) => ({ ...prev, [id]: true }));
    setAvailability((prev) => ({ ...prev, [id]: next })); // optimistic
    try {
      await updateDesignerAvailability(id, next);
      setToast({ type: 'success', message: 'Designer availability updated successfully' });
    } catch (err) {
      setAvailability((prev) => ({ ...prev, [id]: !next })); // roll back
      setToast({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to update availability. Please try again.',
      });
    } finally {
      pendingRef.current.delete(id);
      setAvailabilityPending((prev) => ({ ...prev, [id]: false }));
    }
  };

  const handleStatusChanged = () => {
    setStatusTarget(null);
    setNotice('User status updated successfully');
    setReloadKey((k) => k + 1); // refresh the table row
    setDrawerRefreshKey((k) => k + 1); // and the open drawer, if any
  };

  const handleResent = () => {
    setResendTarget(null);
    setNotice('Invitation resent successfully');
  };

  const handleUpdated = () => {
    setEditUserId(null);
    setNotice('User updated successfully');
    setReloadKey((k) => k + 1); // keep the current page/filters, just refresh the rows
  };

  const handleCreated = (res: CreateUserResponse) => {
    setInviteOpen(false);
    setNotice(res.message);
    // New accounts sort first, so jump to page 1 and refetch the list.
    setPage(1);
    setReloadKey((k) => k + 1);
  };

  // Debounce the search box so typing does not fire a request per keystroke.
  useEffect(() => {
    const timer = setTimeout(() => {
      const next = searchInput.trim();
      if (next !== q) {
        setQ(next);
        setPage(1);
      }
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchInput, q]);

  useEffect(() => {
    let ignore = false; // drop responses that arrive after the filters changed again
    setLoading(true);
    setError('');
    getAdminUsers({ page, limit, q, role, status })
      .then((res) => {
        if (ignore) return;
        setUsers(res.items);
        setTotal(res.total);
      })
      .catch((err) => {
        if (ignore) return;
        setUsers([]);
        setError(err instanceof Error ? err.message : 'Failed to load users. Please try again.');
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [page, limit, q, role, status, reloadKey]);

  const totalPages = Math.max(1, Math.ceil(total / limit));
  const from = total === 0 ? 0 : (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  return (
    <AdminPageFrame
      title="Users"
      description="Browse, search and filter every account in the system."
      action={
        <AdminButton onClick={() => setInviteOpen(true)}>
          <Plus size={17} /> Invite user
        </AdminButton>
      }
    >
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
      {notice && (
        <div role="status" className="mb-4 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
          {notice}
        </div>
      )}
      <AdminCard>
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center">
          <label className="relative block flex-1">
            <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by name or email"
              className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-blue-400"
            />
          </label>
          <select
            aria-label="Filter by role"
            value={role}
            onChange={(e) => {
              setRole(e.target.value);
              setPage(1);
            }}
            className={selectClass}
          >
            {ROLE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <select
            aria-label="Filter by status"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className={selectClass}
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        {error && (
          <div role="alert" className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
            <span>{error}</span>
            <button
              type="button"
              onClick={() => setReloadKey((k) => k + 1)}
              className="font-semibold underline hover:no-underline"
            >
              Retry
            </button>
          </div>
        )}

        <AdminTable headings={HEADINGS}>
          {loading
            ? Array.from({ length: Math.min(limit, 8) }, (_, i) => (
                <tr key={`skeleton-${i}`} aria-hidden="true">
                  {HEADINGS.map((h) => (
                    <AdminCell key={h}>
                      <div className="h-4 w-full max-w-[160px] animate-pulse rounded bg-slate-100" />
                    </AdminCell>
                  ))}
                </tr>
              ))
            : users.map((user) => (
                <tr
                  key={user.id}
                  onClick={() => setViewUserId(user.id)}
                  className="cursor-pointer hover:bg-slate-50/70"
                >
                  <AdminCell>
                    <span title={user.id} className="font-mono text-xs text-slate-500">{user.id.slice(0, 8)}</span>
                  </AdminCell>
                  <AdminCell><span className="font-semibold">{formatValue(user.fullName)}</span></AdminCell>
                  <AdminCell>{formatValue(user.email)}</AdminCell>
                  <AdminCell><Badge value={user.role} styles={ROLE_BADGE} /></AdminCell>
                  <AdminCell><Badge value={user.status} styles={STATUS_BADGE} /></AdminCell>
                  <AdminCell>
                    {user.role === 'DESIGNER' ? (
                      <span onClick={(e) => e.stopPropagation()}>
                        {availability[user.id] !== undefined ? (
                          <AvailabilitySwitch
                            size="sm"
                            label="none"
                            isAvailable={availability[user.id]}
                            pending={!!availabilityPending[user.id]}
                            onToggle={(next) => void toggleAvailability(user.id, next)}
                          />
                        ) : availabilityFailed[user.id] ? (
                          <button
                            type="button"
                            title="Could not load availability - click to retry"
                            onClick={() => void loadAvailability(user.id)}
                            className="rounded-md px-1.5 py-0.5 text-xs font-semibold text-red-500 hover:bg-red-50"
                          >
                            Retry
                          </button>
                        ) : (
                          <span aria-label="Loading availability" className="inline-block h-5 w-9 animate-pulse rounded-full bg-slate-100" />
                        )}
                      </span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </AdminCell>
                  <AdminCell>
                    <div className="flex items-center gap-1 text-slate-400">
                      <button
                        type="button"
                        aria-label={`View ${user.fullName}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setViewUserId(user.id);
                        }}
                        className="rounded-lg p-1.5 hover:bg-slate-100 hover:text-slate-700"
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        type="button"
                        aria-label={`Edit ${user.fullName}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditUserId(user.id);
                        }}
                        className="rounded-lg p-1.5 hover:bg-slate-100 hover:text-slate-700"
                      >
                        <Pencil size={16} />
                      </button>
                      {user.status === 'INVITED' && (
                        <button
                          type="button"
                          aria-label={`Resend invitation to ${user.email}`}
                          title="Resend invite"
                          onClick={(e) => {
                            e.stopPropagation();
                            setResendTarget({ id: user.id, email: user.email });
                          }}
                          className="rounded-lg p-1.5 hover:bg-slate-100 hover:text-slate-700"
                        >
                          <Mail size={16} />
                        </button>
                      )}
                      <StatusActionsMenu
                        label={user.email}
                        actions={getAvailableStatusActions(user, currentUserId)}
                        onSelect={(action) => setStatusTarget({ id: user.id, email: user.email, action })}
                      />
                    </div>
                  </AdminCell>
                </tr>
              ))}
          {!loading && !error && users.length === 0 && (
            <tr>
              <td colSpan={HEADINGS.length} className="px-4 py-10 text-center text-sm text-slate-500">
                No users match your filters.
              </td>
            </tr>
          )}
        </AdminTable>

        <div className="mt-4 flex flex-col gap-3 text-sm text-slate-500 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <span>{total === 0 ? 'No users' : `Showing ${from}-${to} of ${total}`}</span>
            <select
              aria-label="Rows per page"
              value={limit}
              onChange={(e) => {
                setLimit(Number(e.target.value));
                setPage(1);
              }}
              className={`${selectClass} py-1.5`}
            >
              {LIMIT_OPTIONS.map((n) => (
                <option key={n} value={n}>{n} / page</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={loading || page <= 1}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ChevronLeft size={15} /> Prev
            </button>
            <span className="px-2 font-medium text-slate-700">Page {page} of {totalPages}</span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={loading || page >= totalPages}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next <ChevronRight size={15} />
            </button>
          </div>
        </div>
      </AdminCard>
      <UserDetailDrawer
        userId={viewUserId}
        onClose={() => setViewUserId(null)}
        onResendInvite={setResendTarget}
        statusActions={(u) => getAvailableStatusActions(u, currentUserId)}
        onStatusAction={(u, action) => setStatusTarget({ ...u, action })}
        onAvailabilityChange={(id, value) => setAvailability((prev) => ({ ...prev, [id]: value }))}
        refreshKey={drawerRefreshKey}
        onEdit={(id) => {
          setViewUserId(null);
          setEditUserId(id);
        }}
      />
      <StatusChangeDialog target={statusTarget} onClose={() => setStatusTarget(null)} onChanged={handleStatusChanged} />
      <ResendInviteDialog target={resendTarget} onClose={() => setResendTarget(null)} onSent={handleResent} />
      <EditUserModal userId={editUserId} onClose={() => setEditUserId(null)} onUpdated={handleUpdated} />
      <InviteUserModal open={inviteOpen} onClose={() => setInviteOpen(false)} onCreated={handleCreated} />
    </AdminPageFrame>
  );
};

export default AdminUsersPage;
