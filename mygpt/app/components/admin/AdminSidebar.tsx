import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation, Form } from '@remix-run/react';

import {
    IoGridOutline,
    IoFolderOpenOutline,
    IoPeopleOutline,
    IoSettingsOutline,
    IoTimeOutline,
    IoExitOutline,
    IoChevronBackOutline,
    IoChevronForwardOutline,
    IoMenuOutline
} from 'react-icons/io5';

interface NavItem {
  id: string;
  label: string;
  icon: JSX.Element;
  path: string;
}

interface AdminSidebarProps {
  activePage?: string;
  onNavigate?: (itemId: string) => void;
}

const navItems: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: <IoGridOutline size={20} />, path: '/admin' },
  { id: 'collections', label: 'Collections', icon: <IoFolderOpenOutline size={20} />, path: '/admin/collection' },
  { id: 'team', label: 'Team', icon: <IoPeopleOutline size={20} />, path: '/admin/team' },
  { id: 'settings', label: 'Settings', icon: <IoSettingsOutline size={20} />, path: '/admin/setting' },
  { id: 'history', label: 'History', icon: <IoTimeOutline size={20} />, path: '/admin/history' },
];

const NavButton = React.memo(({ 
  item, 
  isActive, 
  isCollapsed, 
  onClick 
}: {
  item: NavItem;
  isActive: boolean;
  isCollapsed: boolean;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-start'} w-full px-4 py-3 rounded-lg text-left transition-colors ${
      isActive
        ? 'bg-white dark:bg-white/10 text-black dark:text-white'
        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-black hover:text-gray-900 dark:hover:text-white'
    }`}
    title={isCollapsed ? item.label : ''}
  >
    <span className="flex items-center justify-center">{item.icon}</span>
    {!isCollapsed && <span className="ml-3">{item.label}</span>}
  </button>
));

// Memoize the logo component
const Logo = React.memo(({ isCollapsed }: { isCollapsed: boolean }) => (
  <div className={`px-4 py-6 mb-4 flex ${isCollapsed ? 'justify-center' : 'justify-between'} items-center`}>
    {!isCollapsed && (
      <h1 className="text-xl font-bold text-gray-900 dark:text-white">
        <div className="flex items-center">
          <img
            src=""
            alt="MY-GPT"
            className="h-10 w-10 mr-3 dark:hidden"
          />
          <img
            src=""
            alt="MY-GPT"
            className="h-10 w-10 mr-3 hidden dark:block"
          />
          <span className="text-xl font-bold text-gray-900 dark:text-white">MY-GPT</span>
        </div>
      </h1>
    )}
  </div>
));

const AdminSidebar: React.FC<AdminSidebarProps> = React.memo(({ activePage, onNavigate }) => {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Memoize the current page calculation
  const getCurrentPage = useCallback(() => {
    const path = location.pathname;
    if (path === '/admin' || path === '/admin/') return 'dashboard';
    if (path.includes('/admin/collection')) return 'collections';
    if (path.includes('/admin/create-gpt')) return 'collections';
    if (path.includes('/admin/edit-gpt')) return 'collections';
    if (path.includes('/admin/team')) return 'team';
    if (path.includes('/admin/setting')) return 'settings';
    if (path.includes('/admin/history')) return 'history';
    return 'dashboard';
  }, [location.pathname]);

  const currentActivePage = activePage || getCurrentPage();

  // Optimize resize handler
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setIsCollapsed(true);
      }
    };

    handleResize(); // Call once on mount
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleSidebar = useCallback(() => {
    setIsCollapsed(prev => !prev);
  }, []);

  const toggleMobileMenu = useCallback(() => {
    setIsMobileMenuOpen(prev => !prev);
  }, []);

  const handleNavigation = useCallback((itemId: string, path: string) => {
    navigate(path);
    
    if (onNavigate) {
      onNavigate(itemId);
    }

    if (window.innerWidth < 768 && isMobileMenuOpen) {
      setIsMobileMenuOpen(false);
    }
  }, [navigate, onNavigate, isMobileMenuOpen]);

  return (
    <>
      <div className="md:hidden fixed top-4 left-4 z-50">
        <button
          onClick={toggleMobileMenu}
          className="rounded-full p-2 bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-white shadow-lg hover:bg-gray-200 dark:hover:bg-gray-700"
        >
          <IoMenuOutline size={24} />
        </button>
      </div>

      {isMobileMenuOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/60 dark:bg-black/80 z-40"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      <div
        className={`fixed md:relative h-screen bg-white dark:bg-[#121212] text-black dark:text-white flex flex-col justify-between transition-all duration-300 ease-in-out z-50 border-r border-gray-200 dark:border-gray-800
          ${isCollapsed ? 'w-[70px]' : 'w-[240px]'}
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
        <div>
          <Logo isCollapsed={isCollapsed} />
          
          {!isCollapsed && (
            <button
              onClick={toggleSidebar}
              className="absolute top-6 right-4 rounded-full p-1.5 bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-white hover:bg-gray-200 dark:hover:bg-white/20 transition-colors hidden md:flex items-center justify-center"
            >
              <IoChevronBackOutline size={16} />
            </button>
          )}
          
          {isCollapsed && (
            <button
              onClick={toggleSidebar}
              className="absolute top-6 right-4 rounded-full p-1.5 bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-white hover:bg-gray-200 dark:hover:bg-white/20 transition-colors hidden md:flex items-center justify-center"
            >
              <IoChevronForwardOutline size={16} />
            </button>
          )}

          <div className="flex flex-col space-y-1 px-2">
            {navItems.map((item) => (
              <NavButton
                key={item.id}
                item={item}
                isActive={currentActivePage === item.id}
                isCollapsed={isCollapsed}
                onClick={() => handleNavigation(item.id, item.path)}
              />
            ))}
          </div>
        </div>

        <div className="px-2 pb-6 mt-auto">
          <Form method="post" action="/logout" className="w-full">
            <button
              type="submit"
              className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-start'} w-full px-4 py-3 text-gray-600 dark:text-gray-400 hover:bg-red-100 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-300 rounded-lg text-left transition-colors`}
              title={isCollapsed ? 'Logout' : ''}
            >
              <span className="flex items-center justify-center"><IoExitOutline size={20} /></span>
              {!isCollapsed && <span className="ml-3">Logout</span>}
            </button>
          </Form>
        </div>
      </div>
    </>
  );
});

export default AdminSidebar;