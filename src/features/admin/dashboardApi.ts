import { apiRequest } from '@/services/authService';
import type { ProjectStatus } from '@/features/projects/projectApi';
import type { InquiryStatus, InquiryTopic } from '@/features/inquiries/inquiryApi';

export type BackendRole = 'ADMIN' | 'STAFF' | 'DESIGNER' | 'CUSTOMER' | 'SUPPLIER';

/** GET /admin/dashboard. Money is a VND string ("12500000.00"). */
export interface DashboardStats {
  generatedAt: string;
  users: { total: number; byRole: Record<BackendRole, number>; byStatus: Record<string, number>; newLast30Days: number };
  projects: { total: number; active: number; byStatus: Record<ProjectStatus, number>; createdLast30Days: number; completedLast30Days: number };
  revenue: {
    collected: string; collectedLast30Days: string; outstanding: string; overdueMilestones: number;
    activeContracts: number; activeContractValue: string;
    /** Oldest first, "YYYY-MM". */
    monthly: { month: string; amount: string }[];
  };
  quotations: { awaitingCustomer: number; approved: number; rejected: number; approvedValue: string; approvalRatePercent: string | null };
  reviews: { count: number; averageOverall: string | null; recommendPercent: string | null };
  inquiries: { byStatus: Record<InquiryStatus, number>; last30Days: number };
  recentProjects: { id: string; code: string; title: string; status: ProjectStatus; customerName: string; staffName: string; updatedAt: string }[];
  recentInquiries: { id: string; fullName: string; topic: InquiryTopic; status: InquiryStatus; createdAt: string }[];
}

export const dashboardApi = {
  stats: () => apiRequest<DashboardStats>('/admin/dashboard'),
};
