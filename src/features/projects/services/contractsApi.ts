import { t } from '@/i18n';
import { ApiError, apiFetch, apiRequest } from '@/services/authService';

// ---------------------------------------------------------------------------
// Types — mirror the backend DTOs (Swagger: POST /projects/{projectId}/contract)
// ---------------------------------------------------------------------------

/** Payment stages. The first milestone (seqNo 1) is always DEPOSIT. */
export type StageType = 'DEPOSIT' | 'LAYOUT_2D' | 'RENDER_3D' | 'FINAL_PACKAGE';

/** DEPOSIT → ON_CONTRACT_ACTIVE; every other stage → ON_STAGE_APPROVED. */
export type DueTrigger = 'ON_CONTRACT_ACTIVE' | 'ON_STAGE_APPROVED';

export interface PaymentMilestoneInput {
  /** Sequential from 1 (1 = DEPOSIT), 1..4. */
  seqNo: number;
  name: string;
  stageType: StageType;
  /** VND as a decimal string, e.g. "15000000". Must be > 0. */
  amount: string;
  dueTrigger: DueTrigger;
}

/** Name used by the backend DTO for one payment milestone of POST /projects/{projectId}/contract. */
export type CreateContractMilestonePayload = PaymentMilestoneInput;

export interface CreateContractPayload {
  /** VND as a decimal string; must equal the sum of all milestone amounts. */
  totalDesignFee: string;
  /** Max revision requests per stage, 0..20. */
  maxRevisionsPerStage: number;
  /** Days the customer has to review each submission, 1..60. */
  reviewWindowDays: number;
  /** Max 5000 characters. */
  note?: string;
  /** 1..4 milestones, seqNo consecutive from 1. */
  milestones: CreateContractMilestonePayload[];
}

export type ContractStatus = 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
export type EsignStatus = 'NOT_SENT' | 'AWAITING_CUSTOMER' | 'SIGNED';
export type MilestoneStatus = 'PENDING' | 'INVOICED' | 'PAID' | 'OVERDUE' | 'CANCELLED';

export interface PaymentMilestoneResponse {
  id: string;
  seqNo: number;
  name: string;
  stageType: StageType;
  /** VND, string với 2 chữ số thập phân, vd "15000000.00". */
  amount: string;
  dueTrigger: DueTrigger;
  status: MilestoneStatus;
  approvedVersionId: string | null;
  reviewDeadline: string | null;
  autoApproved: boolean;
  approvedAt: string | null;
  invoicedAt: string | null;
  /** `YYYY-MM-DD`. */
  dueDate: string | null;
  paidAt: string | null;
}

/** PDF hợp đồng chưa ký mà Staff đã upload. */
export interface UnsignedContractFileInfo {
  /** SHA-256 (hex) của file, dùng để phát hiện file bị thay đổi. */
  hash: string;
  fileName: string;
}

/** PDF hợp đồng đã ký, do hệ thống sinh ra. */
export interface ContractFileInfo {
  fileName: string;
}

/** Chữ ký điện tử của customer. */
export interface ContractSignatureResponse {
  signerId: string;
  signerName: string;
  signerEmail: string;
  /** SHA-256 (hex) của PDF chưa ký tại thời điểm ký. */
  documentHash: string;
  ipAddress: string | null;
  signedAt: string;
}

export interface ContractResponse {
  id: string;
  projectId: string;
  /** Dạng `HD-YYMMDD-XXXX`. */
  contractNo: string;
  /** VND, string với 2 chữ số thập phân. */
  totalDesignFee: string;
  maxRevisionsPerStage: number;
  reviewWindowDays: number;
  status: ContractStatus;
  esignStatus: EsignStatus;
  note: string | null;
  /** null = Staff chưa upload PDF chưa ký. */
  unsignedFile: UnsignedContractFileInfo | null;
  /** null = customer chưa ký xong. */
  signedFile: ContractFileInfo | null;
  /** `YYYY-MM-DD` (giờ Việt Nam). */
  signedDate: string | null;
  createdById: string;
  esignSentAt: string | null;
  esignCompletedAt: string | null;
  activatedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  createdAt: string;
  updatedAt: string;
  /** null = customer chưa ký. */
  signature: ContractSignatureResponse | null;
  /** Theo `seqNo` tăng dần. */
  milestones: PaymentMilestoneResponse[];
}

