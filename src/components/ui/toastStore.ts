/** Toast state, outside React so toast.success() works from any component, hook or service. Rendered by <Toaster /> (Toast.tsx). */
export type ToastTone = 'success' | 'error' | 'warning' | 'info';

export interface ToastOptions {
  /** Same id replaces the toast already showing (and restarts its timer) instead of stacking a copy. */
  id?: string;
  /** Bold line above the message. */
  title?: string;
  /** Milliseconds before it closes itself; Infinity keeps it until closed. Defaults by tone. */
  duration?: number;
  /** One button under the message; clicking it also closes the toast. */
  action?: { label: string; onClick: () => void };
}

export interface ToastItem extends ToastOptions {
  id: string;
  tone: ToastTone;
  message: string;
  /** Bumped on every show, so a replaced toast restarts its countdown. */
  stamp: number;
}

/** Errors stay longest: they usually need reading. */
export const DURATION: Record<ToastTone, number> = { success: 3500, info: 4000, warning: 5000, error: 6000 };
const MAX_VISIBLE = 4;

let items: ToastItem[] = [];
const listeners = new Set<() => void>();
let seq = 0;
const emit = () => listeners.forEach((listener) => listener());
export const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

function show(tone: ToastTone, message: string, options: ToastOptions = {}): string {
  const id = options.id ?? `toast-${++seq}`;
  items = [{ ...options, id, tone, message, stamp: ++seq }, ...items.filter((item) => item.id !== id)].slice(0, MAX_VISIBLE);
  emit();
  return id;
}

function dismiss(id?: string) {
  items = id === undefined ? [] : items.filter((item) => item.id !== id);
  emit();
}

/**
 * App-wide notifications. `toast.success('Saved')`, `toast.error(message, { title })`, or
 * `toast.show({ tone, message })` for code that already holds a { tone, message } object. Rendered by <Toaster />.
 */
export const toast = {
  success: (message: string, options?: ToastOptions) => show('success', message, options),
  error: (message: string, options?: ToastOptions) => show('error', message, options),
  warning: (message: string, options?: ToastOptions) => show('warning', message, options),
  info: (message: string, options?: ToastOptions) => show('info', message, options),
  show: ({ tone, message, ...options }: ToastOptions & { tone: ToastTone; message: string }) => show(tone, message, options),
  dismiss,
};

/** Current list, newest first (for useSyncExternalStore). */
export const getToasts = () => items;

// --- open dialogs: on phones a dialog is a bottom sheet, so the toasts move to the top while one is open ---
let dialogs = 0;
export const getDialogCount = () => dialogs;
/** Modal calls this while it is open; call the returned function when it closes. */
export function holdForDialog(): () => void {
  dialogs += 1;
  emit();
  return () => {
    dialogs -= 1;
    emit();
  };
}
