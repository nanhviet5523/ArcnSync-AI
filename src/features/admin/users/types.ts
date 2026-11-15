export type ApiUserRole = 'CUSTOMER' | 'DESIGNER' | 'STAFF' | 'SUPPLIER' | 'ADMIN';
export type ApiUserStatus = 'ACTIVE' | 'INACTIVE' | 'LOCKED' | 'INVITED';

export interface ApiUser {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  // Kept as string so values the BE adds later still render instead of breaking the table.
  role: ApiUserRole | (string & {});
  status: ApiUserStatus | (string & {});
  activatedAt: string | null;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface UsersListResponse {
  items: ApiUser[];
  page: number;
  limit: number;
  total: number;
}

export interface UsersQuery {
  page: number;
  limit: number;
  q?: string;
  role?: string;
  status?: string;
}

export type CreatableRole = 'STAFF' | 'DESIGNER' | 'SUPPLIER';

export interface DesignerProfileInput {
  employeeCode: string;
  title: string;
  specialization: string;
  yearsOfExperience: number;
  bio?: string;
}

export interface SupplierProfileInput {
  companyName: string;
  taxCode: string;
  businessAddress: string;
  contactName: string;
  contactPhone: string;
  website?: string;
  partnerSince?: string; // YYYY-MM-DD
}

export interface CreateUserPayload {
  email: string;
  fullName: string;
  phone: string;
  role: CreatableRole;
  designerProfile?: DesignerProfileInput;
  supplierProfile?: SupplierProfileInput;
}

export interface CreateUserResponse {
  message: string;
  user: ApiUser & {
    profile?: Record<string, unknown> | null;
  };
}

export interface DesignerProfile {
  type: 'DESIGNER';
  employeeCode: string | null;
  title: string | null;
  specialization: string | null;
  yearsOfExperience: number | null;
  bio: string | null;
  isAvailable: boolean;
  ratingAvg: string | null;
  ratingCount: number | null;
}

export interface SupplierProfile {
  type: 'SUPPLIER';
  companyName: string | null;
  taxCode: string | null;
  businessAddress: string | null;
  contactName: string | null;
  contactPhone: string | null;
  website: string | null;
  partnerSince: string | null;
}

export type UserProfile = DesignerProfile | SupplierProfile;

// Staff / Customer / Admin come back without a profile.
export interface AdminUserDetail extends ApiUser {
  profile?: UserProfile | null;
}

// PATCH body: email and role are immutable, so they are not part of this type.
export interface UpdateUserPayload {
  fullName?: string;
  phone?: string;
  designerProfile?: Partial<DesignerProfileInput>;
  supplierProfile?: Partial<SupplierProfileInput>;
}

export interface ResendInvitationResponse {
  message: string;
}

export type StatusAction = 'LOCK' | 'UNLOCK' | 'DEACTIVATE' | 'REACTIVATE';
