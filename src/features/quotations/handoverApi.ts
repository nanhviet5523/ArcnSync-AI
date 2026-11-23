import { t } from '@/i18n';
import { apiRequest, apiUpload, downloadFile } from '@/services/authService';
import type { MilestoneStatus } from '@/features/projects/services/contractsApi';

/**
 * Handover API (backend `quotations` module, `HandoverService`). Handover starts once the homeowner accepts the quotation:
 * its design version (the approved RENDER_3D) is the final version. Lead uploads the package (render images, 3D models,
 * documents) and submits it; the homeowner approves it (the FINAL_PACKAGE milestone becomes INVOICED and they can download
 * the DXF and the package) or asks for changes (no new version, no revision counted). The backend auto-approves a
 * submitted package once `reviewDeadline` passes.
 */
export type HandoverStatus = 'NOT_SUBMITTED' | 'SUBMITTED' | 'CHANGES_REQUESTED' | 'APPROVED';
export const HANDOVER_ASSET_TYPES = ['RENDER_IMAGE', 'MODEL_3D', 'DOCUMENT'] as const;
export type HandoverAssetType = (typeof HANDOVER_ASSET_TYPES)[number];

export interface HandoverAsset {
  id: string;
  assetType: HandoverAssetType;
  fileName: string;
  mimeType: string;
  /** Bytes as a string (BIGINT). */
  sizeBytes: string;
  uploadedById: string;
  createdAt: string;
}

/** The FINAL_PACKAGE payment milestone. */
export interface HandoverMilestone {
  id: string;
  name: string;
  status: MilestoneStatus;
  /** VND as a string. */
  amount: string;
  /** Set while a submitted package waits for the homeowner; the backend auto-approves after it. */
  reviewDeadline: string | null;
  approvedAt: string | null;
  paidAt: string | null;
}

export interface Handover {
  designVersionId: string;
  projectId: string;
  quotationId: string;
  status: HandoverStatus;
  milestone: HandoverMilestone;
  /** The homeowner's open change request, only while CHANGES_REQUESTED. */
  latestRevisionRequest: { id: string; content: string; createdAt: string } | null;
  /** Render images, 3D models, documents. The DXF is downloaded per floor from the version. */
  assets: HandoverAsset[];
}

// ---------------------------------------------------------------------------
// Limits: same as the backend (handover.service.ts HANDOVER_ASSET_LIMITS)
// ---------------------------------------------------------------------------

const MB = 1024 * 1024;
export const HANDOVER_LIMITS: Readonly<Record<HandoverAssetType, { maxBytes: number; maxFiles: number; ext: string[] }>> = {
  RENDER_IMAGE: { maxBytes: 20 * MB, maxFiles: 30, ext: ['png', 'jpg', 'jpeg'] },
  MODEL_3D: { maxBytes: 100 * MB, maxFiles: 10, ext: ['glb'] },
  DOCUMENT: { maxBytes: 20 * MB, maxFiles: 20, ext: ['pdf', 'csv', 'xlsx'] },
};
/** Files per upload request. */
export const MAX_HANDOVER_FILES_PER_UPLOAD = 10;
/** Most the backend accepts for a change request's reason. */
export const HANDOVER_REASON_MAX = 2000;

export const acceptOf = (type: HandoverAssetType) => HANDOVER_LIMITS[type].ext.map((e) => `.${e}`).join(',');

// ---------------------------------------------------------------------------
// API calls
// ---------------------------------------------------------------------------

const enc = encodeURIComponent;

