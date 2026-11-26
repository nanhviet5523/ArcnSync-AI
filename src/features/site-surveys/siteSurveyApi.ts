import { apiFetch, apiRequest, apiUpload, ApiError } from '@/services/authService';
import { errorText, t } from '@/i18n';
import type { PropertyType } from '@/services/apartmentService';

/**
 * Site survey (khảo sát hiện trạng), backend module `site-surveys`.
 * REQUESTED (waiting for the Lead to pick a time) → SCHEDULED → SUBMITTED (waiting for the homeowner) → CONFIRMED.
 * REJECTED: the homeowner asked the Lead to fix the result. CANCELLED: called off before the visit.
 * On CONFIRMED the backend creates (or updates) the apartment with its floors and rooms and attaches it to the project.
 */
export type SiteSurveyStatus = 'REQUESTED' | 'SCHEDULED' | 'SUBMITTED' | 'CONFIRMED' | 'REJECTED' | 'CANCELLED';

export interface TimeSlot { startAt: string; endAt: string }
/** The time the Lead fixed. slotIndex points into proposedSlots, or is null when the Lead moved it to another time. */
export interface ScheduledSlot extends TimeSlot { slotIndex: number | null }

export interface SurveyPhoto { id: string; fileName: string; mimeType: string; sizeBytes: number; uploadedAt: string }
export interface SurveyRoom {
  name: string;
  roomType: string;
  /** m², string with 2 decimals; null = not measured */
  area: string | null;
  purpose: string | null;
}
export interface SurveyFloor {
  /** Id used by the photo routes (/site-survey-floors/:id/photos). Changes when the floor is removed and added again. */
  id: string;
  level: number;
  name: string;
  floorHeightMm: number;
  /** m², string with 2 decimals */
  measuredArea: string;
  note: string | null;
  rooms: SurveyRoom[];
  photos: SurveyPhoto[];
}

export interface SiteSurvey {
  id: string;
  projectId: string;
  status: SiteSurveyStatus;
  /** 1–3 times the homeowner offered; kept as they were after the Lead picks one */
  proposedSlots: TimeSlot[];
  customerNote: string | null;
  scheduledSlot: ScheduledSlot | null;
  scheduledById: string | null;
  propertyType: PropertyType;
  buildingName: string;
  address: string;
  tower: string | null;
  unitNo: string;
  floorNo: number | null;
  layoutCode: string | null;
  bedroomCount: number | null;
  bathroomCount: number | null;
  /** m², set when the Lead submits */
  measuredTotalArea: string | null;
  leadNote: string | null;
  rejectionReason: string | null;
  cancelReason: string | null;
  cancelledById: string | null;
  /** The apartment created or updated on confirmation */
  apartmentId: string | null;
  submittedAt: string | null;
  confirmedAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
  /** Sorted by level */
  floors: SurveyFloor[];
}

/** Home details the homeowner gives when booking (and the Lead records after the visit). */
export interface SurveyLocation {
  propertyType?: PropertyType;
  buildingName: string;
  address: string;
  tower?: string;
  unitNo: string;
  floorNo?: number;
}

export interface BookSurveyPayload extends SurveyLocation {
  /** 1–3 future times */
  proposedSlots: TimeSlot[];
  note?: string;
}

/** PATCH: leave a field out to keep it; null clears tower, floorNo or note. Sending proposedSlots sends it back to REQUESTED. */
export interface UpdateSurveyPayload {
  proposedSlots?: TimeSlot[];
  propertyType?: PropertyType;
  buildingName?: string;
  address?: string;
  tower?: string | null;
  unitNo?: string;
  floorNo?: number | null;
  note?: string | null;
}

/** Either pick one of the homeowner's times, or move the visit to another time. */
export type SchedulePayload = { slotIndex: number } | { startAt: string; endAt: string };

export interface MeasurementRoom { name: string; roomType: string; area?: number; purpose?: string }
export interface MeasurementFloor {
  /** 1 = ground floor; negative = basement. Unique in a survey. */
  level: number;
  name: string;
  floorHeightMm?: number;
  measuredArea: number;
  note?: string;
  rooms?: MeasurementRoom[];
}
/** PUT measurement replaces the whole result. A floor that keeps its level keeps its photos; a floor left out loses them. */
export interface MeasurementPayload extends SurveyLocation {
  layoutCode?: string;
  note?: string;
  floors: MeasurementFloor[];
}

