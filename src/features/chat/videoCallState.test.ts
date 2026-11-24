import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { VideoCallItem } from '../../types/chat.ts';
import {
  callEndBanner,
  canStartCallInConversation,
  elapsedSecondsSince,
  formatCallDuration,
  isActiveCallStatus,
  isTerminalCallStatus,
  resolvePeerUserId,
  shouldIgnoreCallEvent,
} from './videoCallState.ts';

const makeCall = (overrides: Partial<VideoCallItem> = {}): VideoCallItem => ({
  id: 'call-1',
  conversationId: 'conv-1',
  callerId: 'u-caller',
  calleeId: 'u-callee',
  status: 'RINGING',
  answeredAt: null,
  endedAt: null,
  durationSeconds: 0,
  createdAt: '2026-11-24T03:00:00.000Z',
  ...overrides,
});

test('status predicates classify RINGING/ONGOING as active and ENDED/DECLINED/MISSED/CANCELLED as terminal', () => {
  assert.equal(isActiveCallStatus('RINGING'), true);
  assert.equal(isActiveCallStatus('ONGOING'), true);
  assert.equal(isActiveCallStatus('ENDED'), false);
  for (const status of ['ENDED', 'DECLINED', 'MISSED', 'CANCELLED'] as const) {
    assert.equal(isTerminalCallStatus(status), true);
  }
});

test('canStartCallInConversation requires canSend and idle phase', () => {
  assert.equal(canStartCallInConversation({ canSend: true }, 'idle'), true);
  assert.equal(canStartCallInConversation({ canSend: false }, 'idle'), false);
  assert.equal(canStartCallInConversation({ canSend: true }, 'ongoing'), false);
});

test('formatCallDuration formats seconds as MM:SS and H:MM:SS', () => {
  assert.equal(formatCallDuration(0), '00:00');
  assert.equal(formatCallDuration(-5), '00:00');
  assert.equal(formatCallDuration(65), '01:05');
  assert.equal(formatCallDuration(3661), '1:01:01');
});

test('elapsedSecondsSince clamps negative clock skew to 0', () => {
  const answeredAt = '2026-11-24T03:00:10.000Z';
  assert.equal(elapsedSecondsSince(null, Date.parse('2026-11-24T03:01:00.000Z')), 0);
  assert.equal(elapsedSecondsSince(answeredAt, Date.parse('2026-11-24T03:00:05.000Z')), 0);
  assert.equal(elapsedSecondsSince(answeredAt, Date.parse('2026-11-24T03:01:25.000Z')), 75);
});

test('shouldIgnoreCallEvent blocks stale or backward call transitions', () => {
  const ringing = makeCall({ id: 'call-1', status: 'RINGING' });
  const ongoing = makeCall({ id: 'call-1', status: 'ONGOING' });
  const ended = makeCall({ id: 'call-1', status: 'ENDED' });
  const otherEnded = makeCall({ id: 'call-old', status: 'ENDED' });

  // From idle: only RINGING can bootstrap
  assert.equal(shouldIgnoreCallEvent(null, ringing), false);
  assert.equal(shouldIgnoreCallEvent(null, ended), true);

  // Active call ignores stale events from another call ID
  assert.equal(shouldIgnoreCallEvent(ongoing, otherEnded), true);

  // Never move ONGOING → RINGING
  assert.equal(shouldIgnoreCallEvent(ongoing, ringing), true);
  // ONGOING → ENDED is valid
  assert.equal(shouldIgnoreCallEvent(ongoing, ended), false);
  // Terminal call ignores further events for same ID
  assert.equal(shouldIgnoreCallEvent(ended, ongoing), true);
});

test('resolvePeerUserId and callEndBanner return accurate peer and summary keys', () => {
  const call = makeCall({ status: 'DECLINED', durationSeconds: 0 });
  assert.equal(resolvePeerUserId(call, 'u-caller'), 'u-callee');
  assert.equal(resolvePeerUserId(call, 'u-callee'), 'u-caller');

  assert.deepEqual(callEndBanner(call, true, 'Nguyen Linh'), {
    key: 'chat.call.endedDeclinedByPeer',
    vars: { name: 'Nguyen Linh' },
  });
  assert.deepEqual(callEndBanner(call, false, 'Nguyen Linh'), {
    key: 'chat.call.endedDeclined',
  });
  assert.deepEqual(callEndBanner({ status: 'ENDED', durationSeconds: 92 }, true, 'Nguyen Linh'), {
    key: 'chat.call.endedNormal',
    vars: { duration: '01:32' },
  });
});