export const handoverApi = {
  /**
   * GET /design-versions/{id}/handover-assets: package and status of the final version (anyone who sees the project).
   * Errors: 422 QUOTATION_NOT_ACCEPTED / FINAL_MILESTONE_NOT_FOUND, 404 DESIGN_VERSION_NOT_FOUND.
   */
  get: (versionId: string) => apiRequest<Handover>(`/design-versions/${enc(versionId)}/handover-assets`),

  /**
   * Lead adds files of one type (≤ 10 per request) while NOT_SUBMITTED or CHANGES_REQUESTED.
   * POST /design-versions/{id}/handover-assets, multipart `files` (repeated) + `assetType`.
   * Errors: 422 INVALID_ASSET_FILE / HANDOVER_ASSET_LIMIT_REACHED / INVALID_HANDOVER_STATUS, 403 NOT_PROJECT_DESIGNER.
   */
  upload(versionId: string, assetType: HandoverAssetType, files: readonly File[], onProgress?: (fraction: number) => void) {
    const form = new FormData();
    form.append('assetType', assetType);
    // the backend field is `files` (repeated), not `files[]`
    for (const file of files) form.append('files', file, file.name);
    return apiUpload<Handover>(`/design-versions/${enc(versionId)}/handover-assets`, form, onProgress);
  },

  /** Lead deletes one file (same statuses as upload). DELETE /design-assets/{id} → 204. */
  async remove(assetId: string): Promise<void> {
    await apiRequest<void>(`/design-assets/${enc(assetId)}`, { method: 'DELETE' });
  },

  /** GET /design-assets/{id}/file. The homeowner only after approving the package (403 DOWNLOAD_FORBIDDEN). */
  download: (asset: Pick<HandoverAsset, 'id' | 'fileName'>) =>
    // the server sends `filename*=UTF-8''…`, which downloadFile can't parse: use the name from the list
    downloadFile(`/design-assets/${enc(asset.id)}/file`, asset.fileName, { preferFallbackName: true }),

  /**
   * DXF of one floor of the final version. GET /design-versions/{id}/file?floorId=. Designers and admin always; the
   * homeowner and staff only after the package is approved (403 DOWNLOAD_FORBIDDEN).
   */
  downloadDxf: (versionId: string, floorId: string, fileName: string) =>
    downloadFile(`/design-versions/${enc(versionId)}/file?floorId=${enc(floorId)}`, fileName, { preferFallbackName: true }),

  /** Lead submits (≥ 1 render image, else 422 HANDOVER_INCOMPLETE): the milestone gets a review deadline, the homeowner an email. */
  submit: (versionId: string) => apiRequest<Handover>(`/design-versions/${enc(versionId)}/handover-submission`, { method: 'POST' }),

  /** Homeowner approves the submitted package: FINAL_PACKAGE → INVOICED, DXF and package downloadable. */
  approve: (versionId: string) => apiRequest<Handover>(`/design-versions/${enc(versionId)}/handover-approval`, { method: 'POST' }),

  /** Homeowner asks for changes to the submitted package; Lead fixes it and submits again. */
  requestChanges: (versionId: string, reason: string) =>
    apiRequest<Handover>(`/design-versions/${enc(versionId)}/handover-revision-requests`, { method: 'POST', body: JSON.stringify({ reason }) }),
};

// ---------------------------------------------------------------------------
// Rules shown in the UI (the backend checks them again)
// ---------------------------------------------------------------------------

/** First problem with the picked files, as a sentence; null when they can be sent. `existing` = files of that type already in the package. */
export function validateHandoverFiles(type: HandoverAssetType, files: readonly File[], existing: number): string | null {
  const limit = HANDOVER_LIMITS[type];
  const bad = files.find((f) => !limit.ext.includes(f.name.toLowerCase().split('.').pop() ?? ''));
  if (bad) return t('handover.errBadType', { name: bad.name, allowed: limit.ext.map((e) => `.${e}`).join(', ') });
  const big = files.find((f) => f.size === 0 || f.size > limit.maxBytes);
  if (big) return t('handover.errTooBig', { name: big.name, mb: limit.maxBytes / MB });
  if (files.length > MAX_HANDOVER_FILES_PER_UPLOAD) return t('handover.errPerUpload', { max: MAX_HANDOVER_FILES_PER_UPLOAD });
  if (existing + files.length > limit.maxFiles) return t('handover.errTooMany', { max: limit.maxFiles, left: Math.max(0, limit.maxFiles - existing) });
  return null;
}

/** "1.2 MB" / "350 KB". */
export function fileSize(bytes: string | number): string {
  const n = Number(bytes);
  if (n >= MB) return `${(n / MB).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(n / 1024))} KB`;
}

/** Lead edits the package only before submitting, or after the homeowner asks for changes. */
export const isEditable = (h: Pick<Handover, 'status' | 'milestone'>) =>
  h.milestone.status === 'PENDING' && (h.status === 'NOT_SUBMITTED' || h.status === 'CHANGES_REQUESTED');
