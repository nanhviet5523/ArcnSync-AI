import { formatDateTime, formatMoney, t } from '../../i18n/index.ts';
import type { Comment, CommentReply, CommentTarget, DesignElement, DesignVersion, Product, Project, ProjectRole, Role, VersionSummary } from './types';

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

/** Block không khớp products.block_code hay mã danh mục. */
export const isUnknownItem = (e: DesignElement) => !e.category;
/** Only the designer works with block names; everyone else reads "Unidentified item". */
export const elementName = (e: DesignElement, role: Role) =>
  role !== 'designer' && isUnknownItem(e) ? t('items.unidentified') : e.product?.name ?? e.name ?? e.block_name;
export const elementCategory = (e: DesignElement, role: Role) =>
  e.category?.name ?? (role === 'designer' ? e.block_name : t('items.unidentified'));

/** Versions that can sit next to `current` in Compare: same stage, drawn on the floor in view, newest first. */
export const compareCandidates = <T extends Pick<VersionSummary, 'id' | 'version_no' | 'created_at'> & { version_type: string; floors: readonly { id: string }[] }>(versions: readonly T[], current: { id: string; version_type: string }, floorId: string): T[] =>
  versions
    .filter((v) => v.version_type === current.version_type && v.id !== current.id && (!floorId || v.floors.some((f) => f.id === floorId)))
    .sort((a, b) => b.version_no - a.version_no || b.created_at.localeCompare(a.created_at));

/** The requested version if it is still valid, otherwise the one just before `current`. candidates: newest first. */
export const pickCompareTarget = <T extends Pick<VersionSummary, 'id' | 'version_no'>>(candidates: readonly T[], current: Pick<VersionSummary, 'version_no'>, wanted: string | null): T | null =>
  candidates.find((v) => v.id === wanted) ?? candidates.find((v) => v.version_no < current.version_no) ?? candidates[0] ?? null;

/** Limits of UploadFloorDto in the backend. */
const FLOOR_HEIGHT_MIN_MM = 2000;
const FLOOR_HEIGHT_MAX_MM = 10000;
const NEW_FLOOR_HEIGHT_MM = 3000;

/** A floor row in the Upload dialog: floor_id null = a floor being added. */
export interface UploadRow<F = unknown> { key: string; floor_id: string | null; level: number; name: string; floor_height_mm: number; file: F | null }
export interface UploadRowError { name?: string; level?: string; height?: string; file?: string }

export const newUploadRow = <F,>(rows: readonly UploadRow<F>[]): UploadRow<F> => {
  const level = Math.max(0, ...rows.map((r) => r.level)) + 1;
  return { key: `new-${level}`, floor_id: null, level, name: t('upload.newFloorName', { n: level }), floor_height_mm: NEW_FLOOR_HEIGHT_MM, file: null };
};

/** `floors` field of the upload, in the same order as `files`. Rows without a file are not sent: the backend copies those floors. */
export const uploadFloorRefs = <F,>(rows: readonly UploadRow<F>[]) => rows.filter((r) => r.file).map((r) => (
  r.floor_id ? { floorId: r.floor_id } : { level: r.level, name: r.name.trim(), floorHeightMm: r.floor_height_mm }
));

/** Problems per row key, only for floors being added: existing floors cannot be edited here. */
export function uploadRowErrors<F>(rows: readonly UploadRow<F>[]): Record<string, UploadRowError> {
  const nameOf = (r: UploadRow<F>) => r.name.trim().toLowerCase();
  const out: Record<string, UploadRowError> = {};
  for (const r of rows) {
    if (r.floor_id) continue;
    const others = rows.filter((x) => x.key !== r.key);
    const e: UploadRowError = {};
    if (!r.name.trim()) e.name = t('upload.errFloorName');
    else if (others.some((x) => nameOf(x) === nameOf(r))) e.name = t('upload.errFloorNameTaken');
    if (others.some((x) => x.level === r.level)) e.level = t('upload.errFloorLevelTaken', { n: r.level });
    if (!Number.isInteger(r.floor_height_mm) || r.floor_height_mm < FLOOR_HEIGHT_MIN_MM || r.floor_height_mm > FLOOR_HEIGHT_MAX_MM) {
      e.height = t('upload.errFloorHeight', { min: FLOOR_HEIGHT_MIN_MM, max: FLOOR_HEIGHT_MAX_MM });
    }
    if (!r.file) e.file = t('upload.errNewFloorFile');
    if (Object.keys(e).length) out[r.key] = e;
  }
  return out;
}

