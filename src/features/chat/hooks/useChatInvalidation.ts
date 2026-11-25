import { useEffect } from 'react';
import { chatCache } from '../chatCache';
import type { ChatListKey } from '../chatCache';

/** Reload a mounted list whenever `chatCache.invalidate(key)` is called. `reload` should be stable. */
export function useChatInvalidation(key: ChatListKey, reload: () => void): void {
  useEffect(() => chatCache.subscribe(key, reload), [key, reload]);
}
