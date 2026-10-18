import { useState, useMemo } from 'react';
import { adminService, INITIAL_ADMIN_USERS } from '@/features/admin/services/adminService';
import type { AdminUser, AdminRole, UserFilterCategory } from '@/types/admin';

export const useAdminUsers = () => {
  const [users, setUsers] = useState<AdminUser[]>(INITIAL_ADMIN_USERS);
  const [activeCategory, setActiveCategory] = useState<UserFilterCategory>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const isSubmitting = false;
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Form states matching Figma screenshot
  const [fullName, setFullName] = useState('');
  const [workEmail, setWorkEmail] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [role, setRole] = useState<AdminRole>('Designer');
  const [permissions, setPermissions] = useState<string[]>([
    'Edit designs & versions',
    'Use the AI design tool',
    'See budget & BOM',
  ]);

  // Edit User Drawer State
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [editRole, setEditRole] = useState<AdminRole>('Designer');
  const [editPermissions, setEditPermissions] = useState<string[]>([
    'Edit designs & versions',
    'Use the AI design tool',
    'See budget & BOM',
  ]);

  // Deactivate User Modal State
  const [userToDeactivate, setUserToDeactivate] = useState<AdminUser | null>(null);
  const [isDeactivateModalOpen, setIsDeactivateModalOpen] = useState<boolean>(false);

  const togglePermission = (permissionLabel: string) => {
    setPermissions((prev) =>
      prev.includes(permissionLabel)
        ? prev.filter((item) => item !== permissionLabel)
        : [...prev, permissionLabel]
    );
  };

  const toggleEditPermission = (permissionLabel: string) => {
    setEditPermissions((prev) =>
      prev.includes(permissionLabel)
        ? prev.filter((item) => item !== permissionLabel)
        : [...prev, permissionLabel]
    );
  };

  const validateEmail = (emailStr: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(emailStr.trim());
  };

  const handleInviteUser = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!fullName.trim()) {
      setNotification({ message: 'Enter a full name.', type: 'error' });
      return;
    }

    if (!workEmail.trim() || !validateEmail(workEmail)) {
      setEmailError('Enter a valid email address.');
      return;
    }

    setEmailError(null);
    setNotification({
      message: 'Invitation could not be sent. The available API only searches registered active customers; it cannot create an invitation or add a customer to a project.',
      type: 'error',
    });
  };

  // Open Edit Drawer
  const openEditDrawer = (user: AdminUser) => {
    setSelectedUser(user);
    setEditRole(user.role);
    setEditPermissions(
      user.permissions && user.permissions.length > 0
        ? [...user.permissions]
        : ['Edit designs & versions', 'Use the AI design tool', 'See budget & BOM']
    );
    setIsDrawerOpen(true);
  };

  const closeEditDrawer = () => {
    setIsDrawerOpen(false);
    setSelectedUser(null);
  };

  // Save changes from Edit Drawer
  const handleSaveEdit = async () => {
    if (!selectedUser) return;
    try {
      await adminService.updateUser(selectedUser.id, {
        role: editRole,
        permissions: editPermissions,
      });

      setUsers((prev) =>
        prev.map((u) =>
          u.id === selectedUser.id
            ? { ...u, role: editRole, permissions: editPermissions }
            : u
        )
      );

      setNotification({
        message: `Changes for ${selectedUser.name} saved successfully!`,
        type: 'success',
      });
      closeEditDrawer();

      setTimeout(() => {
        setNotification(null);
      }, 3500);
    } catch {
      setNotification({ message: 'Failed to save user changes.', type: 'error' });
    }
  };

  // Send password reset
  const handleSendPasswordReset = async () => {
    if (!selectedUser) return;
    try {
      await adminService.sendPasswordReset(selectedUser.email);
      setNotification({
        message: `Password reset email sent to ${selectedUser.email}!`,
        type: 'success',
      });
      setTimeout(() => {
        setNotification(null);
      }, 3500);
    } catch {
      setNotification({ message: 'Failed to send password reset email.', type: 'error' });
    }
  };

  // Open Deactivate Modal
  const openDeactivateModal = (user: AdminUser) => {
    setUserToDeactivate(user);
    setIsDeactivateModalOpen(true);
  };

  const closeDeactivateModal = () => {
    setIsDeactivateModalOpen(false);
    setUserToDeactivate(null);
  };

  // Confirm Deactivate
  const handleConfirmDeactivate = async () => {
    if (!userToDeactivate) return;
    try {
      await adminService.deactivateUser(userToDeactivate.id);
      setUsers((prev) =>
        prev.map((u) =>
          u.id === userToDeactivate.id ? { ...u, status: 'Deactivated' as const } : u
        )
      );

      setNotification({
        message: `Account ${userToDeactivate.name} has been deactivated.`,
        type: 'success',
      });

      closeDeactivateModal();
      if (isDrawerOpen && selectedUser?.id === userToDeactivate.id) {
        closeEditDrawer();
      }

      setTimeout(() => {
        setNotification(null);
      }, 3500);
    } catch {
      setNotification({ message: 'Failed to deactivate account.', type: 'error' });
    }
  };

  const pendingCount = useMemo(() => {
    return users.filter((u) => u.status === 'Invited').length;
  }, [users]);

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      // 1. Category Filter
      let matchCategory = true;
      if (activeCategory === 'homeowners') {
        matchCategory = u.role === 'Homeowner';
      } else if (activeCategory === 'company') {
        matchCategory = u.role === 'Designer' || u.role === 'Staff';
      } else if (activeCategory === 'suppliers') {
        matchCategory = u.role === 'Supplier';
      } else if (activeCategory === 'pending') {
        matchCategory = u.status === 'Invited';
      }

      // 2. Search Query
      const query = searchQuery.toLowerCase().trim();
      const matchSearch =
        !query ||
        u.name.toLowerCase().includes(query) ||
        u.email.toLowerCase().includes(query) ||
        u.role.toLowerCase().includes(query);

      return matchCategory && matchSearch;
    });
  }, [users, activeCategory, searchQuery]);

  return {
    users,
    filteredUsers,
    totalCount: users.length,
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
    isSubmitting,
    notification,
    setNotification,

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
  };
};
