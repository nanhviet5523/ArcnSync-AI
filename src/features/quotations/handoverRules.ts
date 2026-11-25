// No '@/' imports here: unit-tested with node --test (handoverRules.test.ts).
import type { MilestoneStatus } from '../projects/services/contractsApi';
import type { HandoverAssetType, HandoverStatus } from './handoverApi';

/**
 * Submit & upload gates (backend PREVIOUS_MILESTONE_UNPAID): the previous stage's milestone must be paid. A stage missing
 * from the contract or CANCELLED does not block. Undefined = unknown (contract not read): left to the backend.
 */
export const milestoneClear = (status?: MilestoneStatus | null) => !status || status === 'PAID' || status === 'CANCELLED';

/**
 * Download gates check exactly PAID (backend isPaid(), else 403 DOWNLOAD_FORBIDDEN reason PAYMENT_REQUIRED):
 * unlike the submit gates, a CANCELLED milestone still blocks.
 */
export const canHomeownerDownload = (handover: HandoverStatus, milestone: MilestoneStatus) =>
  handover === 'APPROVED' && milestone === 'PAID';

/**
 * Preview route (GET /design-assets/:id/preview):
 * - DOCUMENT never has a preview (backend returns 404 PREVIEW_NOT_AVAILABLE).
 * - Homeowner previews RENDER_IMAGE / MODEL_3D once SUBMITTED or APPROVED (no need to pay FINAL_PACKAGE).
 * - Non-homeowner roles (designer, staff, admin) can always preview RENDER_IMAGE / MODEL_3D.
 */
export const canPreview = (role: string, handoverStatus: HandoverStatus, assetType: HandoverAssetType): boolean => {
  if (assetType === 'DOCUMENT') return false;
  if (role === 'homeowner') return handoverStatus === 'SUBMITTED' || handoverStatus === 'APPROVED';
  return true;
};

/** Handover DXF: once approved. Homeowner and staff also need the FINAL_PACKAGE milestone PAID; designer and admin don't. */
export const canSeeDxf = (role: string, handover: HandoverStatus, milestone: MilestoneStatus) =>
  handover === 'APPROVED' && (role === 'homeowner' || role === 'staff' ? milestone === 'PAID' : true);

export type HandoverSubmitBlock = 'uploading' | 'needRender' | 'awaitingRender3dPayment';

/** Why the Lead can't submit the package yet, or null. render3d: status of the RENDER_3D milestone (undefined = unknown). */
export function submitHandoverBlock({ renders, uploading, render3d }: { renders: number; uploading: boolean; render3d?: MilestoneStatus | null }): HandoverSubmitBlock | null {
  if (uploading) return 'uploading';
  if (!milestoneClear(render3d)) return 'awaitingRender3dPayment';
  if (renders === 0) return 'needRender';
  return null;
}
