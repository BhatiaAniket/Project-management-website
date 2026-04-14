import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, LogOut, User, ChevronDown } from 'lucide-react';
import ThemeToggle from '../ThemeToggle';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { companyAPI } from '../../api/company';

const DashboardNavbar: React.FC = () => {
  const { user, logout } = useAuth();
  const { isConnected } = useSocket();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<any[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchUnread = async () => {
      try {
        const res = await companyAPI.getUnreadCount();
        setUnreadCount(res.data.data.count);
      } catch (e) { /* ignore */ }
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setDropdownOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNotifClick = async () => {
    setNotifOpen(!notifOpen);
    if (!notifOpen) {
      try {
        const res = await companyAPI.listNotifications({ limit: 5 });
        setNotifications(res.data.data.notifications || []);
      } catch (e) { /* ignore */ }
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const initials = user?.fullName
    ?.split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'CA';

  const getNotifRoute = () => user?.role === 'manager' ? '/manager/notifications' : '/company/notifications';

  const getProfileRoute = () => user?.role === 'manager' ? '/manager/profile' : '/company/settings';

  return (
    <header className="h-16 border-b border-border bg-card/80 backdrop-blur-xl sticky top-0 z-30 flex items-center justify-between px-6">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-muted-foreground'}`} />
          <span className="text-sm font-medium text-muted-foreground hidden md:inline">
            {user?.companyName || 'Company Dashboard'}
          </span>
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center gap-3">
        <ThemeToggle />

        {/* Notifications */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={handleNotifClick}
            className="relative p-2 rounded-xl hover:bg-muted/60 transition-colors"
          >
            <Bell className="w-5 h-5 text-muted-foreground" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4.5 h-4.5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center min-w-[18px] h-[18px] px-1">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          <AnimatePresence>
            {notifOpen && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 top-full mt-2 w-80 rounded-2xl border border-border bg-card shadow-lg overflow-hidden z-50"
              >
                <div className="p-3 border-b border-border flex items-center justify-between">
                  <span className="text-sm font-semibold">Notifications</span>
                  <button
                    onClick={() => navigate(getNotifRoute())}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    View all
                  </button>
                </div>
                <div className="max-h-[300px] overflow-y-auto">
                  {notifications.length === 0 ? (
                    <p className="text-sm text-muted-foreground p-4 text-center">No notifications</p>
                  ) : (
                    notifications.map((n: any) => (
                      <div
                        key={n._id}
                        className={`px-4 py-3 border-b border-border last:border-0 hover:bg-muted/40 transition-colors cursor-pointer ${!n.isRead ? 'bg-muted/20' : ''
                          }`}
                      >
                        <p className="text-sm font-medium">{n.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{n.message}</p>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* User Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-muted/60 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-foreground text-background flex items-center justify-center text-xs font-bold">
              {initials}
            </div>
            <span className="text-sm font-medium hidden md:inline">{user?.fullName?.split(' ')[0]}</span>
            <ChevronDown className="w-4 h-4 text-muted-foreground hidden md:inline" />
          </button>

          <AnimatePresence>
            {dropdownOpen && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 top-full mt-2 w-48 rounded-2xl border border-border bg-card shadow-lg overflow-hidden z-50"
              >
                <button
                  onClick={() => { navigate(getProfileRoute()); setDropdownOpen(false); }}
                  className="w-full text-left px-4 py-3 text-sm hover:bg-muted/40 transition-colors flex items-center gap-2"
                >
                  <User className="w-4 h-4" /> Profile
                </button>
                <div className="h-px bg-border" />
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-3 text-sm hover:bg-muted/40 transition-colors flex items-center gap-2 text-red-500"
                >
                  <LogOut className="w-4 h-4" /> Logout
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
};

export default DashboardNavbar;
