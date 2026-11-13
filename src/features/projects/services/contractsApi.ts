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

export interface CreateContractPayload {
  /** VND as a decimal string; must equal the sum of all milestone amounts. */
  totalDesignFee: string;
  /** Max revision requests per stage, 0..20. */
  maxRevisionsPerStage: number;
  /** Days the customer has to review each submission, 1..60. */
  reviewWindowDays: number;
  note?: string;
  milestones: PaymentMilestoneInput[];
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
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}

/**
 * Staff gửi yêu cầu ký cho customer. POST /contracts/{id}/signing-request.
 * NOT_SENT → AWAITING_CUSTOMER. 422 nếu chưa upload PDF hoặc tổng các đợt
 * chưa khớp phí thiết kế (CONTRACT_FILE_MISSING / MILESTONE_TOTAL_MISMATCH).
 */
export function requestContractSigning(contractId: string): Promise<ContractResponse> {
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

/**
 * Customer yêu cầu gửi OTP ký qua email. POST /contracts/{id}/signature-otps.
 * 429 nếu gửi lại quá sớm (OTP_RESEND_TOO_SOON).
 */
export function sendContractSignatureOtp(contractId: string): Promise<{ expiresInMinutes: number }> {
  return apiRequest<{ expiresInMinutes: number }>(`/contracts/${encodeURIComponent(contractId)}/signature-otps`, {
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

/**
 * Staff kích hoạt hợp đồng đã ký. POST /contracts/{id}/activation.
 * DRAFT → ACTIVE, đợt DEPOSIT chuyển sang INVOICED. 422 nếu chưa ký
 * (CONTRACT_NOT_SIGNED).
 */
export function activateContract(contractId: string): Promise<ContractResponse> {
  return apiRequest<ContractResponse>(`/contracts/${encodeURIComponent(contractId)}/activation`, {
    method: 'POST',
  });
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

  if (!response.ok) {
    const status = response.status;
    throw new ApiError(
      status === 404 ? 'Hợp đồng chưa có file PDF.' : `Không tải được file (${status}).`,
      status,
    );
  }

  const disposition = response.headers.get('Content-Disposition') ?? '';
  const match = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(disposition);
  const fileName = match ? decodeURIComponent(match[1]) : fallbackFileName;

  return { blob: await response.blob(), fileName };
}

/** Trigger a browser save-as for a blob fetched via {@link downloadContractFile}. */
export function saveBlobAs(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
