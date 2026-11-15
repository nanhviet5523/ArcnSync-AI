import { apiRequest } from '@/services/authService';

// ---------------------------------------------------------------------------
// Types — mirror the backend DTOs (Swagger: POST /projects)
// ---------------------------------------------------------------------------

export interface CreateProjectPayload {
  /** Căn hộ của customer; customer của dự án = chủ căn hộ. */
  apartmentId: string;
  title: string;
  description?: string;
  /** Số người ở, 1..50. */
  householdSize?: number;
  /** Phong cách ưa thích (phải đang active). */
  preferredStyleId?: string;
  /** VND, > 0. */
  budgetMin: string;
  /** VND, ≥ budgetMin. */
  budgetMax: string;
  /** Dung sai vượt ngân sách (%), 0–10, mặc định 10. */
  budgetTolerancePercent?: number;
}

export type ProjectStatus =
  | 'CONTRACT_PENDING'
  | 'REQUIREMENT_ANALYSIS'
  | 'IN_DESIGN'
  | 'PRODUCT_SELECTION'
  | 'QUOTING'
  | 'DRAFT'
  | 'COMPLETED'
  | 'CANCELLED';

export interface ProjectPersonRef {
  id: string;
  fullName: string;
  email: string;
}

export interface ProjectDesignerRef {
  id: string;
  fullName: string;
}

export interface ProjectStyleRef {
  id: string;
  code: string;
  name: string;
}

export interface ProjectApartmentSummary {
  id: string;
  buildingName: string;
  address: string;
  tower: string | null;
  unitNo: string;
}

