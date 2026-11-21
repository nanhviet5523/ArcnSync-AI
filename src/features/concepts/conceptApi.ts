import { errorText, t } from '@/i18n';
import { apiRequest, apiUpload, fetchBlobUrl } from '@/services/authService';
import type { UserRole } from '@/types/role';
import type { ProjectRole, ProjectStatus } from '@/features/projects/projectApi';

// ---------------------------------------------------------------------------
// Types: mirror the backend ConceptResponseDto (GET /projects/{projectId}/concepts)
// ---------------------------------------------------------------------------

/** A concept is a design version of type CONCEPT. Customers never receive DRAFT. */
export type ConceptStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED';
/** What the UI shows: a SUBMITTED concept that lost to the chosen one reads "Not chosen". */
export type ConceptDisplayStatus = ConceptStatus | 'NOT_CHOSEN';

export interface ConceptImage {
  id: string;
  assetType: 'RENDER_IMAGE' | 'AI_VISUALIZATION';
  fileName: string;
  mimeType: string;
  /** Bytes as a string (BIGINT). */
  sizeBytes: string;
  /** `/design-assets/{id}/file`: needs the Bearer token, load it with {@link conceptImageUrl}. */
  url: string;
  createdAt: string;
}

export interface Concept {
  id: string;
  projectId: string;
  versionNo: number;
  title: string;
  description: string | null;
  status: ConceptStatus;
  createdBy: { id: string; fullName: string } | null;
  createdAt: string;
  submittedAt: string | null;
  approvedAt: string | null;
  /** Oldest first; the first one is the cover. */
  images: ConceptImage[];
}

// ---------------------------------------------------------------------------
// Limits: same as the backend (design-concepts.service.ts, CreateConceptDto)
// ---------------------------------------------------------------------------

export const MAX_CONCEPT_IMAGES = 10;
export const MAX_CONCEPT_IMAGE_BYTES = 20 * 1024 * 1024;
/** Concepts waiting for the homeowner (SUBMITTED) at the same time. */
export const MAX_SUBMITTED_CONCEPTS = 5;
/** The backend checks the magic bytes and rejects WebP. */
export const CONCEPT_IMAGE_TYPES = ['image/png', 'image/jpeg'];
export const CONCEPT_TITLE_MAX = 255;
export const CONCEPT_DESCRIPTION_MAX = 2000;

// ---------------------------------------------------------------------------
// API calls
// ---------------------------------------------------------------------------

const enc = encodeURIComponent;

function imagesForm(files: readonly File[], fields: Record<string, string> = {}): FormData {
  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) form.append(key, value);
  // the backend field is `files` (repeated), not `files[]`
  for (const file of files) form.append('files', file, file.name);
  return form;
}

export const conceptApi = {
  /**
   * GET /projects/{projectId}/concepts: every concept with its images, by versionNo.
   * Customers only receive SUBMITTED / APPROVED. Errors: 404 PROJECT_NOT_FOUND.
   */
  list: (projectId: string) => apiRequest<Concept[]>(`/projects/${enc(projectId)}/concepts`),

  /**
   * Lead creates a DRAFT concept. POST /projects/{projectId}/concepts, multipart `files` (1–10 PNG/JPEG ≤ 20 MB),
   * `title`, `description?`. Errors: 403 NOT_PROJECT_DESIGNER; 422 PROJECT_NOT_IN_DESIGN / STAGE_ALREADY_APPROVED /
   * INVALID_CONCEPT_IMAGE / CONCEPT_IMAGE_LIMIT; 409 DESIGN_VERSION_CONFLICT.
   */
  create(projectId: string, input: { title: string; description: string }, files: readonly File[], onProgress?: (fraction: number) => void) {
    const fields: Record<string, string> = { title: input.title };
    if (input.description) fields.description = input.description;
    return apiUpload<Concept>(`/projects/${enc(projectId)}/concepts`, imagesForm(files, fields), onProgress);
  },

  /**
   * Lead edits the title / description (DRAFT or SUBMITTED, while no concept is chosen). PATCH /design-versions/{id}.
   * `description: null` clears it. Errors: 422 VERSION_NOT_EDITABLE / PROJECT_NOT_IN_DESIGN / STAGE_ALREADY_APPROVED.
   */
  update: (id: string, patch: { title?: string; description?: string | null }) =>
    apiRequest<Concept>(`/design-versions/${enc(id)}`, { method: 'PATCH', body: JSON.stringify(patch) }),

  /** Lead adds images (total ≤ 10). POST /design-versions/{id}/concept-images, multipart `files`. */
  addImages: (id: string, files: readonly File[], onProgress?: (fraction: number) => void) =>
    apiUpload<Concept>(`/design-versions/${enc(id)}/concept-images`, imagesForm(files), onProgress),

  /**
   * Lead deletes one image. DELETE /design-assets/{id} → 204. The last image can't be deleted
   * (422 CONCEPT_IMAGE_LIMIT). Errors: 404 DESIGN_ASSET_NOT_FOUND, 422 VERSION_NOT_EDITABLE.
   */
  async deleteImage(assetId: string): Promise<void> {
    await apiRequest<void>(`/design-assets/${enc(assetId)}`, { method: 'DELETE' });
  },

  /**
   * Lead sends a concept to the homeowner: DRAFT → SUBMITTED. POST /design-versions/{id}/submission.
   * Errors: 422 CONCEPT_LIMIT_REACHED (5 already waiting) / INVALID_DESIGN_VERSION_STATUS_TRANSITION / STAGE_ALREADY_APPROVED.
   */
  submit: (id: string) => apiRequest<Concept>(`/design-versions/${enc(id)}/submission`, { method: 'POST' }),

  /**
   * Homeowner chooses a concept: SUBMITTED → APPROVED; the others stay SUBMITTED. POST /design-versions/{id}/approval.
   * Returns the layout-style version detail, not a concept: reload the list afterwards.
   * Errors: 422 STAGE_ALREADY_APPROVED / INVALID_DESIGN_VERSION_STATUS_TRANSITION / PROJECT_NOT_IN_DESIGN, 403 NOT_PROJECT_CUSTOMER.
   */
  async choose(id: string): Promise<void> {
    await apiRequest<unknown>(`/design-versions/${enc(id)}/approval`, { method: 'POST' });
  },
};

