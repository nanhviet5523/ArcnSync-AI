import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { ChatMessageSummary, ConversationItem } from '../../types/chat.ts';
import {
  applyIncomingMessageToConversation,
  applyReadMarker,
  findLastSeenMessageId,
  latestIso,
  shouldMarkConversationRead,
} from './readMarker.ts';

const ME = 'user-me';
const OTHER = 'user-other';

const makeConversation = (overrides: Partial<ConversationItem> = {}): ConversationItem => ({
  id: 'conv-1',
  otherUser: { id: OTHER, fullName: 'Nguyen Linh', role: 'DESIGNER', companyName: null },
  lastMessage: null,
  unreadCount: 0,
  canSend: true,
  sharedProjects: [],
  myLastReadAt: null,
  otherLastReadAt: null,
  lastMessageAt: null,
  createdAt: '2026-11-24T01:00:00.000Z',
  ...overrides,
});

const makeMsg = (overrides: Partial<ChatMessageSummary> = {}): ChatMessageSummary => ({
  id: 'm1',
  conversationId: 'conv-1',
  senderId: OTHER,
  sender: null,
  messageType: 'TEXT',
  content: 'Hello',
  project: null,
  designVersionId: null,
  attachment: null,
  videoCallId: null,
  createdAt: '2026-11-24T02:00:00.000Z',
  ...overrides,
});

test('latestIso keeps the later timestamp and ignores null', () => {
  assert.equal(latestIso(null, '2026-11-24T02:00:00.000Z'), '2026-11-24T02:00:00.000Z');
  assert.equal(latestIso('2026-11-24T03:00:00.000Z', '2026-11-24T02:00:00.000Z'), '2026-11-24T03:00:00.000Z');
  assert.equal(latestIso('2026-11-24T02:00:00.000Z', '2026-11-24T03:00:00.000Z'), '2026-11-24T03:00:00.000Z');
});

test('shouldMarkConversationRead triggers on unreadCount > 0 or newer incoming message, and deduplicates', () => {
  const m1 = makeMsg({ id: 'm1', senderId: OTHER, createdAt: '2026-11-24T02:00:00.000Z' });
  const unreadConv = makeConversation({ unreadCount: 2, lastMessage: m1 });

  const key1 = shouldMarkConversationRead(unreadConv, m1, ME, undefined);
  assert.ok(key1);
  // Same key is deduplicated
  assert.equal(shouldMarkConversationRead(unreadConv, m1, ME, key1), null);

  // Already read: no request needed
  const readConv = makeConversation({ unreadCount: 0, myLastReadAt: '2026-11-24T02:05:00.000Z', lastMessage: m1 });
  assert.equal(shouldMarkConversationRead(readConv, m1, ME, undefined), null);

  // New incoming message newer than myLastReadAt triggers markRead even if unreadCount was 0
  const m2 = makeMsg({ id: 'm2', senderId: OTHER, createdAt: '2026-11-24T02:10:00.000Z' });
  const key2 = shouldMarkConversationRead(readConv, m2, ME, key1);
  assert.ok(key2 && key2 !== key1);

  // Own message does NOT trigger markRead
  const myMsg = makeMsg({ id: 'm3', senderId: ME, createdAt: '2026-11-24T02:15:00.000Z' });
  assert.equal(shouldMarkConversationRead(readConv, myMsg, ME, undefined), null);
});

test('applyReadMarker updates myLastReadAt/unreadCount for self and otherLastReadAt for peer monotonically', () => {
  const conv = makeConversation({
    unreadCount: 3,
    myLastReadAt: '2026-11-24T02:00:00.000Z',
    otherLastReadAt: '2026-11-24T02:00:00.000Z',
  });

  const selfRead = applyReadMarker(conv, ME, '2026-11-24T02:10:00.000Z', ME);
  assert.equal(selfRead.unreadCount, 0);
  assert.equal(selfRead.myLastReadAt, '2026-11-24T02:10:00.000Z');
  assert.equal(selfRead.otherLastReadAt, '2026-11-24T02:00:00.000Z');

  const peerRead = applyReadMarker(selfRead, OTHER, '2026-11-24T02:20:00.000Z', ME);
  assert.equal(peerRead.otherLastReadAt, '2026-11-24T02:20:00.000Z');

  // Older timestamp never moves otherLastReadAt backwards
  const stalePeerRead = applyReadMarker(peerRead, OTHER, '2026-11-24T01:00:00.000Z', ME);
  assert.equal(stalePeerRead, peerRead);
});

test('findLastSeenMessageId picks the latest outgoing non-SYSTEM message read by peer', () => {
  const messages: ChatMessageSummary[] = [
    makeMsg({ id: 'm1', senderId: ME, createdAt: '2026-11-24T02:00:00.000Z' }),
    makeMsg({ id: 'm2', senderId: OTHER, createdAt: '2026-11-24T02:01:00.000Z' }),
    makeMsg({ id: 'm3', senderId: ME, createdAt: '2026-11-24T02:02:00.000Z' }),
    makeMsg({ id: 'm4', senderId: ME, messageType: 'SYSTEM', createdAt: '2026-11-24T02:03:00.000Z' }),
    makeMsg({ id: 'm5', senderId: ME, createdAt: '2026-11-24T02:10:00.000Z' }),
  ];

  assert.equal(findLastSeenMessageId(messages, ME, null), null);
  assert.equal(findLastSeenMessageId(messages, ME, '2026-11-24T01:59:00.000Z'), null);
  assert.equal(findLastSeenMessageId(messages, ME, '2026-11-24T02:05:00.000Z'), 'm3');
  assert.equal(findLastSeenMessageId(messages, ME, '2026-11-24T02:10:00.000Z'), 'm5');
});

test('applyIncomingMessageToConversation increments unread only for background non-SYSTEM messages from peer', () => {
  const base = makeConversation({ unreadCount: 1 });
  const incoming = makeMsg({ id: 'm10', senderId: OTHER, createdAt: '2026-11-24T03:00:00.000Z' });

  const bg = applyIncomingMessageToConversation(base, incoming, ME, false);
  assert.equal(bg.unreadCount, 2);
  assert.equal(bg.lastMessage?.id, 'm10');

  // Same message arriving again is not double-counted
  const dup = applyIncomingMessageToConversation(bg, incoming, ME, false);
  assert.equal(dup.unreadCount, 2);

  // Open & visible conversation keeps unreadCount at 0
  const fg = applyIncomingMessageToConversation(base, incoming, ME, true);
  assert.equal(fg.unreadCount, 0);

  // SYSTEM message does not increment unreadCount
  const sys = makeMsg({ id: 'm11', senderId: OTHER, messageType: 'SYSTEM', createdAt: '2026-11-24T03:05:00.000Z' });
  const afterSys = applyIncomingMessageToConversation(base, sys, ME, false);
  assert.equal(afterSys.unreadCount, 1);
});
