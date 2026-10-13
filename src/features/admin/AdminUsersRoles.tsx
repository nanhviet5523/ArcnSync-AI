import React, { useRef } from 'react';
import { Search, Plus, ArrowRight, Lock, Check, ChevronDown, CheckCircle, AlertCircle } from 'lucide-react';
import { AdminHeader } from '@/features/admin/components/AdminHeader';
import { Footer } from '@/components/layout/Footer';
import { useAdminUsers } from '@/features/admin/hooks/useAdminUsers';
import type { AdminRole, UserFilterCategory } from '@/types/admin';

export const AdminUsersRoles: React.FC = () => {
  const {
    filteredUsers,
    totalCount,
    activeCategory,
    setActiveCategory,
    searchQuery,
    setSearchQuery,
    fullName,
    setFullName,
    workEmail,
    setWorkEmail,
    role,
    setRole,
    permissions,
    togglePermission,
    handleInviteUser,
    isSubmitting,
    notification,
  } = useAdminUsers();

  const inviteCardRef = useRef<HTMLDivElement>(null);
  const fullNameInputRef = useRef<HTMLInputElement>(null);

  const scrollToInvite = () => {
    inviteCardRef.current?.scrollIntoView({ behavior: 'smooth' });
    fullNameInputRef.current?.focus();
  };

  const filterTabs: { label: string; key: UserFilterCategory; count?: number }[] = [
    { label: totalCount > 6 ? `All ${214 + (totalCount - 6)}` : 'All 214', key: 'all' },
    { label: 'Homeowners', key: 'homeowners' },
    { label: 'Company team', key: 'company' },
    { label: 'Suppliers', key: 'suppliers' },
  ];

  const permissionOptions = [
    'Edit designs & versions',
    'Use the AI design tool',
    'See budget & BOM',
    'Create contracts',
  ];

  const getRoleBadgeStyle = (userRole: AdminRole) => {
    switch (userRole) {
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

  const getStatusBadgeStyle = (status: string) => {
    switch (status) {
      case 'Active':
        return 'bg-emerald-50 text-emerald-700';
      case 'Invited':
        return 'bg-amber-50 text-amber-700';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/60 font-sans flex flex-col justify-between">
      {/* Admin Top Navigation Header */}
      <AdminHeader activeTab="users" />

      {/* Main Content Area */}
      <main className="w-full max-w-[1440px] mx-auto px-6 lg:px-12 py-8 flex-1">
        {/* Toast Notification */}
        {notification && (
          <div
            className={`mb-6 p-4 rounded-xl flex items-center gap-3 transition-all ${
              notification.type === 'success'
                ? 'bg-emerald-50 border border-emerald-200 text-emerald-900'
                : 'bg-rose-50 border border-rose-200 text-rose-900'
            }`}
          >
            {notification.type === 'success' ? (
              <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            )}
            <span className="text-sm font-medium">{notification.message}</span>
          </div>
        )}

        {/* Page Title & Invite User Action Button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              Users & roles
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Create accounts for the company team and supplier partners. Homeowners sign up themselves.
            </p>
          </div>

          <button
            type="button"
            onClick={scrollToInvite}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-semibold rounded-xl shadow-xs transition cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Invite user</span>
          </button>
        </div>

        {/* 2-Column Responsive Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* LEFT COLUMN: Users Table Card (8 cols) */}
          <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6">
            {/* Top Toolbar: Category Filters & Search Box */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              {/* Category Pills */}
              <div className="flex items-center flex-wrap gap-1 p-1 bg-slate-100/70 rounded-xl w-fit">
                {filterTabs.map((tab) => {
                  const isActive = activeCategory === tab.key;
                  return (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setActiveCategory(tab.key)}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                        isActive
                          ? 'bg-white text-slate-900 shadow-2xs'
                          : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              {/* Search Users Input */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search users"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full sm:w-56 pl-9 pr-3.5 py-1.5 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition"
                />
              </div>
            </div>

            {/* Users Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    <th className="py-3 px-3">Name</th>
                    <th className="py-3 px-3">Email</th>
                    <th className="py-3 px-3">Role</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3 text-right sm:text-left">Last Active</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {filteredUsers.length > 0 ? (
                    filteredUsers.map((user) => (
                      <tr
                        key={user.id}
                        className="hover:bg-slate-50/70 transition-colors group"
                      >
                        {/* Name + Avatar */}
                        <td className="py-4 px-3">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-8 h-8 rounded-full ${user.avatarBgColor} text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs select-none`}
                            >
                              {user.avatar}
                            </div>
                            <span className="font-semibold text-slate-900 text-sm whitespace-nowrap">
                              {user.name}
                            </span>
                          </div>
                        </td>

                        {/* Email */}
                        <td className="py-4 px-3 text-xs text-slate-600 whitespace-nowrap">
                          {user.email}
                        </td>

                        {/* Role Badge */}
                        <td className="py-4 px-3 whitespace-nowrap">
                          <span
                            className={`px-3 py-0.5 rounded-full text-xs font-semibold inline-block ${getRoleBadgeStyle(
                              user.role
                            )}`}
                          >
                            {user.role}
                          </span>
                        </td>

                        {/* Status Badge */}
                        <td className="py-4 px-3 whitespace-nowrap">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-xs font-semibold inline-block ${getStatusBadgeStyle(
                              user.status
                            )}`}
                          >
                            {user.status}
                          </span>
                        </td>

                        {/* Last Active */}
                        <td className="py-4 px-3 text-xs text-slate-600 whitespace-nowrap text-right sm:text-left">
                          {user.lastActive}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={5}
                        className="py-12 text-center text-sm text-slate-400"
                      >
                        No users match the search filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* RIGHT COLUMN: Invite User Card & Security Note (4 cols) */}
          <div className="lg:col-span-4 flex flex-col gap-4">
            {/* Invite User Card */}
            <div
              ref={inviteCardRef}
              className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 flex flex-col gap-5"
            >
              {/* Card Header with 'New' Badge */}
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-slate-900">
                  Invite user
                </h2>
                <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-xs font-semibold rounded-full select-none">
                  New
                </span>
              </div>

              {/* Form */}
              <form onSubmit={handleInviteUser} className="flex flex-col gap-4">
                {/* Full Name */}
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    Full name
                  </label>
                  <input
                    ref={fullNameInputRef}
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Le Trang"
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition"
                  />
                </div>

                {/* Work Email */}
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    Work email
                  </label>
                  <input
                    type="email"
                    value={workEmail}
                    onChange={(e) => setWorkEmail(e.target.value)}
                    placeholder="e.g. trang@archsync.vn"
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition"
                  />
                </div>

                {/* Role Select Dropdown */}
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    Role
                  </label>
                  <div className="relative">
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value as AdminRole)}
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 bg-white appearance-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition"
                    >
                      <option value="Designer">Designer</option>
                      <option value="Staff">Staff</option>
                      <option value="Supplier">Supplier</option>
                      <option value="Homeowner">Homeowner</option>
                    </select>
                    <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                {/* Permissions Checkboxes */}
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-2.5">
                    Permissions
                  </label>
                  <div className="space-y-2.5">
                    {permissionOptions.map((perm) => {
                      const isChecked = permissions.includes(perm);
                      return (
                        <label
                          key={perm}
                          className="flex items-center gap-2.5 cursor-pointer select-none group"
                          onClick={() => togglePermission(perm)}
                        >
                          <div
                            className={`w-4 h-4 rounded flex items-center justify-center transition-colors ${
                              isChecked
                                ? 'bg-blue-600 text-white'
                                : 'border border-slate-300 bg-white group-hover:border-slate-400'
                            }`}
                          >
                            {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>
                          <span className="text-xs font-medium text-slate-700 group-hover:text-slate-900 transition-colors">
                            {perm}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="mt-2 w-full py-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:bg-blue-400 text-white font-semibold text-sm rounded-xl shadow-xs flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  <ArrowRight className="w-4 h-4" />
                  <span>{isSubmitting ? 'Sending...' : 'Send invitation'}</span>
                </button>
              </form>
            </div>

            {/* Cyan Notice Information Box */}
            <div className="bg-cyan-50/70 border border-cyan-100/90 rounded-2xl p-4 flex items-start gap-3 text-cyan-950 text-xs leading-relaxed shadow-2xs">
              <Lock className="w-4 h-4 text-cyan-700 shrink-0 mt-0.5" />
              <p>
                The user sets a password from an email link. Company team and partners need no CV review.
              </p>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};
