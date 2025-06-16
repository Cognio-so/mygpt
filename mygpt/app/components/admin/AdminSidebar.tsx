import React from 'react';
import { useNavigate, useLocation, Form } from '@remix-run/react';
import {
  LayoutDashboard,
  FolderOpen,
  Users,
  Settings,
  History,
  LogOut,
  Menu,
} from 'lucide-react';

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from '~/components/ui/sidebar';
import { Button } from '~/components/ui/button';
import { FiMenu } from 'react-icons/fi';

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
}

interface AdminSidebarProps {
  activePage?: string;
  onNavigate?: (itemId: string) => void;
  children: React.ReactNode;
}

const AdminSidebarComponent: React.FC<Omit<AdminSidebarProps, 'children'>> = ({ 
  activePage, 
  onNavigate 
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { state } = useSidebar();

  const getCurrentPage = () => {
    const path = location.pathname;
    if (path === '/admin' || path === '/admin/') return 'dashboard';
    if (path.includes('/admin/collection')) return 'collections';
    if (path.includes('/admin/create-gpt')) return 'collections';
    if (path.includes('/admin/edit-gpt')) return 'collections';
    if (path.includes('/admin/team')) return 'team';
    if (path.includes('/admin/setting')) return 'settings';
    if (path.includes('/admin/history')) return 'history';
    return 'dashboard';
  };

  const currentActivePage = activePage || getCurrentPage();

  const handleNavigation = (itemId: string, path: string) => {
    navigate(path);
    
    if (onNavigate) {
      onNavigate(itemId);
    }
  };

  const navItems: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/admin' },
    { id: 'collections', label: 'Collections', icon: FolderOpen, path: '/admin/collection' },
    { id: 'team', label: 'Team', icon: Users, path: '/admin/team' },
    { id: 'settings', label: 'Settings', icon: Settings, path: '/admin/setting' },
    { id: 'history', label: 'History', icon: History, path: '/admin/history' },
  ];

  return (
    <Sidebar variant="inset" collapsible="icon">
      <SidebarHeader>
        {state === "expanded" ? (
          // Expanded state - show full header with logo and toggle
          <div className="flex items-center justify-between">
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton size="lg" asChild>
                  <div className="flex items-center">
                    <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                      <span className="text-lg font-bold">M</span>
                    </div>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-semibold">MyGPT</span>
                      <span className="truncate text-xs text-sidebar-foreground/50">Admin Panel</span>
                    </div>
                  </div>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
            <SidebarTrigger className="ml-auto" />
          </div>
        ) : (
          // Collapsed state - show only the logo icon
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" asChild tooltip="MyGPT Admin">
                <div className="flex items-center justify-center">
                  <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                    <span className="text-lg font-bold">M</span>
                  </div>
                </div>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        )}
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.id} className='py-2'>
                  <SidebarMenuButton
                    asChild
                    isActive={currentActivePage === item.id}
                    tooltip={item.label}
                    className='text-lg rounded-lg p-2 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                  >
                    <button onClick={() => handleNavigation(item.id, item.path)}>
                      <item.icon />
                      <span>{item.label}</span>
                    </button>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        {state === "collapsed" ? (
          // Collapsed state - show prominent toggle button at bottom
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip="Expand Sidebar">
                <SidebarTrigger className="w-full h-10 hover:bg-sidebar-accent rounded-lg">
                  <FiMenu size={20} />
                </SidebarTrigger>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <Form method="post" action="/logout">
                <SidebarMenuButton asChild tooltip="Logout">
                  <Button 
                    type="submit" 
                    variant="ghost" 
                    className="w-full justify-center p-2"
                  >
                    <LogOut />
                  </Button>
                </SidebarMenuButton>
              </Form>
            </SidebarMenuItem>
          </SidebarMenu>
        ) : (
          // Expanded state - show normal logout button
          <SidebarMenu>
            <SidebarMenuItem>
              <Form method="post" action="/logout">
                <SidebarMenuButton asChild tooltip="Logout">
                  <Button 
                    type="submit" 
                    variant="ghost" 
                    className="w-full justify-start"
                  >
                    <LogOut />
                    <span>Logout</span>
                  </Button>
                </SidebarMenuButton>
              </Form>
            </SidebarMenuItem>
          </SidebarMenu>
        )}
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
};

export const AdminSidebarWithProvider: React.FC<AdminSidebarProps> = ({
  activePage,
  onNavigate,
  children
}) => {
  return (
    <SidebarProvider>
      <AdminSidebarComponent activePage={activePage} onNavigate={onNavigate} />
      <SidebarInset>
        <div className="flex flex-1 flex-col gap-4 p-4">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
};

export default AdminSidebarWithProvider;