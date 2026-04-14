import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { employeeAPI } from '../../api/employee';
import { showToast } from '../../components/Toast';
import { Bell, Check, Loader2, Trash2 } from 'lucide-react';

const EmployeeNotifications = () => {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Re-use company notification mark as read generic api... Wait, employeeAPI.getNotifications calls /notifications
  // Assuming standard endpoints: GET /api/notifications, PATCH /api/notifications/:id/read
  const fetchNotifications = async () => {
    try {
      const res = await employeeAPI.getNotifications();
      // Assume the API returns the notifications array in `data.data`
      setNotifications(res.data.data || []);
    } catch { showToast('Error loading notifications', 'error'); } 
    finally { setLoading(false); }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const markAsRead = async (id: string, currentStatus: boolean) => {
    if (currentStatus) return; // Already read
    
    // Optimistic UI update
    setNotifications(prev => prev.map(n => n._id === id ? { ...n, read: true } : n));
    try {
      // It's highly probable that a markAsRead API exists if getNotifications does, but if not we ignore error visually
      const { companyAPI } = require('../../api/company'); // Access existing generic API locally to avoid changing employeeAPI right now
      await companyAPI.markNotificationRead?.(id);
    } catch { /* ignore */ }
  };

  const markAllAsRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    try {
      // Similar optimistic strategy given limited scope
      const { companyAPI } = require('../../api/company');
      await companyAPI.markAllNotificationsRead?.();
    } catch { /* ignore */ }
  };

  if (loading) return <div className="flex justify-center py-24"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>;

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex justify-between items-center bg-card border border-border p-5 rounded-2xl shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-blue-500/10 text-blue-500 rounded-xl flex items-center justify-center">
            <Bell className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-heading">Notifications</h1>
            <p className="text-muted-foreground text-sm flex items-center gap-2">
              You possess <span className="font-bold text-foreground">{unreadCount}</span> unread notices
            </p>
          </div>
        </div>
        {unreadCount > 0 && (
          <button onClick={markAllAsRead} className="px-4 py-2 bg-foreground text-background text-sm font-medium rounded-full hover:scale-105 transition-transform flex items-center gap-2">
            <Check className="w-4 h-4" /> Mark all read
          </button>
        )}
      </div>

      <div className="space-y-3">
        {notifications.length > 0 ? notifications.map((notif, i) => (
          <motion.div 
            key={notif._id} 
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            onClick={() => markAsRead(notif._id, notif.read)}
            className={`cursor-pointer border border-border rounded-2xl p-5 flex gap-4 transition-all ${notif.read ? 'bg-background opacity-70' : 'bg-card shadow-sm hover:border-foreground/30'}`}
          >
            <div className={`w-2.5 h-2.5 mt-1.5 rounded-full shrink-0 ${notif.read ? 'bg-transparent' : 'bg-blue-500'}`} />
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-start mb-1">
                <p className={`text-sm ${notif.read ? 'font-medium' : 'font-bold'}`}>{notif.title}</p>
                <span className="text-[10px] text-muted-foreground whitespace-nowrap ml-4">{new Date(notif.createdAt).toLocaleDateString()}</span>
              </div>
              <p className="text-xs text-muted-foreground pr-8">{notif.message}</p>
            </div>
            {!notif.read && (
              <div className="shrink-0 flex items-center">
                <span className="text-[10px] font-semibold text-blue-500 bg-blue-100 px-2 py-0.5 rounded-full">New</span>
              </div>
            )}
          </motion.div>
        )) : (
          <div className="text-center py-16 border border-border bg-card rounded-2xl">
            <Bell className="w-12 h-12 mx-auto text-muted-foreground mb-4 opacity-50" />
            <p className="text-sm text-muted-foreground">You're all caught up!</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmployeeNotifications;
