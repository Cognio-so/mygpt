import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link, Form } from '@remix-run/react';
import { useTheme } from '~/context/themeContext';

import {
    IoGridOutline,
    IoFolderOpenOutline,
    IoSettingsOutline,
    IoTimeOutline,
    IoExitOutline,
    IoChevronBackOutline,
    IoChevronForwardOutline,
    IoMenuOutline
} from 'react-icons/io5';

// Define types for props and nav items
interface NavItem {
  id: string;
  label: string;
  icon: JSX.Element;
  path: string;
}

interface UserSidebarProps {
  activePage?: string;
  onNavigate?: (itemId: string) => void;
}

const UserSidebar: React.FC<UserSidebarProps> = ({ activePage, onNavigate }) => {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { theme } = useTheme();
  
  // Get current active page from URL
  const getCurrentPage = () => {
    const path = location.pathname;
    if (path === '/user' || path === '/user/' || path === '/dashboard') return 'dashboard';
    if (path.includes('/user/setting')) return 'settings';
    if (path.includes('/user/history')) return 'history';
    return 'dashboard';
  };

  const currentActivePage = activePage || getCurrentPage();

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setIsCollapsed(true);
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const handleNavigation = (itemId: string, path: string) => {
    navigate(path);
    
    if (onNavigate) {
      onNavigate(itemId);
    }

    if (window.innerWidth < 768 && isMobileMenuOpen) {
      toggleMobileMenu();
    }
  };

  const navItems: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <IoGridOutline size={20} />, path: '/dashboard' },
    { id: 'settings', label: 'Settings', icon: <IoSettingsOutline size={20} />, path: '/user/setting' },
    { id: 'history', label: 'History', icon: <IoTimeOutline size={20} />, path: '/user/history' },
  ];

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
          <div className={`px-4 py-6 mb-4 flex ${isCollapsed ? 'justify-center' : 'justify-between'} items-center`}>
            {!isCollapsed && <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              <div className="flex items-center">
                <img
                  src="/logo-light.png"
                  alt="MY-GPT"
                  className="h-10 w-10 mr-3 dark:hidden"
                />
                <img
                  src="/logo-dark.png"
                  alt="MY-GPT"
                  className="h-10 w-10 mr-3 hidden dark:block"
                />
                <span className="text-xl font-bold text-gray-900 dark:text-white">MY-GPT</span>
              </div>
            </h1>}
            <button
              onClick={toggleSidebar}
              className="rounded-full p-1.5 bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-white hover:bg-gray-200 dark:hover:bg-white/20 transition-colors hidden md:flex items-center justify-center"
            >
              {isCollapsed ? <IoChevronForwardOutline size={16} /> : <IoChevronBackOutline size={16} />}
            </button>
          </div>

          <div className="flex flex-col space-y-1 px-2">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleNavigation(item.id, item.path)}
                className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-start'} w-full px-4 py-3 rounded-lg text-left transition-colors ${currentActivePage === item.id
                  ? 'bg-white dark:bg-white/10 text-black dark:text-white'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-black hover:text-gray-900 dark:hover:text-white'
                }`}
                title={isCollapsed ? item.label : ''}
              >
                <span className="flex items-center justify-center">{item.icon}</span>
                {!isCollapsed && <span className="ml-3">{item.label}</span>}
              </button>
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
};

export default UserSidebar;
