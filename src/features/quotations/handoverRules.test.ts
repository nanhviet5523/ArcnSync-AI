/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { canHomeownerDownload, canPreview, canSeeDxf, milestoneClear, submitHandoverBlock } from './handoverRules.ts';
import { errorText } from '../../i18n/index.ts';

test('milestoneClear: missing, PAID or CANCELLED do not block; PENDING/INVOICED/OVERDUE block', () => {
  assert.equal(milestoneClear(undefined), true);
  assert.equal(milestoneClear(null), true);
  assert.equal(milestoneClear('PAID'), true);
  assert.equal(milestoneClear('CANCELLED'), true);
  assert.equal(milestoneClear('PENDING'), false);
  assert.equal(milestoneClear('INVOICED'), false);
  assert.equal(milestoneClear('OVERDUE'), false);
});

test('submitHandoverBlock: checks uploading, then render3d payment, then render count', () => {
  assert.equal(submitHandoverBlock({ renders: 0, uploading: true, render3d: 'INVOICED' }), 'uploading');
  assert.equal(submitHandoverBlock({ renders: 2, uploading: false, render3d: 'INVOICED' }), 'awaitingRender3dPayment');
  assert.equal(submitHandoverBlock({ renders: 0, uploading: false, render3d: 'PAID' }), 'needRender');
  assert.equal(submitHandoverBlock({ renders: 1, uploading: false, render3d: 'PAID' }), null);
  assert.equal(submitHandoverBlock({ renders: 1, uploading: false, render3d: undefined }), null);
});

test('canHomeownerDownload: requires APPROVED and FINAL_PACKAGE PAID', () => {
  assert.equal(canHomeownerDownload('APPROVED', 'PAID'), true);
  assert.equal(canHomeownerDownload('APPROVED', 'INVOICED'), false);
  assert.equal(canHomeownerDownload('APPROVED', 'CANCELLED'), false);
  assert.equal(canHomeownerDownload('SUBMITTED', 'PAID'), false);
});

test('canSeeDxf: homeowner and staff need PAID; designer and admin only need APPROVED', () => {
  assert.equal(canSeeDxf('homeowner', 'APPROVED', 'PAID'), true);
  assert.equal(canSeeDxf('homeowner', 'APPROVED', 'INVOICED'), false);
  assert.equal(canSeeDxf('staff', 'APPROVED', 'INVOICED'), false);
  assert.equal(canSeeDxf('designer', 'APPROVED', 'INVOICED'), true);
  assert.equal(canSeeDxf('admin', 'APPROVED', 'PENDING'), true);
  assert.equal(canSeeDxf('designer', 'SUBMITTED', 'PAID'), false);
});

test('canPreview: DOCUMENT never previews for any role or status', () => {
  for (const role of ['homeowner', 'designer', 'staff', 'admin']) {
    for (const status of ['NOT_SUBMITTED', 'SUBMITTED', 'CHANGES_REQUESTED', 'APPROVED'] as const) {
      assert.equal(canPreview(role, status, 'DOCUMENT'), false, `${role}/${status}/DOCUMENT`);
    }
  }
});

test('canPreview: homeowner previews RENDER_IMAGE and MODEL_3D only when SUBMITTED or APPROVED', () => {
  for (const type of ['RENDER_IMAGE', 'MODEL_3D'] as const) {
    assert.equal(canPreview('homeowner', 'NOT_SUBMITTED', type), false);
    assert.equal(canPreview('homeowner', 'CHANGES_REQUESTED', type), false);
    assert.equal(canPreview('homeowner', 'SUBMITTED', type), true);
    assert.equal(canPreview('homeowner', 'APPROVED', type), true);
  }
});

test('canPreview: designer, staff and admin always preview RENDER_IMAGE and MODEL_3D', () => {
  for (const role of ['designer', 'staff', 'admin']) {
    for (const status of ['NOT_SUBMITTED', 'SUBMITTED', 'CHANGES_REQUESTED', 'APPROVED'] as const) {
      assert.equal(canPreview(role, status, 'RENDER_IMAGE'), true);
      assert.equal(canPreview(role, status, 'MODEL_3D'), true);
    }
  }
});

test('errorText: maps PREVIEW_NOT_AVAILABLE, DOWNLOAD_FORBIDDEN reasons and PREVIOUS_MILESTONE_UNPAID', () => {
  assert.equal(errorText({ code: 'PREVIEW_NOT_AVAILABLE' }), 'Preview is not available for this file.');
  assert.equal(
    errorText({ code: 'DOWNLOAD_FORBIDDEN', details: { reason: 'NOT_SUBMITTED' } }),
    'You can preview these files once the Lead designer submits the handover package.',
  );
  assert.equal(
    errorText({ code: 'DOWNLOAD_FORBIDDEN', details: { reason: 'PAYMENT_REQUIRED' } }),
    'These files can be downloaded once the final installment is paid.',
  );
  assert.equal(
    errorText({ code: 'DOWNLOAD_FORBIDDEN', details: { reason: 'NOT_APPROVED' } }),
    'You can download these files once the handover package is approved.',
  );
  assert.match(
    errorText({ code: 'PREVIOUS_MILESTONE_UNPAID', details: { stageType: 'RENDER_3D' } }),
    /installment/,
  );
});
