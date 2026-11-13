import type { Project, ProjectRole } from '@/features/projects/projectApi';

export type { Project, ProjectRole };
export type Role = 'homeowner' | 'designer' | 'staff' | 'admin';
export type VersionType = 'CONCEPT' | 'LAYOUT_2D' | 'RENDER_3D';
export type RevisionType = 'MINOR' | 'MAJOR';
export type SourceType = 'UPLOAD' | 'EDIT';
export type VersionStatus = 'DRAFT' | 'SUBMITTED' | 'REVISION_REQUESTED' | 'APPROVED' | 'SUPERSEDED';
export type CommentStatus = 'OPEN' | 'ADDRESSED' | 'RESOLVED';
export type ElementType = 'FURNITURE' | 'LIGHTING' | 'DECOR' | 'APPLIANCE' | 'FINISH_MATERIAL' | 'OTHER';
export type Pt = [number, number];

export interface Viewer {
  id: string;
  role: Role;
  email: string;
  name: string;
}

export interface Opening {
  handle: string | null;
  code: string;
  type: 'door' | 'window';
  x: number;
  y: number;
  rotation: number;
  width: number;
  wall_kind: 'wall' | 'segment' | null;
  wall_index: number | null;
}

/** Tường, cửa, phòng (mét). Chỉ đọc sau khi tạo. */
export interface SceneJson {
  unit_scale: number;
  wall_height: number;
  wall_thickness: number;
  walls: { outer: Pt[]; holes: Pt[][] }[];
  wall_segments: [Pt, Pt][];
  openings: Opening[];
  /** room_id, has_name, boundary: absent on versions made before rooms were linked to the rooms table. */
  rooms: { name: string; area: number; label: Pt; room_id?: string | null; has_name?: boolean; boundary?: Pt[] | null }[];
  warnings: string[];
}

export interface Floor {
  id: string;
  level: number;
  name: string;
  floor_height_mm: number;
}

export interface VersionFloor extends Floor {
  scene_json: SceneJson;
  file_url: string;
}

/** Sản phẩm gắn vào món: từ selection của món hoặc từ product-options. Giá giữ dạng string như backend. */
export interface Product {
  id: string;
  name: string;
  sku: string;
  block_code: string;
  supplier_name: string;
  unit_price: string;
  thumbnail_url: string | null;
  model_3d_url: string | null;
  width_mm: number | null;
  depth_mm: number | null;
  height_mm: number | null;
  specifications: Record<string, unknown> | null;
  /** Set on a product read from a room draft: empty image tile and "No longer available". */
  unavailable?: boolean;
}

export interface ProductOption extends Product {
  fit: 'FITS' | 'TOO_LONG' | 'TOO_DEEP' | 'TOO_TALL' | 'UNKNOWN';
  current: boolean;
}

/** Thuộc tính chỉnh trên web, đúng khoá backend: mountHeight (mét), on. */
export interface Overrides {
  mountHeight?: number;
  on?: boolean;
}

export interface DesignElement {
  id: string;
  floor_id: string;
  /** Null on older versions and in unnamed areas. */
  room_id: string | null;
  dxf_handle: string | null;
  block_name: string;
  name: string;
  element_type: ElementType;
  category: { id: string; code: string; name: string } | null;
  default_model_url: string | null;
  position: { x: number; y: number; rotation_deg: number };
  width_mm: number;
  depth_mm: number;
  height_mm: number;
  overrides: Overrides | null;
  choice: 'CHOSEN' | 'NOT_CHOSEN' | null;
  product: Product | null;
  line_total: string | null;
}

export interface DesignVersion {
  id: string;
  project_id: string;
  version_no: number;
  version_type: VersionType;
  label: string;
  revision_type: RevisionType | null;
  source_type: SourceType;
  status: VersionStatus;
  title: string;
  description: string | null;
  parent_version_id: string | null;
  created_at: string;
  created_by_name: string;
  floors: VersionFloor[];
  elements: DesignElement[];
  unchosen_count: number | null;
  provisional_total: string | null;
}

export type VersionSummary = Omit<DesignVersion, 'floors' | 'elements' | 'unchosen_count' | 'provisional_total'> & { floors: Floor[] };

export interface RevisionLimit {
  limit: number;
  used: number;
  remaining: number;
}

export interface ElementRef {
  id: string;
  floor_id: string;
  dxf_handle: string | null;
  block_name: string;
  name: string;
}

export interface CommentAuthor {
  id: string;
  name: string;
  role: Role;
}

export interface CommentReply {
  id: string;
  design_version_id: string;
  content: string;
  author: CommentAuthor;
  created_at: string;
}

/** Thread gốc do backend trả: đã gồm comment chưa xong của bản trước và trả lời lồng bên trong. */
export interface Comment extends CommentReply {
  version_label: string;
  kind: 'ELEMENT' | 'POINT' | 'GENERAL';
  status: CommentStatus;
  floor_id: string | null;
  room_id: string | null;
  pin_position: { x: number; y: number } | null;
  element: ElementRef | null;
  current_element: ElementRef | null;
  addressed_in_version_id: string | null;
  replies: CommentReply[];
}

