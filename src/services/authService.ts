import type { User, UserRole } from '@/types/role';

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
const ACCESS_TOKEN_KEY = 'archsync-access-token';
const REFRESH_TOKEN_KEY = 'archsync-refresh-token';
const USER_ROLES: UserRole[] = ['homeowner', 'staff', 'supplier', 'admin', 'designer'];
const AUTH_EVENT = 'archsync-auth-change';

export function getCurrentDemoUser(): User | null {
  if (typeof window === 'undefined') return null;
  const saved = window.localStorage.getItem(SESSION_KEY) ?? window.sessionStorage.getItem(SESSION_KEY);
  if (!saved) return null;

  try {
    const user = JSON.parse(saved) as User;
    return USER_ROLES.includes(user.role) ? user : null;
  } catch {
    return null;
  }
}

export function loginDemo(email: string, password: string, rememberMe: boolean): User | null {
  const account = DEMO_ACCOUNTS.find(
    (candidate) => candidate.email.toLowerCase() === email.trim().toLowerCase() && candidate.password === password,
  );
  if (!account || typeof window === 'undefined') return null;

  logoutDemo();
  const storage = rememberMe ? window.localStorage : window.sessionStorage;
  storage.setItem(SESSION_KEY, JSON.stringify(account.user));
  window.dispatchEvent(new Event(AUTH_EVENT));
  return account.user;
}

export function logoutDemo(): void {
  if (typeof window === 'undefined') return;
  for (const storage of [window.localStorage, window.sessionStorage]) {
    storage.removeItem(SESSION_KEY);
    storage.removeItem(ACCESS_TOKEN_KEY);
    storage.removeItem(REFRESH_TOKEN_KEY);
  }
  window.dispatchEvent(new Event(AUTH_EVENT));
}

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

export class ApiError extends Error {
  status: number;
  messages: string[];
  fieldErrors: Record<string, string>;

  constructor(message: string, status = 0, messages: string[] = [], fieldErrors: Record<string, string> = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.messages = messages;
    this.fieldErrors = fieldErrors;
  }
}

// Parses BE error bodies: { message: string | string[], errors?: {field: msg} | [{field|property, message|constraints}] }
function buildApiError(status: number, data: any, fallback: string): ApiError {
  const messages: string[] = [];
  const fieldErrors: Record<string, string> = {};

  if (Array.isArray(data?.message)) messages.push(...data.message.filter((m: unknown) => typeof m === 'string'));
  else if (typeof data?.message === 'string') messages.push(data.message);

  const errors = data?.errors;
  if (Array.isArray(errors)) {
    for (const item of errors) {
      const field = item?.field ?? item?.property;
      const msg =
        item?.message ?? (item?.constraints ? (Object.values(item.constraints)[0] as string) : undefined);
      if (field && typeof msg === 'string' && !fieldErrors[field]) fieldErrors[field] = msg;
    }
  } else if (errors && typeof errors === 'object') {
    for (const [field, value] of Object.entries(errors)) {
      const msg = Array.isArray(value) ? value[0] : value;
      if (typeof msg === 'string') fieldErrors[field] = msg;
    }
  }

  return new ApiError(messages[0] || fallback, status, messages, fieldErrors);
}

async function postJson<T>(path: string, body: unknown, fallback: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    throw new ApiError('Cannot connect to the server. Please check your connection and try again.');
  }

  const data = await res.json().catch(() => null);
  if (!res.ok) throw buildApiError(res.status, data, `${fallback} (${res.status}). Please try again.`);
  return data as T;
}

export interface RegisterPayload {
  fullName: string;
  phone: string;
  email: string;
  password: string;
}

export interface RegisterResponse {
  message: string;
  user: {
    id: string;
    email: string;
    fullName: string;
    phone: string;
    role: string;
    status: string;
  };
}

export function registerUser(payload: RegisterPayload): Promise<RegisterResponse> {
  return postJson<RegisterResponse>('/auth/register', payload, 'Registration failed');
}

export interface VerifyEmailPayload {
  otp: string;
  email: string;
}

export interface VerifyEmailResponse {
  message: string;
  user: RegisterResponse['user'];
}

export function verifyEmail(payload: VerifyEmailPayload): Promise<VerifyEmailResponse> {
  return postJson<VerifyEmailResponse>('/auth/verify-email', payload, 'Verification failed');
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: RegisterResponse['user'];
}

const BE_ROLE_MAP: Record<string, UserRole> = {
  CUSTOMER: 'homeowner',
  HOMEOWNER: 'homeowner',
  STAFF: 'staff',
  DESIGNER: 'designer',
  SUPPLIER: 'supplier',
  ADMIN: 'admin',
};

export function loginUser(payload: LoginPayload): Promise<LoginResponse> {
  return postJson<LoginResponse>('/auth/login', payload, 'Login failed');
}

// Stores tokens + user in the same storage the app already reads its session from.
export function saveSession(res: LoginResponse, rememberMe: boolean): User {
  const role = BE_ROLE_MAP[res.user.role?.toUpperCase()];
  if (!role) throw new ApiError(`Unsupported account role: ${res.user.role}`);

  const user: User = { id: res.user.id, name: res.user.fullName, email: res.user.email, role };
  logoutDemo();
  const storage = rememberMe ? window.localStorage : window.sessionStorage;
  storage.setItem(ACCESS_TOKEN_KEY, res.accessToken);
  storage.setItem(REFRESH_TOKEN_KEY, res.refreshToken);
  storage.setItem(SESSION_KEY, JSON.stringify(user));
  window.dispatchEvent(new Event(AUTH_EVENT));
  return user;
}

export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(ACCESS_TOKEN_KEY) ?? window.sessionStorage.getItem(ACCESS_TOKEN_KEY);
}
