import React, { useMemo, useState } from 'react';
import { Download, Search, ChevronDown, User, Layers, Edit3, Sparkles, X, Check } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { Header, Footer } from '@/components/layout';

interface ActivityLogItem {
  id: string;
  time: string;
  user: string;
  initials: string;
  avatarBg: string;
  role: 'Staff' | 'Designer' | 'Homeowner' | 'Supplier' | 'Admin';
  action: string;
  target: string;
}

const INITIAL_LOGS: ActivityLogItem[] = [
  {
    id: 'l1',
    time: 'Today 10:24',
    user: 'Tran Nam',
    initials: 'TN',
    avatarBg: 'bg-purple-600',
    role: 'Staff',
    action: 'Created contract',
    target: 'C-2026-014',
  },
  {
    id: 'l2',
    time: 'Today 10:05',
    user: 'Nguyen Linh',
    initials: 'NL',
    avatarBg: 'bg-blue-600',
    role: 'Designer',
    action: 'Submitted v3 for review',
    target: 'Modern Townhouse · Thu Duc',
  },
  {
    id: 'l3',
    time: 'Today 09:40',
    user: 'Minh Anh',
    initials: 'MA',
    avatarBg: 'bg-teal-600',
    role: 'Homeowner',
    action: 'Signed up',
    target: 'minh.anh@gmail.com',
  },
  {
    id: 'l4',
    time: 'Today 09:12',
    user: 'Noi That Viet',
    initials: 'NV',
    avatarBg: 'bg-slate-800',
    role: 'Supplier',
    action: 'Imported 92 products',
    target: 'ntv-sept-2026.csv',
  },
  {
    id: 'l5',
    time: 'Yesterday',
    user: 'Admin',
    initials: 'AD',
    avatarBg: 'bg-slate-900',
    role: 'Admin',
    action: 'Published prompt Concept render (designer) v5',
    target: 'Prompt library',
  },
  {
    id: 'l6',
    time: 'Yesterday',
    user: 'Admin',
    initials: 'AD',
    avatarBg: 'bg-slate-900',
    role: 'Admin',
    action: 'Changed role to Designer',
    target: 'Pham Duc',
  },
  {
    id: 'l7',
    time: 'Yesterday',
    user: 'Admin',
    initials: 'AD',
    avatarBg: 'bg-slate-900',
    role: 'Admin',
    action: 'Invited Designer',
    target: 'Le Trang',
  },
  {
    id: 'l8',
    time: '02 Oct',
    user: 'Admin',
    initials: 'AD',
    avatarBg: 'bg-slate-900',
    role: 'Admin',
    action: 'Created partner account',
    target: 'Viglacera Tiles',
  },
];

interface IssueItem {
  id: string;
  title: string;
  detail: string;
  severity: 'Warning' | 'Info';
  dotColor: string;
  since: string;
}

const INITIAL_ISSUES: IssueItem[] = [
  {
    id: 'iss1',
    title: 'Image generation is slower than usual',
    detail: 'Average 38 s per concept in the last 2 hours (normal is 20 s).',
    severity: 'Warning',
    dotColor: 'bg-amber-600',
    since: '2 h ago',
  },
  {
    id: 'iss2',
    title: 'File storage above 60%',
    detail: '62% of 500 GB used. Delivery files are the largest share.',
    severity: 'Info',
    dotColor: 'bg-blue-600',
    since: 'Yesterday',
  },
  {
    id: 'iss3',
    title: 'Catalog import failed for Noi That Viet',
    detail: 'ntv-lighting.csv had 34 errors. The supplier has the error report.',
    severity: 'Warning',
    dotColor: 'bg-amber-600',
    since: '21 Aug',
  },
];

