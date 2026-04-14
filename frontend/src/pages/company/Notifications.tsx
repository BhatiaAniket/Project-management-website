import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Bell, Check, CheckCheck, Trash2, Loader2 } from 'lucide-react';
import { companyAPI } from '../../api/company';
import { showToast } from '../../components/Toast';
import { useAuth } from '../../context/AuthContext';
import { AnimatePresence } from 'framer-motion';
import { X, Megaphone, Undo2 } from 'lucide-react';

const Notifications: React.FC = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [showBroadcast, setShowBroadcast] = useState(false);
  const [broadcastLoading, setBroadcastLoading] = useState(false);
  const [broadcastForm, setBroadcastForm] = useState({ title: '', message: '' });

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await companyAPI.listNotifications({ limit: 50 });
      setNotifications(res.data.data.notifications || []);
    } catch { setNotifications([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchNotifications(); }, []);

  const handleMarkRead = async (id: string) => {
    try {
      await companyAPI.markAsRead(id);
      setNotifications((prev) => prev.map((n) => n._id === id ? { ...n, isRead: true } : n));
    } catch { /* ignore */ }
  };

  const handleMarkAllRead = async () => {
    try {
      await companyAPI.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      showToast('All marked as read', 'success');
    } catch { /* ignore */ }
  };

  const handleDelete = async (id: string) => {
    try {
      await companyAPI.deleteNotification(id);
      setNotifications((prev) => prev.filter((n) => n._id !== id));
    } catch { /* ignore */ }
  };

  const handleRecallBroadcast = async (broadcastId: string) => {
    try {
      await companyAPI.deleteBroadcast(broadcastId);
      // Remove all local notifications matching this broadcastId
      setNotifications((prev) => prev.filter((n) => n.relatedId !== broadcastId));
      showToast('Broadcast recalled for everyone', 'success');
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to recall broadcast', 'error');
    }
  };

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    setBroadcastLoading(true);
    try {
      await companyAPI.broadcastNotification(broadcastForm);
      showToast('Broadcast sent successfully!', 'success');
      setShowBroadcast(false);
      setBroadcastForm({ title: '', message: '' });
      fetchNotifications();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to send broadcast', 'error');
    } finally {
      setBroadcastLoading(false);
    }
  };

  const typeIcons: Record<string, string> = {
    task_assigned: '📋', task_updated: '✏️', deadline_approaching: '⏰', meeting_starting: '📅',
    new_message: '💬', employee_joined: '👋', performance_report: '📊', announcement: '📢',
    project_created: '📁', general: '🔔',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-heading">Notifications</h1>
          <p className="text-sm text-muted-foreground mt-1">{notifications.filter((n) => !n.isRead).length} unread</p>
        </div>
        <div className="flex gap-2">
          {user?.role === 'company_admin' && (
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => setShowBroadcast(true)} className="flex items-center gap-2 px-4 py-2 rounded-full bg-foreground text-background text-sm font-medium transition-colors">
              <Megaphone className="w-4 h-4" /> Broadcast
            </motion.button>
          )}
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleMarkAllRead} className="flex items-center gap-2 px-4 py-2 rounded-full border border-border text-sm font-medium hover:bg-muted/60 transition-colors">
            <CheckCheck className="w-4 h-4" /> Mark all read
          </motion.button>
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-16">
            <Bell className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold">All caught up!</h3>
            <p className="text-sm text-muted-foreground">No notifications to show</p>
          </div>
        ) : (
          notifications.map((n, i) => (
            <motion.div key={n._id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }} className={`flex items-start gap-3 px-5 py-4 border-b border-border last:border-0 hover:bg-muted/20 transition-colors ${!n.isRead ? 'bg-muted/10' : ''}`}>
              <span className="text-lg mt-0.5">{typeIcons[n.type] || '🔔'}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium">{n.title}</p>
                  {!n.isRead && <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />}
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">{n.message}</p>
                <p className="text-xs text-muted-foreground mt-1">{new Date(n.createdAt).toLocaleString()}</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {!n.isRead && (
                  <button onClick={() => handleMarkRead(n._id)} className="p-1.5 rounded-lg hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-colors" title="Mark read">
                    <Check className="w-4 h-4" />
                  </button>
                )}
                {user?.role === 'company_admin' && n.type === 'announcement' && n.relatedId && (
                  <button onClick={() => handleRecallBroadcast(n.relatedId)} className="p-1.5 rounded-lg hover:bg-yellow-500/10 text-muted-foreground hover:text-yellow-500 transition-colors" title="Recall Broadcast from everyone">
                    <Undo2 className="w-4 h-4" />
                  </button>
                )}
                <button onClick={() => handleDelete(n._id)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-colors" title="Delete">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ))
        )}
      </div>

      <AnimatePresence>
        {showBroadcast && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowBroadcast(false)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} onClick={(e) => e.stopPropagation()} className="bg-card border border-border rounded-2xl p-6 w-full max-w-md">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold font-heading">Broadcast Alert</h2>
                <button onClick={() => setShowBroadcast(false)} className="p-1.5 hover:bg-muted rounded-full">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleBroadcast} className="space-y-4">
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Title</label>
                  <input type="text" required value={broadcastForm.title} onChange={(e) => setBroadcastForm({ ...broadcastForm, title: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:border-foreground" placeholder="e.g. Server Maintenance" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Message</label>
                  <textarea value={broadcastForm.message} onChange={(e) => setBroadcastForm({ ...broadcastForm, message: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:border-foreground resize-none h-24" placeholder="Type your full announcement here..." />
                </div>
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} disabled={broadcastLoading || !broadcastForm.title} type="submit" className="w-full py-3 rounded-full bg-foreground text-background text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-70">
                  {broadcastLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send Broadcast'}
                </motion.button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Notifications;
