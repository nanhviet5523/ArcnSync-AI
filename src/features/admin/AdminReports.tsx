
import React, { useMemo, useState } from 'react';
import {
  Download,
  Search,
  ChevronDown,
  User,
  Layers,
  Edit3,
  Sparkles,
  X,
  Check,
} from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import {
  AdminButton,
  AdminCard,
  AdminPageFrame,
  AdminTable,
} from './AdminPageFrame';
import { useDemoWorkspace } from '@/hooks/useDemoWorkspace';

type ReportTab = 'Overview' | 'Activity log' | 'Issues';

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

interface IssueItem {
  id: string;
  title: string;
  detail: string;
  severity: 'Warning' | 'Info';
  dotColor: string;
  since: string;
}

const tabs: ReportTab[] = ['Overview', 'Activity log', 'Issues'];

const INITIAL_ISSUES: IssueItem[] = [
  {
    id: 'iss1',
    title: 'Image generation is slower than usual',
    detail:
      'Average 38 s per concept in the last 2 hours (normal is 20 s).',
    severity: 'Warning',
    dotColor: 'bg-amber-600',
    since: '2 h ago',
  },
  {
    id: 'iss2',
    title: 'File storage above 60%',
    detail:
      '62% of 500 GB used. Delivery files are the largest share.',
    severity: 'Info',
    dotColor: 'bg-blue-600',
    since: 'Yesterday',
  },
  {
    id: 'iss3',
    title: 'Catalog import failed for Noi That Viet',
    detail:
      'ntv-lighting.csv had 34 errors. The supplier has the error report.',
    severity: 'Warning',
    dotColor: 'bg-amber-600',
    since: '21 Aug',
  },
];

const ROLE_OPTIONS = [
  'All roles',
  'Homeowner',
  'Designer',
  'Staff',
  'Supplier',
  'Admin',
] as const;