export const AdminReports: React.FC = () => {
  const [params, setParams] = useSearchParams();
  const tabParam = params.get('tab');

  // Sub-tabs: Overview | Activity log | Issues
  const currentTab: 'overview' | 'activity' | 'issues' =
    tabParam === 'issues'
      ? 'issues'
      : tabParam === 'activity' || tabParam === 'log'
      ? 'activity'
      : 'overview';

  const setTab = (tab: 'overview' | 'activity' | 'issues') => {
    if (tab === 'overview') {
      setParams({});
    } else if (tab === 'activity') {
      setParams({ tab: 'activity' });
    } else {
      setParams({ tab: 'issues' });
    }
  };

  // Date range state in Overview
  const [dateRange, setDateRange] = useState<'Last 7 days' | 'Last 30 days' | 'Last 90 days'>(
    'Last 30 days'
  );

  // Activity log search and filter
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<string>('All roles');
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Issues state: resolved issue IDs & acknowledged issue IDs
  const [resolvedIssues, setResolvedIssues] = useState<string[]>([]);
  const [acknowledgedIssues, setAcknowledgedIssues] = useState<string[]>([]);

  // Open issues count
  const openIssuesCount = INITIAL_ISSUES.length - resolvedIssues.length;

  // Filtered activity logs
  const filteredLogs = useMemo(() => {
    return INITIAL_LOGS.filter((item) => {
      const matchesRole = roleFilter === 'All roles' || item.role === roleFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchesQuery =
        !q ||
        item.user.toLowerCase().includes(q) ||
        item.action.toLowerCase().includes(q) ||
        item.target.toLowerCase().includes(q) ||
        item.time.toLowerCase().includes(q) ||
        item.role.toLowerCase().includes(q);

      return matchesRole && matchesQuery;
    });
  }, [searchQuery, roleFilter]);

  // Dynamic stats based on date range
  const statValues = useMemo(() => {
    switch (dateRange) {
      case 'Last 7 days':
        return { users: '6', projects: '2', contracts: '1', generations: '331' };
      case 'Last 90 days':
        return { users: '78', projects: '27', contracts: '14', generations: '3,890' };
      case 'Last 30 days':
      default:
        return { users: '26', projects: '9', contracts: '5', generations: '1,248' };
    }
  }, [dateRange]);

  // Export modal state (Image 2)
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
  const [exportDateRange, setExportDateRange] = useState<string>('Last 30 days');
  const [exportFormat, setExportFormat] = useState<'PDF' | 'CSV'>('PDF');
  const [exportOverview, setExportOverview] = useState<boolean>(true);
  const [exportActivityLog, setExportActivityLog] = useState<boolean>(true);
  const [exportIssues, setExportIssues] = useState<boolean>(true);

  // Confirm export handler
  const handleConfirmExport = () => {
    const filename = `archsync-report-${exportDateRange.toLowerCase().replace(/\s+/g, '-')}.${exportFormat.toLowerCase()}`;
    const content =
      exportFormat === 'CSV'
        ? 'Time,User,Role,Action,Target\n' +
          filteredLogs
            .map((r) => `"${r.time}","${r.user}","${r.role}","${r.action}","${r.target}"`)
            .join('\n')
        : `ArchSync AI Platform Report\nDate Range: ${exportDateRange}\nSections: ${[
            exportOverview && 'Overview',
            exportActivityLog && 'Activity log',
            exportIssues && 'Issues',
          ]
            .filter(Boolean)
            .join(', ')}`;

    const blob = new Blob([content], {
      type: exportFormat === 'CSV' ? 'text/csv' : 'text/plain',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
    setIsExportModalOpen(false);
  };

  const getRoleBadgeStyle = (role: ActivityLogItem['role']) => {
    switch (role) {
      case 'Staff':
        return 'bg-cyan-50 text-cyan-700 border-cyan-100';
      case 'Designer':
        return 'bg-blue-50 text-blue-700 border-blue-100';
      case 'Homeowner':
        return 'bg-slate-100 text-slate-700 border-slate-200';
      case 'Supplier':
        return 'bg-purple-50 text-purple-700 border-purple-100';
      case 'Admin':
        return 'bg-amber-50 text-amber-700 border-amber-100';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/60 font-sans flex flex-col justify-between">
      <Header role="admin" activeTab="reports" />

      <main className="w-full max-w-[1440px] mx-auto px-6 lg:px-12 py-8 flex-1">
        {/* Top Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <span className="text-[11px] font-bold tracking-wider text-blue-600 uppercase mb-1 block">
              Admin · Reports
            </span>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              Reports & activity
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              How the platform is used, who did what, and what needs attention.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsExportModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-xl shadow-2xs transition cursor-pointer self-start sm:self-auto"
          >
            <Download className="w-4 h-4 text-slate-600" />
            <span>Export report</span>
          </button>
        </div>

        {/* Sub-tab Navigation */}
        <div className="inline-flex p-1 bg-slate-200/60 rounded-xl mb-6">
          <button
            type="button"
            onClick={() => setTab('overview')}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition cursor-pointer ${
              currentTab === 'overview'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Overview
          </button>
          <button
            type="button"
            onClick={() => setTab('activity')}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition cursor-pointer ${
              currentTab === 'activity'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Activity log
          </button>
          <button
            type="button"
            onClick={() => setTab('issues')}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition cursor-pointer ${
              currentTab === 'issues'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Issues {openIssuesCount}
          </button>
        </div>

        {/* TAB 1: OVERVIEW */}
        {currentTab === 'overview' && (
          <div className="space-y-6">
            {/* Date Range Selector */}
            <div className="inline-flex p-1 bg-slate-100/90 rounded-xl border border-slate-200/60">
              {(['Last 7 days', 'Last 30 days', 'Last 90 days'] as const).map((range) => (
                <button
                  key={range}
                  type="button"
                  onClick={() => setDateRange(range)}
                  className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer ${
                    dateRange === range
                      ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {range}
                </button>
              ))}
            </div>

            {/* 4 Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Stat 1 */}
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <User className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                    New users
                  </span>
                  <div className="text-2xl font-extrabold text-slate-900 tracking-tight mt-0.5">
                    {statValues.users}
                  </div>
                </div>
              </div>

              {/* Stat 2 */}
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-cyan-50 text-cyan-600 flex items-center justify-center shrink-0">
                  <Layers className="w-5 h-5 text-cyan-600" />
                </div>
                <div>
                  <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                    Projects started
                  </span>
                  <div className="text-2xl font-extrabold text-slate-900 tracking-tight mt-0.5">
                    {statValues.projects}
                  </div>
                </div>
              </div>

              {/* Stat 3 */}
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                  <Edit3 className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                    Contracts signed
                  </span>
                  <div className="text-2xl font-extrabold text-slate-900 tracking-tight mt-0.5">
                    {statValues.contracts}
                  </div>
                </div>
              </div>

              {/* Stat 4 */}
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                  <Sparkles className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                    AI generations
                  </span>
                  <div className="text-2xl font-extrabold text-slate-900 tracking-tight mt-0.5">
                    {statValues.generations}
                  </div>
                </div>
              </div>
            </div>

            {/* 2 Big Visual Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
              {/* Card 1: Projects by stage */}
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6">
                <h2 className="text-base font-bold text-slate-900 mb-5">
                  Projects by stage
                </h2>

                <div className="space-y-4">
                  {/* Requirements */}
                  <div className="flex items-center gap-4">
                    <span className="w-28 text-xs font-medium text-slate-600 shrink-0">
                      Requirements
                    </span>
                    <div className="flex-1 h-3.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-300 rounded-full w-[60%]" />
                    </div>
                    <span className="w-5 text-right text-xs font-bold text-slate-900 shrink-0">
                      3
                    </span>
                  </div>

                  {/* Concept */}
                  <div className="flex items-center gap-4">
                    <span className="w-28 text-xs font-medium text-slate-600 shrink-0">
                      Concept
                    </span>
                    <div className="flex-1 h-3.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-600 rounded-full w-[80%]" />
                    </div>
                    <span className="w-5 text-right text-xs font-bold text-slate-900 shrink-0">
                      5
                    </span>
                  </div>

                  {/* Review */}
                  <div className="flex items-center gap-4">
                    <span className="w-28 text-xs font-medium text-slate-600 shrink-0">
                      Review
                    </span>
                    <div className="flex-1 h-3.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-300 rounded-full w-[60%]" />
                    </div>
                    <span className="w-5 text-right text-xs font-bold text-slate-900 shrink-0">
                      3
                    </span>
                  </div>

                  {/* Products & BOM */}
                  <div className="flex items-center gap-4">
                    <span className="w-28 text-xs font-medium text-slate-600 shrink-0">
                      Products & BOM
                    </span>
                    <div className="flex-1 h-3.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-300 rounded-full w-[60%]" />
                    </div>
                    <span className="w-5 text-right text-xs font-bold text-slate-900 shrink-0">
                      3
                    </span>
                  </div>

                  {/* Approval */}
                  <div className="flex items-center gap-4">
                    <span className="w-28 text-xs font-medium text-slate-600 shrink-0">
                      Approval
                    </span>
                    <div className="flex-1 h-3.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-300 rounded-full w-[40%]" />
                    </div>
                    <span className="w-5 text-right text-xs font-bold text-slate-900 shrink-0">
                      2
                    </span>
                  </div>

                  {/* Handover */}
                  <div className="flex items-center gap-4">
                    <span className="w-28 text-xs font-medium text-slate-600 shrink-0">
                      Handover
                    </span>
                    <div className="flex-1 h-3.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-300 rounded-full w-[40%]" />
                    </div>
                    <span className="w-5 text-right text-xs font-bold text-slate-900 shrink-0">
                      2
                    </span>
                  </div>
                </div>

                <p className="mt-5 text-xs text-slate-400 font-medium">
                  18 active projects
                </p>
              </div>

              {/* Card 2: Contract value by package */}
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6">
                <h2 className="text-base font-bold text-slate-900 mb-5">
                  Contract value by package
                </h2>

                <div className="space-y-5">
                  {/* Essential */}
                  <div>
                    <div className="flex items-center justify-between text-xs font-bold text-slate-900 mb-1.5">
                      <span>Essential</span>
                      <span>VND 135M</span>
                    </div>
                    <div className="h-3.5 bg-slate-100 rounded-full overflow-hidden mb-1">
                      <div className="h-full bg-blue-300 rounded-full w-[35%]" />
                    </div>
                    <span className="text-[11px] text-slate-400 font-medium">
                      3 contracts
                    </span>
                  </div>

                  {/* Standard */}
                  <div>
                    <div className="flex items-center justify-between text-xs font-bold text-slate-900 mb-1.5">
                      <span>Standard</span>
                      <span>VND 272M</span>
                    </div>
                    <div className="h-3.5 bg-slate-100 rounded-full overflow-hidden mb-1">
                      <div className="h-full bg-blue-600 rounded-full w-[70%]" />
                    </div>
                    <span className="text-[11px] text-slate-400 font-medium">
                      4 contracts
                    </span>
                  </div>

                  {/* Premium */}
                  <div>
                    <div className="flex items-center justify-between text-xs font-bold text-slate-900 mb-1.5">
                      <span>Premium</span>
                      <span>VND 190M</span>
                    </div>
                    <div className="h-3.5 bg-slate-100 rounded-full overflow-hidden mb-1">
                      <div className="h-full bg-blue-300 rounded-full w-[50%]" />
                    </div>
                    <span className="text-[11px] text-slate-400 font-medium">
                      2 contracts
                    </span>
                  </div>
                </div>

                <p className="mt-5 text-xs text-slate-400 font-medium">
                  Total VND 597M across 9 contracts
                </p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: ACTIVITY LOG */}
        {currentTab === 'activity' && (
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6">
            {/* Top Filter and Search Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-end justify-between gap-4 mb-5">
              {/* Search Activity Input */}
              <div className="relative flex-1 max-w-xl">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Search activity"
                  className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Role Filter */}
              <div className="flex flex-col gap-1 w-full sm:w-44">
                <label className="text-[11px] font-semibold text-slate-500 text-left sm:text-right sm:pr-1">
                  Role
                </label>
                <div className="relative">
                  <select
                    value={roleFilter}
                    onChange={(e) => {
                      setRoleFilter(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-900 bg-white appearance-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500 pr-8 font-medium"
                  >
                    <option value="All roles">All roles</option>
                    <option value="Staff">Staff</option>
                    <option value="Designer">Designer</option>
                    <option value="Homeowner">Homeowner</option>
                    <option value="Supplier">Supplier</option>
                    <option value="Admin">Admin</option>
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead>
                  <tr className="bg-slate-100/70 rounded-xl">
                    <th className="py-2.5 px-4 text-[10px] font-bold tracking-wider text-slate-500 uppercase rounded-l-xl">
                      Time
                    </th>
                    <th className="py-2.5 px-4 text-[10px] font-bold tracking-wider text-slate-500 uppercase">
                      User
                    </th>
                    <th className="py-2.5 px-4 text-[10px] font-bold tracking-wider text-slate-500 uppercase">
                      Role
                    </th>
                    <th className="py-2.5 px-4 text-[10px] font-bold tracking-wider text-slate-500 uppercase">
                      Action
                    </th>
                    <th className="py-2.5 px-4 text-[10px] font-bold tracking-wider text-slate-500 uppercase rounded-r-xl">
                      Target
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-24 text-center">
                        <p className="text-sm font-bold text-slate-900">
                          No activity matches.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredLogs.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/60 transition">
                        {/* Time */}
                        <td className="py-3 px-4 text-xs text-slate-500 whitespace-nowrap">
                          {item.time}
                        </td>

                        {/* User with avatar */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-2.5">
                            <div
                              className={`w-7 h-7 rounded-full ${item.avatarBg} text-white flex items-center justify-center font-bold text-[11px] shrink-0`}
                            >
                              {item.initials}
                            </div>
                            <span className="text-xs font-bold text-slate-900">
                              {item.user}
                            </span>
                          </div>
                        </td>

                        {/* Role pill badge */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span
                            className={`inline-block px-2.5 py-0.5 text-xs font-semibold rounded-full border ${getRoleBadgeStyle(
                              item.role
                            )}`}
                          >
                            {item.role}
                          </span>
                        </td>

                        {/* Action */}
                        <td className="py-3 px-4 text-xs text-slate-700">
                          {item.action}
                        </td>

                        {/* Target */}
                        <td className="py-3 px-4 text-xs font-medium text-slate-800">
                          {item.target}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Table Footer */}
            <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>Showing {filteredLogs.length} events</span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={currentPage <= 1 || filteredLogs.length === 0}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition shadow-2xs"
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={filteredLogs.length === 0}
                  onClick={() => setCurrentPage((p) => p + 1)}
                  className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition shadow-2xs"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: ISSUES */}
        {currentTab === 'issues' && (
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6">
            {/* Header: Title and Badge */}
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-900">Issues</h2>
              <span
                className={`px-2.5 py-0.5 text-xs font-semibold rounded-full ${
                  openIssuesCount > 0
                    ? 'bg-amber-50 text-amber-700 border border-amber-200/60'
                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                }`}
              >
                {openIssuesCount} open
              </span>
            </div>

            {/* Issues List */}
            <div className="divide-y divide-slate-100">
              {INITIAL_ISSUES.map((issue) => {
                const isResolved = resolvedIssues.includes(issue.id);
                const isAcknowledged = acknowledgedIssues.includes(issue.id);

                return (
                  <div
                    key={issue.id}
                    className="py-5 first:pt-0 last:pb-0 flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    {/* Left: Dot, Title, Details */}
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div
                        className={`w-2 h-2 rounded-full ${issue.dotColor} mt-1.5 shrink-0`}
                      />
                      <div className="min-w-0">
                        <h3 className="text-sm font-bold text-slate-900">
                          {issue.title}
                        </h3>
                        <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                          {issue.detail}
                        </p>
                        <p className="text-[11px] text-slate-400 mt-1.5 font-medium">
                          {issue.severity} · since {issue.since}
                        </p>
                      </div>
                    </div>

                    {/* Right: Actions or Resolved Badge */}
                    <div className="flex items-center gap-2.5 self-start md:self-center shrink-0">
                      {isResolved ? (
                        <span className="px-3.5 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-full border border-emerald-200/60">
                          Resolved
                        </span>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              if (!isAcknowledged) {
                                setAcknowledgedIssues((prev) => [...prev, issue.id]);
                              }
                            }}
                            className={`px-3.5 py-1.5 border border-slate-200 text-xs font-semibold rounded-xl transition shadow-2xs ${
                              isAcknowledged
                                ? 'bg-slate-50 text-slate-400 cursor-default'
                                : 'bg-white hover:bg-slate-50 text-slate-700 cursor-pointer'
                            }`}
                          >
                            {isAcknowledged ? 'Acknowledged' : 'Acknowledge'}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setResolvedIssues((prev) => [...prev, issue.id]);
                            }}
                            className="px-3.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 text-xs font-semibold rounded-xl transition cursor-pointer"
                          >
                            Resolve
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        {/* EXPORT REPORT MODAL (Image 2) */}
        {isExportModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
            <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200/90 shadow-2xl p-6 relative animate-in zoom-in-95 duration-150">
              {/* Modal Header */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <h3 className="text-base font-bold text-slate-900">Export report</h3>
                <button
                  type="button"
                  onClick={() => setIsExportModalOpen(false)}
                  className="w-7 h-7 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="py-4 space-y-4">
                {/* Date range dropdown */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Date range
                  </label>
                  <div className="relative">
                    <select
                      value={exportDateRange}
                      onChange={(e) => setExportDateRange(e.target.value)}
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs text-slate-900 bg-white appearance-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
                    >
                      <option value="Last 7 days">Last 7 days</option>
                      <option value="Last 30 days">Last 30 days</option>
                      <option value="Last 90 days">Last 90 days</option>
                    </select>
                    <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                {/* Format Radio */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-2">
                    Format
                  </label>
                  <div className="flex items-center gap-6">
                    <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="radio"
                        name="exportFormat"
                        checked={exportFormat === 'PDF'}
                        onChange={() => setExportFormat('PDF')}
                        className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-slate-300"
                      />
                      <span className="text-xs font-medium text-slate-800">PDF</span>
                    </label>

                    <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="radio"
                        name="exportFormat"
                        checked={exportFormat === 'CSV'}
                        onChange={() => setExportFormat('CSV')}
                        className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-slate-300"
                      />
                      <span className="text-xs font-medium text-slate-800">CSV</span>
                    </label>
                  </div>
                </div>

                {/* Section Checkboxes */}
                <div className="pt-2 space-y-2.5">
                  <label className="flex items-center gap-2.5 cursor-pointer select-none">
                    <div
                      onClick={() => setExportOverview(!exportOverview)}
                      className={`w-4 h-4 rounded flex items-center justify-center transition ${
                        exportOverview
                          ? 'bg-blue-600 text-white'
                          : 'border border-slate-300 bg-white'
                      }`}
                    >
                      {exportOverview && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                    <span className="text-xs font-medium text-slate-700">Overview</span>
                  </label>

                  <label className="flex items-center gap-2.5 cursor-pointer select-none">
                    <div
                      onClick={() => setExportActivityLog(!exportActivityLog)}
                      className={`w-4 h-4 rounded flex items-center justify-center transition ${
                        exportActivityLog
                          ? 'bg-blue-600 text-white'
                          : 'border border-slate-300 bg-white'
                      }`}
                    >
                      {exportActivityLog && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                    <span className="text-xs font-medium text-slate-700">Activity log</span>
                  </label>

                  <label className="flex items-center gap-2.5 cursor-pointer select-none">
                    <div
                      onClick={() => setExportIssues(!exportIssues)}
                      className={`w-4 h-4 rounded flex items-center justify-center transition ${
                        exportIssues
                          ? 'bg-blue-600 text-white'
                          : 'border border-slate-300 bg-white'
                      }`}
                    >
                      {exportIssues && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                    <span className="text-xs font-medium text-slate-700">Issues</span>
                  </label>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsExportModalOpen(false)}
                  className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-xl transition cursor-pointer shadow-2xs"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmExport}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-xs rounded-xl shadow-xs transition cursor-pointer"
                >
                  Export
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default AdminReports;
