import { apiRequest } from '@/services/authService';
import type { UserRole } from '@/types/role';
import { t } from '@/i18n';

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
  bedroomCount: number;
  bathroomCount: number;
  owner: Person;
  floors: ApartmentFloor[];
}

/** Role inside one project's design team, not an account role. */
export type ProjectRole = 'LEAD' | 'MEMBER';
/** Same as ProjectRole; the name the backend DTO uses (`myProjectRole`). */
export type MyProjectRole = ProjectRole;

export interface ProjectMember { designerId: string; fullName: string; email: string; title: string | null; addedAt: string }
export interface ProjectRoomRef { id: string; name: string; floorId: string }
export interface RoomAssignment { roomId: string; roomName: string; floorId: string; designerId: string; designerName: string }

/** One person of GET /projects/:id/team. The Lead has addedAt null. */
export interface TeamPerson { userId: string; name: string; email: string; avatar: string | null; addedAt: string | null; assignedRooms: ProjectRoomRef[] }
export interface ProjectTeam { lead: TeamPerson | null; members: TeamPerson[] }
/** Rooms of people who left the team, now the Lead's (their unmerged drafts moved too, back to DRAFT). */
export interface ReassignedRoom { roomId: string; roomName: string; floorId: string; fromDesignerId: string; toDesignerId: string }
export interface DesignerOption { id: string; fullName: string; email: string; isAvailable: boolean; activeProjectCount: number }

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
  apartment: Pick<Apartment, 'id' | 'buildingName' | 'address' | 'tower' | 'unitNo'> & Partial<Apartment>;
  createdAt: string;
  updatedAt: string;
  /** Project detail only. The lead is `designer`. */
  members?: ProjectMember[];
  /** Null = the viewer is not on the design team. Undefined = the backend did not say (see resolveProjectRole). */
  myProjectRole?: ProjectRole | null;
  /** Project list only: rooms assigned to the viewer. */
  myRooms?: ProjectRoomRef[];
}

interface Page<T> { items: T[]; page: number; limit: number; total: number }

// ---------------------------------------------------------------------------
// Backend DTOs (Swagger: /projects). They are structurally compatible with Project.
// ---------------------------------------------------------------------------