/** Newest by version number, then by creation time. Does not rely on the order the API returns. */
export const latestVersion = <T extends Pick<VersionSummary, 'version_no' | 'created_at'>>(items: readonly T[]): T | undefined =>
  items.reduce<T | undefined>((best, v) => (!best || v.version_no > best.version_no || (v.version_no === best.version_no && v.created_at > best.created_at) ? v : best), undefined);

export interface QuickAnchor { target: CommentTarget; x: number; y: number; w: number; h: number }
export interface HintAnchor { x: number; y: number; w: number; h: number }
/** What the viewer is pointing at on the canvas. It belongs to one version and one floor. */
export interface CanvasUi {
  selEl: string | null;
  selComment: string | null;
  target: CommentTarget | null;
  quick: QuickAnchor | null;
  hint: HintAnchor | null;
  commentMode: boolean;
}
/** State after changing version or floor. */
export const CLEAR_CANVAS: CanvasUi = { selEl: null, selComment: null, target: null, quick: null, hint: null, commentMode: false };
/** At Products a comment on an item is a request to change its model, colour or material. */
export const commentPlaceholder = (target: CommentTarget | null, isRender: boolean) =>
  t(isRender && target?.kind === 'element' ? 'comments.placeholderItem' : 'comments.placeholder');
/** A comment must not carry an element id from another version. */
export const targetInVersion = (target: CommentTarget, elements: readonly Pick<DesignElement, 'id'>[]) =>
  target.kind !== 'element' || elements.some((e) => e.id === target.element.id);
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
 * The designer marked it addressed: the homeowner has to accept it or say not yet.
 * Otherwise a thread is waiting for me when it is still OPEN and its latest message (the root or the newest reply)
 * was written by the other side. Shared by the project list ("Needs your action") and the workspace filter.
 */
export function waitingForMe(c: Pick<Comment, 'status' | 'author' | 'created_at' | 'replies'>, me: Role): boolean {
  if (me === 'homeowner' && c.status === 'ADDRESSED') return true;
  const other = OTHER[me];
  if (!other || c.status !== 'OPEN') return false;
  const last = [c, ...c.replies].reduce((a, b) => (b.created_at > a.created_at ? b : a));
  return last.author.role === other;
}
export const countWaitingForMe = (comments: Comment[], me: Role) => comments.filter((c) => waitingForMe(c, me)).length;

/** Same count for the project list; a Member only answers for the rooms assigned to them. */
export function awaitingInScope(comments: Comment[], me: Role, project: Pick<Project, 'myProjectRole' | 'myRooms'>) {
  if (project.myProjectRole !== 'MEMBER') return countWaitingForMe(comments, me);
  const mine = new Set((project.myRooms ?? []).map((r) => r.id));
  return countWaitingForMe(comments.filter((c) => !!c.room_id && mine.has(c.room_id)), me);
}

/**
 * The viewer's role on the design team. When the backend says nothing, only the project's own designer counts as Lead:
 * anyone else gets no team rights.
 */
export const resolveProjectRole = (project: Pick<Project, 'myProjectRole' | 'designer'>, viewerId: string): ProjectRole | null =>
  project.myProjectRole !== undefined ? project.myProjectRole : !!viewerId && project.designer?.id === viewerId ? 'LEAD' : null;

export type StatusFilter = 'UNRESOLVED' | 'ALL';
export const statusMatches = (c: Comment, f: StatusFilter) => f === 'ALL' || c.status !== 'RESOLVED';

/** Ghim 2D: bỏ RESOLVED trừ khi đang chọn thẻ đó. */
export const pinsToShow = (threads: CommentThread[], selectedId: string | null) =>
  threads.filter((t) => t.num !== null && (t.root.status !== 'RESOLVED' || t.root.id === selectedId));

export const pinPoint = (t: CommentThread) =>
  t.element ? { x: t.element.position.x, y: t.element.position.y } : t.root.pin_position;

