
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Layers,
  Layers3,
  Sparkles,
  AlertTriangle,
  Download,
  X,
  ChevronDown,
  ArrowRight,
  Activity,
} from 'lucide-react';
import { Header, Footer } from '@/components/layout';
import { AdminButton, AdminCard } from './AdminPageFrame';
import { useDemoWorkspace } from '@/hooks/useDemoWorkspace';
import {
  GENERATION_STATS_WEEK,
  INITIAL_RECENT_ACTIVITY,
} from '@/features/admin/services/adminService';
import type { AdminRole } from '@/types/admin';

export const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const workspace = useDemoWorkspace();

  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportDateRange, setExportDateRange] = useState('Last 30 days');
  const [exportFormat, setExportFormat] = useState<'PDF' | 'CSV'>('PDF');
  const [exportOverview, setExportOverview] = useState(true);
  const [exportActivityLog, setExportActivityLog] = useState(true);
  const [exportIssues, setExportIssues] = useState(true);

  const stats = [
    {
      label: 'Demo accounts',
      value: '5',
      icon: Users,
      color: 'bg-blue-50 text-blue-600',
      path: '/admin-users',
    },
    {
      label: 'Active projects',
      value: String(
        workspace.projects.filter((project) => project.stage !== 'Handover')
          .length
      ),
      icon: Layers3,
      color: 'bg-teal-50 text-teal-700',
      path: '/admin-reports',
    },
    {
      label: 'Design versions',
      value: String(workspace.versions.length),
      icon: Sparkles,
      color: 'bg-violet-50 text-violet-700',
      path: '/admin-reports',
    },
    {
      label: 'Open inquiries',
      value: String(
        workspace.inquiries.filter(
          (inquiry) => inquiry.status !== 'Answered'
        ).length
      ),
      icon: AlertTriangle,
      color: 'bg-amber-50 text-amber-700',
      path: '/admin-reports?tab=issues',
    },
  ];

  const activity = workspace.activity.slice(0, 4).map((item) => [
    item.action,
    item.role,
    item.at,
  ]);

  const statCards = [
    {
      label: 'USERS',
      value: '214',
      icon: <Users className="w-5 h-5 text-blue-600" />,
      iconBg: 'bg-blue-50',
    },
    {
      label: 'ACTIVE PROJECTS',
      value: '18',
      icon: <Layers className="w-5 h-5 text-cyan-600" />,
      iconBg: 'bg-cyan-50',
    },
    {
      label: 'AI GENERATIONS / MONTH',
      value: '1,248',
      icon: <Sparkles className="w-5 h-5 text-purple-600" />,
      iconBg: 'bg-purple-50',
    },
    {
      label: 'OPEN ISSUES',
      value: '3',
      icon: <AlertTriangle className="w-5 h-5 text-amber-600" />,
      iconBg: 'bg-amber-50',
    },
  ];

  const handleConfirmExport = () => {
    const filename = `archsync-platform-report-${exportDateRange
      .toLowerCase()
      .replace(/\s+/g, '-')}.${exportFormat.toLowerCase()}`;

    const content = `ArchSync AI Platform Report
Date Range: ${exportDateRange}
Format: ${exportFormat}
Sections: ${[
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

  const getRoleBadgeStyle = (role: AdminRole) => {
    switch (role) {
      case 'Homeowner':
        return 'bg-slate-100 text-slate-700';
      case 'Designer':
        return 'bg-blue-50 text-blue-700';
      case 'Staff':
        return 'bg-cyan-50 text-cyan-700';
      case 'Supplier':
        return 'bg-purple-50 text-purple-700';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

  return (
    <>
      <div className="min-h-screen bg-slate-50/60 font-sans flex flex-col justify-between">
        <Header role="admin" activeTab="dashboard" />

        <main className="w-full max-w-[1440px] mx-auto px-6 lg:px-12 py-8 flex-1">
          {/* Page Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                Platform overview
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                Monitor activity and manage accounts, data and AI settings.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsExportModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-semibold rounded-xl transition cursor-pointer shadow-2xs self-start sm:self-auto"
            >
              <Download className="w-4 h-4 text-slate-600" />
              <span>Export report</span>
            </button>
          </div>

          {/* Demo Workspace Statistics */}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 mb-8">
            {stats.map(({ label, value, icon: Icon, color, path }) => (
              <button
                key={label}
                type="button"
                onClick={() => navigate(path)}
                className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <span
                  className={`grid h-12 w-12 place-items-center rounded-xl ${color}`}
                >
                  <Icon size={23} />
                </span>
                <span>
                  <span className="block text-sm text-slate-500">{label}</span>
                  <strong className="mt-1 block text-2xl text-slate-900">
                    {value}
                  </strong>
                </span>
              </button>
            ))}
          </div>

          {/* Main Content Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* LEFT COLUMN */}
            <div className="lg:col-span-8 flex flex-col gap-6">
              {/* AI Generations Per Day Chart */}
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-base font-bold text-slate-900">
                    AI generations per day
                  </h2>
                  <span className="text-xs font-medium text-slate-400">
                    Last 7 days
                  </span>
                </div>

                <div className="h-56 flex items-end justify-between gap-3 px-2 sm:px-6 pb-2">
                  {GENERATION_STATS_WEEK.map((item) => {
                    const maxVal = 80;
                    const heightPercent = (item.count / maxVal) * 100;

                    return (
                      <div
                        key={item.day}
                        className="flex-1 flex flex-col items-center gap-2 h-full justify-end group"
                      >
                        <span className="text-xs font-semibold text-slate-600 group-hover:text-blue-600 transition-colors">
                          {item.count}
                        </span>
                        <div
                          style={{ height: `${heightPercent}%` }}
                          className={`w-full max-w-[48px] rounded-lg transition-all duration-300 ${
                            item.isHighlight
                              ? 'bg-blue-600 hover:bg-blue-700 shadow-sm'
                              : 'bg-blue-400/80 hover:bg-blue-500/90'
                          }`}
                        />
                        <span className="text-xs font-medium text-slate-500 pt-1">
                          {item.day}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Recent Account Activity */}
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6">
                <h2 className="text-base font-bold text-slate-900 mb-5">
                  Recent account activity
                </h2>

                <div className="divide-y divide-slate-100">
                  {INITIAL_RECENT_ACTIVITY.map((act) => (
                    <div
                      key={act.id}
                      className="py-3.5 flex items-center justify-between gap-4 first:pt-0 last:pb-0"
                    >
                      <span className="text-sm font-medium text-slate-800">
                        {act.title}
                      </span>

                      <div className="flex items-center gap-4 shrink-0">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${getRoleBadgeStyle(
                            act.role
                          )}`}
                        >
                          {act.role}
                        </span>
                        <span className="text-xs text-slate-400 w-16 text-right">
                          {act.time}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Activity from Demo Workspace */}
              <AdminCard title="Recent demo activity">
                <div className="divide-y divide-slate-100">
                  {activity.map(([message, role, time], index) => (
                    <div
                      key={`${message}-${index}`}
                      className="flex flex-wrap items-center justify-between gap-2 py-3 first:pt-0 last:pb-0"
                    >
                      <span className="text-sm font-medium text-slate-700">
                        {message}
                      </span>
                      <span className="flex items-center gap-3 text-xs text-slate-400">
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-600">
                          {role}
                        </span>
                        {time}
                      </span>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => navigate('/admin-reports?tab=log')}
                  className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-blue-600"
                >
                  View activity log <ArrowRight size={15} />
                </button>
              </AdminCard>
            </div>

            {/* RIGHT COLUMN */}
            <div className="lg:col-span-4 flex flex-col gap-6">
              {/* System Health */}
              <AdminCard title="System health">
                <div className="divide-y divide-slate-100">
                  {[
                    [
                      'AI service',
                      'Operational',
                      'bg-emerald-100 text-emerald-700',
                    ],
                    [
                      'Video call service',
                      'Operational',
                      'bg-emerald-100 text-emerald-700',
                    ],
                    [
                      'File storage',
                      '62% used',
                      'bg-amber-100 text-amber-700',
                    ],
                  ].map(([name, status, style]) => (
                    <div
                      key={name}
                      className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
                    >
                      <span className="text-sm text-slate-600">{name}</span>
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${style}`}
                      >
                        {status}
                      </span>
                    </div>
                  ))}
                </div>
              </AdminCard>

              {/* Quick Actions */}
              <AdminCard title="Quick actions">
                <div className="grid gap-2">
                  <AdminButton onClick={() => navigate('/admin-users')}>
                    Invite team member
                  </AdminButton>
                  <AdminButton
                    secondary
                    onClick={() => navigate('/admin-users')}
                  >
                    Add supplier partner
                  </AdminButton>
                  <AdminButton
                    secondary
                    onClick={() => navigate('/admin-ai-settings')}
                  >
                    <Sparkles size={16} /> Edit AI prompts
                  </AdminButton>
                </div>
              </AdminCard>

              <AdminCard>
                <p className="flex items-center gap-2 text-sm font-semibold text-amber-800">
                  <Activity size={17} /> 3 items need attention
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Review current platform issues and recent system activity.
                </p>
                <AdminButton
                  secondary
                  className="mt-4"
                  onClick={() => navigate('/admin-reports?tab=issues')}
                >
                  Review reports
                </AdminButton>
              </AdminCard>

              {/* Additional Dashboard Statistics */}
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6">
                <h2 className="text-base font-bold text-slate-900 mb-5">
                  Platform statistics
                </h2>

                <div className="space-y-4">
                  {statCards.map((stat) => (
                    <div
                      key={stat.label}
                      className="flex items-center gap-3"
                    >
                      <div
                        className={`w-10 h-10 rounded-xl ${stat.iconBg} flex items-center justify-center shrink-0`}
                      >
                        {stat.icon}
                      </div>
                      <div>
                        <span className="block text-[11px] font-bold text-slate-400 tracking-wider">
                          {stat.label}
                        </span>
                        <span className="text-xl font-extrabold text-slate-900">
                          {stat.value}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* EXPORT REPORT MODAL */}
          {isExportModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
              <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200/90 shadow-2xl p-6 relative animate-in zoom-in-95 duration-150">
                {/* Modal Header */}
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <h3 className="text-base font-bold text-slate-900">
                    Export report
                  </h3>
                  <button
                    type="button"
                    onClick={() => setIsExportModalOpen(false)}
                    className="w-7 h-7 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition cursor-pointer"
                    aria-label="Close export dialog"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Modal Body */}
                <div className="py-4 space-y-4">
                  <div>
                    <label
                      htmlFor="export-date-range"
                      className="block text-xs font-semibold text-slate-700 mb-1.5"
                    >
                      Date range
                    </label>
                    <div className="relative">
                      <select
                        id="export-date-range"
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

                  <div>
                    <span className="block text-xs font-semibold text-slate-700 mb-2">
                      Format
                    </span>
                    <div className="flex items-center gap-6">
                      <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="radio"
                          name="exportFormatDash"
                          checked={exportFormat === 'PDF'}
                          onChange={() => setExportFormat('PDF')}
                          className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-slate-300"
                        />
                        <span className="text-xs font-medium text-slate-800">
                          PDF
                        </span>
                      </label>

                      <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="radio"
                          name="exportFormatDash"
                          checked={exportFormat === 'CSV'}
                          onChange={() => setExportFormat('CSV')}
                          className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-slate-300"
                        />
                        <span className="text-xs font-medium text-slate-800">
                          CSV
                        </span>
                      </label>
                    </div>
                  </div>

                  {/* Section Checkboxes */}
                  <div className="pt-2 space-y-2.5">
                    <label className="flex items-center gap-2.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={exportOverview}
                        onChange={() => setExportOverview(!exportOverview)}
                        className="w-4 h-4 rounded accent-blue-600"
                      />
                      <span className="text-xs font-medium text-slate-700">
                        Overview
                      </span>
                    </label>

                    <label className="flex items-center gap-2.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={exportActivityLog}
                        onChange={() =>
                          setExportActivityLog(!exportActivityLog)
                        }
                        className="w-4 h-4 rounded accent-blue-600"
                      />
                      <span className="text-xs font-medium text-slate-700">
                        Activity log
                      </span>
                    </label>

                    <label className="flex items-center gap-2.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={exportIssues}
                        onChange={() => setExportIssues(!exportIssues)}
                        className="w-4 h-4 rounded accent-blue-600"
                      />
                      <span className="text-xs font-medium text-slate-700">
                        Issues
                      </span>
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
    </>
  );
};

export default AdminDashboard;
