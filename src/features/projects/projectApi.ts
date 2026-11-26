import { apiRequest } from '@/services/authService';
import type { UserRole } from '@/types/role';
import { errorText, t } from '@/i18n';

export type ProjectStatus =
  | 'DRAFT' | 'CONTRACT_PENDING' | 'REQUIREMENT_ANALYSIS' | 'IN_DESIGN'
  | 'PRODUCT_SELECTION' | 'QUOTING' | 'COMPLETED' | 'CANCELLED';

export interface Person { id: string; fullName: string; email?: string }
export interface ApartmentFloor { id: string; level: number; name: string; floorHeightMm: number }

export interface Apartment {
  id: string;
  propertyType: 'APARTMENT' | 'HOUSE';
  buildingName: string;
  address: string;
  tower: string | null;
  unitNo: string;
  netArea: string;
  bedroomCount: number | null;
  bathroomCount: number | null;
  owner: Person;
  floors: ApartmentFloor[];
  /** Project detail only (GET /projects/:id). The project list leaves it out. */
  rooms?: ProjectRoomRef[];
}

/** Role inside one project's design team, not an account role. */
export type ProjectRole = 'LEAD' | 'MEMBER';
/** Same as ProjectRole; the name the backend DTO uses (`myProjectRole`). */
export type MyProjectRole = ProjectRole;

export interface ProjectMember { designerId: string; fullName: string; email: string; title: string | null; addedAt: string }
/** One item of GET /projects/:id/members (same shape as `members[]` of GET /projects/:id). */
export type ProjectMemberItem = ProjectMember;
export interface GetProjectMembersResponse { items: ProjectMemberItem[] }
export interface ProjectRoomRef { id: string; name: string; floorId: string }
export interface RoomAssignment { roomId: string; roomName: string; floorId: string; designerId: string; designerName: string }

/** One person of GET /projects/:id/team. The Lead has addedAt null; avatar is always null (show initials). */
export interface TeamPerson { userId: string; name: string; email: string; avatar: null; addedAt: string | null; assignedRooms: ProjectRoomRef[] }
/** GET /projects/:id/team. */
export interface ProjectTeamResponseDto { lead: TeamPerson | null; members: TeamPerson[] }
export type ProjectTeam = ProjectTeamResponseDto;
/** One item of GET /users/designers. */
export interface DesignerOption { id: string; fullName: string; email: string; isAvailable: boolean; activeProjectCount: number }
export type DesignerListItem = DesignerOption;

/** PUT /projects/:id/team body: the whole team. The Lead is never repeated in memberIds. */
export interface UpdateProjectTeamPayload { leadId: string; memberIds: string[] }
/** A room of someone who left the team, handed to the Lead by PUT /projects/:id/team. */
export interface ReassignedRoom { roomId: string; roomName: string; floorId: string; fromDesignerId: string; toDesignerId: string }
/** PUT /projects/:id/team response. */
export interface UpdateProjectTeamResponse extends ProjectTeamResponseDto { reassignedRooms: ReassignedRoom[] }

export interface Project {
  id: string;
  code: string;
  title: string;
  description: string | null;
  status: ProjectStatus;
  budgetMin: string;
  budgetMax: string;
  designer: Person | null;
  customer: Person;
  staff: Person;
  /** Null until the site survey is confirmed (a new project has no apartment yet). */
  apartment: (Pick<Apartment, 'id' | 'buildingName' | 'address' | 'tower' | 'unitNo'> & Partial<Apartment>) | null;
  createdAt: string;
  updatedAt: string;
  /** Project detail only. The lead is `designer`. */
  members?: ProjectMember[];
  /** Null = the viewer is not on the design team. Undefined = the backend did not say (see resolveProjectRole). */
  myProjectRole?: ProjectRole | null;
  /** Project list only: rooms assigned to the viewer. */
  myRooms?: ProjectRoomRef[];
  householdSize?: number | null;
  preferredStyle?: { id: string; code: string; name: string } | null;
  /** Percent as a string, e.g. "10.00". */
  budgetTolerancePercent?: string;
}

/** PUT /projects/:id/designer body. */
export interface AssignLeadDesignerPayload {
  /** user_id of the new Lead Designer. */
  designerId: string;
}

/**
 * PATCH /projects/:id body. Leave a field out to keep it; null clears description, householdSize or
 * preferredStyleId (never send ""). Nothing else (status, code, apartmentId…) is accepted.
 */
