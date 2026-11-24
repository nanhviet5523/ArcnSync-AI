import { apiRequest } from '@/services/authService';

export type InquiryStatus = 'NEW' | 'IN_PROGRESS' | 'RESOLVED' | 'SPAM';
export type InquiryTopic = 'NEW_PROJECT' | 'CONSULTATION' | 'PARTNERSHIP' | 'SUPPORT' | 'OTHER';
export type InquiryPropertyType = 'APARTMENT' | 'HOUSE';

export const INQUIRY_STATUSES: InquiryStatus[] = ['NEW', 'IN_PROGRESS', 'RESOLVED', 'SPAM'];
export const INQUIRY_TOPICS: InquiryTopic[] = ['NEW_PROJECT', 'CONSULTATION', 'PARTNERSHIP', 'SUPPORT', 'OTHER'];

export interface Inquiry {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  topic: InquiryTopic;
  propertyType: InquiryPropertyType | null;
  message: string;
  status: InquiryStatus;
  assignee: { id: string; fullName: string } | null;
  staffNote: string | null;
  handledAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface InquiryPage {
  items: Inquiry[];
  total: number;
  /** Whole inbox, not only the filtered page. */
  counts: Record<InquiryStatus, number>;
}

export interface ContactInput {
  fullName: string;
  email: string;
  phone?: string;
  topic: InquiryTopic;
  propertyType?: InquiryPropertyType;
  message: string;
  /** Honeypot: hidden from people, left empty. */
  website?: string;
}

const json = (method: string, body: unknown): RequestInit => ({ method, body: JSON.stringify(body) });
const qs = (q: Record<string, string | number | boolean | undefined>) => {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(q)) if (v !== undefined && v !== '' && v !== false) p.set(k, String(v));
  return p.toString() ? `?${p}` : '';
};

const enc = encodeURIComponent;

export const inquiryApi = {
  /** Public, no account needed (rate limited by IP). */
  submit: (input: ContactInput) => apiRequest<{ message: string }>('/contact-inquiries', json('POST', input)),
  list: (q: { status?: InquiryStatus; topic?: InquiryTopic; q?: string; mine?: boolean } = {}) =>
    apiRequest<InquiryPage>(`/contact-inquiries${qs({ ...q, limit: 100 })}`),
  get: (id: string) => apiRequest<Inquiry>(`/contact-inquiries/${enc(id)}`),
  update: (id: string, body: { status?: InquiryStatus; staffNote?: string | null; assignToMe?: boolean }) =>
    apiRequest<Inquiry>(`/contact-inquiries/${enc(id)}`, json('PATCH', body)),
};
