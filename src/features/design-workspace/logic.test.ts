import { test } from 'node:test';
import assert from 'node:assert/strict';
import { latestVersion, pickCompareTarget, uploadFloorRefs, uploadRowErrors, versionLabel } from './logic.ts';
import type { UploadRow } from './logic.ts';

test('homeowners read "Design N", everyone else the internal label', () => {
  assert.equal(versionLabel('v3', 'homeowner'), 'Design 3');
  assert.equal(versionLabel('v1.2', 'homeowner'), 'Design 1.2');
  assert.equal(versionLabel('v3', 'designer'), 'v3');
});

test('latest version: highest number, then newest; none for an empty list', () => {
  const a = { version_no: 2, created_at: '2026-01-01T00:00:00Z' };
  const b = { version_no: 2, created_at: '2026-01-02T00:00:00Z' };
  const c = { version_no: 1, created_at: '2026-03-01T00:00:00Z' };
  assert.equal(latestVersion([a, c, b]), b);
  assert.equal(latestVersion([]), undefined);
});

test('compare target: the wanted version, else the one before current, else the first', () => {
  const v3 = { id: 'v3', version_no: 3 }, v1 = { id: 'v1', version_no: 1 };
  assert.equal(pickCompareTarget([v3, v1], { version_no: 4 }, 'v1'), v1);
  assert.equal(pickCompareTarget([v3, v1], { version_no: 2 }, 'gone'), v1);
  assert.equal(pickCompareTarget([v3], { version_no: 2 }, null), v3);
  assert.equal(pickCompareTarget([], { version_no: 2 }, null), null);
});

const row = (r: Partial<UploadRow<string>>): UploadRow<string> =>
  ({ key: 'k', floor_id: null, level: 1, name: 'Floor 1', floor_height_mm: 3000, file: 'plan.dxf', ...r });

test('upload rows: existing floors are not checked, new floors are', () => {
  const errors = uploadRowErrors([
    row({ key: 'old', floor_id: 'f1', name: '', file: null }),
    row({ key: 'a', level: 2, name: 'Attic' }),
    row({ key: 'b', level: 2, name: ' attic ', floor_height_mm: 1500, file: null }),
  ]);
  assert.equal(errors.old, undefined);
  assert.deepEqual(Object.keys(errors.b).sort(), ['file', 'height', 'level', 'name']);
  assert.deepEqual(Object.keys(errors.a).sort(), ['level', 'name']);
});

test('upload refs: only rows with a file, existing floors by id', () => {
  assert.deepEqual(uploadFloorRefs([
    row({ floor_id: 'f1' }),
    row({ key: 'n', level: 2, name: ' Roof ', file: 'roof.dxf' }),
    row({ key: 'x', level: 3, file: null }),
  ]), [{ floorId: 'f1' }, { level: 2, name: 'Roof', floorHeightMm: 3000 }]);
});
