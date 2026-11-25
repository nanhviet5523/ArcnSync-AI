/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildContactPayload,
  CONTACT_FULL_NAME_MAX,
  CONTACT_MESSAGE_MAX,
  extractContactFieldErrors,
  INITIAL_CONTACT_FORM,
  isRateLimitError,
  validateContactForm,
} from './contactForm.ts';
import { errorText } from '../../i18n/index.ts';

test('validateContactForm: accepts a valid form with optional fields empty', () => {
  const errors = validateContactForm({
    ...INITIAL_CONTACT_FORM,
    fullName: 'Nguyen Van A',
    email: 'khach@example.com',
    message: 'I want to design my 2-bedroom apartment.',
  });
  assert.deepEqual(errors, {});
});

test('validateContactForm: requires fullName, valid email, and message', () => {
  const errors = validateContactForm({
    ...INITIAL_CONTACT_FORM,
    fullName: '   ',
    email: 'not-an-email',
    message: '  ',
  });
  assert.equal(errors.fullName, 'fullNameRequired');
  assert.equal(errors.email, 'emailInvalid');
  assert.equal(errors.message, 'messageRequired');
});

test('validateContactForm: enforces max lengths and Vietnam/international phone pattern', () => {
  const errors = validateContactForm({
    ...INITIAL_CONTACT_FORM,
    fullName: 'a'.repeat(CONTACT_FULL_NAME_MAX + 1),
    email: 'valid@example.com',
    phone: '090-123-4567',
    message: 'm'.repeat(CONTACT_MESSAGE_MAX + 1),
  });
  assert.equal(errors.fullName, 'fullNameTooLong');
  assert.equal(errors.phone, 'phoneInvalid');
  assert.equal(errors.message, 'messageTooLong');

  assert.deepEqual(
    validateContactForm({
      ...INITIAL_CONTACT_FORM,
      fullName: 'A',
      email: 'a@b.co',
      phone: '+84901234567',
      message: 'Hello',
    }),
    {},
  );
  assert.deepEqual(
    validateContactForm({
      ...INITIAL_CONTACT_FORM,
      fullName: 'A',
      email: 'a@b.co',
      phone: '0901234567',
      message: 'Hello',
    }),
    {},
  );
});

test('buildContactPayload: trims strings, omits empty optionals, preserves honeypot', () => {
  const payload = buildContactPayload({
    fullName: '  Nguyen Van A  ',
    email: '  Khach@Example.COM ',
    phone: '   ',
    topic: 'CONSULTATION',
    propertyType: '',
    message: '  Need advice  ',
    website: '',
  });
  assert.deepEqual(payload, {
    fullName: 'Nguyen Van A',
    email: 'khach@example.com',
    topic: 'CONSULTATION',
    message: 'Need advice',
    website: '',
  });

  const withOptionals = buildContactPayload({
    fullName: 'Nguyen Van A',
    email: 'a@b.co',
    phone: ' 0901234567 ',
    topic: 'NEW_PROJECT',
    propertyType: 'APARTMENT',
    message: 'Hi',
    website: 'https://bot.example',
  });
  assert.equal(withOptionals.phone, '0901234567');
  assert.equal(withOptionals.propertyType, 'APARTMENT');
  assert.equal(withOptionals.website, 'https://bot.example');
});

test('extractContactFieldErrors and isRateLimitError handle backend 400 and 429', () => {
  assert.deepEqual(
    extractContactFieldErrors({
      status: 400,
      fieldErrors: { phone: 'Enter a valid phone number.', unknownField: 'Ignored' },
    }),
    { phone: 'Enter a valid phone number.' },
  );
  assert.deepEqual(extractContactFieldErrors({ status: 500, fieldErrors: { email: 'x' } }), {});
  assert.equal(isRateLimitError({ status: 429 }), true);
  assert.equal(isRateLimitError({ code: 'TOO_MANY_REQUESTS' }), true);
  assert.equal(isRateLimitError({ status: 400 }), false);
});

test('errorText maps CONTACT_INQUIRY_NOT_FOUND', () => {
  assert.equal(errorText({ code: 'CONTACT_INQUIRY_NOT_FOUND' }), "This inquiry couldn't be found.");
});