// ---------------------------------------------------------------------------
// Client-side validation — catch the two most common 4xx before hitting the API
// ---------------------------------------------------------------------------

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** True when `projectId` is a standard UUID (backend returns 400 "uuid is expected" otherwise). */
export function isUuid(value: string): boolean {
  return UUID_RE.test(value.trim());
}

/**
 * Convert a VND decimal string to minor units (×100) as a BigInt, so large
 * amounts compare exactly without floating-point rounding. Returns null when
 * the string is not a valid non-negative number.
 */
function toMinorUnits(amount: string): bigint | null {
  const trimmed = amount.trim();
  if (!/^\d+(\.\d+)?$/.test(trimmed)) return null;
  const [whole, fraction = ''] = trimmed.split('.');
  const cents = (fraction + '00').slice(0, 2);
  try {
    return BigInt(whole) * 100n + BigInt(cents);
  } catch {
    return null;
  }
}

export interface ContractValidationError {
  code: 'INVALID_PROJECT_ID' | 'MILESTONE_TOTAL_MISMATCH' | 'EMPTY_MILESTONES';
  message: string;
}

/**
 * Validate a draft before submitting. Returns the first problem found, or null
 * when the payload is safe to send. Mirrors the backend's MILESTONE_TOTAL_MISMATCH
 * (422) rule: the sum of milestone amounts must equal totalDesignFee exactly.
 */
export function validateContractDraft(
  projectId: string,
  payload: CreateContractPayload,
): ContractValidationError | null {
  if (!isUuid(projectId)) {
    return { code: 'INVALID_PROJECT_ID', message: 'Mã dự án không hợp lệ (phải là UUID chuẩn).' };
  }

  if (payload.milestones.length === 0) {
    return { code: 'EMPTY_MILESTONES', message: 'Hợp đồng cần ít nhất một đợt thanh toán.' };
  }

  const total = toMinorUnits(payload.totalDesignFee);
  if (total === null) {
    return { code: 'MILESTONE_TOTAL_MISMATCH', message: 'Tổng phí thiết kế không hợp lệ.' };
  }

  let sum = 0n;
  for (const milestone of payload.milestones) {
    const amount = toMinorUnits(milestone.amount);
    if (amount === null) {
      return { code: 'MILESTONE_TOTAL_MISMATCH', message: `Số tiền đợt "${milestone.name}" không hợp lệ.` };
    }
    sum += amount;
  }

  if (sum !== total) {
    return {
      code: 'MILESTONE_TOTAL_MISMATCH',
      message: 'Tổng số tiền các đợt thanh toán phải bằng đúng phí thiết kế.',
    };
  }

  return null;
}

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

const VND_FORMATTER = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 });

/**
 * Format a VND decimal string (or number) for display, e.g. "50000000.00" or
 * "50000000" → "50,000,000 VNĐ". Non-numeric input is returned as-is.
 */
export function formatVnd(amount: string | number): string {
  const value = typeof amount === 'number' ? amount : Number(amount);
  if (Number.isNaN(value)) return String(amount);
  return `${VND_FORMATTER.format(value)} VNĐ`;
}

// ---------------------------------------------------------------------------
// API calls
// ---------------------------------------------------------------------------

/**
 * Create a project's contract and its payment schedule.
 * POST /projects/{projectId}/contract — returns the created contract (201).
 *
 * Runs {@link validateContractDraft} first and throws a 422 {@link ApiError}
 * (code MILESTONE_TOTAL_MISMATCH / INVALID_PROJECT_ID) on failure, so callers
 * can read `err.message` the same way for client- and server-side errors.
 */
