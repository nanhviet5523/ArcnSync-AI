import React, { useRef } from 'react';
import {
  Search,
  Plus,
  Lock,
  Check,
  ChevronDown,
  CheckCircle,
  AlertCircle,
  X,
} from 'lucide-react';
import { Header, Footer } from '@/components/layout';
import { useAdminUsers } from '@/features/admin/hooks/useAdminUsers';
import type { AdminRole, UserFilterCategory } from '@/types/admin';

export const AdminUsersRoles: React.FC = () => {
  const {
    filteredUsers,
    totalCount,
    pendingCount,
    activeCategory,
    setActiveCategory,
    searchQuery,
    setSearchQuery,
    fullName,
    setFullName,
    workEmail,
    setWorkEmail,
    emailError,
    setEmailError,
    role,
    setRole,
    permissions,
    togglePermission,
    handleInviteUser,
    notification,

    // Drawer
    selectedUser,
    isDrawerOpen,
    openEditDrawer,
    closeEditDrawer,
    editRole,
    setEditRole,
    editPermissions,
    toggleEditPermission,
    handleSaveEdit,
    handleSendPasswordReset,

    // Deactivate Modal
    userToDeactivate,
    isDeactivateModalOpen,
    openDeactivateModal,
    closeDeactivateModal,
    handleConfirmDeactivate,
  } = useAdminUsers();

  const inviteCardRef = useRef<HTMLDivElement>(null);
  const fullNameInputRef = useRef<HTMLInputElement>(null);

  const scrollToInvite = () => {
    inviteCardRef.current?.scrollIntoView({ behavior: 'smooth' });
    fullNameInputRef.current?.focus();
  };

  const filterTabs: { label: string; key: UserFilterCategory; count?: number }[] = [
    { label: totalCount > 8 ? `All ${214 + (totalCount - 8)}` : 'All 214', key: 'all' },
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
      case 'Deactivated':
      case 'Suspended':
        return 'bg-rose-50 text-rose-700';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/60 font-sans flex flex-col justify-between relative">
      {/* Admin Top Navigation Header */}
      <Header role="admin" activeTab="users" />

      {/* Main Content Area */}
      <main className="w-full max-w-[1440px] mx-auto px-6 lg:px-12 py-8 flex-1">
        {/* Toast Notification */}
        {notification && (
          <div
            className={`mb-6 p-4 rounded-xl flex items-center gap-3 transition-all shadow-xs ${
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
            <span className="text-[11px] font-bold tracking-wider text-blue-600 uppercase mb-1 block">
              Admin · Accounts
            </span>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              Users &amp; roles
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
            <div className="flex flex-col gap-3 mb-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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

              {/* Sub-filter pill: Pending invitations */}
              <div>
                <button
                  type="button"
                  onClick={() =>
                    setActiveCategory(activeCategory === 'pending' ? 'all' : 'pending')
                  }
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold transition cursor-pointer border ${
                    activeCategory === 'pending'
                      ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span>Pending invitations</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                      activeCategory === 'pending'
                        ? 'bg-slate-800 text-white'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {pendingCount}
                  </span>
                </button>
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
                        onClick={() => openEditDrawer(user)}
                        title="Click to view & edit user"
                        className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                      >
                        {/* Name + Avatar */}
                        <td className="py-4 px-3">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-8 h-8 rounded-full ${user.avatarBgColor} text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs select-none`}
                            >
                              {user.avatar}
                            </div>
                            <span className="font-semibold text-slate-900 text-sm whitespace-nowrap group-hover:text-blue-600 transition-colors">
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

              <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900">
                The available API only searches registered, active customer accounts. There is no endpoint to send a project invitation or add a customer to a project yet.
              </p>
              <a href="/customers" className="text-sm font-semibold text-blue-700 hover:text-blue-800">Browse active customer accounts</a>

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
                    onChange={(e) => {
                      setWorkEmail(e.target.value);
                      if (emailError) setEmailError(null);
                    }}
                    placeholder="e.g. trang@archsync.vn"
                    className={`w-full px-3.5 py-2.5 border rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none transition ${
                      emailError
                        ? 'border-rose-400 focus:border-rose-500 ring-1 ring-rose-200'
                        : 'border-slate-200 focus:ring-1 focus:ring-blue-500 focus:border-blue-500'
                    }`}
                  />
                  {emailError && (
                    <p className="text-xs text-rose-600 mt-1.5 font-medium">
                      {emailError}
                    </p>
                  )}
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
                  disabled
                  className="mt-2 w-full py-3 bg-slate-300 text-slate-600 font-semibold text-sm rounded-xl flex items-center justify-center gap-2 cursor-not-allowed"
                >
                  <Lock className="w-4 h-4" />
                  <span>Invitation API unavailable</span>
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

      {/* Screen 3: Edit User Drawer (Slide-over from right) */}
      {isDrawerOpen && selectedUser && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop Overlay */}
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-[1px] transition-opacity"
            onClick={closeEditDrawer}
          />

          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-300">
              {/* Drawer Content */}
              <div className="p-6">
                {/* Drawer Header */}
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <h2 className="text-lg font-bold text-slate-900">Edit user</h2>
                  <button
                    type="button"
                    onClick={closeEditDrawer}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* User Summary Box */}
                <div className="mt-6 flex items-start gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div
                    className={`w-12 h-12 rounded-full ${selectedUser.avatarBgColor} text-white font-bold text-base flex items-center justify-center shrink-0 shadow-2xs`}
                  >
                    {selectedUser.avatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-bold text-slate-900 truncate">
                      {selectedUser.name}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5 truncate">
                      {selectedUser.email}
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${getStatusBadgeStyle(
                          selectedUser.status
                        )}`}
                      >
                        {selectedUser.status}
                      </span>
                      <span className="text-xs text-slate-400">
                        Last active {selectedUser.lastActive}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Role Field */}
                <div className="mt-6">
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    Role
                  </label>
                  <div className="relative">
                    <select
                      value={editRole}
                      onChange={(e) => setEditRole(e.target.value as AdminRole)}
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

                {/* Permissions Toggles */}
                <div className="mt-6">
                  <label className="block text-xs font-medium text-slate-700 mb-3">
                    Permissions
                  </label>
                  <div className="space-y-4">
                    {permissionOptions.map((perm) => {
                      const isChecked = editPermissions.includes(perm);
                      return (
                        <div
                          key={perm}
                          className="flex items-center justify-between text-xs text-slate-700 font-medium"
                        >
                          <span>{perm}</span>
                          <button
                            type="button"
                            role="switch"
                            aria-checked={isChecked}
                            onClick={() => toggleEditPermission(perm)}
                            className={`relative h-6 w-11 rounded-full transition-colors cursor-pointer ${
                              isChecked ? 'bg-blue-600' : 'bg-slate-200'
                            }`}
                          >
                            <span
                              className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-transform ${
                                isChecked ? 'left-6' : 'left-1'
                              }`}
                            />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Drawer Actions */}
              <div className="p-6 border-t border-slate-100 flex flex-col gap-3">
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-sm rounded-xl shadow-xs transition cursor-pointer"
                >
                  Save changes
                </button>

                <button
                  type="button"
                  onClick={handleSendPasswordReset}
                  className="w-full py-2.5 bg-white border border-slate-200 hover:bg-slate-50 active:bg-slate-100 text-slate-700 font-semibold text-sm rounded-xl transition cursor-pointer"
                >
                  Send password reset
                </button>

                <button
                  type="button"
                  onClick={() => openDeactivateModal(selectedUser)}
                  className="w-full py-2.5 bg-white border border-rose-200 hover:bg-rose-50 text-rose-600 font-semibold text-sm rounded-xl transition cursor-pointer"
                >
                  Deactivate account
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Screen 5: Deactivate Confirmation Modal */}
      {isDeactivateModalOpen && userToDeactivate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-[1px] transition-opacity"
            onClick={closeDeactivateModal}
          />

          {/* Dialog Card */}
          <div className="relative bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 z-10 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-2">
              <h3 className="text-lg font-bold text-slate-900">
                Deactivate {userToDeactivate.name}?
              </h3>
              <button
                type="button"
                onClick={closeDeactivateModal}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-slate-600 mt-2 leading-relaxed">
              They can no longer sign in. Their projects and history stay.
            </p>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={closeDeactivateModal}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-sm rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeactivate}
                className="px-4 py-2 border border-rose-300 hover:bg-rose-50 text-rose-600 font-semibold text-sm rounded-xl transition cursor-pointer"
              >
                Deactivate
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
};
