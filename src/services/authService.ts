import type { User, UserRole } from '@/types/role';
import { onSignOut, runSignOutListeners } from './signOut.ts';
import { parseContentDispositionFileName } from './contentDisposition.ts';

// `?.`: under plain `node --test` import.meta.env does not exist.
export const API_BASE_URL =
  import.meta.env?.VITE_API_URL ?? 'http://localhost:3000';

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

export interface ResendOtpPayload {
  email: string;
}

export interface ResendOtpResponse {
  message: string;
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

  const code = typeof body?.code === 'string' ? body.code.toUpperCase() : '';
  const knownCodeMessages: Record<string, string> = {
    TOKEN_EXPIRED: 'Your session has expired. Please sign in again.',
    DESIGN_STYLE_CODE_EXISTS: 'A design style with this code already exists.',
    CATEGORY_CODE_EXISTS: 'A category with this code already exists.',
    PRODUCT_SKU_EXISTS: 'A product with this SKU already exists.',
    APARTMENT_ALREADY_EXISTS: 'An apartment with these details already exists.',
    USER_NOT_FOUND: 'No registered user was found for the provided email address.',
    USER_NOT_ACTIVE: 'The customer account is not active.',
    NOT_APARTMENT_STAFF: 'You can edit only apartments assigned to projects you manage.',
    APARTMENT_LOCKED: 'This apartment cannot be edited while its project is active.',
  };
  const statusMessage = status >= 500
    ? 'The server encountered an error. Please try again later.'
    : status === 401
      ? 'Your session has expired or your credentials are invalid. Please sign in again.'
      : status === 403
        ? 'You do not have permission to perform this action.'
        : status === 404
          ? 'The requested item could not be found or is not available.'
          : status === 409
            ? 'This request conflicts with existing data. Review the item and try again.'
            : status === 400 || status === 422
              ? 'The submitted information is invalid. Check the fields and try again.'
              : status === 429
                ? 'Too many requests. Wait a moment and try again.'
                : `${fallback} (${status}). Please try again.`;

  const normalizedFieldErrors = status >= 500
    ? {}
    : Object.fromEntries(
      Object.entries(fieldErrors).map(([field, message]) => [
        field,
        hasVietnameseText(message) ? englishFieldError(field) : message,
      ]),
    );
  const normalizedMessages = status >= 500
    ? [statusMessage]
    : messages.map((message) => {
      if (!hasVietnameseText(message)) return message;
      if (status === 401 || status === 403 || status === 404 || status === 409 || status === 429) {
        return statusMessage;
      }
      return englishFieldErrorFromMessage(message);
    });
  const message = knownCodeMessages[code]
    ?? (status >= 500 ? statusMessage : normalizedMessages[0] ?? statusMessage);

  const details = body?.details && typeof body.details === 'object' && !Array.isArray(body.details)
    ? (body.details as Record<string, unknown>) : {};
  return new ApiError(message, status, normalizedMessages, normalizedFieldErrors, code ? String(body?.code) : '', details);
}

function hasVietnameseText(value: string): boolean {
  return /[À-ỹĐđ]/u.test(value)
    || /\b(khong|loi|du lieu|het han|dang nhap|vui long|khong hop le|that bai|khong tim thay)\b/i.test(value);
}

function englishFieldError(field: string): string {
  const key = field.toLowerCase().replace(/[^a-z]/g, '');
  if (key.includes('email')) return 'Enter a valid email address.';
  if (key.includes('phone')) return 'Enter a valid phone number.';
  if (key.includes('password')) return 'Check the password requirements and try again.';
  if (key.includes('fullname') || key === 'name') return 'Enter a valid name.';
  if (key.includes('sku')) return 'Enter a valid product SKU.';
  if (key.includes('code')) return 'Enter a valid code.';
  return 'This field is invalid. Check it and try again.';
}

