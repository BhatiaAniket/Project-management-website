import React, { useState, useEffect } from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import DashboardSidebar from './DashboardSidebar';
import DashboardNavbar from './DashboardNavbar';

const EmployeeLayout: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const location = useLocation();

  // Close sidebar on mobile when route changes
  useEffect(() => {
    if (window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  }, [location.pathname]);

  if (!isAuthenticated || user?.role !== 'employee') {
    return <Navigate to="/login" replace />;
  }

  const navItems = [
    { label: 'Overview', path: '/employee/dashboard', icon: 'LayoutGrid' },
    { label: 'Tasks', path: '/employee/tasks', icon: 'CheckSquare' },
    { label: 'Daily Report', path: '/employee/reports', icon: 'FileText' },
    { label: 'Meetings', path: '/employee/meetings', icon: 'Calendar' },
    { label: 'Chat', path: '/employee/chat', icon: 'MessageSquare' },
    { label: 'Files', path: '/employee/files', icon: 'Folder' },
    { label: 'Notifications', path: '/employee/notifications', icon: 'Bell' },
    { label: 'Performance', path: '/employee/performance', icon: 'TrendingUp' },
    { label: 'Profile', path: '/employee/profile', icon: 'User' },
    { label: 'Settings', path: '/employee/settings', icon: 'Settings' }
  ];

  return (
    <div className="flex h-screen bg-background overflow-hidden relative selection:bg-foreground/10">
      <DashboardSidebar 
        isOpen={sidebarOpen} 
        setIsOpen={setSidebarOpen} 
        navItems={navItems}
        baseRoute="/employee"
      />
      
      <div className={`flex-1 flex flex-col transition-all duration-300 ease-in-out w-full ${sidebarOpen ? 'lg:pl-64' : ''}`}>
        <DashboardNavbar 
          toggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          sidebarOpen={sidebarOpen}
        />
        
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-[#f8f9fa] dark:bg-[#0A0A0A]">
          <div className="container mx-auto px-4 py-8 lg:px-8 max-w-7xl animate-fade-in custom-scrollbar">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
};

export default EmployeeLayout;
