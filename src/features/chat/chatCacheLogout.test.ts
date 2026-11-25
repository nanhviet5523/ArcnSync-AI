import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { ConversationItem } from '../../types/chat.ts';
import { chatCache } from './chatCache.ts';
import { logout } from '../../services/authService.ts';

const conv = { id: 'c1', lastMessage: null } as unknown as ConversationItem;

/** Just enough of window for authService: two Storage maps and dispatchEvent. */
function fakeWindow(refreshToken: string | null) {
  const store = (init: Record<string, string>) => {
    const m = new Map(Object.entries(init));
    return {
      getItem: (k: string) => m.get(k) ?? null,
      setItem: (k: string, v: string) => { m.set(k, v); },
      removeItem: (k: string) => { m.delete(k); },
    };
  };
  return {
    localStorage: store(refreshToken ? { 'archsync-refresh-token': refreshToken } : {}),
    sessionStorage: store({}),
    dispatchEvent: () => true,
  };
}

test('logout clears the chat cache', async () => {
  chatCache.setConversation(conv);
  await logout();
  assert.equal(chatCache.getConversation('c1'), undefined);
});

test('logout clears the chat cache even when the logout API call fails', async (t) => {
  const g = globalThis as Record<string, unknown>;
  t.after(() => { delete g.window; });
  g.window = fakeWindow('rt');
  t.mock.method(globalThis, 'fetch', async () => { throw new TypeError('network down'); });

  chatCache.setConversation(conv);
  await logout();
  assert.equal(chatCache.getConversation('c1'), undefined);
});
