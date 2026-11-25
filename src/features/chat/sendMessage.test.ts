import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MAX_CHAT_FILE_BYTES, buildSendBody, canSubmit, validateChatFile } from './sendMessage.ts';
import { sendMessageFailure } from './chatErrors.ts';

const file = (name = 'plan.pdf', bytes = 3) => new File([new Uint8Array(bytes)], name, { type: 'application/pdf' });
const PROJECT = '3f2b8c1e-9a4d-4e7b-8c2a-1d5e6f7a8b9c';

// --- buildSendBody -------------------------------------------------------------

test('text only → JSON with trimmed content', () => {
  assert.deepEqual(buildSendBody({ content: '  hello\nthere  ' }), { kind: 'json', body: { content: 'hello\nthere' } });
});

test('JSON: empty optional fields are left out (undefined, null, "", spaces); "undefined" never appears', () => {
  for (const projectId of [undefined, null, '', '   ']) {
    const built = buildSendBody({ content: 'hi', projectId, designVersionId: projectId });
    assert.deepEqual(built, { kind: 'json', body: { content: 'hi' } });
    assert.equal(JSON.stringify(built).includes('undefined'), false);
  }
  assert.deepEqual(buildSendBody({ content: 'hi', projectId: PROJECT }), { kind: 'json', body: { content: 'hi', projectId: PROJECT } });
  assert.deepEqual(buildSendBody({ content: 'hi', designVersionId: PROJECT }), { kind: 'json', body: { content: 'hi', designVersionId: PROJECT } });
});

test('with a file → multipart with exactly one "file", trimmed caption, no empty fields', () => {
  const built = buildSendBody({ content: '  caption ', file: file('Bản vẽ phòng khách.pdf'), projectId: '', designVersionId: undefined });
  assert.equal(built.kind, 'form');
  if (built.kind !== 'form') return;
  assert.equal(built.form.getAll('file').length, 1);
  const sent = built.form.get('file');
  assert.ok(sent instanceof File);
  assert.equal(sent.name, 'Bản vẽ phòng khách.pdf');
  assert.equal(built.form.get('content'), 'caption');
  assert.equal(built.form.has('projectId'), false);
  assert.equal(built.form.has('designVersionId'), false);
});

test('with a file and no caption → no content field at all', () => {
  const built = buildSendBody({ content: '   ', file: file(), projectId: PROJECT });
  assert.equal(built.kind, 'form');
  if (built.kind !== 'form') return;
  assert.equal(built.form.has('content'), false);
  assert.equal(built.form.get('projectId'), PROJECT);
});

// --- validateChatFile ------------------------------------------------------------

test('exactly 20 MB is fine, one byte more is not', () => {
  assert.equal(validateChatFile({ name: 'a.zip', size: MAX_CHAT_FILE_BYTES }), null);
  assert.equal(validateChatFile({ name: 'a.zip', size: MAX_CHAT_FILE_BYTES + 1 }), 'FILE_TOO_LARGE');
});

test('extension check: .exe refused, upper case accepted, every allowed type passes', () => {
  assert.equal(validateChatFile({ name: 'setup.exe', size: 10 }), 'FILE_TYPE_NOT_ALLOWED');
  assert.equal(validateChatFile({ name: 'photo.JPG', size: 10 }), null);
  assert.equal(validateChatFile({ name: 'noextension', size: 10 }), 'FILE_TYPE_NOT_ALLOWED');
  assert.equal(validateChatFile({ name: 'evil.pdf.exe', size: 10 }), 'FILE_TYPE_NOT_ALLOWED');
  for (const ext of ['png', 'jpg', 'jpeg', 'webp', 'pdf', 'docx', 'xlsx', 'dxf', 'zip']) {
    assert.equal(validateChatFile({ name: `f.${ext}`, size: 10 }), null, ext);
  }
});

// --- canSubmit -------------------------------------------------------------------

test('whitespace only without a file cannot be sent; with a file it can', () => {
  assert.equal(canSubmit('   \n\t ', null), false);
  assert.equal(canSubmit('', null), false);
  assert.equal(canSubmit('   ', file()), true);
  assert.equal(canSubmit('hi', null), true);
});

test('over 4000 characters after trim cannot be sent; spaces around do not count', () => {
  assert.equal(canSubmit('a'.repeat(4000), null), true);
  assert.equal(canSubmit(`  ${'a'.repeat(4000)}  `, null), true);
  assert.equal(canSubmit('a'.repeat(4001), null), false);
  assert.equal(canSubmit('a'.repeat(4001), file()), false);
});

// --- sendMessageFailure ------------------------------------------------------------

const apiError = (code: string, status: number) => Object.assign(new Error('x'), { name: 'ApiError', code, status });

test('send errors → message and what to do with the draft', () => {
  assert.equal(sendMessageFailure(apiError('CHAT_NOT_ALLOWED', 403)).effect, 'blocked');
  assert.equal(sendMessageFailure(apiError('CHAT_RECIPIENT_INACTIVE', 422)).effect, 'blocked');
  assert.equal(sendMessageFailure(apiError('INVALID_CHAT_ATTACHMENT', 422)).effect, 'dropFile');
  assert.equal(sendMessageFailure(apiError('INVALID_MESSAGE_CONTEXT', 422)).effect, 'dropContext');
  assert.equal(sendMessageFailure(apiError('CONVERSATION_NOT_FOUND', 404)).effect, 'notFound');
  assert.equal(sendMessageFailure(apiError('MESSAGE_CONTENT_REQUIRED', 400)).messageKey, 'chat.errors.MESSAGE_CONTENT_REQUIRED');
  const bug = sendMessageFailure(apiError('VALIDATION_ERROR', 400));
  assert.deepEqual([bug.clientBug, bug.effect, bug.messageKey], [true, null, 'chat.composer.failed']);
});

test('network and 5xx: "may not have been sent", draft untouched', () => {
  for (const e of [new TypeError('Failed to fetch'), apiError('INTERNAL_ERROR', 500)]) {
    const f = sendMessageFailure(e);
    assert.equal(f.messageKey, 'chat.composer.maybeNotSent');
    assert.equal(f.effect, null);
  }
});
