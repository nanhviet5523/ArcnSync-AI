import { apiRequest, getCurrentUser } from '@/services/authService';
import { projectApi } from '@/features/projects/projectApi';
import { uploadFloorRefs } from './logic';
import type {
  Comment, CommentReply, ComparedElement, DesignElement, DesignVersion, DraftProduct, ElementEdit, ElementRef, Opening, Product, ProductOption,
  Project, RevisionLimit, RevisionType, Role, RoomDraft, RoomDraftInput, SceneJson, UploadInput, VersionComparison, VersionFloor, VersionSummary, VersionType, Viewer,
} from './types';

export interface DesignApi {
  getViewer(): Viewer;
  getProject(projectId: string): Promise<Project>;
  listVersions(projectId: string, versionType: VersionType): Promise<{ items: VersionSummary[]; revisionLimit: RevisionLimit }>;
  getVersion(versionId: string): Promise<DesignVersion>;
  uploadDxf(projectId: string, input: UploadInput): Promise<DesignVersion>;
  listComments(versionId: string): Promise<Comment[]>;
  createComment(versionId: string, input: { content: string; floor_id: string | null; design_element_id: string | null; pin_position: { x: number; y: number } | null }): Promise<void>;
  replyComment(versionId: string, parentId: string, content: string): Promise<void>;
  acceptComment(commentId: string): Promise<void>;
  reopenComment(commentId: string, reply: string): Promise<void>;
  requestChanges(versionId: string, content: string): Promise<void>;
  /** Duyệt layout hoặc sản phẩm (theo loại version). Trả bản đã duyệt. */
  approve(versionId: string): Promise<VersionSummary>;
  listProductOptions(elementId: string): Promise<ProductOption[]>;
  /** choose_all_remaining: món chưa chọn giữ model hiện tại (sản phẩm có block_code trùng tên block). */
  saveEdits(versionId: string, input: { title: string; revision_type: RevisionType; edits: ElementEdit[]; choose_all_remaining?: boolean; addressed_comment_ids?: string[]; room_draft_ids?: string[] }): Promise<DesignVersion & { skipped_room_ids: string[] }>;
  /** Lead: every draft of the version. Member: their own. */
  listRoomDrafts(versionId: string): Promise<RoomDraft[]>;
  /** Replaces the whole draft of the room and puts it back to DRAFT. */
  saveRoomDraft(versionId: string, roomId: string, input: RoomDraftInput): Promise<void>;
  markRoomDraftReady(versionId: string, roomId: string): Promise<void>;
  /** Designer: comment needed no drawing change (e.g. a question). */
  addressComment(commentId: string, addressedInVersionId: string): Promise<void>;
  compare(versionId: string, withId: string, floorId?: string): Promise<VersionComparison>;
  /** Đường dẫn model 3D của món theo sản phẩm (route theo dự án, mọi vai). */
  elementModelPath(elementId: string, productId: string): string;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
type Raw = any;

const ROLE: Record<string, Role> = { CUSTOMER: 'homeowner', DESIGNER: 'designer', STAFF: 'staff', ADMIN: 'admin' };
const author = (a: Raw) => ({ id: a.id, name: a.fullName, role: ROLE[a.role] ?? 'staff' });
const floorRef = (f: Raw) => ({ id: f.id, level: f.level, name: f.name, floor_height_mm: f.floorHeightMm });

const scene = (s: Raw): SceneJson => ({
  unit_scale: s.unitScale, wall_height: s.wallHeight, wall_thickness: s.wallThickness,
  walls: s.walls ?? [], wall_segments: s.wallSegments ?? [], warnings: s.warnings ?? [],
  rooms: (s.rooms ?? []).map((r: Raw) => ({
    name: r.name, area: r.area, label: r.label, room_id: r.roomId ?? null, has_name: r.hasName ?? true,
    boundary: r.boundary?.length >= 3 ? r.boundary : null,
  })),
  openings: (s.openings ?? []).map((o: Raw): Opening => ({
    handle: o.handle, code: o.blockName, type: o.type === 'DOOR' ? 'door' : 'window', x: o.x, y: o.y,
    rotation: o.rotation, width: o.width, wall_kind: o.wallKind, wall_index: o.wallIndex,
  })),
});

const product = (p: Raw, id: string): Product => ({
  id, name: p.name, sku: p.sku, block_code: p.blockCode, supplier_name: p.supplier?.companyName ?? '',
  unit_price: p.unitPriceSnapshot ?? p.price, thumbnail_url: p.thumbnailUrl, model_3d_url: p.model3dUrl,
  width_mm: p.widthMm, depth_mm: p.depthMm, height_mm: p.heightMm, specifications: p.specifications,
});

const element = (e: Raw): DesignElement => ({
  id: e.id, floor_id: e.floorId, room_id: e.roomId ?? null, dxf_handle: e.dxfHandle, block_name: e.blockName, name: e.name, element_type: e.elementType,
  category: e.category, default_model_url: e.defaultModelUrl, position: e.position,
  width_mm: e.widthMm ?? 500, depth_mm: e.depthMm ?? 500, height_mm: e.heightMm ?? 800,
  overrides: e.overrides, choice: e.choice,
  product: e.selection ? product(e.selection, e.selection.productId) : null,
  line_total: e.selection?.lineTotal ?? null,
});

const summary = (v: Raw): VersionSummary => ({
  id: v.id, project_id: v.projectId, version_no: v.versionNo, version_type: v.versionType, label: v.label,
  revision_type: v.revisionType, source_type: v.sourceType, status: v.status, title: v.title, description: v.description,
  parent_version_id: v.parentVersionId, created_at: v.createdAt, created_by_name: v.createdBy?.fullName ?? '',
  floors: (v.floors ?? []).map(floorRef),
});

const detail = (v: Raw): DesignVersion => ({
  ...summary(v),
  floors: (v.floors ?? []).map((f: Raw): VersionFloor => ({ ...floorRef(f), scene_json: scene(f.scene), file_url: f.fileUrl })),
  // món không có vị trí trong DXF thì không vẽ được
  elements: (v.elements ?? []).filter((e: Raw) => e.position).map(element),
  unchosen_count: v.unchosenCount, provisional_total: v.provisionalTotal,
});

const ref = (r: Raw): ElementRef | null => r && { id: r.id, floor_id: r.floorId, dxf_handle: r.dxfHandle, block_name: r.blockName, name: r.name };
const reply = (r: Raw): CommentReply => ({ id: r.id, design_version_id: r.designVersionId, content: r.content, author: author(r.author), created_at: r.createdAt });
const comment = (c: Raw): Comment => ({
  ...reply(c), version_label: c.versionLabel, kind: c.kind, status: c.status, floor_id: c.floorId, room_id: c.roomId ?? null, pin_position: c.pinPosition,
  element: ref(c.element), current_element: ref(c.currentElement), addressed_in_version_id: c.addressedInVersionId,
  replies: (c.replies ?? []).map(reply),
});
const compared = (e: Raw): ComparedElement => ({ id: e.id, floor_id: e.floorId, dxf_handle: e.dxfHandle, name: e.name });
const change = (c: Raw) => ({ from: compared(c.from), to: compared(c.to) });

const draftProduct = (p: Raw): DraftProduct | null => (p ? { id: p.id, name: p.name, price: p.price ?? null, thumbnail_url: p.thumbnailUrl ?? null, available: p.available ?? true } : null);
const roomDraft = (d: Raw): RoomDraft => ({
  id: d.id, room_id: d.roomId, room_name: d.roomName, designer_id: d.designerId, designer_name: d.designerName, status: d.status,
  selections: (d.selections ?? []).map((s: Raw) => ({ element_id: s.elementId, product_id: s.productId, product: draftProduct(s.product) })),
  overrides: (d.overrides ?? []).map((o: Raw) => ({ element_id: o.elementId, overrides: o.overrides })),
  addressed_comment_ids: d.addressedCommentIds ?? [],
  dropped_changes: (d.droppedChanges ?? []).map((x: Raw) => ({ element_id: x.elementId, floor_id: x.floorId, dxf_handle: x.dxfHandle, product: draftProduct(x.product) })),
});

const post = (body: unknown, method = 'POST'): RequestInit => ({ method, body: JSON.stringify(body) });
const qs = (q: Record<string, string | undefined>) => {
  const p = new URLSearchParams(Object.entries(q).filter((e): e is [string, string] => !!e[1]));
  return p.toString() ? `?${p}` : '';
};

export const designApi: DesignApi = {
  getViewer() {
    const u = getCurrentUser();
    return { id: u?.id ?? '', role: (u?.role === 'supplier' ? 'staff' : u?.role ?? 'homeowner') as Role, email: u?.email ?? '', name: u?.name ?? '' };
  },
  getProject: (id) => projectApi.get(id),
  async listVersions(projectId, versionType) {
    const r = await apiRequest<Raw>(`/projects/${projectId}/design-versions${qs({ versionType })}`);
    return { items: r.items.map(summary), revisionLimit: r.revisionLimit };
  },
  getVersion: async (id) => detail(await apiRequest<Raw>(`/design-versions/${id}`)),
  async uploadDxf(projectId, input) {
    const form = new FormData();
    form.append('title', input.title);
    if (input.revision_type) form.append('revisionType', input.revision_type);
    form.append('wallHeight', String(input.wall_height_m));
    form.append('floors', JSON.stringify(uploadFloorRefs(input.files.map((f) => ({ ...f, key: f.name })))));
    if (input.addressed_comment_ids.length) form.append('addressedCommentIds', JSON.stringify(input.addressed_comment_ids));
    for (const f of input.files) form.append('files', f.file, f.file.name);
    return detail(await apiRequest<Raw>(`/projects/${projectId}/design-versions`, { method: 'POST', body: form }));
  },
  listComments: async (versionId) => (await apiRequest<Raw>(`/design-versions/${versionId}/comments`)).items.map(comment),
  async createComment(versionId, c) {
    await apiRequest(`/design-versions/${versionId}/comments`, post({
      content: c.content,
      ...(c.design_element_id ? { designElementId: c.design_element_id } : {}),
      ...(c.floor_id ? { floorId: c.floor_id } : {}),
      ...(c.pin_position && !c.design_element_id ? { pinPosition: c.pin_position } : {}),
    }));
  },
  async replyComment(versionId, parentId, content) {
    await apiRequest(`/design-versions/${versionId}/comments`, post({ content, parentCommentId: parentId }));
  },
  async acceptComment(id) { await apiRequest(`/comments/${id}/status`, post({ action: 'ACCEPT' }, 'PATCH')); },
  async reopenComment(id, text) { await apiRequest(`/comments/${id}/status`, post({ action: 'REOPEN', reply: text }, 'PATCH')); },
  async requestChanges(id, content) { await apiRequest(`/design-versions/${id}/revision-requests`, post({ content })); },
  approve: async (id) => summary(await apiRequest<Raw>(`/design-versions/${id}/approval`, { method: 'POST' })),
  async listProductOptions(elementId) {
    const r = await apiRequest<Raw>(`/design-elements/${elementId}/product-options?limit=100`);
    return r.items.map((o: Raw): ProductOption => ({ ...product(o, o.id), fit: o.fit, current: o.current }));
  },
  async addressComment(id, addressedInVersionId) { await apiRequest(`/comments/${id}/status`, post({ action: 'ADDRESS', addressedInVersionId }, 'PATCH')); },
  async saveEdits(id, { title, revision_type, edits, choose_all_remaining, addressed_comment_ids, room_draft_ids }) {
    const selections = edits.filter((e) => e.product_id).map((e) => ({ elementId: e.element_id, productId: e.product_id }));
    const overrides = edits.filter((e) => e.overrides).map((e) => ({ elementId: e.element_id, overrides: e.overrides }));
    const saved = await apiRequest<Raw>(`/design-versions/${id}/edits`, post({ title, revisionType: revision_type, selections, overrides, ...(choose_all_remaining ? { chooseAllRemaining: true } : {}), ...(addressed_comment_ids?.length ? { addressedCommentIds: addressed_comment_ids } : {}), ...(room_draft_ids?.length ? { roomDraftIds: room_draft_ids } : {}) }));
    return { ...detail(saved), skipped_room_ids: saved.skippedRoomIds ?? [] };
  },
  listRoomDrafts: async (id) => (await apiRequest<Raw>(`/design-versions/${id}/room-drafts`)).items.map(roomDraft),
  async saveRoomDraft(id, roomId, input) {
    await apiRequest(`/design-versions/${id}/room-drafts/${roomId}`, post({
      selections: input.selections.map((s) => ({ elementId: s.element_id, productId: s.product_id })),
      overrides: input.overrides.map((o) => ({ elementId: o.element_id, overrides: o.overrides })),
      addressedCommentIds: input.addressed_comment_ids,
    }, 'PUT'));
  },
  async markRoomDraftReady(id, roomId) { await apiRequest(`/design-versions/${id}/room-drafts/${roomId}`, post({ status: 'READY' }, 'PATCH')); },
  async compare(id, withId, floorId) {
    const r = await apiRequest<Raw>(`/design-versions/${id}/comparison${qs({ with: withId, floorId })}`);
    return {
      from: r.from, to: r.to, added: r.added.map(compared), removed: r.removed.map(compared),
      moved: r.moved.map((m: Raw) => ({ ...change(m), distance: m.distance, rotation_deg: m.rotationDeg })),
      replaced: r.replaced.map(change), overrides_changed: r.overridesChanged.map(change),
      walls_changed: r.wallsChanged, openings_changed: r.openingsChanged, totals: r.totals,
    };
  },
  elementModelPath: (elementId, productId) => `/design-elements/${elementId}/model-3d${qs({ productId })}`,
};
