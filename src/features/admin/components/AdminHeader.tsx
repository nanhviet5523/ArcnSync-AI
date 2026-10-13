import React from 'react';
import { Header } from '@/components/layout';
import type { HeaderProps } from '@/components/layout/Header';

export interface AdminHeaderProps extends Omit<HeaderProps, 'role'> {
  activeTab?: string;
}

export const AdminHeader: React.FC<AdminHeaderProps> = (props) => {
  return <Header role="admin" {...props} />;
};

export default AdminHeader;
