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

export interface ProjectMember { designerId: string; fullName: string; email: string; title: string | null; addedAt: string }
export interface ProjectRoomRef { id: string; name: string; floorId: string }
export interface RoomAssignment { roomId: string; roomName: string; floorId: string; designerId: string; designerName: string }
export interface InvitableDesigner { id: string; fullName: string; email: string; avatarUrl: string | null }

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

const qs = (q: Record<string, string | number | boolean | undefined>) => {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(q)) if (v !== undefined && v !== '') p.set(k, String(v));
  const s = p.toString();
  return s ? `?${s}` : '';
};
const json = (method: string, body?: unknown): RequestInit => ({ method, body: body === undefined ? undefined : JSON.stringify(body) });

export const projectApi = {
  list: (q: { status?: ProjectStatus; q?: string } = {}) => apiRequest<Page<Project>>(`/projects${qs({ ...q, limit: 100 })}`),
  get: (id: string) => apiRequest<Project>(`/projects/${id}`),
  create: (body: { apartmentId: string; title: string; budgetMin: string; budgetMax: string; description?: string }) =>
    apiRequest<Project>('/projects', json('POST', body)),
  assignDesigner: (id: string, designerId: string) => apiRequest<Project>(`/projects/${id}/designer`, json('PUT', { designerId })),
  kickoff: (id: string) => apiRequest<Project>(`/projects/${id}/design-kickoff`, json('POST')),

  listInvitableDesigners: async (id: string, q: string) => (await apiRequest<{ items: InvitableDesigner[] }>(`/projects/${id}/invitable-designers${qs({ q: q.trim() })}`)).items,
  addMember: (id: string, designerId: string) => apiRequest<ProjectMember>(`/projects/${id}/members`, json('POST', { designerId })),
  removeMember: (id: string, designerId: string) => apiRequest<void>(`/projects/${id}/members/${designerId}`, json('DELETE')),
  listRoomAssignments: async (id: string) => (await apiRequest<{ items: RoomAssignment[] }>(`/projects/${id}/room-assignments`)).items,
  /** Rooms not listed keep their designer. Changing a room's designer deletes that room's draft. */
  updateRoomAssignments: (id: string, assignments: { roomId: string; designerId: string | null }[]) =>
    apiRequest<{ items: RoomAssignment[] }>(`/projects/${id}/room-assignments`, json('PUT', { assignments })),

  findCustomer: (email: string) => apiRequest<{ id: string; email: string; fullName: string; phone: string }>(`/users/customers${qs({ email })}`),
  listDesigners: () => apiRequest<Page<{ id: string; fullName: string; email: string; isAvailable: boolean }>>('/users/designers?available=true&limit=100'),
  listApartments: (ownerId: string) => apiRequest<Page<Apartment>>(`/apartments${qs({ ownerId, limit: 100 })}`),
  createApartment: (body: {
    ownerEmail: string; propertyType: 'APARTMENT' | 'HOUSE'; buildingName: string; address: string; unitNo: string;
    netArea: number; bedroomCount: number; bathroomCount: number; tower?: string;
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
    if (role === 'staff' || role === 'admin') return t(p.designer ? 'nextStep.staffKickoff' : 'nextStep.staffAssign');
    return t('nextStep.waitingStaff');
  }
  const key = `nextStep.${p.status}.${role}`;
  const text = t(key);
  return text === key ? '' : text;
}