export const MAX_SLOTS = 3;
export const MAX_FLOORS = 20;
export const MAX_ROOMS_PER_FLOOR = 50;
export const MAX_PHOTOS_PER_FLOOR = 30;
export const MAX_PHOTOS_PER_UPLOAD = 10;
export const MAX_PHOTO_BYTES = 10 * 1024 * 1024;
export const PHOTO_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

/** Before the visit the homeowner can still change it, and the homeowner, Lead, Staff or Admin can cancel it. */
export const isBooked = (s: SiteSurveyStatus) => s === 'REQUESTED' || s === 'SCHEDULED';
/** The Lead records results and manages photos only in these. */
export const isMeasurable = (s: SiteSurveyStatus) => s === 'SCHEDULED' || s === 'REJECTED';

const json = (method: string, body?: unknown): RequestInit => ({ method, body: body === undefined ? undefined : JSON.stringify(body) });
const survey = (id: string) => `/site-surveys/${encodeURIComponent(id)}`;
const floorPhotos = (floorId: string) => `/site-survey-floors/${encodeURIComponent(floorId)}/photos`;

export const siteSurveyApi = {
  /** GET /projects/:projectId/site-surveys: every survey of the project, newest first (cancelled ones too). */
  async listByProject(projectId: string): Promise<SiteSurvey[]> {
    return (await apiRequest<{ items: SiteSurvey[] }>(`/projects/${encodeURIComponent(projectId)}/site-surveys`)).items;
  },
  /** GET /site-surveys/:id */
  get: (id: string) => apiRequest<SiteSurvey>(survey(id)),
  /**
   * POST /projects/:projectId/site-surveys: the homeowner books. 422 DESIGNER_NOT_ASSIGNED | PROJECT_NOT_EDITABLE |
   * PROJECT_ALREADY_SURVEYED, 409 SITE_SURVEY_EXISTS, 400 for a wrong time.
   */
  book: (projectId: string, body: BookSurveyPayload) =>
    apiRequest<SiteSurvey>(`/projects/${encodeURIComponent(projectId)}/site-surveys`, json('POST', body)),
  /** PATCH /site-surveys/:id: the homeowner changes times or the address while REQUESTED | SCHEDULED. */
  update: (id: string, body: UpdateSurveyPayload) => apiRequest<SiteSurvey>(survey(id), json('PATCH', body)),
  /** PUT /site-surveys/:id/schedule: the Lead fixes the time → SCHEDULED. */
  schedule: (id: string, body: SchedulePayload) => apiRequest<SiteSurvey>(`${survey(id)}/schedule`, json('PUT', body)),
  /** POST /site-surveys/:id/cancellation: homeowner, Lead, Staff in charge or Admin, while REQUESTED | SCHEDULED. */
  cancel: (id: string, reason: string) => apiRequest<SiteSurvey>(`${survey(id)}/cancellation`, json('POST', { reason })),
  /** PUT /site-surveys/:id/measurement: the Lead records the result (replaces it all) while SCHEDULED | REJECTED. */
  recordMeasurement: (id: string, body: MeasurementPayload) => apiRequest<SiteSurvey>(`${survey(id)}/measurement`, json('PUT', body)),
  /** POST /site-surveys/:id/submission: the Lead submits → SUBMITTED. 422 SURVEY_INCOMPLETE (details.missingPhotoLevels). */
  submit: (id: string) => apiRequest<SiteSurvey>(`${survey(id)}/submission`, { method: 'POST' }),
  /** POST /site-surveys/:id/confirmation: the homeowner confirms → CONFIRMED; the apartment is created. 409 APARTMENT_HAS_ACTIVE_PROJECT. */
  confirm: (id: string) => apiRequest<SiteSurvey>(`${survey(id)}/confirmation`, { method: 'POST' }),
  /** POST /site-surveys/:id/rejection: the homeowner sends the result back with a reason → REJECTED. */
  reject: (id: string, reason: string) => apiRequest<SiteSurvey>(`${survey(id)}/rejection`, json('POST', { reason })),

  /**
   * POST /site-survey-floors/:id/photos (multipart `files`): up to 10 per request, PNG/JPEG/WebP ≤ 10 MB, 30 per floor.
   * Returns EVERY photo of the floor after the upload, not only the new ones.
   */
  async uploadPhotos(floorId: string, files: File[], onProgress?: (fraction: number) => void): Promise<SurveyPhoto[]> {
    const form = new FormData();
    files.forEach((file) => form.append('files', file));
    return (await apiUpload<{ items: SurveyPhoto[] }>(floorPhotos(floorId), form, onProgress)).items;
  },
  /** GET /site-survey-floors/:id/photos/:photoId as a blob (the route needs the bearer token, so no plain <img src>). */
  async photoBlob(floorId: string, photoId: string): Promise<Blob> {
    const res = await apiFetch(`${floorPhotos(floorId)}/${encodeURIComponent(photoId)}`);
    if (!res.ok) {
      const data = await res.json().catch(() => null) as { code?: string } | null;
      throw new ApiError('Photo request failed', res.status, [], {}, data?.code ?? '');
    }
    return res.blob();
  },
  /** DELETE /site-survey-floors/:id/photos/:photoId (204), while SCHEDULED | REJECTED. */
  deletePhoto: (floorId: string, photoId: string) =>
    apiRequest<null>(`${floorPhotos(floorId)}/${encodeURIComponent(photoId)}`, { method: 'DELETE' }),
};

