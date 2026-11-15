import { apiRequest } from '@/services/authService';
import type { StatusAction, ResendInvitationResponse, AdminUserDetail, UpdateUserPayload, CreateUserPayload, CreateUserResponse, UsersListResponse, UsersQuery } from './types';

export function getAdminUsers({ page, limit, q, role, status }: UsersQuery): Promise<UsersListResponse> {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (q) params.set('q', q);
  if (role) params.set('role', role);
  if (status) params.set('status', status);
  return apiRequest<UsersListResponse>(`/admin/users?${params.toString()}`);
}

export function createAdminUser(data: CreateUserPayload): Promise<CreateUserResponse> {
  return apiRequest<CreateUserResponse>('/admin/users', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function getAdminUserById(id: string): Promise<AdminUserDetail> {
  return apiRequest<AdminUserDetail>(`/admin/users/${encodeURIComponent(id)}`);
}

export function updateAdminUser(id: string, data: UpdateUserPayload): Promise<AdminUserDetail> {
  return apiRequest<AdminUserDetail>(`/admin/users/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export function resendAdminUserInvitation(id: string): Promise<ResendInvitationResponse> {
  return apiRequest<ResendInvitationResponse>(`/admin/users/${encodeURIComponent(id)}/invitations`, {
    method: 'POST',
  });
}

export function updateAdminUserStatus(id: string, action: StatusAction): Promise<AdminUserDetail> {
  return apiRequest<AdminUserDetail>(`/admin/users/${encodeURIComponent(id)}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ action }),
  });
}

export function updateDesignerAvailability(id: string, isAvailable: boolean): Promise<AdminUserDetail> {
  return apiRequest<AdminUserDetail>(`/admin/designers/${encodeURIComponent(id)}/availability`, {
    method: 'PATCH',
    body: JSON.stringify({ isAvailable }),
  });
}