export interface UpdateProjectPayload {
  title?: string;
  description?: string | null;
  householdSize?: number | null;
  preferredStyleId?: string | null;
  budgetMin?: string | number;
  budgetMax?: string | number;
  /** 0..10. */
  budgetTolerancePercent?: number;
}

interface Page<T> { items: T[]; page: number; limit: number; total: number }

// ---------------------------------------------------------------------------
// Backend DTOs (Swagger: /projects). They are structurally compatible with Project.
// ---------------------------------------------------------------------------

/** POST /projects body. The apartment is attached later, once the site survey is confirmed. */
export interface CreateProjectPayload {
  /** Email of a registered, active customer account. */
  customerEmail: string;
  title: string;
  description?: string;
  /** People living in the home, 1..50. */
  householdSize?: number;
  /** Preferred design style (must be active). */
  preferredStyleId?: string;
  /** VND, > 0. */
  budgetMin: string | number;
  /** VND, >= budgetMin. */
  budgetMax: string | number;
  /** Allowed budget overrun (%), 0-10, default 10. */
  budgetTolerancePercent?: number;
}

export interface ProjectPersonRef { id: string; fullName: string; email: string }
export interface ProjectDesignerRef { id: string; fullName: string }
export interface ProjectStyleRef { id: string; code: string; name: string }
export interface ProjectApartmentSummary { id: string; buildingName: string; address: string; tower: string | null; unitNo: string }
export type ProjectApartmentSummaryDto = ProjectApartmentSummary;

export interface ProjectResponse {
  id: string;
  code: string;
  title: string;
  description: string | null;
  householdSize: number | null;
  status: ProjectStatus;
  /** VND as a string with 2 decimals, e.g. "150000000.00". */
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
  /** Null until the site survey is confirmed. */
  apartment: ProjectApartmentSummaryDto | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

/** One row of GET /projects. */
export interface ProjectListItem extends ProjectResponse {
  /** The viewer's role in the design team; null when they are not on it. */
  myProjectRole: MyProjectRole | null;
  /** Rooms assigned to the viewer. */
  myRooms: ProjectRoomRef[];
}

/** `details` of the 409 APARTMENT_HAS_ACTIVE_PROJECT error. */
export interface ApartmentHasActiveProjectDetails { projectId: string; projectCode: string; status: ProjectStatus }

export interface RoomAssignmentListResponse { items: RoomAssignment[] }
export interface RoomAssignmentItem {
  roomId: string;
  /** user_id of the Lead or a Member; null = unassign. */
  designerId: string | null;
}
/** Name used by the PUT spec for one entry of `assignments`. */
export type AssignRoomItem = RoomAssignmentItem;
export interface UpdateRoomAssignmentsPayload { assignments: RoomAssignmentItem[] }

export interface ProjectQuery {
  status?: ProjectStatus;
  /** Search by project code or title, max 100 characters. */
  q?: string;
  /** >= 1, default 1. */
  page?: number;
  /** 1..100, default 20. */
  limit?: number;
}
export type ProjectPageResponse = Page<ProjectListItem>;

const qs = (q: Record<string, string | number | boolean | undefined>) => {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(q)) if (v !== undefined && v !== '') p.set(k, String(v));
  const s = p.toString();
  return s ? `?${s}` : '';
};
const json = (method: string, body?: unknown): RequestInit => ({ method, body: body === undefined ? undefined : JSON.stringify(body) });
const path = (id: string) => `/projects/${encodeURIComponent(id)}`;

// ---------------------------------------------------------------------------
// Project API calls
// ---------------------------------------------------------------------------

/** GET /projects: my projects (Customer/Staff/Designer) or all of them (Admin), filtered and paged. */
export function getProjects(params: ProjectQuery = {}): Promise<ProjectPageResponse> {
  return apiRequest<ProjectPageResponse>(`/projects${qs({
    status: params.status,
    q: params.q?.trim(),
    page: params.page ?? 1,
    limit: params.limit ?? 20,
  })}`);
}

/**
 * POST /projects: Staff creates a DRAFT project for a customer found by email. The project starts with
 * `apartment: null` until the site survey is confirmed.
 * The body is rebuilt from the whitelisted fields only (the backend rejects unknown ones) and
 * empty optionals are left out.
 * - 400 `VALIDATION_ERROR` (details.fields), 404 `USER_NOT_FOUND` (customerEmail) / `DESIGN_STYLE_NOT_FOUND`.
 * - 409 `PROJECT_CODE_GENERATION_FAILED`.
 * - 422 `USER_NOT_ACTIVE` (the customer), `DESIGN_STYLE_INACTIVE`, `INVALID_BUDGET_RANGE`.
 */