export interface ProjectResponse {
  id: string;
  code: string;
  title: string;
  description: string | null;
  householdSize: number | null;
  status: ProjectStatus;
  /** VND, string với 2 chữ số thập phân, vd "150000000.00". */
  budgetMin: string;
  budgetMax: string;
  budgetTolerancePercent: string;
  aiGenerationLimit: number;
  aiGenerationUsed: number;
  designerId: string | null;
  designerAssignedAt: string | null;
  designer: ProjectDesignerRef | null;
  preferredStyle: ProjectStyleRef | null;
  customer: ProjectPersonRef;
  staff: ProjectPersonRef;
  apartment: ProjectApartmentSummary;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

/** Chi tiết đi kèm lỗi 409 APARTMENT_HAS_ACTIVE_PROJECT. */
export interface ApartmentHasActiveProjectDetails {
  projectId: string;
  projectCode: string;
  status: ProjectStatus;
}

export interface RoomAssignment {
  roomId: string;
  roomName: string;
  floorId: string;
  designerId: string;
  designerName: string;
}

export interface RoomAssignmentListResponse {
  items: RoomAssignment[];
}

export interface RoomAssignmentItem {
  roomId: string;
  /** user_id của Lead hoặc Member; null = bỏ giao. */
  designerId: string | null;
}

export interface UpdateRoomAssignmentsPayload {
  assignments: RoomAssignmentItem[];
}

export type MyProjectRole = 'LEAD' | 'MEMBER';

export interface ProjectRoomRef {
  id: string;
  name: string;
  floorId: string;
}

export interface ProjectListItem {
  /** Vai của người đang xem trong đội thiết kế; không phải designer của dự án = null. */
  myProjectRole: MyProjectRole | null;
  /** Phòng người đang xem được giao. */
  myRooms: ProjectRoomRef[];
  id: string;
  code: string;
  title: string;
  description: string | null;
  householdSize: number | null;
  status: ProjectStatus;
  budgetMin: string;
  budgetMax: string;
  budgetTolerancePercent: string;
  aiGenerationLimit: number;
  aiGenerationUsed: number;
  designerId: string | null;
  designerAssignedAt: string | null;
  designer: ProjectDesignerRef | null;
  preferredStyle: ProjectStyleRef | null;
  customer: ProjectPersonRef;
  staff: ProjectPersonRef;
  apartment: ProjectApartmentSummary;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

export interface ProjectQuery {
  status?: ProjectStatus;
  /** Tìm theo mã hoặc tiêu đề dự án, tối đa 100 ký tự. */
  q?: string;
  /** >= 1, mặc định 1. */
  page?: number;
  /** 1..100, mặc định 20. */
  limit?: number;
}

export interface ProjectPageResponse {
  items: ProjectListItem[];
  page: number;
  limit: number;
  total: number;
}

// ---------------------------------------------------------------------------
// API calls
// ---------------------------------------------------------------------------

/**
 * Staff tạo dự án (DRAFT) trên căn hộ của customer. POST /projects.
 *
 * Lỗi cần xử lý riêng ở UI:
 * - 409 `APARTMENT_HAS_ACTIVE_PROJECT`: căn hộ đang có dự án chưa kết thúc.
 *   `err.details` chứa {@link ApartmentHasActiveProjectDetails} (projectId,
 *   projectCode, status) để điều hướng thẳng tới dự án đó.
 * - 422 `USER_NOT_ACTIVE`: chủ căn hộ không còn active.
 */
export function createProject(
  payload: CreateProjectPayload,
): Promise<ProjectResponse> {
  return apiRequest<ProjectResponse>('/projects', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/**
 * Staff phụ trách / Admin giao (hoặc đổi) Lead Designer. PUT /projects/{id}/designer.
 *
 * Lỗi cần xử lý riêng ở UI (đọc qua `err.status` + `err.code` của {@link ApiError}):
 * - 404 `DESIGNER_NOT_FOUND`: không tìm thấy designer.
 * - 422 `USER_NOT_ACTIVE`: tài khoản designer chưa active.
 * - 422 `DESIGNER_NOT_AVAILABLE`: designer hiện không nhận dự án mới.
 * - 422 `PROJECT_CLOSED`: dự án đã kết thúc, không thể phân công.
 */
export function assignProjectDesigner(
  projectId: string,
  designerId: string,
): Promise<ProjectResponse> {
  return apiRequest<ProjectResponse>(`/projects/${encodeURIComponent(projectId)}/designer`, {
    method: 'PUT',
    body: JSON.stringify({ designerId }),
  });
}

/** Phòng đã giao và người phụ trách. GET /projects/{id}/room-assignments. */
export function getRoomAssignments(projectId: string): Promise<RoomAssignmentListResponse> {
  return apiRequest<RoomAssignmentListResponse>(
    `/projects/${encodeURIComponent(projectId)}/room-assignments`,
  );
}

/**
 * Lead giao phòng cho Lead hoặc Member (`designerId` null = bỏ giao); phòng
 * không liệt kê giữ nguyên. PUT /projects/{id}/room-assignments.
 *
 * Lỗi cần xử lý riêng ở UI:
 * - 403 `INSUFFICIENT_ROLE`: chỉ Lead Designer của dự án mới có quyền.
 * - 422 `ROOM_NOT_IN_APARTMENT`: phòng không thuộc căn hộ của dự án.
 * - 422 `DESIGNER_NOT_IN_PROJECT`: designer không thuộc đội ngũ dự án.
 */
export function updateRoomAssignments(
  projectId: string,
  payload: UpdateRoomAssignmentsPayload,
): Promise<RoomAssignmentListResponse> {
  return apiRequest<RoomAssignmentListResponse>(
    `/projects/${encodeURIComponent(projectId)}/room-assignments`,
    {
      method: 'PUT',
      body: JSON.stringify(payload),
    },
  );
}

/**
 * Danh sách dự án của tôi (Customer/Staff/Designer) hoặc tất cả (Admin).
 * GET /projects, lọc theo status/q, có phân trang.
 */
export function getProjects(params: ProjectQuery = {}): Promise<ProjectPageResponse> {
  const search = new URLSearchParams();
  if (params.status) search.set('status', params.status);
  if (params.q?.trim()) search.set('q', params.q.trim());
  search.set('page', String(params.page ?? 1));
  search.set('limit', String(params.limit ?? 20));

  return apiRequest<ProjectPageResponse>(`/projects?${search.toString()}`);
}