const getRoleBadgeStyle = (role: string) => {
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

const escapeCsv = (value: unknown) =>
  `"${String(value ?? '').replace(/"/g, '""')}"`;

export const AdminReports: React.FC = () => {
  const workspace = useDemoWorkspace();
  const [params, setParams] = useSearchParams();

  const tabParam = params.get('tab');

  const currentTab: ReportTab =
    tabParam === 'issues'
      ? 'Issues'
      : tabParam === 'activity' || tabParam === 'log'
        ? 'Activity log'
        : 'Overview';

  const selectTab = (tab: ReportTab) => {
    if (tab === 'Overview') {
      setParams({});
    } else {
      setParams({ tab: tab === 'Issues' ? 'issues' : 'activity' });
    }
  };

  const [dateRange, setDateRange] = useState<
    'Last 7 days' | 'Last 30 days' | 'Last 90 days'
  >('Last 30 days');

  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('All roles');
  const [currentPage, setCurrentPage] = useState(1);

  const [resolvedIssues, setResolvedIssues] = useState<string[]>([]);
  const [acknowledgedIssues, setAcknowledgedIssues] = useState<string[]>([]);

  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportDateRange, setExportDateRange] = useState<
    'Last 7 days' | 'Last 30 days' | 'Last 90 days'
  >('Last 30 days');
  const [exportFormat, setExportFormat] = useState<'PDF' | 'CSV'>('CSV');
  const [exportOverview, setExportOverview] = useState(true);
  const [exportActivityLog, setExportActivityLog] = useState(true);
  const [exportIssues, setExportIssues] = useState(true);

  const activityLogs: ActivityLogItem[] = useMemo(() => {
    return workspace.activity.map((item, index) => {
      const user = String(item.actor ?? 'Unknown user');
      const role = String(item.role ?? 'Admin');
      const initials = user
        .split(/\s+/)
        .filter(Boolean)
        .map((part) => part[0])
        .join('')
        .slice(0, 2)
        .toUpperCase();

      const supportedRoles: ActivityLogItem['role'][] = [
        'Staff',
        'Designer',
        'Homeowner',
        'Supplier',
        'Admin',
      ];

      return {
        id: `activity-${index}-${String(item.at ?? '')}`,
        time: String(item.at ?? ''),
        user,
        initials: initials || 'UN',
        avatarBg:
          role === 'Designer'
            ? 'bg-blue-600'
            : role === 'Homeowner'
              ? 'bg-teal-600'
              : role === 'Supplier'
                ? 'bg-purple-600'
                : role === 'Staff'
                  ? 'bg-cyan-600'
                  : 'bg-slate-800',
        role: supportedRoles.includes(role as ActivityLogItem['role'])
          ? (role as ActivityLogItem['role'])
          : 'Admin',
        action: String(item.action ?? ''),
        target: String(item.target ?? ''),
      };
    });
  }, [workspace.activity]);

  const filteredLogs = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();

    return activityLogs.filter((item) => {
      const matchesRole =
        roleFilter === 'All roles' || item.role === roleFilter;

      const matchesQuery =
        !query ||
        [
          item.time,
          item.user,
          item.role,
          item.action,
          item.target,
        ]
          .join(' ')
          .toLowerCase()
          .includes(query);

      return matchesRole && matchesQuery;
    });
  }, [activityLogs, roleFilter, searchQuery]);

  const pageSize = 5;
  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);

  const paginatedLogs = filteredLogs.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize,
  );

  const openIssuesCount = INITIAL_ISSUES.filter(
    (issue) => !resolvedIssues.includes(issue.id),
  ).length;

  const overviewStats = [
    {
      label: 'New requests',
      value: workspace.requests.filter(
        (request) => request.status === 'AI brief ready',
      ).length,
      icon: User,
      iconClass: 'bg-blue-50 text-blue-600',
    },
    {
      label: 'Projects started',
      value: workspace.projects.length,
      icon: Layers,
      iconClass: 'bg-cyan-50 text-cyan-600',
    },
    {
      label: 'Contracts signed',
      value: workspace.contracts.filter(
        (contract) => contract.status === 'Signed',
      ).length,
      icon: Edit3,
      iconClass: 'bg-amber-50 text-amber-600',
    },
    {
      label: 'Design versions',
      value: workspace.versions.length,
      icon: Sparkles,
      iconClass: 'bg-purple-50 text-purple-600',
    },
  ];

  const stageCounts: [string, number][] = [
    [
      'Requirements',
      workspace.projects.filter(
        (project) => project.stage === 'Requirements',
      ).length,
    ],
    [
      'Concept',
      workspace.projects.filter((project) => project.stage === 'Concept')
        .length,
    ],
    [
      'Review',
      workspace.projects.filter(
        (project) => project.stage === 'Design review',
      ).length,
    ],
    [
      'Products & BOM',
      workspace.projects.filter(
        (project) => project.stage === 'Product selection',
      ).length,
    ],
    ['Approval', 0],
    [
      'Handover',
      workspace.projects.filter((project) => project.stage === 'Handover')
        .length,
    ],
  ];

  const contractPackages = (['Essential', 'Standard', 'Premium'] as const).map(
    (name) => {
      const contracts = workspace.contracts.filter(
        (contract) => contract.packageName === name,
      );

      return {
        name,
        count: contracts.length,
        total: contracts.reduce((sum, contract) => sum + contract.fee, 0),
      };
    },
  );

  const totalContractValue = workspace.contracts.reduce(
    (sum, contract) => sum + contract.fee,
    0,
  );

  const statValues = useMemo(() => {
    const factor =
      dateRange === 'Last 7 days'
        ? 1
        : dateRange === 'Last 90 days'
          ? 3
          : 1;

    return {
      requests: workspace.requests.filter(
        (request) => request.status === 'AI brief ready',
      ).length * factor,
      projects: workspace.projects.length * factor,
      contracts: workspace.contracts.filter(
        (contract) => contract.status === 'Signed',
      ).length * factor,
      versions: workspace.versions.length * factor,
    };
  }, [
    dateRange,
    workspace.requests,
    workspace.projects,
    workspace.contracts,
    workspace.versions,
  ]);

  const downloadCsv = (rows: string[][], filename: string) => {
    const csv = rows.map((row) => row.map(escapeCsv).join(',')).join('\n');
    const blob = new Blob(['\uFEFF', csv], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = filename;
    link.click();

    URL.revokeObjectURL(url);
  };

  const handleConfirmExport = () => {
    const sections: string[] = [
      'ArchSync AI Platform Report',
      `Date Range: ${exportDateRange}`,
      '',
    ];

    if (exportOverview) {
      sections.push('OVERVIEW');
      overviewStats.forEach((stat) => {
        sections.push(`${stat.label}: ${stat.value}`);
      });
      sections.push('');
    }

    if (exportActivityLog) {
      sections.push('ACTIVITY LOG');
      filteredLogs.forEach((item) => {
        sections.push(
          `${item.time} | ${item.user} | ${item.role} | ${item.action} | ${item.target}`,
        );
      });
      sections.push('');
    }

    if (exportIssues) {
      sections.push('ISSUES');
      INITIAL_ISSUES.forEach((issue) => {
        const status = resolvedIssues.includes(issue.id)
          ? 'Resolved'
          : acknowledgedIssues.includes(issue.id)
            ? 'Acknowledged'
            : 'Open';

        sections.push(
          `${issue.title} | ${issue.severity} | ${status} | ${issue.detail}`,
        );
      });
    }

    if (exportFormat === 'CSV') {
      const rows: string[][] = [];

      if (exportOverview) {
        rows.push(['Overview']);
        rows.push(['Metric', 'Value']);
        overviewStats.forEach((stat) => {
          rows.push([stat.label, String(stat.value)]);
        });
        rows.push([]);
      }

      if (exportActivityLog) {
        rows.push(['Activity log']);
        rows.push(['Time', 'User', 'Role', 'Action', 'Target']);
        filteredLogs.forEach((item) => {
          rows.push([
            item.time,
            item.user,
            item.role,
            item.action,
            item.target,
          ]);
        });
        rows.push([]);
      }

      if (exportIssues) {
        rows.push(['Issues']);
        rows.push(['Title', 'Severity', 'Status', 'Detail', 'Since']);
        INITIAL_ISSUES.forEach((issue) => {
          const status = resolvedIssues.includes(issue.id)
            ? 'Resolved'
            : acknowledgedIssues.includes(issue.id)
              ? 'Acknowledged'
              : 'Open';

          rows.push([
            issue.title,
            issue.severity,
            status,
            issue.detail,
            issue.since,
          ]);
        });
      }

      downloadCsv(
        rows,
        `archsync-report-${exportDateRange
          .toLowerCase()
          .replace(/\s+/g, '-')}.csv`,
      );
    } else {
      const printWindow = window.open('', '_blank');

      if (printWindow) {
        printWindow.document.write(`
          <!doctype html>
          <html>
            <head>
              <title>ArchSync Report</title>
              <style>
                body {
                  font-family: Arial, sans-serif;
                  padding: 32px;
                  color: #0f172a;
                  line-height: 1.6;
                }
                h1 { font-size: 24px; }
                pre {
                  white-space: pre-wrap;
                  overflow-wrap: anywhere;
                  font-family: Arial, sans-serif;
                }
                @media print { body { padding: 0; } }
              </style>
            </head>
            <body>
              <h1>ArchSync AI Platform Report</h1>
              <pre>${sections
                .join('\n')
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')}</pre>
              <script>
                window.onload = () => {
                  window.print();
                };
              </script>
            </body>
          </html>
        `);
        printWindow.document.close();
      }
    }

    setIsExportModalOpen(false);
  };

  return (
    <AdminPageFrame
      title="Reports & activity"
      description="Review platform usage, account activity, and issues that need attention."
      action={
        <AdminButton
          secondary
          onClick={() => setIsExportModalOpen(true)}
        >
          <Download size={16} />
          Export report
        </AdminButton>
      }
    >
      <div className="mb-5 flex gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-white p-1">
        {tabs.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => selectTab(tab)}
            className={`whitespace-nowrap rounded-lg px-4 py-2.5 text-sm font-semibold ${
              currentTab === tab
                ? 'bg-blue-50 text-blue-700'
                : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            {tab}
            {tab === 'Issues' ? ` (${openIssuesCount})` : ''}
          </button>
        ))}
      </div>

      {currentTab === 'Overview' && (
        <>
          <div className="mb-5 flex flex-wrap gap-2">
            {(
              ['Last 7 days', 'Last 30 days', 'Last 90 days'] as const
            ).map((range) => (
              <button
                key={range}
                type="button"
                onClick={() => setDateRange(range)}
                className={`rounded-lg px-3 py-2 text-sm font-semibold ${
                  dateRange === range
                    ? 'bg-blue-600 text-white'
                    : 'border border-slate-200 bg-white text-slate-600'
                }`}
              >
                {range}
              </button>
            ))}
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {overviewStats.map((stat, index) => {
              const Icon = stat.icon;
              const value = [
                statValues.requests,
                statValues.projects,
                statValues.contracts,
                statValues.versions,
              ][index];

              return (
                <div
                  key={stat.label}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-11 w-11 items-center justify-center rounded-xl ${stat.iconClass}`}
                    >
                      <Icon size={20} />
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">{stat.label}</p>
                      <b className="mt-1 block text-2xl text-slate-900">
                        {value}
                      </b>
                    </div>
                  </div>
                  <span className="mt-3 block text-xs text-slate-400">
                    Based on current demo data
                  </span>
                </div>
              );
            })}
          </div>

          <div className="mt-5 grid gap-5 lg:grid-cols-2">
            <AdminCard title="Projects by stage">
              {stageCounts.map(([label, value]) => (
                <div key={label} className="mb-4 last:mb-0">
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="text-slate-600">{label}</span>
                    <b>{value}</b>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100">
                    <div
                      className="h-2 rounded-full bg-teal-500"
                      style={{
                        width: `${
                          (value / Math.max(workspace.projects.length, 1)) *
                          100
                        }%`,
                      }}
                    />
                  </div>
                </div>
              ))}
              <p className="mt-4 text-xs text-slate-400">
                {workspace.projects.length} shared projects
              </p>
            </AdminCard>

            <AdminCard title="Contract value by package">
              {contractPackages.map((item) => (
                <div key={item.name} className="mb-4 last:mb-0">
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="font-medium text-slate-700">
                      {item.name}
                      <small className="ml-2 text-slate-400">
                        {item.count} contracts
                      </small>
                    </span>
                    <b>
                      VND {(item.total / 1e6).toLocaleString()}M
                    </b>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100">
                    <div
                      className="h-2 rounded-full bg-blue-500"
                      style={{
                        width: `${
                          (item.total / Math.max(totalContractValue, 1)) * 100
                        }%`,
                      }}
                    />
                  </div>
                </div>
              ))}
              <p className="mt-4 text-xs text-slate-400">
                Total VND {(totalContractValue / 1e6).toLocaleString()}M across{' '}
                {workspace.contracts.length} contracts
              </p>
            </AdminCard>
          </div>
        </>
      )}

      {currentTab === 'Activity log' && (
        <AdminCard>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row">
            <div className="relative min-w-0 flex-1">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                value={searchQuery}
                onChange={(event) => {
                  setSearchQuery(event.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search activity"
                className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm"
              />
            </div>

            <div className="relative">
              <select
                value={roleFilter}
                onChange={(event) => {
                  setRoleFilter(event.target.value);
                  setCurrentPage(1);
                }}
                className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-3 py-2.5 pr-9 text-sm sm:w-44"
              >
                {ROLE_OPTIONS.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={15}
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <AdminTable
              headings={['Time', 'User', 'Role', 'Action', 'Target']}
            >
              {paginatedLogs.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/60">
                  <td className="whitespace-nowrap px-4 py-3.5 text-slate-600">
                    {item.time}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white ${item.avatarBg}`}
                      >
                        {item.initials}
                      </span>
                      <span className="text-sm font-medium text-slate-800">
                        {item.user}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <span
                      className={`inline-block rounded-full border px-2.5 py-1 text-xs font-semibold ${getRoleBadgeStyle(item.role)}`}
                    >
                      {item.role}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-slate-600">
                    {item.action}
                  </td>
                  <td className="px-4 py-3.5 text-slate-600">
                    {item.target}
                  </td>
                </tr>
              ))}
            </AdminTable>

            {filteredLogs.length === 0 && (
              <p className="py-10 text-center text-sm text-slate-500">
                No activity matches your search.
              </p>
            )}
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4 text-xs text-slate-500">
            <span>
              Showing {filteredLogs.length === 0 ? 0 : (safePage - 1) * pageSize + 1}
              {'–'}
              {Math.min(safePage * pageSize, filteredLogs.length)} of{' '}
              {filteredLogs.length} events
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={safePage <= 1}
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                className="rounded-lg border border-slate-200 px-3 py-1.5 font-medium disabled:cursor-not-allowed disabled:opacity-40"
              >
                Previous
              </button>
              <span>
                Page {safePage} of {totalPages}
              </span>
              <button
                type="button"
                disabled={safePage >= totalPages}
                onClick={() =>
                  setCurrentPage((page) => Math.min(totalPages, page + 1))
                }
                className="rounded-lg border border-slate-200 px-3 py-1.5 font-medium disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        </AdminCard>
      )}

      {currentTab === 'Issues' && (
        <AdminCard title="Platform issues">
          <div className="mb-5 flex items-center justify-between border-b border-slate-100 pb-4">
            <p className="text-sm text-slate-500">
              Review issues and update their status.
            </p>
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                openIssuesCount > 0
                  ? 'bg-amber-50 text-amber-700'
                  : 'bg-emerald-50 text-emerald-700'
              }`}
            >
              {openIssuesCount} open
            </span>
          </div>

          <div className="divide-y divide-slate-100">
            {INITIAL_ISSUES.map((issue) => {
              const isResolved = resolvedIssues.includes(issue.id);
              const isAcknowledged = acknowledgedIssues.includes(issue.id);

              return (
                <div
                  key={issue.id}
                  className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 md:flex-row md:items-center"
                >
                  <span
                    className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${issue.dotColor}`}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-slate-800">
                      {issue.title}
                    </p>
                    <p className="mt-1 text-sm leading-6 text-slate-500">
                      {issue.detail}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      {issue.severity} · since {issue.since}
                    </p>
                  </div>

                  {isResolved ? (
                    <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                      Resolved
                    </span>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      <AdminButton
                        secondary
                        onClick={() => {
                          if (!isAcknowledged) {
                            setAcknowledgedIssues((current) => [
                              ...current,
                              issue.id,
                            ]);
                          }
                        }}
                      >
                        {isAcknowledged ? (
                          <>
                            <Check size={14} />
                            Acknowledged
                          </>
                        ) : (
                          'Acknowledge'
                        )}
                      </AdminButton>

                      <AdminButton
                        onClick={() =>
                          setResolvedIssues((current) =>
                            current.includes(issue.id)
                              ? current
                              : [...current, issue.id],
                          )
                        }
                      >
                        Resolve
                      </AdminButton>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </AdminCard>
      )}

      {isExportModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setIsExportModalOpen(false);
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="export-report-title"
            className="relative w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h2
                id="export-report-title"
                className="text-base font-bold text-slate-900"
              >
                Export report
              </h2>
              <button
                type="button"
                aria-label="Close export dialog"
                onClick={() => setIsExportModalOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-4 py-5">
              <div>
                <label
                  htmlFor="export-date-range"
                  className="mb-1.5 block text-xs font-semibold text-slate-700"
                >
                  Date range
                </label>
                <select
                  id="export-date-range"
                  value={exportDateRange}
                  onChange={(event) =>
                    setExportDateRange(
                      event.target.value as typeof exportDateRange,
                    )
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm"
                >
                  <option value="Last 7 days">Last 7 days</option>
                  <option value="Last 30 days">Last 30 days</option>
                  <option value="Last 90 days">Last 90 days</option>
                </select>
              </div>

              <fieldset>
                <legend className="mb-2 text-xs font-semibold text-slate-700">
                  Format
                </legend>
                <div className="flex items-center gap-6">
                  {(['PDF', 'CSV'] as const).map((format) => (
                    <label
                      key={format}
                      className="inline-flex cursor-pointer items-center gap-2 text-sm"
                    >
                      <input
                        type="radio"
                        name="exportFormat"
                        checked={exportFormat === format}
                        onChange={() => setExportFormat(format)}
                        className="h-4 w-4"
                      />
                      {format}
                    </label>
                  ))}
                </div>
              </fieldset>

              <fieldset className="space-y-3">
                <legend className="mb-2 text-xs font-semibold text-slate-700">
                  Include sections
                </legend>

                {[
                  {
                    label: 'Overview',
                    checked: exportOverview,
                    setChecked: setExportOverview,
                  },
                  {
                    label: 'Activity log',
                    checked: exportActivityLog,
                    setChecked: setExportActivityLog,
                  },
                  {
                    label: 'Issues',
                    checked: exportIssues,
                    setChecked: setExportIssues,
                  },
                ].map((section) => (
                  <label
                    key={section.label}
                    className="flex cursor-pointer items-center gap-2.5 text-sm text-slate-700"
                  >
                    <input
                      type="checkbox"
                      checked={section.checked}
                      onChange={(event) =>
                        section.setChecked(event.target.checked)
                      }
                      className="h-4 w-4 rounded"
                    />
                    {section.label}
                  </label>
                ))}
              </fieldset>
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
              <AdminButton
                secondary
                onClick={() => setIsExportModalOpen(false)}
              >
                Cancel
              </AdminButton>
              <AdminButton
                onClick={handleConfirmExport}
                disabled={
                  !exportOverview && !exportActivityLog && !exportIssues
                }
              >
                <Download size={15} />
                Export
              </AdminButton>
            </div>
          </div>
        </div>
      )}
    </AdminPageFrame>
  );
};

export default AdminReports;