export function createProjectContract(
  projectId: string,
  payload: CreateContractPayload,
): Promise<ContractResponse> {
  const problem = validateContractDraft(projectId, payload);
  if (problem) {
    const status = problem.code === 'INVALID_PROJECT_ID' ? 400 : 422;
    return Promise.reject(new ApiError(problem.message, status, [problem.message], {}, problem.code));
  }

  return createContract(projectId, payload);
}

/**
 * POST /projects/{projectId}/contract without client-side checks: the caller validates.
 * Errors: 400 VALIDATION_ERROR (details.fields), 403 NOT_PROJECT_STAFF, 404 PROJECT_NOT_FOUND,
 * 409 CONTRACT_ALREADY_EXISTS / CONTRACT_NO_GENERATION_FAILED, 422 INVALID_MILESTONES /
 * MILESTONE_TOTAL_MISMATCH (details.milestonesTotal, details.totalDesignFee) / INVALID_PROJECT_STATUS_TRANSITION.
 */
export function createContract(projectId: string, payload: CreateContractPayload): Promise<ContractResponse> {
  return apiRequest<ContractResponse>(`/projects/${encodeURIComponent(projectId)}/contract`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/**
 * Fetch a project's contract. GET /projects/{projectId}/contract.
 *
 * Returns `null` on a 404 (backend code CONTRACT_NOT_FOUND) instead of
 * throwing, so the UI can treat "no contract yet" as a normal state rather
 * than a system error. Any other failure (network, 401/403, 500…) still
 * throws the {@link ApiError} as usual.
 */
export async function getProjectContract(projectId: string): Promise<ContractResponse | null> {
  try {
    return await apiRequest<ContractResponse>(`/projects/${encodeURIComponent(projectId)}/contract`);
  } catch (err) {
    // Only CONTRACT_NOT_FOUND means "no contract yet"; PROJECT_NOT_FOUND and other failures must surface.
    if (err instanceof ApiError && err.status === 404 && err.code === 'CONTRACT_NOT_FOUND') return null;
    throw err;
  }
}

/** GET /contracts/{id}. Each milestone also carries id/status/dates: strip them before sending an update. */
export function getContract(contractId: string): Promise<ContractResponse> {
  return apiRequest<ContractResponse>(`/contracts/${encodeURIComponent(contractId)}`);
}

/**
 * GET /contracts/{id}. Same shape as {@link getProjectContract}. Returns `null` on 404 CONTRACT_NOT_FOUND
 * (unknown id, no access, or a customer asking for a contract that is still NOT_SENT) so the UI shows
 * an empty state instead of an error. Other failures throw: 403 INSUFFICIENT_ROLE, 400 BAD_REQUEST.
 */
export async function getContractById(contractId: string): Promise<ContractResponse | null> {
  try {
    return await getContract(contractId);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404 && err.code === 'CONTRACT_NOT_FOUND') return null;
    throw err;
  }
}

/** Every field is optional: what is left out stays unchanged. `milestones` present replaces the whole schedule. */
export interface UpdateContractPayload {
  /** VND string, > 0. Never null. */
  totalDesignFee?: string;
  /** 0..20. Never null. */
  maxRevisionsPerStage?: number;
  /** 1..60. Never null. */
  reviewWindowDays?: number;
  /** Max 5000 chars; null clears the note. */
  note?: string | null;
  /** 1..4 items with exactly the five whitelisted fields. */
  milestones?: PaymentMilestoneInput[];
}

/**
 * Staff edits the contract. PATCH /contracts/{id}. Only while status DRAFT and esignStatus NOT_SENT.
 * The body is rebuilt from the whitelisted fields (the backend rejects unknown ones, e.g. a milestone's id/status).
 * Errors: 400 VALIDATION_ERROR, 403 NOT_PROJECT_STAFF, 404 CONTRACT_NOT_FOUND, 422 CONTRACT_NOT_EDITABLE /
 * INVALID_MILESTONES / MILESTONE_TOTAL_MISMATCH (details.milestonesTotal, details.totalDesignFee).
 */
export function updateContract(contractId: string, payload: UpdateContractPayload): Promise<ContractResponse> {
  const body: UpdateContractPayload = {
    ...(payload.totalDesignFee !== undefined ? { totalDesignFee: payload.totalDesignFee } : {}),
    ...(payload.maxRevisionsPerStage !== undefined ? { maxRevisionsPerStage: payload.maxRevisionsPerStage } : {}),
    ...(payload.reviewWindowDays !== undefined ? { reviewWindowDays: payload.reviewWindowDays } : {}),
    ...(payload.note !== undefined ? { note: payload.note } : {}),
    ...(payload.milestones ? {
      milestones: payload.milestones.map((m): PaymentMilestoneInput => ({
        seqNo: m.seqNo, name: m.name, stageType: m.stageType, amount: m.amount, dueTrigger: m.dueTrigger,
      })),
    } : {}),
  };
  return apiRequest<ContractResponse>(`/contracts/${encodeURIComponent(contractId)}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

/** PATCH /contracts/{id}: returns the updated contract, so callers can use it without a second GET. */
export const updateContractDraft = updateContract;

/**
 * Staff sends the signing request to the customer. POST /contracts/{id}/signing-request, no body.
 * NOT_SENT → AWAITING_CUSTOMER (response carries esignSentAt).
 * Errors: 403 NOT_PROJECT_STAFF, 404 CONTRACT_NOT_FOUND, 422 CONTRACT_FILE_MISSING / INVALID_MILESTONES /
 * MILESTONE_TOTAL_MISMATCH (details.milestonesTotal, details.totalDesignFee) / CONTRACT_NOT_DRAFT /
 * INVALID_ESIGN_STATUS_TRANSITION.
 */
export function sendSigningRequest(contractId: string): Promise<ContractResponse> {
  return apiRequest<ContractResponse>(`/contracts/${encodeURIComponent(contractId)}/signing-request`, {
    method: 'POST',
  });
}

/**
 * Staff rút lại yêu cầu ký khi customer chưa ký. DELETE /contracts/{id}/signing-request.
 * AWAITING_CUSTOMER → NOT_SENT.
 */
export async function withdrawContractSigning(contractId: string): Promise<void> {
  await apiRequest<void>(`/contracts/${encodeURIComponent(contractId)}/signing-request`, {
    method: 'DELETE',
  });
}

/** DELETE /contracts/{id}/signing-request: 204 No Content, no body is parsed. */
export const withdrawSigningRequest: (contractId: string) => Promise<void> = withdrawContractSigning;

export interface RequestSignatureOtpResponse {
  /** How long the emailed OTP stays valid (backend default 15). */
  expiresInMinutes: number;
}
export type RequestOtpResponse = RequestSignatureOtpResponse;

/**
 * Customer asks for a signing OTP by email. POST /contracts/{id}/signature-otps, no body.
 * Errors: 400/422 CONTRACT_NOT_AWAITING_SIGNATURE, 403 (not the project's customer), 404 CONTRACT_NOT_FOUND /
 * USER_NOT_FOUND, 429 OTP_RESEND_TOO_SOON (details.retryAfterSeconds), 500 when the email can't be sent.
 */
export function requestSignatureOtp(contractId: string): Promise<RequestSignatureOtpResponse> {
  return apiRequest<RequestSignatureOtpResponse>(`/contracts/${encodeURIComponent(contractId)}/signature-otps`, {
    method: 'POST',
  });
}

/**
 * Customer ký hợp đồng bằng OTP 6 số. POST /contracts/{id}/signatures.
 * esignStatus → SIGNED. 422 nếu OTP sai (OTP_INVALID) hoặc file bị thay đổi
 * (CONTRACT_FILE_TAMPERED).
 */
export function signContract(contractId: string, otp: string): Promise<ContractResponse> {
  return apiRequest<ContractResponse>(`/contracts/${encodeURIComponent(contractId)}/signatures`, {
    method: 'POST',
    body: JSON.stringify({ otp }),
  });
}

export interface SubmitSignaturePayload {
  /** Exactly 6 digits, kept as a string to preserve leading zeros. */
  otp: string;
}

/** POST /contracts/{id}/signatures (201): the contract comes back ACTIVE + SIGNED, deposit INVOICED. */
export function submitContractSignature(contractId: string, payload: SubmitSignaturePayload): Promise<ContractResponse> {
  return signContract(contractId, payload.otp);
}

/** Largest PDF the backend accepts for PUT /contracts/{id}/file. */
export const CONTRACT_FILE_MAX_BYTES = 20 * 1024 * 1024;

/**
 * Staff uploads the unsigned contract PDF (already signed by the company). PUT /contracts/{id}/file.
 * Only while status DRAFT and esignStatus NOT_SENT. Multipart with the single key `file`; no Content-Type
 * is set here so the browser adds the multipart boundary (apiRequest skips JSON headers for FormData).
 * Errors: 400 VALIDATION_ERROR, 403 NOT_PROJECT_STAFF, 404 CONTRACT_NOT_FOUND, 422 CONTRACT_NOT_EDITABLE, 422 INVALID_PDF_FILE.
 */
export function uploadContractFile(contractId: string, file: File): Promise<ContractResponse> {
  const form = new FormData();
  form.append('file', file);
  return apiRequest<ContractResponse>(`/contracts/${encodeURIComponent(contractId)}/file`, {
    method: 'PUT',
    body: form,
  });
}

/** The error body of a failed blob request is JSON ({ code, message }): read it as text and parse. */
export async function parseBlobError(blob: Blob): Promise<{ code: string; message: string }> {
  try {
    const data = JSON.parse(await blob.text()) as { code?: unknown; message?: unknown };
    const message = Array.isArray(data.message) ? String(data.message[0] ?? '') : String(data.message ?? '');
    return { code: typeof data.code === 'string' ? data.code : '', message };
  } catch {
    return { code: '', message: '' };
  }
}

/** Branch on `code`, not status: the two 404s mean different things. */
async function fileError(response: Response): Promise<ApiError> {
  const { code, message } = await parseBlobError(await response.blob());
  const text =
    code === 'CONTRACT_FILE_NOT_FOUND' ? t('contractPage.fileNotFound')
      : code === 'CONTRACT_NOT_FOUND' ? t('contractPage.fileContractNotFound')
        : code === 'INSUFFICIENT_ROLE' || response.status === 403 ? t('contractPage.fileNoPermission')
          : code === 'BAD_REQUEST' ? t('contractPage.invalidContractId')
            : (message || t('contractPage.fileLoadFailed'));
  return new ApiError(text, response.status, [], {}, code);
}

/** GET /contracts/{id}/file as a Blob (application/pdf), sent with the Bearer token. */
export async function getContractFileBlob(contractId: string): Promise<Blob> {
  const response = await apiFetch(`/contracts/${encodeURIComponent(contractId)}/file`);
  if (!response.ok) throw await fileError(response);
  return response.blob();
}

/**
 * Tải PDF hợp đồng: bản đã ký nếu có, chưa thì bản chưa ký.
 * GET /contracts/{id}/file. 404 nếu chưa có file nào (CONTRACT_FILE_NOT_FOUND).
 * Dùng `apiFetch` thay vì `apiRequest` vì response là file nhị phân, không phải JSON.
 */
export async function downloadContractFile(
  contractId: string,
  fallbackFileName = 'hop-dong.pdf',
): Promise<{ blob: Blob; fileName: string }> {
  const response = await apiFetch(`/contracts/${encodeURIComponent(contractId)}/file`);

  if (!response.ok) throw await fileError(response);

  const disposition = response.headers.get('Content-Disposition') ?? '';
  const match = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(disposition);
  const fileName = match ? decodeURIComponent(match[1]) : fallbackFileName;

  return { blob: await response.blob(), fileName };
}

/** GET /contracts/{id}/file (Bearer JWT; CUSTOMER, STAFF, ADMIN, DESIGNER). Resolves with the PDF blob. */
export const getContractFile = downloadContractFile;

/** Trigger a browser save-as for a blob fetched via {@link downloadContractFile}. */
export function saveBlobAs(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Some browsers have not started the download yet right after click(): revoke later.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