function englishFieldErrorFromMessage(message: string): string {
  const text = message.toLowerCase();
  if (text.includes('email') || text.includes('e-mail')) return 'Enter a valid email address.';
  if (text.includes('phone') || text.includes('điện thoại')) return 'Enter a valid phone number.';
  if (text.includes('password') || text.includes('mật khẩu')) return 'Check the password requirements and try again.';
  if (text.includes('name') || text.includes('tên')) return 'Enter a valid name.';
  return 'The submitted information is invalid. Check the fields and try again.';
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

/**
 * Gửi lại OTP kích hoạt tài khoản. POST /auth/resend-otp.
 * Backend luôn trả cùng một message dù email có tồn tại hay không (tránh lộ thông tin).
 */
export function resendOtp(
  payload: ResendOtpPayload,
): Promise<ResendOtpResponse> {
  return postJson<ResendOtpResponse>(
    '/auth/resend-otp',
    payload,
    'Could not resend the OTP code',
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
  // Per-user caches (chat...) go first, whatever happens next.
  runSignOutListeners();
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

/**
 * 401 codes after which a refresh cannot help: the session was revoked (signed in elsewhere: the backend keeps one
 * session per user), the refresh token was reused or is unknown, or the account can no longer sign in.
 */
export const SESSION_ENDED_CODES: ReadonlySet<string> = new Set([
  'TOKEN_REVOKED',
  'REFRESH_TOKEN_REUSED',
  'INVALID_REFRESH_TOKEN',
  'ACCOUNT_LOCKED',
  'ACCOUNT_INACTIVE',
  'EMAIL_NOT_VERIFIED',
]);

/** Why the last session ended, for the login page. sessionStorage: it concerns this tab only. */
const SIGN_OUT_REASON_KEY = 'archsync-sign-out-reason';

/** The code that ended the last session in this tab, or null. Read-only: clear it with clearSignOutReason. */
export function peekSignOutReason(): string | null {
  try { return window.sessionStorage.getItem(SIGN_OUT_REASON_KEY); } catch { return null; }
}

export function clearSignOutReason(): void {
  try { window.sessionStorage.removeItem(SIGN_OUT_REASON_KEY); } catch { /* storage blocked */ }
}

/** Clear the session, remember why (shown on the login page), and go to /login. */
export function endSession(reason: string): void {
  clearAuthSession();
  try { window.sessionStorage.setItem(SIGN_OUT_REASON_KEY, reason || 'SESSION_EXPIRED'); } catch { /* storage blocked */ }
  redirectToLogin();
}

/** Backend error code of a response body, upper-cased; '' when there is none. */
function bodyCode(data: unknown): string {
  const code = (data as { code?: unknown } | null)?.code;
  return typeof code === 'string' ? code.toUpperCase() : '';
}

// ---------------------------------------------------------------------------
// Token refresh, shared by every tab
// ---------------------------------------------------------------------------
//
// The backend rotates the refresh token and treats a second use of an old one as theft (REFRESH_TOKEN_REUSED), which
// revokes the whole session. So two tabs must never send the same refresh token:
// - navigator.locks makes tabs refresh one at a time; inside the lock a tab first re-reads storage and, when another
//   tab already rotated the token (shared localStorage), takes the new access token instead of refreshing again.
// - sessionStorage is per tab, but "Duplicate tab" copies it, so a rotation is also announced on a BroadcastChannel and
//   a tab holding the old refresh token adopts the new pair.

const REFRESH_LOCK = 'archsync-refresh';
const AUTH_CHANNEL = 'archsync-auth';
/** The lock is held this long after a broadcast so a waiting tab gets the message before it re-reads storage. */
const BROADCAST_SETTLE_MS = 150;

interface RotationMessage { type: 'rotated'; from: string; accessToken: string; refreshToken: string }

// Browser only: under `node --test` an open BroadcastChannel would keep the process from exiting.
const authChannel: BroadcastChannel | null =
  typeof window !== 'undefined' && typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(AUTH_CHANNEL) : null;

authChannel?.addEventListener('message', (event: MessageEvent<RotationMessage>) => {
  const msg = event.data;
  if (msg?.type !== 'rotated') return;
  const storage = getSessionStorage();
  // Only the tab still holding the token that was just rotated away takes the new pair.
  if (!storage || storage.getItem(REFRESH_TOKEN_KEY) !== msg.from) return;
  storage.setItem(ACCESS_TOKEN_KEY, msg.accessToken);
  storage.setItem(REFRESH_TOKEN_KEY, msg.refreshToken);
  dispatchAuthChange();
});

/** Run `task` under the cross-tab refresh lock (directly where the Web Locks API is missing). */
function withRefreshLock(task: () => Promise<{ token: string; broadcast: boolean }>): Promise<string> {
  const locks = typeof navigator !== 'undefined' ? navigator.locks : undefined;
  if (!locks) return task().then((r) => r.token);
  return new Promise<string>((resolve, reject) => {
    locks.request(REFRESH_LOCK, async () => {
      try {
        const { token, broadcast } = await task();
        resolve(token);
        // Callers go on at once; the lock waits a little so the broadcast lands before the next tab reads storage.
        if (broadcast) await new Promise((r) => setTimeout(r, BROADCAST_SETTLE_MS));
      } catch (err) {
        reject(err);
      }
    }).catch(reject);
  });
}

// Concurrent 401 responses in this tab share one refresh.
let refreshing: Promise<string> | null = null;

/**
 * New access token after a 401. Only a 401 from /auth/refresh (or no refresh token at all) ends the session;
 * 429, 5xx and network errors keep it and throw, so the user can try again.
 */
export function refreshAccessToken(): Promise<string> {
  if (refreshing) return refreshing;

  // The refresh token this tab held when it decided to refresh.
  const seen = getRefreshToken();

  refreshing = withRefreshLock(async () => {
    const storage = getSessionStorage();
    const refreshToken = storage?.getItem(REFRESH_TOKEN_KEY);

    if (!storage || !refreshToken) {
      endSession('SESSION_EXPIRED');
      throw new ApiError('Session expired. Please log in again.', 401, [], {}, 'SESSION_EXPIRED');
    }

    // Another tab rotated the token while this one waited for the lock: use its result.
    const access = storage.getItem(ACCESS_TOKEN_KEY);
    if (seen && refreshToken !== seen && access) return { token: access, broadcast: false };

    let response: RefreshResponse;
    try {
      response = await postJson<RefreshResponse>('/auth/refresh', { refreshToken }, 'Session expired');
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) endSession(err.code.toUpperCase() || 'SESSION_EXPIRED');
      throw err;
    }

    // Signed out (or another account signed in) while the request was out: don't write into that storage.
    if (getSessionStorage() !== storage || storage.getItem(REFRESH_TOKEN_KEY) !== refreshToken) {
      throw new ApiError('Session expired. Please log in again.', 401, [], {}, 'SESSION_EXPIRED');
    }
    storage.setItem(ACCESS_TOKEN_KEY, response.accessToken);
    storage.setItem(REFRESH_TOKEN_KEY, response.refreshToken);
    authChannel?.postMessage({
      type: 'rotated', from: refreshToken, accessToken: response.accessToken, refreshToken: response.refreshToken,
    } satisfies RotationMessage);
    return { token: response.accessToken, broadcast: !!authChannel };
  }).finally(() => {
    refreshing = null;
  });

  return refreshing;
}

/**
 * What to do with a 401 from a private endpoint: a session-ended code signs out at once (returns null), anything else
 * (TOKEN_EXPIRED, INVALID_TOKEN, UNAUTHENTICATED, no code) is worth one refresh (returns the new token).
 */
async function recoverFrom401(data: unknown): Promise<string | null> {
  const code = bodyCode(data);
  if (SESSION_ENDED_CODES.has(code)) {
    endSession(code);
    return null;
  }
  return refreshAccessToken();
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

  const sendOrFail = async (token: string | null) => {
    try {
      return await send(token);
    } catch (err) {
      // A caller's abort stays an AbortError so it is never shown as a connection problem.
      if (init.signal?.aborted) throw err;
      throw new ApiError(
        'Cannot connect to the server. Please check your connection and try again.',
      );
    }
  };

  const response = await sendOrFail(getAccessToken());

  if (response.status !== 401) {
    return response;
  }

  const newToken = await recoverFrom401(await response.clone().json().catch(() => null));
  // Session ended: hand back the 401 so the caller shows its error while the page goes to /login.
  if (newToken === null) return response;

  return sendOrFail(newToken);
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
    const newToken = await recoverFrom401(res.data);
    if (newToken !== null) {
      onProgress?.(0);
      res = await send(newToken);
    }
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
/** Bumped on every revokeBlobUrls (sign-out): a download that started before it never lands in the new cache. */
let blobGeneration = 0;
export function fetchBlobUrl(path: string): Promise<string> {
  let p = blobCache.get(path);
  if (!p) {
    const generation = blobGeneration;
    p = apiFetch(path).then(async (res) => {
      if (!res.ok) throw buildApiError(res.status, await res.json().catch(() => null), 'Không tải được file');
      const blob = await res.blob();
      // The session changed while downloading: this file belonged to the previous user.
      if (generation !== blobGeneration) throw new ApiError('Session changed', 401, [], {}, 'SESSION_EXPIRED');
      return URL.createObjectURL(blob);
    });
    p.catch(() => blobCache.delete(path));
    blobCache.set(path, p);
  }
  return p;
}
/** Free one blob URL made by fetchBlobUrl (a preview that unmounts). The next fetchBlobUrl(path) downloads again. */
export function revokeBlobUrl(path: string) {
  const p = blobCache.get(path);
  if (!p) return;
  blobCache.delete(path);
  p.then(URL.revokeObjectURL, () => undefined);
}
export function revokeBlobUrls() {
  blobGeneration += 1;
  for (const p of blobCache.values()) p.then(URL.revokeObjectURL, () => undefined);
  blobCache.clear();
}

// Private files of one user must never be served from cache to the next one signing in on this tab.
onSignOut(revokeBlobUrls);

/** Downloads with the token. The server's file name wins unless `preferFallbackName` is set. */
export async function downloadFile(path: string, fallbackName: string, opts: { preferFallbackName?: boolean } = {}) {
  const res = await apiFetch(path);
  if (!res.ok) throw buildApiError(res.status, await res.json().catch(() => null), 'Không tải được file');
  const name = opts.preferFallbackName ? fallbackName
    : parseContentDispositionFileName(res.headers.get('Content-Disposition')) ?? fallbackName;
  const a = document.createElement('a');
  a.href = URL.createObjectURL(await res.blob());
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
