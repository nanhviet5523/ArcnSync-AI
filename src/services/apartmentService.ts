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
  area: string | number;
  purpose: string;
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

export interface ApartmentPayload {
  propertyType: PropertyType;
  buildingName: string;
  address: string;
  tower?: string;
  unitNo: string;
  floorNo?: number;
  layoutCode?: string;
  netArea: number;
  bedroomCount: number;
  bathroomCount: number;
}

/** PATCH /apartments/{id}: leave a field out to keep it; null clears tower, floorNo or layoutCode; never send "". */
export type ApartmentPatch = Partial<Omit<ApartmentPayload, 'tower' | 'floorNo' | 'layoutCode'>> & {
  tower?: string | null;
  floorNo?: number | null;
  layoutCode?: string | null;
};

export interface CreateApartmentPayload extends ApartmentPayload {
  ownerEmail?: string;
}

export interface CreateRoomPayload {
  name: string;
  roomType: string;
  /** Omitted: the backend uses the lowest floor of the property. */
  floorId?: string;
  area?: number;
  purpose?: string;
}

const queryString = (values: Record<string, string | number | undefined>) => {
  const query = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => {
    if (value !== undefined && value !== '') query.set(key, String(value));
  });
  const serialized = query.toString();
  return serialized ? `?${serialized}` : '';
};

export const apartmentService = {
  list(params: { q?: string; ownerId?: string; page?: number; limit?: number } = {}) {
    return apiRequest<ApartmentPage>(`/apartments${queryString({ page: 1, limit: 20, ...params })}`);
  },
  get(id: string) {
    return apiRequest<Apartment>(`/apartments/${encodeURIComponent(id)}`);
  },
  create(payload: CreateApartmentPayload) {
    return apiRequest<Apartment>('/apartments', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  update(id: string, payload: ApartmentPatch) {
    return apiRequest<Apartment>(`/apartments/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },
  listFloors(apartmentId: string) {
    return apiRequest<ApartmentFloor[]>(`/apartments/${encodeURIComponent(apartmentId)}/floors`);
  },
  listRooms(apartmentId: string) {
    return apiRequest<ApartmentRoom[]>(`/apartments/${encodeURIComponent(apartmentId)}/rooms`);
  },
  createRoom(apartmentId: string, payload: CreateRoomPayload) {
    return apiRequest<ApartmentRoom>(`/apartments/${encodeURIComponent(apartmentId)}/rooms`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
};
