import { ApiError, apiRequest, getCurrentUser, replaceSessionTokens, updateCurrentUserProfile } from '@/services/authService';
import type { UserRole } from '@/types/role';

export interface UserProfile {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  role: UserRole;
  status?: string;
  designerProfile?: Record<string, unknown>;
  supplierProfile?: Record<string, unknown>;
}

export interface UpdateMyProfilePayload {
  fullName: string;
  phone: string;
  designerProfile?: Record<string, unknown>;
  supplierProfile?: Record<string, unknown>;
}

export interface CustomerAccount {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  status?: string;
}

interface ApiEnvelope<T> { data?: T }

function unwrap<T>(value: T | ApiEnvelope<T>): T {
  return value && typeof value === 'object' && 'data' in value && value.data !== undefined
    ? value.data
    : value as T;
}

function normalizeRole(roleValue: unknown): UserRole {
  const value = String(roleValue ?? '').trim().toLowerCase();
  const aliases: Record<string, UserRole> = {
    customer: 'homeowner', homeowner: 'homeowner', staff: 'staff',
    designer: 'designer', supplier: 'supplier', admin: 'admin',
  };
  const role = aliases[value] ?? getCurrentUser()?.role;
  if (!role) throw new ApiError(`Unsupported account role in profile response: ${String(roleValue ?? 'missing')}`);
  return role;
}

function normalizeProfile(profile: UserProfile): UserProfile {
  return { ...profile, role: normalizeRole(profile.role) };
}

export async function getMyProfile(): Promise<UserProfile> {
  const response = await apiRequest<UserProfile | ApiEnvelope<UserProfile>>('/users/me');
  return normalizeProfile(unwrap(response));
}

export async function updateMyProfile(payload: UpdateMyProfilePayload): Promise<UserProfile> {
  const response = await apiRequest<UserProfile | ApiEnvelope<UserProfile>>('/users/me', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
  const profile = normalizeProfile(unwrap(response));
  updateCurrentUserProfile({ name: profile.fullName, phone: profile.phone });
  return profile;
}

export interface ChangeMyPasswordPayload { currentPassword: string; newPassword: string }
interface ChangePasswordResponse {
  message?: string;
  accessToken: string;
  refreshToken: string;
}

export async function changeMyPassword(payload: ChangeMyPasswordPayload): Promise<{ message: string }> {
  const response = unwrap(await apiRequest<ChangePasswordResponse | ApiEnvelope<ChangePasswordResponse>>('/users/me/password', {
    method: 'PUT',
    body: JSON.stringify(payload),
  }));
  if (response.accessToken && response.refreshToken) {
    replaceSessionTokens(response.accessToken, response.refreshToken);
  }
  return { message: response.message ?? 'Password changed successfully.' };
}

export async function getCustomers(email: string): Promise<CustomerAccount[]> {
  const normalizedEmail = email.trim();
  if (!normalizedEmail) throw new ApiError('Enter a customer email address to search.');
  const query = new URLSearchParams({ email: normalizedEmail });
  const response = await apiRequest<unknown>(`/users/customers?${query.toString()}`);
  const result = unwrap(response as CustomerAccount | CustomerAccount[] | ApiEnvelope<CustomerAccount | CustomerAccount[]>);
  const customers = Array.isArray(result) ? result : [result];
  if (!customers.every((customer) =>
    Boolean(customer && typeof customer === 'object' && customer.id && customer.email && customer.fullName),
  )) {
    throw new ApiError('Customer search returned an unexpected response format.');
  }
  return customers;
}