/** Object URL of a concept image, fetched with the token (cached per path). */
export const conceptImageUrl = (image: ConceptImage) => fetchBlobUrl(image.url);

// ---------------------------------------------------------------------------
// Rules shown in the UI (the backend checks them again)
// ---------------------------------------------------------------------------

/** First problem with the picked files, as a sentence; null when they can be sent. `existing` = images already on the concept. */
export function validateConceptFiles(files: readonly File[], existing = 0): string | null {
  const bad = files.find((f) => !CONCEPT_IMAGE_TYPES.includes(f.type));
  if (bad) return t('concepts.errBadType', { name: bad.name });
  const big = files.find((f) => f.size > MAX_CONCEPT_IMAGE_BYTES);
  if (big) return t('concepts.errTooBig', { name: big.name });
  if (existing + files.length > MAX_CONCEPT_IMAGES) return t('concepts.errTooMany', { max: MAX_CONCEPT_IMAGES, left: Math.max(0, MAX_CONCEPT_IMAGES - existing) });
  if (existing + files.length < 1) return t('concepts.errNoImage');
  return null;
}

export function conceptSummary(concepts: readonly Concept[]) {
  return {
    approved: concepts.find((c) => c.status === 'APPROVED') ?? null,
    submittedCount: concepts.filter((c) => c.status === 'SUBMITTED').length,
  };
}

export const displayStatus = (c: Concept, approved: Concept | null): ConceptDisplayStatus =>
  c.status === 'SUBMITTED' && approved ? 'NOT_CHOSEN' : c.status;

export interface ConceptRights {
  /** Lead: create, edit, add / delete images, submit. */
  canEdit: boolean;
  /** Homeowner: choose one of the submitted concepts. */
  canChoose: boolean;
  /** One line telling why there are no buttons; empty when nothing needs saying. */
  reason: string;
}

/** Who may do what on the concept card. `hasLayout`: the project already has a layout, so the concept stage is over. */
export function conceptRights({ role, projectRole, projectStatus, approved, hasLayout }: {
  role: UserRole; projectRole: ProjectRole | null; projectStatus: ProjectStatus; approved: boolean; hasLayout: boolean;
}): ConceptRights {
  const none = (reason = ''): ConceptRights => ({ canEdit: false, canChoose: false, reason });
  if (approved) return none(t(role === 'homeowner' ? 'concepts.reasonChosenHomeowner' : 'concepts.reasonChosen'));
  if (projectStatus !== 'IN_DESIGN' || hasLayout) return none(t('concepts.reasonClosed'));
  if (role === 'homeowner') return { canEdit: false, canChoose: true, reason: '' };
  if (role === 'designer' && projectRole === 'LEAD') return { canEdit: true, canChoose: false, reason: '' };
  return none(t('concepts.reasonLeadOnly'));
}

/** errorText, with the concept meaning of codes shared with the other stages. */
export function conceptErrorText(e: unknown): string {
  const code = (e as { code?: string } | null)?.code;
  if (code === 'STAGE_ALREADY_APPROVED') return t('concepts.errAlreadyChosen');
  if (code === 'VERSION_NOT_EDITABLE') return t('concepts.errNotEditable');
  return errorText(e);
}
