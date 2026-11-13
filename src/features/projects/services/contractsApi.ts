import { ApiError, apiRequest } from '@/services/authService';

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

export type ContractStatus = 'ACTIVE' | 'DRAFT' | 'COMPLETED' | 'CANCELLED';
export type EsignStatus = 'NOT_SENT' | 'AWAITING_CUSTOMER' | 'SIGNED';
export type MilestoneStatus = 'CANCELLED' | 'PENDING' | 'INVOICED' | 'PAID' | 'OVERDUE';

export interface PaymentMilestoneResponse {
  id: string;
  seqNo: number;
  name: string;
  stageType: StageType;
  amount: string;
  dueTrigger: DueTrigger;
  status: MilestoneStatus;
  approvedVersionId: string | null;
  reviewDeadline: string | null;
  autoApproved: boolean;
  approvedAt: string | null;
  invoicedAt: string | null;
  dueDate: string | null;
  paidAt: string | null;
}

export interface ContractResponse {
  id: string;
  projectId: string;
  contractNo: string;
  totalDesignFee: string;
  maxRevisionsPerStage: number;
  reviewWindowDays: number;
  status: ContractStatus;
  esignStatus: EsignStatus;
  note: string | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
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
// API call
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
