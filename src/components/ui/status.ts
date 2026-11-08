import { t } from '@/i18n';

/**
 * Chip colours. One fixed colour per step, shared by every page:
 * Concept light blue, Layout blue, Products violet, Quotation orange, In review yellow,
 * Approved/Completed green, Cancelled light red, "Needs my action" yellow-orange (amber).
 * gray = not started, struck = superseded.
 */
export type Tone = 'gray' | 'sky' | 'blue' | 'violet' | 'orange' | 'yellow' | 'amber' | 'green' | 'red' | 'struck';

export const TONE_CLASS: Record<Tone, string> = {
  gray: 'bg-slate-100 text-slate-700',
  sky: 'bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-100',
  blue: 'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-100',
  violet: 'bg-violet-50 text-violet-700 ring-1 ring-inset ring-violet-100',
  orange: 'bg-orange-50 text-orange-700 ring-1 ring-inset ring-orange-100',
  yellow: 'bg-yellow-50 text-yellow-800 ring-1 ring-inset ring-yellow-200',
  amber: 'bg-amber-100 text-amber-800',
  green: 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-100',
  red: 'bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-100',
  struck: 'bg-slate-50 text-slate-400 line-through',
};

/** The one map from backend enums to label + tone. */
const STATUS: Record<string, Record<string, Tone>> = {
  project: {
    DRAFT: 'gray', CONTRACT_PENDING: 'yellow', REQUIREMENT_ANALYSIS: 'gray', IN_DESIGN: 'blue',
    PRODUCT_SELECTION: 'violet', QUOTING: 'orange', COMPLETED: 'green', CANCELLED: 'red',
  },
  version: { DRAFT: 'gray', SUBMITTED: 'yellow', REVISION_REQUESTED: 'blue', APPROVED: 'green', SUPERSEDED: 'struck' },
  comment: { OPEN: 'amber', ADDRESSED: 'blue', RESOLVED: 'green' },
  choice: { CHOSEN: 'green', NOT_CHOSEN: 'amber', UNIDENTIFIED: 'gray' },
  stage: { CONCEPT: 'sky', LAYOUT_2D: 'blue', RENDER_3D: 'violet' },
  flag: { NEEDS_ME: 'amber' },
};
export type StatusKind = 'project' | 'version' | 'comment' | 'choice' | 'stage' | 'flag';

export const statusInfo = (kind: StatusKind, value: string) => ({
  label: t(`status.${kind}.${value}`),
  tone: STATUS[kind]?.[value] ?? 'gray',
});

const ROLE_ALIAS: Record<string, string> = { CUSTOMER: 'homeowner', HOMEOWNER: 'homeowner', STAFF: 'staff', DESIGNER: 'designer', SUPPLIER: 'supplier', ADMIN: 'admin' };
/** CUSTOMER (backend) and homeowner (frontend) both read "Homeowner". */
export const roleLabel = (role: string) => t(`role.${ROLE_ALIAS[role] ?? role}`);
