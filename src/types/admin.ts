export type AdminRole = 'Homeowner' | 'Designer' | 'Staff' | 'Supplier';

export type UserStatus = 'Active' | 'Invited' | 'Suspended';

export type UserFilterCategory = 'all' | 'homeowners' | 'company' | 'suppliers';

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
  status: UserStatus;
  lastActive: string;
  avatar: string;
  avatarBgColor: string;
  permissions?: string[];
}

export interface InviteUserPayload {
  fullName: string;
  workEmail: string;
  role: AdminRole;
  permissions: string[];
}

export interface BuildingTypeItem {
  id: string;
  name: string;
  enabled: boolean;
  statusText: string;
}

export interface ConstraintRuleItem {
  id: string;
  title: string;
  description: string;
}

export interface PromptLibraryItem {
  id: string;
  title: string;
  version: string;
  status: 'Active' | 'Draft' | 'Archived';
}

export interface RecentActivityItem {
  id: string;
  title: string;
  role: AdminRole;
  time: string;
}

export interface GenerationStatDay {
  day: string;
  count: number;
  isHighlight?: boolean;
}
