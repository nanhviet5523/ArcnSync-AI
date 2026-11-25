import { test } from 'node:test';
import assert from 'node:assert/strict';
import { en } from '../../i18n/en.ts';
import { PROJECT_STEPS, projectStepStates, stepIndex } from './steps.ts';

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

test('step states: DRAFT puts Survey active and the rest upcoming', () => {
  assert.deepEqual(projectStepStates('DRAFT'), {
    states: ['active', 'upcoming', 'upcoming', 'upcoming', 'upcoming', 'upcoming', 'upcoming'], cancelled: false, known: true,
  });
});

test('step states: IN_DESIGN and QUOTING mark the earlier steps done', () => {
  assert.deepEqual(projectStepStates('IN_DESIGN').states, ['done', 'done', 'done', 'active', 'upcoming', 'upcoming', 'upcoming']);
  assert.deepEqual(projectStepStates('QUOTING').states, ['done', 'done', 'done', 'done', 'done', 'active', 'upcoming']);
  // QUOTING sent back to PRODUCT_SELECTION: the stepper goes back too
  assert.deepEqual(projectStepStates('PRODUCT_SELECTION').states, ['done', 'done', 'done', 'done', 'active', 'upcoming', 'upcoming']);
});

test('step states: COMPLETED is every step done', () => {
  assert.deepEqual(projectStepStates('COMPLETED').states, PROJECT_STEPS.map(() => 'done'));
});

test('step states: CANCELLED is every step muted, none active', () => {
  assert.deepEqual(projectStepStates('CANCELLED'), { states: PROJECT_STEPS.map(() => 'muted'), cancelled: true, known: true });
});

test('step states: an unknown status is muted and flagged, not a crash', () => {
  for (const s of ['ON_HOLD', '', 'draft']) {
    assert.deepEqual(projectStepStates(s), { states: PROJECT_STEPS.map(() => 'muted'), cancelled: false, known: false }, s);
  }
});
