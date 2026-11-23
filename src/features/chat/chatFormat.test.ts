import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dayDivider, dayKey, formatBytes } from './chatFormat.ts';

test('formatBytes reads the BIGINT string', () => {
  assert.equal(formatBytes('512'), '512 B');
  assert.equal(formatBytes('1536'), '1.5 KB');
  assert.equal(formatBytes('1048576'), '1 MB');
  assert.equal(formatBytes('5452595'), '5.2 MB');
  assert.equal(formatBytes('abc'), '');
});

test('days are Vietnam days', () => {
  // 18:30 UTC is already the next day in Vietnam (UTC+7).
  assert.equal(dayKey('2026-11-23T18:30:00Z'), '2026-11-24');
  const now = new Date('2026-11-24T05:00:00Z');
  assert.equal(dayDivider('2026-11-23T18:30:00Z', now), 'today');
  assert.equal(dayDivider('2026-11-23T05:00:00Z', now), 'yesterday');
  assert.equal(dayDivider('2026-11-20T05:00:00Z', now), 'Friday, Nov 20, 2026');
});
