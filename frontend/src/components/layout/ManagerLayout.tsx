import React from 'react';
import { Outlet } from 'react-router-dom';
import DashboardSidebar from './DashboardSidebar';
import DashboardNavbar from './DashboardNavbar';

const ManagerLayout: React.FC = () => {
  const navItems = [
    { label: 'Overview', path: '/manager/dashboard', icon: 'LayoutGrid' },
    { label: 'Projects', path: '/manager/projects', icon: 'FolderKanban' },
    { label: 'Tasks', path: '/manager/tasks', icon: 'CheckSquare' },
    { label: 'Employees', path: '/manager/employees', icon: 'Users' },
    { label: 'Daily Reports', path: '/manager/reports', icon: 'FileText' },
    { label: 'Performance', path: '/manager/performance', icon: 'TrendingUp' },
    { label: 'Meetings', path: '/manager/meetings', icon: 'Calendar' },
    { label: 'Chat', path: '/manager/chat', icon: 'MessageSquare' },
    { label: 'Notifications', path: '/manager/notifications', icon: 'Bell' },
    { label: 'Profile', path: '/manager/profile', icon: 'User' },
    { label: 'Settings', path: '/manager/settings', icon: 'Settings' }
  ];

  return (
    <div className="flex min-h-screen bg-background">
      <DashboardSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <DashboardNavbar />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default ManagerLayout;
