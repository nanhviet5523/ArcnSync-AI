import { ApiError, apiRequest } from '@/services/authService';

export interface DesignStyle {
  id: string;
  code: string;
  name: string;
  description: string;
  imageUrl: string;
  isActive: boolean;
}

export interface CreateDesignStylePayload {
  code: string;
  name: string;
  description: string;
  imageUrl: string;
  isActive: boolean;
}

export type UpdateDesignStylePayload = Partial<Omit<CreateDesignStylePayload, 'code'>>;

interface ApiEnvelope<T> { data?: T }

function unwrap<T>(value: T | ApiEnvelope<T>): T {
  return value && typeof value === 'object' && 'data' in value && value.data !== undefined
    ? value.data
    : value as T;
}

function normalizeDesignStyle(value: unknown): DesignStyle | null {
  if (!value || typeof value !== 'object') return null;
  const style = value as Partial<Record<keyof DesignStyle, unknown>>;
  const id = style.id;
  if ((typeof id !== 'string' && typeof id !== 'number')
    || typeof style.code !== 'string'
    || typeof style.name !== 'string'
    || (typeof style.description !== 'string' && style.description !== null && style.description !== undefined)
    || (typeof style.imageUrl !== 'string' && style.imageUrl !== null && style.imageUrl !== undefined)
    || typeof style.isActive !== 'boolean') return null;

  return {
    id: String(id),
    code: style.code,
    name: style.name,
    description: style.description ?? '',
    imageUrl: style.imageUrl ?? '',
    isActive: style.isActive,
  };
}

function normalizeList(response: unknown): DesignStyle[] {
  const payload = unwrap(response as unknown[] | ApiEnvelope<unknown[]>);
  if (!Array.isArray(payload)) {
    throw new ApiError('The design styles API returned an unexpected response format.');
  }
  const styles = payload.map(normalizeDesignStyle);
  if (styles.some((style) => style === null)) {
    throw new ApiError('The design styles API returned an unexpected response format.');
  }
  return styles as DesignStyle[];
}

function normalizeStyle(response: unknown): DesignStyle {
  const payload = unwrap(response as unknown | ApiEnvelope<unknown>);
  const style = normalizeDesignStyle(payload);
  if (!style) {
    throw new ApiError('The design style API returned an unexpected response format.');
  }
  return style;
}

export const designStyleService = {
  async getAll(isActive?: boolean): Promise<DesignStyle[]> {
    const query = isActive === undefined ? '' : `?isActive=${String(isActive)}`;
    return normalizeList(await apiRequest<unknown>(`/design-styles${query}`));
  },

  async getById(id: string): Promise<DesignStyle> {
    return normalizeStyle(await apiRequest<unknown>(`/design-styles/${encodeURIComponent(id)}`));
  },

  async create(payload: CreateDesignStylePayload): Promise<DesignStyle> {
    return normalizeStyle(await apiRequest<unknown>('/admin/design-styles', {
      method: 'POST',
      body: JSON.stringify(payload),
    }));
  },

  async update(id: string, payload: UpdateDesignStylePayload): Promise<DesignStyle> {
    return normalizeStyle(await apiRequest<unknown>(`/admin/design-styles/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }));
  },
};
