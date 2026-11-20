import { apiRequest } from '@/services/authService';

export type PropertyType = 'APARTMENT' | 'HOUSE';

export interface ApartmentOwner {
  id: string;
  fullName: string;
  email: string;
}

export interface ApartmentFloor {
  id: string;
  level: number;
  name: string;
  floorHeightMm: number;
}

export interface ApartmentRoom {
  id: string;
  floorId: string;
  name: string;
  roomType: string;
  /** m², string with 2 decimals; null = not measured */
  area: string | null;
  purpose: string | null;
}

export interface Apartment {
  id: string;
  propertyType: PropertyType;
  buildingName: string;
  address: string;
  tower: string | null;
  unitNo: string;
  floorNo: number | null;
  layoutCode: string | null;
  netArea: string | number;
  bedroomCount: number;
  bathroomCount: number;
  owner: ApartmentOwner;
  floors: ApartmentFloor[];
  createdAt: string;
  updatedAt: string;
}

export interface ApartmentPage {
  items: Apartment[];
  page: number;
  limit: number;
  total: number;
}

const queryString = (values: Record<string, string | number | undefined>) => {
  const query = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => {
    if (value !== undefined && value !== '') query.set(key, String(value));
  });
  const serialized = query.toString();
  return serialized ? `?${serialized}` : '';
};

/**
 * Read-only: backend v13 has no POST /apartments, PATCH /apartments/:id or POST /apartments/:id/rooms any more.
 * An apartment, its floors and rooms are created (or updated) when the homeowner confirms a site survey
 * (see features/site-surveys).
 */
export const apartmentService = {
  list(params: { q?: string; ownerId?: string; page?: number; limit?: number } = {}) {
    return apiRequest<ApartmentPage>(`/apartments${queryString({ page: 1, limit: 20, ...params })}`);
  },
  get(id: string) {
    return apiRequest<Apartment>(`/apartments/${encodeURIComponent(id)}`);
  },
  listFloors(apartmentId: string) {
    return apiRequest<ApartmentFloor[]>(`/apartments/${encodeURIComponent(apartmentId)}/floors`);
  },
  listRooms(apartmentId: string) {
    return apiRequest<ApartmentRoom[]>(`/apartments/${encodeURIComponent(apartmentId)}/rooms`);
  },
};
