// No '@/' imports here: logic.ts (unit-tested with node --test) imports this file.
import { en } from './en.ts';

type Params = Record<string, string | number>;
type Node = string | readonly string[] | { [key: string]: Node };

const lookup = (key: string): Node | undefined => {
  let node: unknown = en;
  for (const part of key.split('.')) node = (node as Record<string, unknown> | undefined)?.[part];
  return node as Node | undefined;
};

/** t('area.key', { n: 2 }) — fills {placeholders}; entries with one/other pick by n. Missing keys return the key. */
export function t(key: string, params?: Params): string {
  let node = lookup(key);
  if (node && typeof node === 'object' && !Array.isArray(node) && params && 'n' in params) {
    node = (node as Record<string, Node>)[Number(params.n) === 1 ? 'one' : 'other'];
  }
  if (typeof node !== 'string') return key;
  return params ? node.replace(/\{(\w+)\}/g, (m, k: string) => (k in params ? String(params[k]) : m)) : node;
}

/** Arrays such as step labels. */
export const tList = (key: string): string[] => {
  const node = lookup(key);
  return Array.isArray(node) ? [...node] : [];
};

const money = new Intl.NumberFormat('en-US');
/** Backend money is a string ("12500000.00"); convert only for display: 12,500,000 ₫ */
export const formatMoney = (v: number | string) => `${money.format(Math.round(Number(v)))} ₫`;
export const formatNumber = (v: number | string) => money.format(Number(v));

const zone = 'Asia/Ho_Chi_Minh';
export const formatDateTime = (iso: string) =>
  new Intl.DateTimeFormat('en-US', { timeZone: zone, dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso));
export const formatDate = (iso: string) =>
  new Intl.DateTimeFormat('en-US', { timeZone: zone, dateStyle: 'medium' }).format(new Date(iso));

/** Any thrown error → English sentence. Backend messages (Vietnamese) are never shown; codes are mapped instead. */
export function errorText(e: unknown): string {
  const err = (e ?? {}) as { name?: string; code?: string; status?: number; message?: string; details?: Record<string, unknown> };
  const d = err.details ?? {};
  if (err.code) {
    if (err.code === 'UNKNOWN_BLOCKS') {
      const names = [...new Set(((d.unknownBlocks as { blockName: string }[] | undefined) ?? []).map((b) => b.blockName))];
      return t('errors.UNKNOWN_BLOCKS', { blocks: names.join(', ') || '—' });
    }
    if (err.code === 'COMMENTS_OPEN') return t('errors.COMMENTS_OPEN', { n: Number(d.openComments ?? 1) });
    if (err.code === 'PRODUCTS_NOT_CHOSEN') return t('errors.PRODUCTS_NOT_CHOSEN', { n: Number(d.unchosen ?? 1) });
    const mapped = t(`errors.${err.code}`);
    if (mapped !== `errors.${err.code}`) return mapped;
    if (err.code.endsWith('NOT_FOUND')) return t('errors.notFound');
    return t('errors.unknown', { code: err.code });
  }
  if (err.name === 'ApiError') return err.status ? t('errors.unknown', { code: `HTTP ${err.status}` }) : t('errors.network');
  // errors thrown by our own code are already English
  return err.message || t('errors.unknownNoCode');
}

/** Field errors from a VALIDATION_ERROR: keep the field names, replace backend text with English. */
export const fieldErrorsText = (fields: Record<string, string> | undefined) =>
  Object.fromEntries(Object.keys(fields ?? {}).map((k) => [k.split('.').pop() ?? k, t('common.checkValue')]));
