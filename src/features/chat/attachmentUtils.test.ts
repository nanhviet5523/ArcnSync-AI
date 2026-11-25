import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  attachmentBadgeLabel,
  isPreviewableImageMime,
  parseContentDispositionFileName,
  resolveAttachmentPath,
} from './attachmentUtils.ts';

test('resolveAttachmentPath uses backend relative URL when safe, otherwise builds from messageId', () => {
  const id = '11111111-1111-4111-8111-111111111111';
  assert.equal(resolveAttachmentPath(id, `/messages/${id}/attachment`), `/messages/${id}/attachment`);
  assert.equal(resolveAttachmentPath(id, undefined), `/messages/${id}/attachment`);
  assert.equal(resolveAttachmentPath(id, 'https://evil.example/steal-token'), `/messages/${id}/attachment`);
  assert.equal(resolveAttachmentPath(id, '/other/path'), `/messages/${id}/attachment`);
});

test('isPreviewableImageMime allows PNG, JPEG and WebP only', () => {
  assert.equal(isPreviewableImageMime('image/png'), true);
  assert.equal(isPreviewableImageMime('image/jpeg'), true);
  assert.equal(isPreviewableImageMime('IMAGE/WEBP'), true);
  assert.equal(isPreviewableImageMime('image/svg+xml'), false);
  assert.equal(isPreviewableImageMime('application/pdf'), false);
});

test('parseContentDispositionFileName decodes RFC 5987 UTF-8 Vietnamese filenames and plain filenames', () => {
  assert.equal(
    parseContentDispositionFileName("attachment; filename*=UTF-8''M%E1%BA%B7t%20b%E1%BA%B1ng%20v3.pdf"),
    'Mặt bằng v3.pdf',
  );
  assert.equal(
    parseContentDispositionFileName('attachment; filename="floor-plan.dxf"'),
    'floor-plan.dxf',
  );
  assert.equal(parseContentDispositionFileName('attachment; filename=quote.xlsx'), 'quote.xlsx');
  // Both forms present (RFC 6266): the UTF-8 name wins whatever the order.
  assert.equal(
    parseContentDispositionFileName("attachment; filename=\"Mat bang.pdf\"; filename*=UTF-8''M%E1%BA%B7t%20b%E1%BA%B1ng.pdf"),
    'Mặt bằng.pdf',
  );
  // Only a non-UTF-8 filename*: never read as the plain name "*=…".
  assert.equal(parseContentDispositionFileName("attachment; filename*=ISO-8859-1''abc.pdf"), null);
  assert.equal(parseContentDispositionFileName(null), null);
  assert.equal(parseContentDispositionFileName('inline'), null);
});

test('attachmentBadgeLabel derives clean uppercase extension labels', () => {
  assert.equal(attachmentBadgeLabel('concept.pdf', 'application/pdf'), 'PDF');
  assert.equal(attachmentBadgeLabel('layout.dxf', 'application/dxf'), 'DXF');
  assert.equal(attachmentBadgeLabel('photo.jpeg', 'image/jpeg'), 'JPG');
  assert.equal(attachmentBadgeLabel('unknown', 'application/octet-stream'), 'FILE');
});
