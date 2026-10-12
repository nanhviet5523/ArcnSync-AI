import type { User } from '@/types/role';

export interface DemoAccount {
  email: string;
  password: string;
  user: User;
}

export const DEMO_PASSWORD = 'Demo123!';

export const DEMO_ACCOUNTS: DemoAccount[] = [
  { email: 'homeowner.demo@archsync.test', password: DEMO_PASSWORD, user: { id: 'demo-homeowner', name: 'Minh Anh', email: 'homeowner.demo@archsync.test', role: 'homeowner' } },
  { email: 'designer.demo@archsync.test', password: DEMO_PASSWORD, user: { id: 'demo-designer', name: 'Nguyen Linh', email: 'designer.demo@archsync.test', role: 'designer', badgeTitle: 'Studio Designer' } },
  { email: 'staff.demo@archsync.test', password: DEMO_PASSWORD, user: { id: 'demo-staff', name: 'Tran Nam', email: 'staff.demo@archsync.test', role: 'staff' } },
  { email: 'supplier.demo@archsync.test', password: DEMO_PASSWORD, user: { id: 'demo-supplier', name: 'Noi That Viet', email: 'supplier.demo@archsync.test', role: 'supplier', badgeTitle: 'Supplier Partner' } },
  { email: 'admin.demo@archsync.test', password: DEMO_PASSWORD, user: { id: 'demo-admin', name: 'ArchSync Admin', email: 'admin.demo@archsync.test', role: 'admin' } },
];

const SESSION_KEY = 'archsync-demo-session';
const AUTH_EVENT = 'archsync-auth-change';

export function getCurrentDemoUser(): User | null {
  if (typeof window === 'undefined') return null;
  const saved = window.localStorage.getItem(SESSION_KEY) ?? window.sessionStorage.getItem(SESSION_KEY);
  if (!saved) return null;

  try {
    const user = JSON.parse(saved) as User;
    return DEMO_ACCOUNTS.some((account) => account.user.id === user.id && account.user.role === user.role)
      ? user
      : null;
  } catch {
    return null;
  }
}

export function loginDemo(email: string, password: string, rememberMe: boolean): User | null {
  const account = DEMO_ACCOUNTS.find(
    (candidate) => candidate.email.toLowerCase() === email.trim().toLowerCase() && candidate.password === password,
  );
  if (!account || typeof window === 'undefined') return null;

  window.localStorage.removeItem(SESSION_KEY);
  window.sessionStorage.removeItem(SESSION_KEY);
  const storage = rememberMe ? window.localStorage : window.sessionStorage;
  storage.setItem(SESSION_KEY, JSON.stringify(account.user));
  window.dispatchEvent(new Event(AUTH_EVENT));
  return account.user;
}

export function logoutDemo(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(SESSION_KEY);
  window.sessionStorage.removeItem(SESSION_KEY);
  window.dispatchEvent(new Event(AUTH_EVENT));
}

