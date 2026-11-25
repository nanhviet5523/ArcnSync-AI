// No imports on purpose: authService and feature caches both import this, so it can never form a cycle,
// and plain `node --test` can load it.

const listeners = new Set<() => void>();

/**
 * Run `listener` whenever the session is cleared (logout, failed token refresh). Use it to drop per-user caches.
 * Returns the unsubscribe function.
 */
export function onSignOut(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

/** Called by clearAuthSession. One failing listener does not stop the others. */
export function runSignOutListeners(): void {
  for (const listener of [...listeners]) {
    try { listener(); } catch { /* a cache that fails to clear must not block sign-out */ }
  }
}
