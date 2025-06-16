import React from 'react';
import { useOutletContext } from '@remix-run/react';
import { AdminSidebarWithProvider } from './AdminSidebar';
import { ThemeProvider } from '~/context/themeContext';
import type { Theme } from '~/lib/theme';

interface AdminLayoutProps {
  children: React.ReactNode;
  activePage?: string;
}

interface OutletContext {
  theme?: Theme | null;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({ children, activePage }) => {
  const { theme } = useOutletContext<OutletContext>();
  
  return (
    <ThemeProvider specifiedTheme={theme}>
      <AdminSidebarWithProvider activePage={activePage}>
        {children}
      </AdminSidebarWithProvider>
    </ThemeProvider>
  );
};

export default AdminLayout; 