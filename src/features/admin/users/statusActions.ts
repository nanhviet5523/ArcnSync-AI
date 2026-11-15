import type { StatusAction } from './types';

export interface StatusActionMeta {
  label: string;
  verb: string; // used in "Are you sure you want to {verb} the account ..."
  warning: string;
  tone: 'danger' | 'primary';
}

export const STATUS_ACTION_META: Record<StatusAction, StatusActionMeta> = {
  LOCK: {
    label: 'Lock',
    verb: 'lock',
    warning: 'This user will not be able to log in until the account is unlocked.',
    tone: 'danger',
  },
  UNLOCK: {
    label: 'Unlock',
    verb: 'unlock',
    warning: 'This user will be able to log in again.',
    tone: 'primary',
  },
  DEACTIVATE: {
    label: 'Deactivate',
    verb: 'deactivate',
    warning: 'This user will lose access to the system until the account is reactivated.',
    tone: 'danger',
  },
  REACTIVATE: {
    label: 'Reactivate',
    verb: 'reactivate',
    warning: 'This user will regain access to the system.',
    tone: 'primary',
  },
};

const ACTIONS_BY_STATUS: Record<string, StatusAction[]> = {
  ACTIVE: ['LOCK', 'DEACTIVATE'],
  LOCKED: ['UNLOCK', 'DEACTIVATE'],
  INACTIVE: ['REACTIVATE', 'LOCK'],
  // INVITED (not activated yet) and unknown statuses: no status actions.
};

// Actions an admin may run on a user. Admins cannot change their own status.
export function getAvailableStatusActions(
  user: { id: string; status: string },
  currentUserId?: string | null,
): StatusAction[] {
  if (currentUserId && user.id === currentUserId) return [];
  return ACTIONS_BY_STATUS[user.status] ?? [];
}