export function createProject(payload: CreateProjectPayload): Promise<ProjectResponse> {
  const description = payload.description?.trim();
  const body: CreateProjectPayload = {
    customerEmail: payload.customerEmail.trim(),
    title: payload.title,
    budgetMin: payload.budgetMin,
    budgetMax: payload.budgetMax,
    ...(description ? { description } : {}),
    ...(payload.householdSize !== undefined ? { householdSize: payload.householdSize } : {}),
    ...(payload.preferredStyleId ? { preferredStyleId: payload.preferredStyleId } : {}),
    ...(payload.budgetTolerancePercent !== undefined ? { budgetTolerancePercent: payload.budgetTolerancePercent } : {}),
  };
  return apiRequest<ProjectResponse>('/projects', json('POST', body));
}

/**
 * PUT /projects/:id/designer: the project's Staff or an Admin sets (or changes) the Lead Designer.
 * The Lead being replaced stays on the project as a Member. Refetch GET /projects/:id/team afterwards.
 * - 400 `VALIDATION_ERROR`, 403 `INSUFFICIENT_ROLE` / `TEAM_MANAGED_BY_STAFF`, 404 `DESIGNER_NOT_FOUND` / `PROJECT_NOT_FOUND`,
 *   422 `USER_NOT_ACTIVE` / `DESIGNER_NOT_AVAILABLE` / `PROJECT_CLOSED` / `INVALID_PROJECT_STATUS`.
 */
export function assignLeadDesigner(projectId: string, payload: AssignLeadDesignerPayload): Promise<ProjectResponse> {
  return apiRequest<ProjectResponse>(`${path(projectId)}/designer`, json('PUT', { designerId: payload.designerId }));
}

/**
 * PATCH /projects/:id: Staff in charge or Admin edits a DRAFT project. Returns the project summary.
 * Errors: 400 VALIDATION_ERROR (details.fields), 403 INSUFFICIENT_ROLE, 404 PROJECT_NOT_FOUND / DESIGN_STYLE_NOT_FOUND,
 * 422 PROJECT_NOT_EDITABLE / INVALID_BUDGET_RANGE / DESIGN_STYLE_INACTIVE.
 */
export function updateProject(projectId: string, payload: UpdateProjectPayload): Promise<ProjectResponse> {
  // rebuilt from the whitelisted fields so nothing extra reaches the API
  const body: UpdateProjectPayload = {
    ...(payload.title !== undefined ? { title: payload.title } : {}),
    ...(payload.description !== undefined ? { description: payload.description === '' ? null : payload.description } : {}),
    ...(payload.householdSize !== undefined ? { householdSize: payload.householdSize } : {}),
    ...(payload.preferredStyleId !== undefined ? { preferredStyleId: payload.preferredStyleId === '' ? null : payload.preferredStyleId } : {}),
    ...(payload.budgetMin !== undefined ? { budgetMin: String(payload.budgetMin) } : {}),
    ...(payload.budgetMax !== undefined ? { budgetMax: String(payload.budgetMax) } : {}),
    ...(payload.budgetTolerancePercent !== undefined ? { budgetTolerancePercent: payload.budgetTolerancePercent } : {}),
  };
  return apiRequest<ProjectResponse>(path(projectId), json('PATCH', body));
}

/**
 * POST /projects/:id/design-kickoff, no body: Staff in charge or Admin moves REQUIREMENT_ANALYSIS → IN_DESIGN.
 * Not idempotent: callers must block a second click while it runs.
 * Errors: 403 INSUFFICIENT_ROLE, 404 PROJECT_NOT_FOUND, 422 DESIGNER_NOT_ASSIGNED / INVALID_PROJECT_STATUS_TRANSITION (details.from).
 */
export function kickoffProjectDesign(projectId: string): Promise<Project> {
  return apiRequest<Project>(`${path(projectId)}/design-kickoff`, { method: 'POST' });
}

