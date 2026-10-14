import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Layers,
  Sparkles,
  AlertTriangle,
  Download,
  UserPlus,
  Box,
  X,
  Check,
  ChevronDown,
} from 'lucide-react';
import { Header, Footer } from '@/components/layout';
import {
  GENERATION_STATS_WEEK,
  INITIAL_RECENT_ACTIVITY,
} from '@/features/admin/services/adminService';
import type { AdminRole } from '@/types/admin';

export const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();

  // Export report modal state (Image 2)
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportDateRange, setExportDateRange] = useState('Last 30 days');
  const [exportFormat, setExportFormat] = useState<'PDF' | 'CSV'>('PDF');
  const [exportOverview, setExportOverview] = useState(true);
  const [exportActivityLog, setExportActivityLog] = useState(true);
  const [exportIssues, setExportIssues] = useState(true);

  const handleConfirmExport = () => {
    const filename = `archsync-platform-report-${exportDateRange.toLowerCase().replace(/\s+/g, '-')}.${exportFormat.toLowerCase()}`;
    const content = `ArchSync AI Platform Report\nDate Range: ${exportDateRange}\nFormat: ${exportFormat}\nSections: ${[
      exportOverview && 'Overview',
      exportActivityLog && 'Activity log',
      exportIssues && 'Issues',
    ]
      .filter(Boolean)
      .join(', ')}`;
    const blob = new Blob([content], { type: exportFormat === 'CSV' ? 'text/csv' : 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
    setIsExportModalOpen(false);
  };

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

        {/* 4 Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {statCards.map((stat) => (
            <div
              key={stat.label}
              className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 flex items-center gap-4 transition-transform hover:-translate-y-0.5"
            >
              <div
                className={`w-12 h-12 rounded-2xl ${stat.iconBg} flex items-center justify-center shrink-0`}
              >
                {stat.icon}
              </div>
              <div>
                <span className="block text-[11px] font-bold text-slate-400 tracking-wider">
                  {stat.label}
                </span>
                <span className="text-2xl lg:text-3xl font-extrabold text-slate-900 tracking-tight">
                  {stat.value}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Main Content Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* LEFT COLUMN: Bar Chart & Recent Activity (8 cols) */}
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

              {/* Bar Chart Container */}
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
          </div>

          {/* RIGHT COLUMN: System Health & Quick Actions (4 cols) */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            {/* System Health Card */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6">
              <h2 className="text-base font-bold text-slate-900 mb-5">
                System health
              </h2>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-700">
                    AI service
                  </span>
                  <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 font-semibold text-xs rounded-full">
                    Operational
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-700">
                    Video call service
                  </span>
                  <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 font-semibold text-xs rounded-full">
                    Operational
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-700">
                    File storage
                  </span>
                  <span className="px-2.5 py-0.5 bg-amber-50 text-amber-700 font-semibold text-xs rounded-full">
                    62% used
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Actions Card */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6">
              <h2 className="text-base font-bold text-slate-900 mb-4">
                Quick actions
              </h2>

              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => navigate('/admin/users')}
                  className="w-full py-3 bg-blue-50/80 hover:bg-blue-100 text-blue-600 font-semibold text-xs rounded-xl flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Invite team member</span>
                </button>

                <button
                  type="button"
                  onClick={() => navigate('/admin/users')}
                  className="w-full py-3 bg-blue-50/80 hover:bg-blue-100 text-blue-600 font-semibold text-xs rounded-xl flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  <Box className="w-4 h-4" />
                  <span>Add supplier partner</span>
                </button>

                <button
                  type="button"
                  onClick={() => navigate('/admin/ai-settings')}
                  className="w-full py-3 border border-slate-200 hover:bg-slate-50 text-slate-800 font-semibold text-xs rounded-xl flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-slate-700" />
                  <span>Edit AI prompts</span>
                </button>
              </div>
            </div>
          </div>
        </div>
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
                        name="exportFormatDash"
                        checked={exportFormat === 'PDF'}
                        onChange={() => setExportFormat('PDF')}
                        className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-slate-300"
                      />
                      <span className="text-xs font-medium text-slate-800">PDF</span>
                    </label>

                    <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="radio"
                        name="exportFormatDash"
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
