import { formatDateTime, formatMoney, t } from '../../i18n/index.ts';
import type { Comment, CommentReply, DesignElement, DesignVersion, Product, Project, Role } from './types';

/** Money and time formatting live in src/i18n; re-exported for the workspace components. */
export const formatVnd = formatMoney;
export const formatTime = formatDateTime;

/** "W × D × H mm" of a product, or null when the supplier gave no size. */
export const productSize = (p: Pick<Product, 'width_mm' | 'depth_mm' | 'height_mm'>) =>
  [p.width_mm, p.depth_mm, p.height_mm].some((v) => v != null) ? t('ws.sizeMm', { w: p.width_mm ?? '—', d: p.depth_mm ?? '—', h: p.height_mm ?? '—' }) : null;

/**
 * Version label by viewer: homeowners read "Design 3" (v1.2 → "Design 1.2"), everyone else keeps the internal "v3".
 * One function for the project pages and the workspace (version menu, compare switch, decision).
 */
export const versionLabel = (label: string, role: string) =>
  role === 'homeowner' ? label.replace(/^v(?=\d)/i, t('cards.designPrefix')) : label;

export const elementName = (e: DesignElement) => e.product?.name ?? e.name ?? e.block_name;
/** Block không khớp products.block_code hay mã danh mục. */
export const isUnknownItem = (e: DesignElement) => !e.category;
/** Có danh mục (model minh hoạ) nhưng chưa chọn sản phẩm. */
export const isNotChosenItem = (e: DesignElement) => e.choice === 'NOT_CHOSEN';

export type DiffKind = 'added' | 'removed' | 'moved' | 'replaced' | 'changed';
export const DIFF_COLORS: Record<DiffKind, string> = { added: '#16a34a', removed: '#dc2626', moved: '#d97706', replaced: '#7c3aed', changed: '#2563eb' };

export type CommentKind = 'element' | 'point' | 'general';
export const commentKind = (c: Comment): CommentKind => (c.kind === 'ELEMENT' ? 'element' : c.kind === 'POINT' ? 'point' : 'general');

export interface CommentThread {
  root: Comment;
  replies: CommentReply[];
  /** Món của comment trong version đang xem (backend tìm theo tầng + dxf_handle); null nếu món đã bị xoá. */
  element: DesignElement | null;
  carried: boolean;
  num: number | null;
}

/** Backend đã gom comment (gồm comment chưa xong của bản trước). Ở đây chỉ gắn món và đánh số ghim theo thứ tự viết. */
export function commentThreads(comments: Comment[], version: Pick<DesignVersion, 'id' | 'elements'>): CommentThread[] {
  const byId = new Map(version.elements.map((e) => [e.id, e]));
  let n = 0;
  return comments.map((root) => ({
    root,
    replies: root.replies,
    element: root.current_element ? byId.get(root.current_element.id) ?? null : null,
    carried: root.design_version_id !== version.id,
    num: commentKind(root) === 'general' ? null : ++n,
  }));
}

/** The other side of the conversation: a designer waits on the homeowner and vice versa. Staff and admin wait on no one. */
const OTHER: Partial<Record<Role, Role>> = { designer: 'homeowner', homeowner: 'designer' };

/**
 * A thread is waiting for me when it is still OPEN and its latest message (the root or the newest reply)
 * was written by the other side. Shared by the project list ("Needs your action") and the workspace filter.
 */
export function waitingForMe(c: Pick<Comment, 'status' | 'author' | 'created_at' | 'replies'>, me: Role): boolean {
  const other = OTHER[me];
  if (!other || c.status !== 'OPEN') return false;
  const last = [c, ...c.replies].reduce((a, b) => (b.created_at > a.created_at ? b : a));
  return last.author.role === other;
}
export const countWaitingForMe = (comments: Comment[], me: Role) => comments.filter((c) => waitingForMe(c, me)).length;

export type StatusFilter = 'UNRESOLVED' | 'ALL';
export const statusMatches = (c: Comment, f: StatusFilter) => f === 'ALL' || c.status !== 'RESOLVED';

/** Ghim 2D: bỏ RESOLVED trừ khi đang chọn thẻ đó. */
export const pinsToShow = (threads: CommentThread[], selectedId: string | null) =>
  threads.filter((t) => t.num !== null && (t.root.status !== 'RESOLVED' || t.root.id === selectedId));

export const pinPoint = (t: CommentThread) =>
  t.element ? { x: t.element.position.x, y: t.element.position.y } : t.root.pin_position;

export type Action =
  | 'upload' | 'download' | 'comment' | 'reply' | 'respond' | 'requestChanges'
  | 'approveLayout' | 'approveProducts' | 'editItems'
  /** Download DXF, export .glb, save .png: only the project's designer (skill ui-nghiep-vu §7). */
  | 'exportFiles';

export interface CanCtx {
  role: Role;
  version: Pick<DesignVersion, 'status' | 'version_type'>;
  project: Pick<Project, 'status'>;
  openCount?: number;
  unknownCount?: number;
  notChosenCount?: number;
}

/** ok=false + reason: hiện nút mờ kèm lý do; ok=false không reason: ẩn. */
export function can(action: Action, { role, version, project, openCount = 0, unknownCount = 0, notChosenCount = 0 }: CanCtx): { ok: boolean; reason?: string } {
  const yes = { ok: true }, no = { ok: false };
  const designer = role === 'designer', customer = role === 'homeowner';
  if (action === 'download' || action === 'exportFiles') return designer ? yes : no;
  const locked = project.status === 'COMPLETED' || project.status === 'CANCELLED' || version.status === 'SUPERSEDED' || version.status === 'APPROVED';
  if (locked) return no;
  const layout = version.version_type === 'LAYOUT_2D', render = version.version_type === 'RENDER_3D';
  switch (action) {
    case 'upload': return designer && layout && project.status === 'IN_DESIGN' ? yes : no;
    case 'comment':
    case 'reply': return designer || customer ? yes : no;
    case 'respond': return customer ? yes : no;
    case 'editItems': return designer && render && project.status === 'PRODUCT_SELECTION' ? yes : no;
    case 'requestChanges':
      if (!customer || !(layout || render)) return no;
      return openCount ? yes : { ok: false, reason: t('reasons.commentFirst') };
    case 'approveLayout': {
      if (!customer || !layout) return no;
      const why = [
        openCount && t('reasons.openComments', { n: openCount }),
        unknownCount && `${t('reasons.unknownItems', { n: unknownCount })}: ${t('reasons.unknownHint')}`,
      ].filter(Boolean);
      return why.length ? { ok: false, reason: why.join('. ') } : yes;
    }
    case 'approveProducts': {
      if (!customer || !render) return no;
      const why = [
        openCount && t('reasons.openComments', { n: openCount }),
        unknownCount && t('reasons.unknownItems', { n: unknownCount }),
        notChosenCount && t('reasons.notChosen', { n: notChosenCount }),
      ].filter(Boolean);
      return why.length ? { ok: false, reason: why.join('. ') } : yes;
    }
  }
  return no;
}