export type Action =
  | 'upload' | 'download' | 'comment' | 'reply' | 'respond' | 'requestChanges'
  | 'approveLayout' | 'approveProducts'
  /** Lead saves a new version of the products (and merges room drafts). */
  | 'editItems'
  /** Change one item, the one in ctx.roomId. One designer per room: the Lead unless the room is someone else's, a Member only in their rooms. */
  | 'editItem'
  /** Member keeps a per-room draft. With ctx.roomId: that room. Without: the draft bar shows, and says so if no room is assigned yet. */
  | 'saveRoomDraft'
  /** Member uploads the DXF they edited in AutoCAD; only changes in their own rooms reach their drafts. */
  | 'uploadRoomDxf'
  /** Lead reads, previews and merges the Members' drafts. */
  | 'reviewDrafts'
  /** Lead takes a room from another designer, with their unmerged changes. */
  | 'takeOverRoom'
  /** Lead adds or removes Members, and gives rooms to designers. Work with no version yet. */
  | 'manageTeam' | 'assignRooms'
  /** Lead uploads the first drawing: no version exists yet. */
  | 'uploadFirst'
  /** Lead closes a comment that needed no drawing change. */
  | 'addressComment'
  /** Choosing Major when creating a version: uses one change round. */
  | 'majorRevision'
  /** Download DXF, export .glb, save .png: only the project's design team (skill ui-nghiep-vu §7). */
  | 'exportFiles';

export interface CanCtx {
  role: Role;
  /** Null: the project has no version yet. */
  version: Pick<DesignVersion, 'status' | 'version_type'> | null;
  project: Pick<Project, 'status'>;
  /** Null or absent: not on the design team, so no team rights. Never assumed to be Lead. */
  projectRole?: ProjectRole | null;
  assignedRoomIds?: readonly string[];
  /** Room of the item or draft being asked about. Null: the item is in no room. */
  roomId?: string | null;
  /** That room is assigned to someone other than the viewer. */
  roomOwnedByOther?: boolean;
  openCount?: number;
  unknownCount?: number;
  notChosenCount?: number;
  /** Major change rounds left in this version's stage; undefined = not known yet. */
  revisionsLeft?: number;
}

/**
 * Why a change in an uploaded DXF did not reach the draft, worded for the Member.
 * `owner`: who has the room, for OUTSIDE_ASSIGNED_ROOMS (the backend only names the room).
 */
export function ignoredReasonText(reason: string, room: string | null, owner?: string | null): string {
  switch (reason) {
    case 'OUTSIDE_ASSIGNED_ROOMS':
      return room && owner ? t('drafts.ignoredReason.outsideOwned', { room, name: owner }) : room ? t('drafts.ignoredReason.outside', { room }) : t('drafts.ignoredReason.outsideNoRoom');
    case 'MOVED_OUT_OF_ROOM': return t('drafts.ignoredReason.movedOut');
    case 'STRUCTURE_LEAD_ONLY': return t('drafts.ignoredReason.structure');
    case 'BLOCK_NOT_IN_BASE': return t('drafts.ignoredReason.blockNotInBase');
    case 'UNKNOWN_ROOM': return t('drafts.ignoredReason.unknownRoom');
    default: return reason;
  }
}

/** Why this version cannot be approved yet, one line each, worded for the viewer. */
export function approveBlockers(action: 'approveLayout' | 'approveProducts', { role, openCount = 0, unknownCount = 0, notChosenCount = 0 }: Pick<CanCtx, 'role' | 'openCount' | 'unknownCount' | 'notChosenCount'>): string[] {
  const unknown = role !== 'designer' ? t('reasons.unknownCustomer')
    : action === 'approveLayout' ? `${t('reasons.unknownItems', { n: unknownCount })}: ${t('reasons.unknownHint')}`
    : t('reasons.unknownItems', { n: unknownCount });
  return [
    openCount ? t('reasons.openComments', { n: openCount }) : '',
    unknownCount ? unknown : '',
    action === 'approveProducts' && notChosenCount ? t('reasons.notChosen', { n: notChosenCount }) : '',
  ].filter(Boolean);
}