/** Message for a failed kickoff, chosen by the backend `code` (and `details.from` for a wrong status). */
export function kickoffErrorText(e: unknown): string {
  const { code, details } = (e ?? {}) as { code?: string; details?: { from?: string } };
  if (code === 'DESIGNER_NOT_ASSIGNED') return t('kickoff.noDesigner');
  if (code === 'APARTMENT_NOT_SURVEYED') return t('errors.APARTMENT_NOT_SURVEYED');
  if (code === 'INVALID_PROJECT_STATUS_TRANSITION') {
    const from = details?.from;
    return t(from === 'DRAFT' ? 'kickoff.fromDraft' : from === 'CONTRACT_PENDING' ? 'kickoff.fromContractPending' : from === 'IN_DESIGN' ? 'kickoff.alreadyStarted' : 'kickoff.wrongStatus');
  }
  if (code === 'PROJECT_NOT_FOUND') return t('kickoff.notFound');
  if (code === 'INSUFFICIENT_ROLE') return t('kickoff.forbidden');
  return errorText(e);
}

/** GET /projects/:id/room-assignments: assigned rooms and who holds them. */
export function getRoomAssignments(projectId: string): Promise<RoomAssignmentListResponse> {
  return apiRequest<RoomAssignmentListResponse>(`${path(projectId)}/room-assignments`);
}

/**
 * PUT /projects/:id/room-assignments: the Lead gives rooms to the Lead or a Member (designerId null = unassign).
 * Rooms not listed keep their designer. Changing a room's designer deletes that room's draft.
 * - 400 `VALIDATION_ERROR`, 403 `NOT_PROJECT_DESIGNER` / `INSUFFICIENT_ROLE`, 404 `PROJECT_NOT_FOUND`,
 *   422 `ROOM_NOT_IN_APARTMENT` / `DESIGNER_NOT_IN_PROJECT` / `PROJECT_CLOSED`.
 */
export function updateRoomAssignments(projectId: string, payload: UpdateRoomAssignmentsPayload): Promise<RoomAssignmentListResponse> {
  return apiRequest<RoomAssignmentListResponse>(`${path(projectId)}/room-assignments`, json('PUT', payload));
}

/**
 * GET /projects/:id/members: the Members (not the Lead, who is `designer` of the project), oldest first, not paged.
 * No Member yet is `{ items: [] }`, not an error. Errors: 400 BAD_REQUEST, 403 INSUFFICIENT_ROLE, 404 PROJECT_NOT_FOUND.
 */
export function getProjectMembers(projectId: string): Promise<GetProjectMembersResponse> {
  return apiRequest<GetProjectMembersResponse>(`${path(projectId)}/members`);
}

const TEAM_ERRORS: Record<string, string> = {
  TEAM_MANAGED_BY_STAFF: 'errors.TEAM_MANAGED_BY_STAFF',
  LEAD_REPLACEMENT_REQUIRED: 'errors.LEAD_REPLACEMENT_REQUIRED',
  INVALID_PROJECT_STATUS: 'errors.INVALID_PROJECT_STATUS',
  PROJECT_CLOSED: 'errors.INVALID_PROJECT_STATUS',
  DESIGNER_NOT_ASSIGNED: 'errors.DESIGNER_NOT_ASSIGNED',
  APARTMENT_NOT_SURVEYED: 'errors.APARTMENT_NOT_SURVEYED',
  DESIGNER_NOT_FOUND: 'team.errDesignerNotFound',
  USER_NOT_ACTIVE: 'team.errUserNotActive',
  DESIGNER_NOT_AVAILABLE: 'team.errNotAvailable',
  PROJECT_NOT_FOUND: 'team.errProjectNotFound',
};

/** Message for a failed PUT /team or PUT /designer, chosen by the backend `code`. */
export function teamErrorText(e: unknown): string {
  const key = TEAM_ERRORS[(e as { code?: string } | null)?.code ?? ''];
  return key ? t(key) : errorText(e);
}

/** Message for a failed team/members load, chosen by the backend `code`. */
export function membersErrorText(e: unknown, role: string | undefined): string {
  const { code, status } = (e ?? {}) as { code?: string; status?: number };
  if (code === 'PROJECT_NOT_FOUND' || status === 404) return t(role === 'designer' ? 'team.errNotOnTeam' : 'team.errMembersNotFound');
  if (code === 'INSUFFICIENT_ROLE') return t('team.errMembersForbidden');
  if (code === 'BAD_REQUEST') return t('team.errBadProjectId');
  return errorText(e);
}

/** GET /projects/:id/team: the Lead (null when none yet) and the Members, each with their assigned rooms. */
export function getProjectTeam(projectId: string): Promise<ProjectTeamResponseDto> {
  return apiRequest<ProjectTeamResponseDto>(`${path(projectId)}/team`);
}

