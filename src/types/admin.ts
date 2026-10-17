export type AdminRole = 'Homeowner' | 'Designer' | 'Staff' | 'Supplier';

export type UserStatus = 'Active' | 'Invited' | 'Suspended' | 'Deactivated';

export type UserFilterCategory = 'all' | 'homeowners' | 'company' | 'suppliers' | 'pending';

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
  status: 'Blocks saving' | 'Warns only';
}

export interface DesignStyleItem {
  id: string;
  name: string;
  description: string;
  aiKeywords: string;
}

export interface MaterialFinishItem {
  id: string;
  name: string;
  category: string;
  enabled: boolean;
  statusText: string;
}

export interface ProductCategoryItem {
  id: string;
  name: string;
  count: number;
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