/** POST /projects body. The project's customer is the apartment owner. */
export interface CreateProjectPayload {
  apartmentId: string;
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
  apartment: ProjectApartmentSummary;
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
 * POST /projects: Staff creates a DRAFT project on a customer's apartment.
 * The body is rebuilt from the whitelisted fields only (the backend rejects unknown ones) and
 * empty optionals are left out.
 * - 400 `VALIDATION_ERROR` (details.fields), 404 `APARTMENT_NOT_FOUND` / `DESIGN_STYLE_NOT_FOUND`.
 * - 409 `APARTMENT_HAS_ACTIVE_PROJECT`: `details` is {@link ApartmentHasActiveProjectDetails}.
 * - 409 `PROJECT_CODE_GENERATION_FAILED`.
 * - 422 `USER_NOT_ACTIVE` (the apartment owner), `DESIGN_STYLE_INACTIVE`, `INVALID_BUDGET_RANGE`.
 */
export function createProject(payload: CreateProjectPayload): Promise<ProjectResponse> {
  const description = payload.description?.trim();
  const body: CreateProjectPayload = {
    apartmentId: payload.apartmentId,
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
 * - 404 `DESIGNER_NOT_FOUND`, 422 `USER_NOT_ACTIVE`, 422 `DESIGNER_NOT_AVAILABLE`, 422 `PROJECT_CLOSED`.
 */
export function assignLeadDesigner(projectId: string, designerId: string): Promise<ProjectResponse> {
  return apiRequest<ProjectResponse>(`${path(projectId)}/designer`, json('PUT', { designerId }));
}

/** GET /projects/:id/room-assignments: assigned rooms and who holds them. */
export function getRoomAssignments(projectId: string): Promise<RoomAssignmentListResponse> {
  return apiRequest<RoomAssignmentListResponse>(`${path(projectId)}/room-assignments`);
}

/**
 * PUT /projects/:id/room-assignments: the Lead gives rooms to the Lead or a Member (designerId null = unassign).
 * Rooms not listed keep their designer. Changing a room's designer deletes that room's draft.
 * - 403 `INSUFFICIENT_ROLE`, 422 `ROOM_NOT_IN_APARTMENT`, 422 `DESIGNER_NOT_IN_PROJECT`.
 */
export function updateRoomAssignments(projectId: string, payload: UpdateRoomAssignmentsPayload): Promise<RoomAssignmentListResponse> {
  return apiRequest<RoomAssignmentListResponse>(`${path(projectId)}/room-assignments`, json('PUT', payload));
}

/** The design team of a project, assembled from the project, its members and its room assignments. */
async function getTeam(id: string): Promise<ProjectTeam> {
  const [project, members, rooms] = await Promise.all([
    apiRequest<Project>(path(id)),
    apiRequest<{ items: ProjectMember[] }>(`${path(id)}/members`),
    getRoomAssignments(id),
  ]);
  const roomsOf = (designerId: string): ProjectRoomRef[] =>
    rooms.items.filter((a) => a.designerId === designerId).map((a) => ({ id: a.roomId, name: a.roomName, floorId: a.floorId }));
  return {
    lead: project.designer
      ? { userId: project.designer.id, name: project.designer.fullName, email: project.designer.email ?? '', avatar: null, addedAt: null, assignedRooms: roomsOf(project.designer.id) }
      : null,
    members: members.items.map((m) => ({ userId: m.designerId, name: m.fullName, email: m.email, avatar: null, addedAt: m.addedAt, assignedRooms: roomsOf(m.designerId) })),
  };
}

export const projectApi = {
  /** Up to 100 projects; the list pages filter on the client. */
  list: (q: { status?: ProjectStatus; q?: string } = {}) => getProjects({ ...q, limit: 100 }),
  get: (id: string) => apiRequest<Project>(path(id)),
  create: createProject,
  kickoff: (id: string) => apiRequest<Project>(`${path(id)}/design-kickoff`, json('POST')),
  assignLeadDesigner,

  /**
   * Staff, Admin and the design team. There is no GET /projects/:id/team: the Lead is `designer` of the project,
   * the Members come from GET /projects/:id/members, and the rooms from GET /projects/:id/room-assignments.
   */
  getTeam: getTeam,
  /** Staff, Admin. Replaces the whole team; people left out give their rooms and drafts to the Lead. */
  updateTeam: (id: string, body: { leadId: string; memberIds: string[] }) =>
    apiRequest<ProjectTeam & { reassignedRooms: ReassignedRoom[] }>(`${path(id)}/team`, json('PUT', body)),
  listRoomAssignments: async (id: string) => (await getRoomAssignments(id)).items,
  updateRoomAssignments: (id: string, assignments: RoomAssignmentItem[]) => updateRoomAssignments(id, { assignments }),

  findCustomer: (email: string) => apiRequest<{ id: string; email: string; fullName: string; phone: string }>(`/users/customers${qs({ email })}`),
  listDesigners: () => apiRequest<Page<DesignerOption>>('/users/designers?available=true&limit=100'),
  listApartments: (ownerId: string) => apiRequest<Page<Apartment>>(`/apartments${qs({ ownerId, limit: 100 })}`),
  createApartment: (body: {
    ownerEmail: string; propertyType: 'APARTMENT' | 'HOUSE'; buildingName: string; address: string; unitNo: string;
    netArea: number; bedroomCount: number; bathroomCount: number;
    /** Block / tower: APARTMENT only, never sent for a HOUSE. */
    tower?: string;
  }) => apiRequest<Apartment>('/apartments', json('POST', body)),
};

/** Index into the 7 project steps (steps.project): Contract, Requirements, Concept, Layout, Products, Quotation, Handover.
 * The concept stage is not built yet, so a project in design is on Layout. Completed = every step done. */
const STEP_OF: Record<ProjectStatus, number> = {
  DRAFT: 0, CONTRACT_PENDING: 0, REQUIREMENT_ANALYSIS: 1, IN_DESIGN: 3, PRODUCT_SELECTION: 4, QUOTING: 5, COMPLETED: 7, CANCELLED: -1,
};
export const stepIndex = (s: ProjectStatus) => STEP_OF[s];
export const isPreparing = (s: ProjectStatus) => ['DRAFT', 'CONTRACT_PENDING', 'REQUIREMENT_ANALYSIS'].includes(s);
export const canOpenWorkspace = (s: ProjectStatus) => ['IN_DESIGN', 'PRODUCT_SELECTION', 'QUOTING', 'COMPLETED'].includes(s);

/** "Next step" for the person viewing the project. */
export function nextStep(role: UserRole, p: Project): string {
  if (p.status === 'CANCELLED') return t('nextStep.cancelled');
  if (p.status === 'COMPLETED') return t(role === 'homeowner' ? 'nextStep.completedHomeowner' : 'nextStep.completed');
  if (isPreparing(p.status)) {
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
