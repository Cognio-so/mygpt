import React from 'react';
import { useOutletContext } from '@remix-run/react';
import { ThemeProvider } from '~/context/themeContext';
import type { Theme } from '~/lib/theme';
import AdminSidebar from './AdminSidebar';

interface AdminLayoutProps {
  children: React.ReactNode;
  activePage?: string;
}

interface OutletContext {
  theme?: Theme | null;
}

// Memoize the layout to prevent unnecessary re-renders
export const AdminLayout: React.FC<AdminLayoutProps> = React.memo(({ children, activePage }) => {
  const { theme } = useOutletContext<OutletContext>();
  
  return (
    <ThemeProvider specifiedTheme={theme}>
      <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
        <AdminSidebar activePage={activePage} />
        <main className="flex-1 overflow-hidden">
          {children}
        </main>
      </div>
    </ThemeProvider>
  );
});

export default AdminLayout; 