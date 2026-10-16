import type { User, UserRole } from '@/types/role';

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';
const SESSION_KEY = 'archsync-auth-session';
const ACCESS_TOKEN_KEY = 'archsync-access-token';
const REFRESH_TOKEN_KEY = 'archsync-refresh-token';
const AUTH_EVENT = 'archsync-auth-change';
const USER_ROLES: UserRole[] = ['homeowner', 'staff', 'supplier', 'admin', 'designer'];

export class ApiError extends Error {
  status: number;

  constructor(message: string, status = 0) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function postJson<T>(path: string, body: unknown, fallback: string): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    throw new ApiError('Cannot connect to the server. Please check your connection and try again.');
  }

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const message = Array.isArray(data?.message) ? data.message.join(' ') : data?.message;
    throw new ApiError(typeof message === 'string' ? message : `${fallback} (${response.status}). Please try again.`, response.status);
  }
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
  user: { id: string; email: string; fullName: string; phone: string; role: string; status: string };
}

export function registerUser(payload: RegisterPayload): Promise<RegisterResponse> {
  return postJson<RegisterResponse>('/auth/register', payload, 'Registration failed');
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: RegisterResponse['user'];
}

const ROLE_MAP: Record<string, UserRole> = {
  CUSTOMER: 'homeowner', HOMEOWNER: 'homeowner', STAFF: 'staff', DESIGNER: 'designer', SUPPLIER: 'supplier', ADMIN: 'admin',
};

export function loginUser(payload: { email: string; password: string }): Promise<LoginResponse> {
  return postJson<LoginResponse>('/auth/login', payload, 'Login failed');
}

export function saveSession(response: LoginResponse, rememberMe: boolean): User {
  const role = ROLE_MAP[response.user.role?.toUpperCase()];
  if (!role) throw new ApiError(`Unsupported account role: ${response.user.role}`);
  clearAuthSession();
  const storage = rememberMe ? window.localStorage : window.sessionStorage;
  const user: User = { id: response.user.id, name: response.user.fullName, email: response.user.email, role };
  storage.setItem(ACCESS_TOKEN_KEY, response.accessToken);
  storage.setItem(REFRESH_TOKEN_KEY, response.refreshToken);
  storage.setItem(SESSION_KEY, JSON.stringify(user));
  window.dispatchEvent(new Event(AUTH_EVENT));
  return user;
}

export function getCurrentUser(): User | null {
  if (typeof window === 'undefined') return null;
  const storage = window.localStorage.getItem(ACCESS_TOKEN_KEY) ? window.localStorage : window.sessionStorage;
  if (!storage.getItem(ACCESS_TOKEN_KEY)) return null;
  const saved = storage.getItem(SESSION_KEY);
  if (!saved) return null;
  try {
    const user = JSON.parse(saved) as User;
    return USER_ROLES.includes(user.role) ? user : null;
  } catch {
    return null;
  }
}

export function clearAuthSession(): void {
  if (typeof window === 'undefined') return;
  for (const storage of [window.localStorage, window.sessionStorage]) {
    storage.removeItem(SESSION_KEY);
    storage.removeItem(ACCESS_TOKEN_KEY);
    storage.removeItem(REFRESH_TOKEN_KEY);
    storage.removeItem('archsync-demo-session');
  }
  window.dispatchEvent(new Event(AUTH_EVENT));
}

export async function logout(): Promise<void> {
  const refreshToken = window.localStorage.getItem(REFRESH_TOKEN_KEY) ?? window.sessionStorage.getItem(REFRESH_TOKEN_KEY);
  try {
    if (refreshToken) await postJson('/auth/logout', { refreshToken }, 'Logout failed');
  } catch {
    // Clear the local session even if the server cannot be reached.
  } finally {
    clearAuthSession();
  }
}
