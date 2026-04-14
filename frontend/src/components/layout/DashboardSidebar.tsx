import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Users,
  FolderKanban,
  BarChart3,
  CalendarClock,
  MessageCircle,
  Bell,
  Settings,
  ChevronLeft,
  ChevronRight,
  FolderOpen
} from 'lucide-react';

const companyNavItems = [
  { label: 'Overview', icon: LayoutDashboard, path: '/company/dashboard' },
  { label: 'People', icon: Users, path: '/company/people' },
  { label: 'Projects', icon: FolderKanban, path: '/company/projects' },
  { label: 'Performance', icon: BarChart3, path: '/company/performance' },
  { label: 'Meetings', icon: CalendarClock, path: '/company/meetings' },
  { label: 'Chat', icon: MessageCircle, path: '/company/chat' },
  { label: 'Notifications', icon: Bell, path: '/company/notifications' },
  { label: 'Settings', icon: Settings, path: '/company/settings' },
];

const managerNavItems = [
  { label: 'Overview', icon: LayoutDashboard, path: '/manager/dashboard' },
  { label: 'Projects', icon: FolderKanban, path: '/manager/projects' },
  { label: 'Tasks', icon: LayoutDashboard /* wait, task icon */, path: '/manager/tasks' },
  { label: 'Employees', icon: Users, path: '/manager/employees' },
  { label: 'Daily Reports', icon: BarChart3 /* icon */, path: '/manager/reports' },
  { label: 'Performance', icon: BarChart3, path: '/manager/performance' },
  { label: 'Meetings', icon: CalendarClock, path: '/manager/meetings' },
  { label: 'Files', icon: FolderOpen, path: '/manager/files' },
  { label: 'Chat', icon: MessageCircle, path: '/manager/chat' },
  { label: 'Notifications', icon: Bell, path: '/manager/notifications' },
  { label: 'Profile', icon: Users, path: '/manager/profile' },
  { label: 'Settings', icon: Settings, path: '/manager/settings' },
];

const employeeNavItems = [
  { label: 'Overview', icon: LayoutDashboard, path: '/employee/dashboard' },
  { label: 'Tasks', icon: LayoutDashboard, path: '/employee/tasks' },
  { label: 'Daily Report', icon: BarChart3, path: '/employee/reports' },
  { label: 'Meetings', icon: CalendarClock, path: '/employee/meetings' },
  { label: 'Chat', icon: MessageCircle, path: '/employee/chat' },
  { label: 'Files', icon: FolderKanban, path: '/employee/files' },
  { label: 'Notifications', icon: Bell, path: '/employee/notifications' },
  { label: 'Performance', icon: BarChart3, path: '/employee/performance' },
  { label: 'Profile', icon: Users, path: '/employee/profile' },
  { label: 'Settings', icon: Settings, path: '/employee/settings' },
];

const DashboardSidebar: React.FC = () => {
  const { user } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  const navItems = user?.role === 'manager' ? managerNavItems : user?.role === 'employee' ? employeeNavItems : companyNavItems;
  const dashboardRoot = user?.role === 'manager' ? '/manager/dashboard' : user?.role === 'employee' ? '/employee/dashboard' : '/company/dashboard';

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 72 : 260 }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      className="h-screen sticky top-0 flex flex-col border-r border-border bg-card z-40"
    >
      {/* Logo */}
      <div className="h-16 flex items-center px-4 border-b border-border shrink-0">
        <AnimatePresence mode="wait">
          {!collapsed ? (
            <motion.span
              key="full-logo"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="font-heading text-xl font-bold tracking-tight text-foreground whitespace-nowrap"
            >
              CognifyPM
            </motion.span>
          ) : (
            <motion.span
              key="icon-logo"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="font-heading text-xl font-bold text-foreground mx-auto"
            >
              C
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* Nav Items */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path ||
            (item.path !== dashboardRoot && location.pathname.startsWith(item.path));

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${isActive
                  ? 'bg-foreground text-background'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                }`}
            >
              <item.icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-background' : ''}`} />
              <AnimatePresence mode="wait">
                {!collapsed && (
                  <motion.span
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: 'auto' }}
                    exit={{ opacity: 0, width: 0 }}
                    className="whitespace-nowrap overflow-hidden"
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
              {isActive && !collapsed && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Collapse Toggle */}
      <div className="border-t border-border p-2 shrink-0">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
        >
          {collapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
          <AnimatePresence mode="wait">
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="whitespace-nowrap"
              >
                Collapse
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>
    </motion.aside>
  );
};

export default DashboardSidebar;
