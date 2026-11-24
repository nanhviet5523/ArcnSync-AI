// No '@/' imports here: unit-tested with node --test (contactForm.test.ts).
import type { ContactInput, InquiryPropertyType, InquiryTopic } from './inquiryApi';

export const CONTACT_FULL_NAME_MAX = 100;
export const CONTACT_EMAIL_MAX = 255;
export const CONTACT_MESSAGE_MAX = 5000;
/** Same pattern as backend PHONE_PATTERN: 9–15 digits, optional leading +. */
export const CONTACT_PHONE_PATTERN = /^\+?\d{9,15}$/;
export const CONTACT_EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const VALID_TOPICS: readonly InquiryTopic[] = ['NEW_PROJECT', 'CONSULTATION', 'PARTNERSHIP', 'SUPPORT', 'OTHER'];
const VALID_PROPERTY_TYPES: readonly InquiryPropertyType[] = ['APARTMENT', 'HOUSE'];

export interface ContactFormValues {
  fullName: string;
  email: string;
  phone: string;
  topic: InquiryTopic;
  propertyType: InquiryPropertyType | '';
  message: string;
  /** Honeypot: hidden off-screen, left empty by real users. */
  website: string;
}

export type ContactField = 'fullName' | 'email' | 'phone' | 'topic' | 'propertyType' | 'message';
export type ContactFieldErrorCode =
  | 'fullNameRequired'
  | 'fullNameTooLong'
  | 'emailRequired'
  | 'emailInvalid'
  | 'phoneInvalid'
  | 'topicInvalid'
  | 'propertyTypeInvalid'
  | 'messageRequired'
  | 'messageTooLong';

export type ContactFieldErrors = Partial<Record<ContactField, ContactFieldErrorCode>>;

export const INITIAL_CONTACT_FORM: ContactFormValues = {
  fullName: '',
  email: '',
  phone: '',
  topic: 'NEW_PROJECT',
  propertyType: '',
  message: '',
  website: '',
};

/** Client-side validation mirroring backend CreateContactInquiryDto. */
export function validateContactForm(values: ContactFormValues): ContactFieldErrors {
  const errors: ContactFieldErrors = {};

  const fullName = values.fullName.trim();
  if (!fullName) errors.fullName = 'fullNameRequired';
  else if (fullName.length > CONTACT_FULL_NAME_MAX) errors.fullName = 'fullNameTooLong';

  const email = values.email.trim();
  if (!email) errors.email = 'emailRequired';
  else if (email.length > CONTACT_EMAIL_MAX || !CONTACT_EMAIL_PATTERN.test(email)) errors.email = 'emailInvalid';

  const phone = values.phone.trim();
  if (phone && !CONTACT_PHONE_PATTERN.test(phone)) errors.phone = 'phoneInvalid';

  if (!VALID_TOPICS.includes(values.topic)) errors.topic = 'topicInvalid';

  if (values.propertyType && !VALID_PROPERTY_TYPES.includes(values.propertyType)) {
    errors.propertyType = 'propertyTypeInvalid';
  }

  const message = values.message.trim();
  if (!message) errors.message = 'messageRequired';
  else if (message.length > CONTACT_MESSAGE_MAX) errors.message = 'messageTooLong';

  return errors;
}

/** Builds the POST /contact-inquiries body: trims strings, omits empty optional fields, preserves honeypot. */
export function buildContactPayload(values: ContactFormValues): ContactInput {
  const phone = values.phone.trim();
  const payload: ContactInput = {
    fullName: values.fullName.trim(),
    email: values.email.trim().toLowerCase(),
    topic: values.topic,
    message: values.message.trim(),
    website: values.website,
  };
  if (phone) payload.phone = phone;
  if (values.propertyType) payload.propertyType = values.propertyType;
  return payload;
}

const KNOWN_FIELDS = new Set<string>(['fullName', 'email', 'phone', 'topic', 'propertyType', 'message']);

/** Extracts known form field errors from a backend 400 ApiError. */
export function extractContactFieldErrors(error: unknown): Partial<Record<ContactField, string>> {
  const err = (error ?? {}) as { status?: number; fieldErrors?: Record<string, string> };
  if (err.status !== 400 && err.status !== 422) return {};
  const out: Partial<Record<ContactField, string>> = {};
  for (const [rawKey, msg] of Object.entries(err.fieldErrors ?? {})) {
    const key = rawKey.split('.').pop() ?? rawKey;
    if (KNOWN_FIELDS.has(key) && typeof msg === 'string' && msg.trim()) {
      out[key as ContactField] = msg;
    }
  }
  return out;
}

export function isRateLimitError(error: unknown): boolean {
  const err = (error ?? {}) as { status?: number; code?: string };
  return err.status === 429 || err.code === 'TOO_MANY_REQUESTS';
}
