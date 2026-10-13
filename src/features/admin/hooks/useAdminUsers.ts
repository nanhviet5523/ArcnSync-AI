import { useState, useMemo } from 'react';
import { adminService, INITIAL_ADMIN_USERS } from '@/features/admin/services/adminService';
import type { AdminUser, AdminRole, UserFilterCategory, InviteUserPayload } from '@/types/admin';

export const useAdminUsers = () => {
  const [users, setUsers] = useState<AdminUser[]>(INITIAL_ADMIN_USERS);
  const [activeCategory, setActiveCategory] = useState<UserFilterCategory>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Form states matching Figma screenshot
  const [fullName, setFullName] = useState('Le Trang');
  const [workEmail, setWorkEmail] = useState('trang@archsync.vn');
  const [role, setRole] = useState<AdminRole>('Designer');
  const [permissions, setPermissions] = useState<string[]>([
    'Edit designs & versions',
    'Use the AI design tool',
    'See budget & BOM',
  ]);

  const togglePermission = (permissionLabel: string) => {
    setPermissions((prev) =>
      prev.includes(permissionLabel)
        ? prev.filter((item) => item !== permissionLabel)
        : [...prev, permissionLabel]
    );
  };

  const handleInviteUser = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!fullName.trim() || !workEmail.trim()) {
      setNotification({ message: 'Please provide full name and work email.', type: 'error' });
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: InviteUserPayload = {
        fullName: fullName.trim(),
        workEmail: workEmail.trim(),
        role,
        permissions,
      };

      const newUser = await adminService.inviteUser(payload);
      setUsers((prev) => [newUser, ...prev]);
      setNotification({
        message: `Invitation successfully sent to ${payload.workEmail}!`,
        type: 'success',
      });

      // Clear or reset notification after 4s
      setTimeout(() => {
        setNotification(null);
      }, 4000);
    } catch {
      setNotification({ message: 'Failed to send invitation. Please try again.', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

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
    setNotification,
  };
};