/**
 * ok=false + reason: hiện nút mờ kèm lý do; ok=false không reason: ẩn.
 *
 * approveProducts, đã đối chiếu backend (src/modules/designs, 09/11):
 * - POST /design-versions/:id/edits nhận addressedCommentIds, gồm cả comment gốc OPEN chuyển từ bản trước
 *   (design-products.service.ts saveEdit); backend không tự chuyển OPEN → ADDRESSED khi tạo version EDIT.
 * - approve chặn COMMENTS_OPEN ở cả 2 giai đoạn, theo comment gốc OPEN hiện ở version được duyệt: viết ở bản đó
 *   hoặc từ bản cũ hơn cùng giai đoạn (comments.repository.ts rootsInScope). openCount đọc cùng phạm vi đó.
 */
export function can(action: Action, { role, version, project, projectRole = null, assignedRoomIds = [], roomId, roomOwnedByOther = false, openCount = 0, unknownCount = 0, notChosenCount = 0, revisionsLeft }: CanCtx): { ok: boolean; reason?: string } {
  const yes = { ok: true }, no = { ok: false };
  const customer = role === 'homeowner';
  const lead = role === 'designer' && projectRole === 'LEAD', member = role === 'designer' && projectRole === 'MEMBER';
  const closed = project.status === 'COMPLETED' || project.status === 'CANCELLED';
  if (action === 'manageTeam' || action === 'assignRooms') return lead && !closed ? yes : no;
  if (action === 'uploadFirst') return lead && project.status === 'IN_DESIGN' ? yes : no;
  if (action === 'download' || action === 'exportFiles') return lead || member ? yes : no;
  if (action === 'majorRevision') return !lead ? no : revisionsLeft === 0 ? { ok: false, reason: t('reasons.noMajorLeft') } : yes;
  if (!version) return no;
  const layout = version.version_type === 'LAYOUT_2D', render = version.version_type === 'RENDER_3D';
  const inRoom = roomId != null && assignedRoomIds.includes(roomId);
  const approving = action === 'approveLayout' || action === 'approveProducts';
  // Out of change rounds the customer may go back and approve an earlier version (backend: SUPERSEDED → APPROVED).
  const earlierApprovable = approving && version.status === 'SUPERSEDED' && revisionsLeft === 0 && project.status === (layout ? 'IN_DESIGN' : 'PRODUCT_SELECTION');
  const locked = closed || (version.status === 'SUPERSEDED' && !earlierApprovable) || version.status === 'APPROVED';
  if (locked) return no;
  const choosing = render && project.status === 'PRODUCT_SELECTION';
  const ctx = { role, openCount, unknownCount, notChosenCount };
  const blocked = (a: 'approveLayout' | 'approveProducts') => {
    const why = approveBlockers(a, ctx);
    return why.length ? { ok: false, reason: why.join('. ') } : yes;
  };
  switch (action) {
    case 'upload': return lead && layout && project.status === 'IN_DESIGN' ? yes : no;
    case 'comment':
    case 'reply': return lead || member || customer ? yes : no;
    case 'respond': return customer ? yes : no;
    case 'editItems':
    case 'reviewDrafts': return lead && choosing ? yes : no;
    case 'takeOverRoom': return lead && choosing && roomOwnedByOther ? yes : no;
    case 'editItem': return choosing && ((lead && !roomOwnedByOther) || (member && inRoom)) ? yes : no;
    case 'saveRoomDraft': return member && choosing && (roomId === undefined || inRoom) ? yes : no;
    // Backend: current RENDER_3D version, PRODUCT_SELECTION, at least one assigned room (else 403 ROOM_NOT_ASSIGNED).
    case 'uploadRoomDxf': return member && choosing && assignedRoomIds.length > 0 ? yes : no;
    // Backend records ADDRESS on the stage's current version: the newest one still awaiting review.
    case 'addressComment': return lead && (version.status === 'SUBMITTED' || version.status === 'REVISION_REQUESTED') ? yes : no;
    case 'requestChanges':
      // No button when out of rounds; the decision block says why (workspace.noRoundsLeft).
      if (!customer || !(layout || render) || revisionsLeft === 0) return no;
      return openCount ? yes : { ok: false, reason: t('reasons.commentFirst') };
    case 'approveLayout': return customer && layout ? blocked('approveLayout') : no;
    case 'approveProducts': return customer && render ? blocked('approveProducts') : no;
  }
  return no;
}
