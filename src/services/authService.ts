```ts
import type { User, UserRole } from '@/types/role';

const API_BASE_URL =
  import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

const SESSION_KEY = 'archsync-auth-session';
const DEMO_SESSION_KEY = 'archsync-demo-session';
const ACCESS_TOKEN_KEY = 'archsync-access-token';
const REFRESH_TOKEN_KEY = 'archsync-refresh-token';
const AUTH_EVENT = 'archsync-auth-change';

const USER_ROLES: UserRole[] = [
  'homeowner',
  'staff',
  'supplier',
  'admin',
  'designer',
];

export class ApiError extends Error {
  status: number;
  messages: string[];
  fieldErrors: Record<string, string>;

  constructor(
    message: string,
    status = 0,
    messages: string[] = [],
    fieldErrors: Record<string, string> = {},
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.messages = messages;
    this.fieldErrors = fieldErrors;
  }
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

export interface VerifyEmailPayload {
  otp: string;
  email: string;
}

export interface VerifyEmailResponse {
  message: string;
  user: RegisterResponse['user'];
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

export interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
}

export interface ForgotPasswordResponse {
  message: string;
}

export interface ResetPasswordPayload {
  email: string;
  otp: string;
  newPassword: string;
}

const BE_ROLE_MAP: Record<string, UserRole> = {
  CUSTOMER: 'homeowner',
  HOMEOWNER: 'homeowner',
  STAFF: 'staff',
  DESIGNER: 'designer',
  SUPPLIER: 'supplier',
  ADMIN: 'admin',
};

function buildApiError(
  status: number,
  data: unknown,
  fallback: string,
): ApiError {
  const body = data as {
    message?: unknown;
    errors?: unknown;
  } | null;

  const messages: string[] = [];
  const fieldErrors: Record<string, string> = {};

  if (Array.isArray(body?.message)) {
    messages.push(
      ...body.message.filter(
        (message): message is string =>
          typeof message === 'string',
      ),
    );
  } else if (typeof body?.message === 'string') {
    messages.push(body.message);
  }

  const errors = body?.errors;

  if (Array.isArray(errors)) {
    for (const item of errors) {
      const field = item?.field ?? item?.property;

      const message =
        item?.message ??
        (item?.constraints
          ? Object.values(item.constraints)[0]
          : undefined);

      if (
        typeof field === 'string' &&
        typeof message === 'string' &&
        !fieldErrors[field]
      ) {
        fieldErrors[field] = message;
      }
    }
  } else if (errors && typeof errors === 'object') {
    for (const [field, value] of Object.entries(errors)) {
      const message = Array.isArray(value) ? value[0] : value;

      if (typeof message === 'string') {
        fieldErrors[field] = message;
      }
    }
  }

  const message =
    messages[0] ||
    `${fallback} (${status}). Please try again.`;

  return new ApiError(message, status, messages, fieldErrors);
}

async function postJson<T>(
  path: string,
  body: unknown,
  fallback: string,
): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
  } catch {
    throw new ApiError(
      'Cannot connect to the server. Please check your connection and try again.',
    );
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw buildApiError(
      response.status,
      data,
      fallback,
    );
  }

  return data as T;
}

// ---------------------------------------------------------------------------
// Register and verify email
// ---------------------------------------------------------------------------

export function registerUser(
  payload: RegisterPayload,
): Promise<RegisterResponse> {
  return postJson<RegisterResponse>(
    '/auth/register',
    payload,
    'Registration failed',
  );
}

export function verifyEmail(
  payload: VerifyEmailPayload,
): Promise<VerifyEmailResponse> {
  return postJson<VerifyEmailResponse>(
    '/auth/verify-email',
    payload,
    'Verification failed',
  );
}

// ---------------------------------------------------------------------------
// Session helpers
// ---------------------------------------------------------------------------

function dispatchAuthChange(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(AUTH_EVENT));
  }
}

export function clearAuthSession(): void {
  if (typeof window === 'undefined') return;

  for (const storage of [
    window.localStorage,
    window.sessionStorage,
  ]) {
    storage.removeItem(SESSION_KEY);
    storage.removeItem(DEMO_SESSION_KEY);
    storage.removeItem(ACCESS_TOKEN_KEY);
    storage.removeItem(REFRESH_TOKEN_KEY);
  }

  dispatchAuthChange();
}

export function logoutDemo(): void {
  clearAuthSession();
}

function getSessionStorage(): Storage | null {
  if (typeof window === 'undefined') return null;

  if (window.localStorage.getItem(REFRESH_TOKEN_KEY)) {
    return window.localStorage;
  }

  if (window.sessionStorage.getItem(REFRESH_TOKEN_KEY)) {
    return window.sessionStorage;
  }

  return null;
}

export function getCurrentUser(): User | null {
  if (typeof window === 'undefined') return null;

  const storages = [
    window.localStorage,
    window.sessionStorage,
  ];

  for (const storage of storages) {
    const accessToken = storage.getItem(ACCESS_TOKEN_KEY);
    const savedSession = storage.getItem(SESSION_KEY);

    // A normal API session must have an access token.
    if (accessToken && savedSession) {
      try {
        const user = JSON.parse(savedSession) as User;

        if (USER_ROLES.includes(user.role)) {
          return user;
        }
      } catch {
        // Try the other storage if this session is invalid.
      }
    }

    // Demo sessions do not use API tokens.
    const demoSession = storage.getItem(DEMO_SESSION_KEY);

    if (demoSession) {
      try {
        const user = JSON.parse(demoSession) as User;

        if (USER_ROLES.includes(user.role)) {
          return user;
        }
      } catch {
        // Ignore invalid demo sessions.
      }
    }
  }

  return null;
}

export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;

  return (
    window.localStorage.getItem(ACCESS_TOKEN_KEY) ??
    window.sessionStorage.getItem(ACCESS_TOKEN_KEY)
  );
}

export function getRefreshToken(): string | null {
  return getSessionStorage()?.getItem(REFRESH_TOKEN_KEY) ?? null;
}

// ---------------------------------------------------------------------------
// Login
// ---------------------------------------------------------------------------

export function loginUser(
  payload: LoginPayload,
): Promise<LoginResponse> {
  return postJson<LoginResponse>(
    '/auth/login',
    payload,
    'Login failed',
  );
}

export function saveSession(
  response: LoginResponse,
  rememberMe: boolean,
): User {
  const role = BE_ROLE_MAP[response.user.role?.toUpperCase()];

  if (!role) {
    throw new ApiError(
      `Unsupported account role: ${response.user.role}`,
    );
  }

  if (typeof window === 'undefined') {
    throw new ApiError('Cannot save session outside the browser.');
  }

  const user: User = {
    id: response.user.id,
    name: response.user.fullName,
    email: response.user.email,
    role,
  };

  clearAuthSession();

  const storage = rememberMe
    ? window.localStorage
    : window.sessionStorage;

  storage.setItem(ACCESS_TOKEN_KEY, response.accessToken);
  storage.setItem(REFRESH_TOKEN_KEY, response.refreshToken);
  storage.setItem(SESSION_KEY, JSON.stringify(user));

  dispatchAuthChange();

  return user;
}

// ---------------------------------------------------------------------------
// Demo login
// ---------------------------------------------------------------------------

// Keep the existing demo accounts here if your project defines them.
// No demo credentials were included in the supplied conflict snippet.
interface DemoAccount {
  email: string;
  password: string;
  user: User;
}

const DEMO_ACCOUNTS: DemoAccount[] = [];

export function loginDemo(
  email: string,
  password: string,
  rememberMe: boolean,
): User | null {
  if (typeof window === 'undefined') return null;

  const account = DEMO_ACCOUNTS.find(
    (candidate) =>
      candidate.email.toLowerCase() ===
        email.trim().toLowerCase() &&
      candidate.password === password,
  );

  if (!account) return null;

  clearAuthSession();

  const storage = rememberMe
    ? window.localStorage
    : window.sessionStorage;

  storage.setItem(
    DEMO_SESSION_KEY,
    JSON.stringify(account.user),
  );

  dispatchAuthChange();

  return account.user;
}

// ---------------------------------------------------------------------------
// Authenticated requests and token refresh
// ---------------------------------------------------------------------------

function redirectToLogin(): void {
  if (
    typeof window !== 'undefined' &&
    window.location.pathname !== '/login'
  ) {
    window.location.replace('/login');
  }
}

// Concurrent 401 responses share one refresh request.
let refreshing: Promise<string> | null = null;

export function refreshAccessToken(): Promise<string> {
  if (refreshing) return refreshing;

  refreshing = (async () => {
    const storage = getSessionStorage();
    const refreshToken = storage?.getItem(REFRESH_TOKEN_KEY);

    if (!storage || !refreshToken) {
      throw new ApiError(
        'Session expired. Please log in again.',
        401,
      );
    }

    const response = await postJson<RefreshResponse>(
      '/auth/refresh',
      { refreshToken },
      'Session expired',
    );

    storage.setItem(
      ACCESS_TOKEN_KEY,
      response.accessToken,
    );

    storage.setItem(
      REFRESH_TOKEN_KEY,
      response.refreshToken,
    );

    return response.accessToken;
  })()
    .catch((err: unknown) => {
      clearAuthSession();
      redirectToLogin();
      throw err;
    })
    .finally(() => {
      refreshing = null;
    });

  return refreshing;
}

export async function apiFetch(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const send = (token: string | null) => {
    const headers = new Headers(init.headers);

    if (
      init.body !== undefined &&
      !headers.has('Content-Type')
    ) {
      headers.set('Content-Type', 'application/json');
    }

    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    return fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers,
    });
  };

  let response: Response;

  try {
    response = await send(getAccessToken());
  } catch {
    throw new ApiError(
      'Cannot connect to the server. Please check your connection and try again.',
    );
  }

  if (response.status !== 401) {
    return response;
  }

  const newToken = await refreshAccessToken();

  try {
    return await send(newToken);
  } catch {
    throw new ApiError(
      'Cannot connect to the server. Please check your connection and try again.',
    );
  }
}

export async function apiRequest<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const response = await apiFetch(path, init);
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw buildApiError(
      response.status,
      data,
      `Request failed (${response.status}). Please try again.`,
    );
  }

  return data as T;
}

// ---------------------------------------------------------------------------
// Logout
// ---------------------------------------------------------------------------

export async function logout(): Promise<void> {
  const refreshToken = getRefreshToken();

  try {
    if (refreshToken) {
      await postJson(
        '/auth/logout',
        { refreshToken },
        'Logout failed',
      );
    }
  } catch {
    // Always clear local state even if the server is unreachable.
  } finally {
    clearAuthSession();
  }
}

// ---------------------------------------------------------------------------
// Forgot and reset password
// ---------------------------------------------------------------------------

export function forgotPassword(
  email: string,
): Promise<ForgotPasswordResponse> {
  return postJson<ForgotPasswordResponse>(
    '/auth/forgot-password',
    { email },
    'Request failed',
  );
}

export function resetPassword(
  payload: ResetPasswordPayload,
): Promise<ForgotPasswordResponse> {
  return postJson<ForgotPasswordResponse>(
    '/auth/reset-password',
    payload,
    'Password reset failed',
  );
}
```