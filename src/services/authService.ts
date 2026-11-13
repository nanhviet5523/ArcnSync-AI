import type { User, UserRole } from '@/types/role';

const API_BASE_URL =
  import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

const SESSION_KEY = 'archsync-auth-session';
const LEGACY_DEMO_SESSION_KEY = 'archsync-demo-session';
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
  /** Mã lỗi backend, vd UNKNOWN_BLOCKS, COMMENTS_OPEN */
  code: string;
  details: Record<string, unknown>;

  constructor(
    message: string,
    status = 0,
    messages: string[] = [],
    fieldErrors: Record<string, string> = {},
    code = '',
    details: Record<string, unknown> = {},
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.messages = messages;
    this.fieldErrors = fieldErrors;
    this.code = code;
    this.details = details;
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

export function buildApiError(
  status: number,
  data: unknown,
  fallback: string,
): ApiError {
  const body = data as {
    code?: unknown;
    message?: unknown;
    errors?: unknown;
    details?: unknown;
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

  const validationFields = (body?.details as { fields?: unknown } | undefined)?.fields;
  const errors = Array.isArray(validationFields)
    ? validationFields.map((f: { field?: unknown; errors?: unknown }) => ({ field: f?.field, message: Array.isArray(f?.errors) ? f.errors[0] : undefined }))
    : body?.errors ?? body?.details;

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
      const nested = value && typeof value === 'object' && !Array.isArray(value)
        ? (value as { message?: unknown; constraints?: Record<string, unknown> })
        : null;
      const message = Array.isArray(value) ? value[0]
        : typeof value === 'string' ? value
          : nested?.message ?? (nested?.constraints ? Object.values(nested.constraints)[0] : undefined);

      if (typeof message === 'string') {
        fieldErrors[field] = message;
      }
    }
  }

  if (errors && typeof errors === 'object' && !Array.isArray(errors)) {
    const nestedErrors = (errors as { fieldErrors?: unknown }).fieldErrors;
    if (nestedErrors && typeof nestedErrors === 'object' && !Array.isArray(nestedErrors)) {
      for (const [field, value] of Object.entries(nestedErrors)) {
        const message = Array.isArray(value) ? value[0] : value;
        if (typeof message === 'string') fieldErrors[field] = message;
      }
    }
  }

  const message =
    messages[0] ||
    `${fallback} (${status}). Please try again.`;

  const details = body?.details && typeof body.details === 'object' && !Array.isArray(body.details)
    ? (body.details as Record<string, unknown>) : {};
  return new ApiError(message, status, messages, fieldErrors, typeof body?.code === 'string' ? body.code : '', details);
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
    storage.removeItem(LEGACY_DEMO_SESSION_KEY);
    storage.removeItem(ACCESS_TOKEN_KEY);
    storage.removeItem(REFRESH_TOKEN_KEY);
  }

  dispatchAuthChange();
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

  // Ignore and remove sessions created by the old frontend-only role switcher.
  window.localStorage.removeItem(LEGACY_DEMO_SESSION_KEY);
  window.sessionStorage.removeItem(LEGACY_DEMO_SESSION_KEY);

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

export function updateCurrentUserProfile(updates: Pick<User, 'name' | 'phone'>): void {
  if (typeof window === 'undefined') return;
  for (const storage of [window.localStorage, window.sessionStorage]) {
    const savedSession = storage.getItem(SESSION_KEY);
    if (!savedSession) continue;
    try {
      const user = JSON.parse(savedSession) as User;
      storage.setItem(SESSION_KEY, JSON.stringify({ ...user, ...updates }));
    } catch {
      storage.removeItem(SESSION_KEY);
    }
  }
  dispatchAuthChange();
}

export function replaceSessionTokens(accessToken: string, refreshToken: string): void {
  const storage = getSessionStorage();
  if (!storage) return;
  storage.setItem(ACCESS_TOKEN_KEY, accessToken);
  storage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  dispatchAuthChange();
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
      !(init.body instanceof FormData) &&
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

/**
 * Multipart POST that reports upload progress (0–1). fetch cannot, so this uses XHR with the same token and one
 * retry after a refresh on 401, like apiFetch.
 */
export async function apiUpload<T>(
  path: string,
  form: FormData,
  onProgress?: (fraction: number) => void,
): Promise<T> {
  const send = (token: string | null) =>
    new Promise<{ status: number; data: unknown }>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${API_BASE_URL}${path}`);
      if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) onProgress?.(e.loaded / e.total);
      };
      xhr.onload = () => {
        let data: unknown = null;
        try { data = JSON.parse(xhr.responseText); } catch { /* empty or not JSON */ }
        resolve({ status: xhr.status, data });
      };
      xhr.onerror = () =>
        reject(new ApiError('Cannot connect to the server. Please check your connection and try again.'));
      xhr.send(form);
    });

  let res = await send(getAccessToken());
  if (res.status === 401) {
    onProgress?.(0);
    res = await send(await refreshAccessToken());
  }
  if (res.status < 200 || res.status >= 300) {
    throw buildApiError(res.status, res.data, `Request failed (${res.status}). Please try again.`);
  }
  return res.data as T;
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

export interface AcceptInvitePayload {
  email: string;
  otp: string;
  password: string;
}

export interface AcceptInviteResponse {
  message: string;
  user: RegisterResponse['user'];
}

export function acceptInvite(payload: AcceptInvitePayload): Promise<AcceptInviteResponse> {
  return postJson<AcceptInviteResponse>('/auth/accept-invite', payload, 'Account activation failed');
}

// ---------------------------------------------------------------------------
// Files behind auth (images, .glb, DXF)
// ---------------------------------------------------------------------------

/** File cần Bearer token (ảnh, .glb, DXF): tải qua apiFetch rồi tạo blob URL. Lỗi giữ nguyên ApiError (có status, code). */
const blobCache = new Map<string, Promise<string>>();
export function fetchBlobUrl(path: string): Promise<string> {
  let p = blobCache.get(path);
  if (!p) {
    p = apiFetch(path).then(async (res) => {
      if (!res.ok) throw buildApiError(res.status, await res.json().catch(() => null), 'Không tải được file');
      return URL.createObjectURL(await res.blob());
    });
    p.catch(() => blobCache.delete(path));
    blobCache.set(path, p);
  }
  return p;
}
export function revokeBlobUrls() {
  for (const p of blobCache.values()) p.then(URL.revokeObjectURL, () => undefined);
  blobCache.clear();
}

export async function downloadFile(path: string, fallbackName: string) {
  const res = await apiFetch(path);
  if (!res.ok) throw buildApiError(res.status, await res.json().catch(() => null), 'Không tải được file');
  const name = /filename="?([^";]+)"?/.exec(res.headers.get('Content-Disposition') ?? '')?.[1] ?? fallbackName;
  const a = document.createElement('a');
  a.href = URL.createObjectURL(await res.blob());
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