/**
 * PUT /projects/:id/team: Staff in charge or Admin sets the whole team. Rooms of people who leave are handed
 * to the Lead (`reassignedRooms`). Refetch GET /projects/:id/team and GET /projects/:id afterwards.
 * Errors: 403 TEAM_MANAGED_BY_STAFF / INSUFFICIENT_ROLE, 404 DESIGNER_NOT_FOUND / PROJECT_NOT_FOUND,
 * 422 LEAD_REPLACEMENT_REQUIRED / INVALID_PROJECT_STATUS / USER_NOT_ACTIVE / DESIGNER_NOT_AVAILABLE.
 */
export function updateProjectTeam(projectId: string, payload: UpdateProjectTeamPayload): Promise<UpdateProjectTeamResponse> {
  // the Lead is never also a Member
  const memberIds = [...new Set(payload.memberIds)].filter((id) => id !== payload.leadId);
  return apiRequest<UpdateProjectTeamResponse>(`${path(projectId)}/team`, json('PUT', { leadId: payload.leadId, memberIds }));
}

/** GET /users/designers: designers with their workload (`activeProjectCount`). */
export function getDesigners(params: { available?: boolean; limit?: number } = {}): Promise<Page<DesignerListItem>> {
  return apiRequest<Page<DesignerListItem>>(`/users/designers${qs({ available: params.available, limit: params.limit })}`);
}

export const projectApi = {
  /** Up to 100 projects; the list pages filter on the client. */
  list: (q: { status?: ProjectStatus; q?: string } = {}) => getProjects({ ...q, limit: 100 }),
  get: (id: string) => apiRequest<Project>(path(id)),
  create: createProject,
  kickoff: kickoffProjectDesign,
  assignLeadDesigner,

  /** Staff, Admin and the design team: GET /projects/:id/team. */
  getTeam: getProjectTeam,
  updateTeam: updateProjectTeam,
  listRoomAssignments: async (id: string) => (await getRoomAssignments(id)).items,
  updateRoomAssignments: (id: string, assignments: RoomAssignmentItem[]) => updateRoomAssignments(id, { assignments }),

  findCustomer: (email: string) => apiRequest<{ id: string; email: string; fullName: string; phone: string }>(`/users/customers${qs({ email })}`),
  listDesigners: () => getDesigners({ available: true, limit: 100 }),
  listApartments: (ownerId: string) => apiRequest<Page<Apartment>>(`/apartments${qs({ ownerId, limit: 100 })}`),
};

/** Step of a status on the 7-step progress bar (steps.ts: one step per backend status). */
export { stepIndex } from './steps';
export const isPreparing = (s: ProjectStatus) => ['DRAFT', 'CONTRACT_PENDING', 'REQUIREMENT_ANALYSIS'].includes(s);
export const canOpenWorkspace = (s: ProjectStatus) => ['IN_DESIGN', 'PRODUCT_SELECTION', 'QUOTING', 'COMPLETED'].includes(s);

/** "Next step" for the person viewing the project. */
export function nextStep(role: UserRole, p: Project): string {
  if (p.status === 'CANCELLED') return t('nextStep.cancelled');
  if (p.status === 'COMPLETED') return t(role === 'homeowner' ? 'nextStep.completedHomeowner' : 'nextStep.completed');
  if (isPreparing(p.status)) {
    // A DRAFT project without a home is in the site survey: booked by the homeowner once a Lead is assigned.
    // `apartment === null` only: callers that pass a partial project (no apartment field) keep the old sentence.
    if (p.status === 'DRAFT' && p.apartment === null) {
      if (role === 'staff' || role === 'admin') return t(p.designer ? 'nextStep.surveyStaff' : 'nextStep.surveyStaffNoLead');
      if (role === 'homeowner' && p.designer) return t('nextStep.surveyHomeowner');
      if (role === 'designer' && p.myProjectRole === 'LEAD') return t('nextStep.surveyLead');
      return t('nextStep.waitingStaff');
    }
    if (role === 'staff' || role === 'admin') {
      // Kickoff is only possible once the deposit is paid (REQUIREMENT_ANALYSIS); before that the staff wait on the contract.
      if (p.status === 'REQUIREMENT_ANALYSIS') return t(p.designer ? 'nextStep.staffKickoff' : 'nextStep.staffAssign');
      return t(p.status === 'DRAFT' ? 'nextStep.staffContract' : 'nextStep.staffDeposit');
    }
    return t('nextStep.waitingStaff');
  }
  const key = `nextStep.${p.status}.${role}`;
  const text = t(key);
  return text === key ? '' : text;
}