/** What a new comment attaches to. */
export type CommentTarget = { kind: 'element'; element: DesignElement } | { kind: 'point'; x: number; y: number; floor_id: string } | { kind: 'general' };

export interface ComparedElement {
  id: string;
  floor_id: string;
  dxf_handle: string | null;
  name: string;
}

export interface VersionComparison {
  from: { id: string; label: string };
  to: { id: string; label: string };
  added: ComparedElement[];
  removed: ComparedElement[];
  moved: { from: ComparedElement; to: ComparedElement; distance: number; rotation_deg: number }[];
  replaced: { from: ComparedElement; to: ComparedElement }[];
  overrides_changed: { from: ComparedElement; to: ComparedElement }[];
  walls_changed: boolean;
  openings_changed: boolean;
  totals: { from: string; to: string; delta: string } | null;
}

export interface ElementEdit {
  element_id: string;
  product_id?: string;
  overrides?: Overrides;
}

export type RoomDraftStatus = 'DRAFT' | 'READY';

/** Product named in a draft. Null when the backend did not send it: shown as "Product" with no price. */
export interface DraftProduct {
  id: string;
  name: string;
  price: string | null;
  thumbnail_url: string | null;
  /** False: no longer sold. Still shown, but the backend refuses to merge it. */
  available: boolean;
}

export interface DraftSelection {
  element_id: string;
  product_id: string;
  product: DraftProduct | null;
}

export interface DraftOverride {
  element_id: string;
  overrides: Overrides;
}

/** A change lost when the draft moved to a new version. element_id is the id on the old version. */
export interface DroppedChange {
  element_id: string;
  floor_id: string;
  dxf_handle: string | null;
  product: DraftProduct | null;
}

export interface RoomDraft {
  id: string;
  room_id: string;
  room_name: string;
  designer_id: string;
  designer_name: string;
  status: RoomDraftStatus;
  selections: DraftSelection[];
  overrides: DraftOverride[];
  addressed_comment_ids: string[];
  dropped_changes: DroppedChange[];
  /** Items added, removed or moved by the Member's uploaded DXF. Merging any of them makes a Major UPLOAD version. */
  layout_changes: DraftLayoutChange[];
  /** The last DXF upload into this draft; null = never uploaded. */
  last_upload: DraftLastUpload | null;
  /** The uploaded DXF can be downloaded again (Lead, draft owner). */
  has_source_file: boolean;
}

export type LayoutOp = 'ADD' | 'DELETE' | 'MOVE';

/** One item change read from an uploaded DXF. `at` is the item's centre in metres (canvas units); `insert` is in drawing units. */
export interface DraftLayoutChange {
  op: LayoutOp;
  floor_id: string;
  /** Handle in the version's drawing (DELETE, MOVE) or in the uploaded file (ADD). */
  handle: string | null;
  block_name: string;
  layer: string;
  insert: { x: number; y: number };
  rotation: number;
  scale: { x: number; y: number };
  at: { x: number; y: number };
}

export interface AcceptedLayoutChange {
  op: LayoutOp;
  handle: string | null;
  block_name: string;
  room_id: string;
  room_name: string;
}

export type IgnoredLayoutReason = 'OUTSIDE_ASSIGNED_ROOMS' | 'MOVED_OUT_OF_ROOM' | 'BLOCK_NOT_IN_BASE' | 'UNKNOWN_ROOM' | 'STRUCTURE_LEAD_ONLY';

export interface IgnoredLayoutChange {
  handle: string | null;
  block_name: string | null;
  room_name: string | null;
  reason: IgnoredLayoutReason;
}

export interface DraftLastUpload {
  uploaded_at: string;
  file_name: string;
  accepted: AcceptedLayoutChange[];
  ignored: IgnoredLayoutChange[];
}

export interface RoomDraftUploadResult {
  accepted: AcceptedLayoutChange[];
  ignored: IgnoredLayoutChange[];
  drafts: { room_id: string; room_name: string; change_count: number; status: RoomDraftStatus }[];
}

/** What Merge & save did with the drafts' layout changes. */
export interface LayoutMerge {
  skipped: { draft_id: string; op: LayoutOp; handle: string | null; block_name: string; reason: string }[];
}

export interface RoomDraftInput {
  selections: { element_id: string; product_id: string }[];
  overrides: { element_id: string; overrides: Overrides }[];
  addressed_comment_ids: string[];
}

export interface UploadFloor {
  floor_id: string | null;
  level: number;
  name: string;
  floor_height_mm: number;
  file: File;
}

export interface UploadInput {
  title: string;
  revision_type: RevisionType | null;
  wall_height_m: number;
  files: UploadFloor[];
  addressed_comment_ids: string[];
}
