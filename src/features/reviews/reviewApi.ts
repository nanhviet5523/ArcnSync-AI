import { apiRequest } from '@/services/authService';

export interface ProjectReview {
  id: string;
  projectId: string;
  /** Only on the list (GET /project-reviews). */
  project: { id: string; code: string; title: string } | null;
  customer: { id: string; fullName: string } | null;
  /** Lead designer when the review was written. */
  designer: { id: string; fullName: string } | null;
  overallRating: number;
  designRating: number;
  communicationRating: number;
  wouldRecommend: boolean;
  comment: string | null;
  createdAt: string;
  updatedAt: string;
  editableUntil: string;
}

export interface ReviewSummary {
  count: number;
  averageOverall: string | null;
  averageDesign: string | null;
  averageCommunication: string | null;
  recommendPercent: string | null;
  distribution: Record<'1' | '2' | '3' | '4' | '5', number>;
}

export interface ReviewInput {
  overallRating: number;
  designRating: number;
  communicationRating: number;
  wouldRecommend: boolean;
  comment: string | null;
}

const json = (method: string, body: unknown): RequestInit => ({ method, body: JSON.stringify(body) });

export const reviewApi = {
  /** 404 REVIEW_NOT_FOUND when the homeowner hasn't reviewed yet. */
  get: (projectId: string) => apiRequest<ProjectReview>(`/projects/${projectId}/review`),
  create: (projectId: string, input: ReviewInput) =>
    apiRequest<ProjectReview>(`/projects/${projectId}/review`, json('POST', { ...input, comment: input.comment || undefined })),
  update: (projectId: string, input: ReviewInput) => apiRequest<ProjectReview>(`/projects/${projectId}/review`, json('PATCH', input)),
  /** Admin: every review; staff: projects they manage; designer: projects they led. */
  list: (q: { rating?: number } = {}) =>
    apiRequest<{ items: ProjectReview[]; total: number; summary: ReviewSummary }>(`/project-reviews?limit=100${q.rating ? `&rating=${q.rating}` : ''}`),
};

export const isNotFound = (e: unknown) => (e as { status?: number })?.status === 404;
