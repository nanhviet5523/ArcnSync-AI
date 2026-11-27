import { apiRequest } from '@/services/authService';
import type { AiQuota, AiSuggestedProduct } from './aiApi';

/**
 * AI product combos for the Products stage (RENDER_3D). Plain REST JSON: no SSE, no socket. Creating one runs RAG + an
 * LLM and can take tens of seconds. The backend never writes the result into the drawing: the page applies the chosen
 * option to the editor and the designer saves it the usual way.
 */
export type ComboVariant = 'BALANCED' | 'SAVING' | 'PREMIUM';

export interface AiRecommendationItem {
  productId: string;
  /** Name when suggested; still there once the product is no longer sold. */
  productName: string;
  /** Null: no longer sold, or the supplier stopped. */
  product: AiSuggestedProduct | null;
  available: boolean;
  /** VND string. */
  priceAtRecommend: string;
  /** VND string; null when no longer sold. */
  currentPrice: string | null;
  quantity: number;
  /** Items that get this product. */
  elementIds: string[];
}

export interface AiRecommendationCandidate {
  index: number;
  label: ComboVariant;
  items: AiRecommendationItem[];
  totalPrice: string;
  /** Null when a product is no longer sold. */
  currentTotalPrice: string | null;
  /** 0..1 */
  score: number;
  withinBudget: boolean;
  /** Written by the AI, in Vietnamese. */
  reason: string;
}

export interface AiRecommendation {
  id: string;
  projectId: string;
  designVersionId: string;
  type: 'PRODUCT_COMBO' | 'ALTERNATIVE_PRODUCT' | 'COST_OPTIMIZATION';
  /** Null: the LLM failed, the reasons are templated and the request was not counted. */
  generationId: string | null;
  roomId: string | null;
  note: string | null;
  includeChosen: boolean;
  designElementIds: string[];
  /** Items no product was found for. */
  unfilledElementIds: string[];
  /** projectRemaining can be negative. */
  budget: { scopeBudget: string; source: 'PROJECT' | 'REQUEST'; projectRemaining: string };
  /** Index 0 = the AI's best match. */
  candidates: AiRecommendationCandidate[];
  acceptedCandidateIndex: number | null;
  createdAt: string;
}

/** Exactly one of roomId / elementIds. */
export interface AiRecommendationRequest {
  roomId?: string;
  elementIds?: string[];
  includeChosen?: boolean;
  note?: string;
  /** VND > 0. Left out: the backend splits what is left of the project budget. */
  budgetMax?: string;
}

export interface AiRecommendationPage { items: AiRecommendation[]; page: number; limit: number; total: number }

export interface AiAcceptance {
  recommendation: AiRecommendation;
  selections: { elementId: string; productId: string }[];
  /** No longer sold: these products are not in `selections`. */
  unavailableProductIds: string[];
}

const enc = encodeURIComponent;

export const recommendationApi = {
  create: (versionId: string, body: AiRecommendationRequest) =>
    apiRequest<AiRecommendation & { quota: AiQuota }>(`/design-versions/${enc(versionId)}/ai-recommendations`, { method: 'POST', body: JSON.stringify(body) }),
  list: (versionId: string, page = 1, limit = 10) =>
    apiRequest<AiRecommendationPage>(`/design-versions/${enc(versionId)}/ai-recommendations?page=${page}&limit=${limit}`),
  /** Current prices are read again from the catalog on every call. */
  get: (id: string) => apiRequest<AiRecommendation>(`/ai-recommendations/${enc(id)}`),
  accept: (id: string, candidateIndex: number) =>
    apiRequest<AiAcceptance>(`/ai-recommendations/${enc(id)}/acceptance`, { method: 'POST', body: JSON.stringify({ candidateIndex }) }),
};