/** Error codes that read differently on the survey screens than elsewhere. */
const SURVEY_OVERRIDES: Record<string, string> = {
  DESIGNER_NOT_ASSIGNED: 'siteSurvey.errors.noLead',
  PROJECT_NOT_EDITABLE: 'siteSurvey.errors.notDraft',
  NOT_PROJECT_DESIGNER: 'siteSurvey.errors.notLead',
  FORBIDDEN: 'siteSurvey.errors.cannotCancel',
};

/**
 * 400 VALIDATION_ERROR → errors keyed like the form's own fields. `resolve` turns a backend path (`floors.0.rooms.1.area`;
 * `floors[0]` is read the same) into a form key, or undefined when no field on the form matches. Backend messages are
 * Vietnamese, so every matched field gets the same English hint. Returns null for any other error.
 */
export function surveyFieldErrors(e: unknown, resolve: (path: string) => string | undefined): { fields: Record<string, string>; formError: string } | null {
  const err = (e ?? {}) as { code?: string; fieldErrors?: Record<string, string> };
  const paths = Object.keys(err.fieldErrors ?? {});
  if (err.code !== 'VALIDATION_ERROR' || !paths.length) return null;
  const fields: Record<string, string> = {};
  const unmatched: string[] = [];
  for (const raw of paths) {
    const path = raw.replace(/\[(\d+)\]/g, '.$1');
    const key = resolve(path);
    if (key) fields[key] = t('common.checkValue');
    else unmatched.push(path);
  }
  const formError = unmatched.length
    ? t('siteSurvey.v.serverFields', { fields: unmatched.join(', ') })
    : t('siteSurvey.v.fix');
  return { fields, formError };
}

/** English sentence for a failed survey call. SURVEY_INCOMPLETE names what is missing. */
export function surveyErrorText(e: unknown): string {
  const err = (e ?? {}) as { code?: string; details?: Record<string, unknown> };
  if (err.code === 'SURVEY_INCOMPLETE') {
    const d = err.details ?? {};
    const missing = (d.missingPhotoLevels as number[] | undefined) ?? [];
    if (d.totalArea) return t('siteSurvey.errors.totalTooLarge');
    if (d.floorCount === 0) return t('siteSurvey.errors.noFloors');
    if (missing.length) return t('siteSurvey.errors.missingPhotos', { levels: missing.join(', ') });
  }
  const key = SURVEY_OVERRIDES[err.code ?? ''];
  return key ? t(key) : errorText(e);
}
