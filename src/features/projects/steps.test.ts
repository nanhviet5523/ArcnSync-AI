import { test } from 'node:test';
import assert from 'node:assert/strict';
import { en } from '../../i18n/en.ts';
import { PROJECT_STEPS, stepIndex } from './steps.ts';

test('every backend status has its own step, in order', () => {
  assert.deepEqual(
    PROJECT_STEPS.map(stepIndex).slice(0, -1),
    [0, 1, 2, 3, 4, 5],
  );
});

test('completed means every step is done, cancelled is off the bar', () => {
  assert.equal(stepIndex('COMPLETED'), PROJECT_STEPS.length);
  assert.equal(stepIndex('CANCELLED'), -1);
});

test('one label per step, shared by the project pages and the landing page', () => {
  assert.equal(en.steps.project.length, PROJECT_STEPS.length);
  for (const status of PROJECT_STEPS) assert.ok(en.home.steps[status].title, `home.steps.${status} has copy`);
});
